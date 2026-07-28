import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { config } from '../../common/config';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * WebAuthn passkeys (FIDO2). Challenges are held in an in-process TTL map —
 * swap for Redis when running more than one API replica (see deployment guide).
 */
@Injectable()
export class PasskeysService {
  private readonly challenges = new Map<string, { challenge: string; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  private putChallenge(key: string, challenge: string): void {
    this.challenges.set(key, { challenge, expiresAt: Date.now() + 5 * 60_000 });
  }

  private takeChallenge(key: string): string {
    const entry = this.challenges.get(key);
    this.challenges.delete(key);
    if (!entry || entry.expiresAt < Date.now()) {
      throw new BadRequestException('Challenge expired — restart the passkey ceremony');
    }
    return entry.challenge;
  }

  async registrationOptions(userId: string) {
    const cfg = config();
    const user = await this.prisma.system.user.findUniqueOrThrow({ where: { id: userId } });
    const existing = await this.prisma.system.webAuthnCredential.findMany({ where: { userId } });

    const options = await generateRegistrationOptions({
      rpName: cfg.WEBAUTHN_RP_NAME,
      rpID: cfg.WEBAUTHN_RP_ID,
      userName: user.email,
      userDisplayName: user.displayName,
      attestationType: 'none',
      excludeCredentials: existing.map((c) => ({ id: c.credentialId })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });
    this.putChallenge(`reg:${userId}`, options.challenge);
    return options;
  }

  async verifyRegistration(userId: string, response: RegistrationResponseJSON, label?: string) {
    const cfg = config();
    const expectedChallenge = this.takeChallenge(`reg:${userId}`);
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: cfg.WEBAUTHN_ORIGIN,
      expectedRPID: cfg.WEBAUTHN_RP_ID,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey registration could not be verified');
    }
    const { credential } = verification.registrationInfo;
    await this.prisma.system.webAuthnCredential.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: credential.transports ?? [],
        label: label ?? 'Passkey',
      },
    });
    return { verified: true };
  }

  async authenticationOptions(email: string) {
    const user = await this.prisma.system.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { credentials: true },
    });
    // Uniform response shape even for unknown users (no enumeration).
    const options = await generateAuthenticationOptions({
      rpID: config().WEBAUTHN_RP_ID,
      userVerification: 'preferred',
      allowCredentials: (user?.credentials ?? []).map((c) => ({
        id: c.credentialId,
        transports: c.transports as never[],
      })),
    });
    if (user) this.putChallenge(`auth:${user.id}`, options.challenge);
    return options;
  }

  /** Returns the authenticated user id on success. */
  async verifyAuthentication(email: string, response: AuthenticationResponseJSON): Promise<string> {
    const cfg = config();
    const user = await this.prisma.system.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { credentials: true },
    });
    if (!user) throw new UnauthorizedException('Passkey authentication failed');

    const credential = user.credentials.find((c) => c.credentialId === response.id);
    if (!credential) throw new UnauthorizedException('Passkey authentication failed');

    const expectedChallenge = this.takeChallenge(`auth:${user.id}`);
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: cfg.WEBAUTHN_ORIGIN,
      expectedRPID: cfg.WEBAUTHN_RP_ID,
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(credential.publicKey),
        counter: Number(credential.counter),
        transports: credential.transports as never[],
      },
    });
    if (!verification.verified) throw new UnauthorizedException('Passkey authentication failed');

    await this.prisma.system.webAuthnCredential.update({
      where: { id: credential.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
    });
    return user.id;
  }
}
