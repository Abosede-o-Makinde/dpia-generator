import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import type { User } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { config } from '../../common/config';
import { decryptSecret, encryptSecret, randomToken } from '../../common/crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * TOTP MFA (RFC 6238) with encrypted seed storage and hashed one-time
 * recovery codes.
 */
@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Step 1: generate a secret; not active until confirmed with a valid code. */
  async enroll(userId: string): Promise<{ otpauthUrl: string; secret: string }> {
    const user = await this.prisma.system.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.mfaEnabled) throw new BadRequestException('MFA already enabled');

    const secret = authenticator.generateSecret(32);
    await this.prisma.system.user.update({
      where: { id: userId },
      data: { mfaSecretEnc: encryptSecret(secret, config().MFA_ENCRYPTION_KEY) },
    });
    return {
      otpauthUrl: authenticator.keyuri(user.email, 'Shieldwise Privacy Platform', secret),
      secret,
    };
  }

  /** Step 2: confirm with a live code; activates MFA and returns recovery codes. */
  async confirm(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await this.prisma.system.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.mfaEnabled) throw new BadRequestException('MFA already enabled');
    if (!user.mfaSecretEnc) throw new BadRequestException('Enroll first');

    const secret = decryptSecret(user.mfaSecretEnc, config().MFA_ENCRYPTION_KEY);
    if (!authenticator.verify({ token: code, secret })) {
      throw new BadRequestException('Invalid code — check your authenticator app');
    }

    const recoveryCodes = Array.from({ length: 8 }, () => randomToken(6));
    const hashes = await Promise.all(recoveryCodes.map((c) => argon2.hash(c)));
    await this.prisma.system.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaRecovery: hashes },
    });
    await this.audit.log({
      action: 'MFA_ENROLLED',
      entityType: 'User',
      entityId: userId,
      actorId: userId,
    });
    return { recoveryCodes };
  }

  /** Accepts a 6-digit TOTP code or a recovery code (single-use). */
  async verifyCode(user: User, code: string): Promise<boolean> {
    if (!user.mfaSecretEnc) return false;

    if (/^\d{6}$/.test(code)) {
      const secret = decryptSecret(user.mfaSecretEnc, config().MFA_ENCRYPTION_KEY);
      return authenticator.verify({ token: code, secret });
    }

    for (const [i, hash] of user.mfaRecovery.entries()) {
      if (await argon2.verify(hash, code).catch(() => false)) {
        const remaining = user.mfaRecovery.filter((_, idx) => idx !== i);
        await this.prisma.system.user.update({
          where: { id: user.id },
          data: { mfaRecovery: remaining },
        });
        return true;
      }
    }
    return false;
  }

  async disable(userId: string, code: string): Promise<void> {
    const user = await this.prisma.system.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaEnabled) throw new BadRequestException('MFA not enabled');
    if (!(await this.verifyCode(user, code))) {
      throw new BadRequestException('Invalid code');
    }
    await this.prisma.system.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecretEnc: null, mfaRecovery: [] },
    });
  }
}
