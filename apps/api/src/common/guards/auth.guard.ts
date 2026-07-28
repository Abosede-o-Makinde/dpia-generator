import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { API_TOKEN_PREFIX, sha256Hex } from '../crypto';
import { config } from '../config';
import { IS_PUBLIC_KEY, type AuthPrincipal } from '../decorators';
import { PrismaService } from '../prisma/prisma.service';
import { currentTenant } from '../tenancy';

interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  type: string;
}

/**
 * Unified authentication guard: accepts either a first-party JWT access token
 * or a personal API token (`shieldwise_pat_…`, stored hashed).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { principal?: AuthPrincipal }>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();

    const principal = token.startsWith(API_TOKEN_PREFIX)
      ? await this.authenticateApiToken(token)
      : await this.authenticateJwt(token);

    req.principal = principal;
    const store = currentTenant();
    if (store) store.userId = principal.userId;
    return true;
  }

  private async authenticateJwt(token: string): Promise<AuthPrincipal> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: config().JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (payload.type !== 'access') throw new UnauthorizedException('Wrong token type');
    return {
      userId: payload.sub,
      email: payload.email,
      displayName: payload.name,
      kind: 'user',
    };
  }

  private async authenticateApiToken(token: string): Promise<AuthPrincipal> {
    const record = await this.prisma.system.apiToken.findUnique({
      where: { tokenHash: sha256Hex(token) },
      include: { user: true },
    });
    if (
      !record ||
      record.revokedAt ||
      (record.expiresAt && record.expiresAt < new Date()) ||
      record.user.deletedAt
    ) {
      throw new UnauthorizedException('Invalid API token');
    }
    // Fire-and-forget usage timestamp.
    void this.prisma.system.apiToken
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return {
      userId: record.userId,
      email: record.user.email,
      displayName: record.user.displayName,
      kind: 'api_token',
      tokenScopes: record.scopes,
    };
  }
}
