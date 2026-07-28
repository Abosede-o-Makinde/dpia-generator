import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import type { User } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { config } from '../../common/config';
import { randomToken, sha256Hex } from '../../common/crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MfaService } from './mfa.service';
import type { LoginDto, LoginResult, RegisterDto, TokenPair } from './dto';

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly mfa: MfaService,
  ) {}

  /** Self-service signup: creates the user, their organisation and OWNER membership. */
  async register(dto: RegisterDto): Promise<LoginResult> {
    if (!config().ALLOW_SIGNUP) {
      throw new ForbiddenException('Self-service signup is disabled');
    }
    const existing = await this.prisma.system.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const slugBase = dto.organisationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40);

    const user = await this.prisma.system.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: dto.email, displayName: dto.displayName, passwordHash },
      });
      const org = await tx.organisation.create({
        data: {
          name: dto.organisationName,
          slug: `${slugBase}-${randomToken(3)}`,
          industry: dto.industry,
        },
      });
      await tx.membership.create({
        data: { organisationId: org.id, userId: created.id, role: 'OWNER' },
      });
      return created;
    });

    await this.audit.log({
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
    });
    return this.issueLogin(user);
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.system.user.findUnique({ where: { email: dto.email } });
    // Uniform failure path — no user enumeration.
    const invalid = new UnauthorizedException('Invalid email or password');

    if (!user || user.deletedAt || !user.passwordHash) throw invalid;
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked — try again later');
    }

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) {
      const failed = user.failedLogins + 1;
      await this.prisma.system.user.update({
        where: { id: user.id },
        data: {
          failedLogins: failed,
          lockedUntil:
            failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
        },
      });
      await this.audit.log({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        actorId: user.id,
      });
      throw invalid;
    }

    await this.prisma.system.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    if (user.mfaEnabled) {
      const mfaToken = await this.jwt.signAsync(
        { sub: user.id, type: 'mfa' },
        { secret: config().JWT_ACCESS_SECRET, expiresIn: '5m' },
      );
      return { mfaRequired: true, mfaToken };
    }
    return this.issueLogin(user);
  }

  /** Second factor: TOTP code or a recovery code, against a short-lived mfa token. */
  async verifyMfa(mfaToken: string, code: string): Promise<LoginResult> {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(mfaToken, { secret: config().JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException('MFA challenge expired — log in again');
    }
    if (payload.type !== 'mfa') throw new UnauthorizedException('Wrong token type');

    const user = await this.prisma.system.user.findUnique({ where: { id: payload.sub } });
    if (!user?.mfaEnabled) throw new UnauthorizedException('MFA not enabled');

    const valid = await this.mfa.verifyCode(user, code);
    if (!valid) {
      await this.audit.log({
        action: 'MFA_CHALLENGE',
        entityType: 'User',
        entityId: user.id,
        actorId: user.id,
        metadata: { outcome: 'failed' },
      });
      throw new UnauthorizedException('Invalid MFA code');
    }
    return this.issueLogin(user);
  }

  /** Refresh with rotation + reuse detection (revokes the whole family on replay). */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = sha256Hex(refreshToken);
    const session = await this.prisma.system.session.findUnique({ where: { tokenHash } });
    if (!session) throw new UnauthorizedException('Invalid refresh token');

    if (session.revokedAt || session.expiresAt < new Date()) {
      // Replay of a rotated/expired token → assume theft, kill the chain.
      await this.prisma.system.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected — sessions revoked');
    }

    const user = await this.prisma.system.user.findUnique({ where: { id: session.userId } });
    if (!user || user.deletedAt) throw new UnauthorizedException('Account unavailable');

    await this.prisma.system.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user, session.familyId);
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.prisma.system.session.findUnique({
      where: { tokenHash: sha256Hex(refreshToken) },
    });
    if (session) {
      await this.prisma.system.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.log({
        action: 'LOGOUT',
        entityType: 'User',
        entityId: session.userId,
        actorId: session.userId,
      });
    }
  }

  async listSessions(userId: string) {
    return this.prisma.system.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.system.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new BadRequestException('Unknown session');
    await this.prisma.system.session.updateMany({
      where: { familyId: session.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Complete a login for flows that authenticated out-of-band (SSO, passkeys). */
  async loginAsUser(userId: string): Promise<LoginResult> {
    const user = await this.prisma.system.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new UnauthorizedException('Account unavailable');
    return this.issueLogin(user);
  }

  private async issueLogin(user: User): Promise<LoginResult> {
    const tokens = await this.issueTokens(user, randomUUID());
    await this.audit.log({
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
    });
    return {
      mfaRequired: false,
      tokens,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }

  private async issueTokens(user: User, familyId: string): Promise<TokenPair> {
    const cfg = config();
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, name: user.displayName, type: 'access' },
      { secret: cfg.JWT_ACCESS_SECRET, expiresIn: cfg.JWT_ACCESS_TTL },
    );
    const refreshToken = randomToken(48);
    await this.prisma.system.session.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + cfg.JWT_REFRESH_TTL * 1000),
      },
    });
    return { accessToken, refreshToken, expiresIn: cfg.JWT_ACCESS_TTL };
  }
}
