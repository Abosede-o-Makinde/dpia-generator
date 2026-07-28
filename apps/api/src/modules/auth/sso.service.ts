import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { randomUUID } from 'node:crypto';
import { config } from '../../common/config';
import { randomToken, sha256Hex } from '../../common/crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

interface DiscoveryDocument {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
}

/**
 * Generic OIDC authorization-code SSO (works with Keycloak, Entra ID, Okta,
 * Google — any spec-compliant IdP). Users are JIT-provisioned on first login
 * and matched by verified email thereafter.
 */
@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);
  private discovery?: DiscoveryDocument;
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  private readonly pending = new Map<string, { nonce: string; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  get enabled(): boolean {
    const cfg = config();
    return !!(cfg.OIDC_ISSUER_URL && cfg.OIDC_CLIENT_ID && cfg.OIDC_CLIENT_SECRET);
  }

  private async discover(): Promise<DiscoveryDocument> {
    if (!this.enabled) throw new ServiceUnavailableException('SSO is not configured');
    if (this.discovery) return this.discovery;
    const issuer = config().OIDC_ISSUER_URL!.replace(/\/$/, '');
    const res = await fetch(`${issuer}/.well-known/openid-configuration`);
    if (!res.ok) throw new ServiceUnavailableException('OIDC discovery failed');
    this.discovery = (await res.json()) as DiscoveryDocument;
    this.jwks = createRemoteJWKSet(new URL(this.discovery.jwks_uri));
    return this.discovery;
  }

  /** Build the IdP redirect URL for the login ceremony. */
  async loginUrl(): Promise<{ url: string }> {
    const doc = await this.discover();
    const state = randomUUID();
    const nonce = randomToken(16);
    this.pending.set(state, { nonce, expiresAt: Date.now() + 10 * 60_000 });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config().OIDC_CLIENT_ID!,
      redirect_uri: `${config().API_URL}/v1/auth/sso/callback`,
      scope: 'openid email profile',
      state,
      nonce,
    });
    return { url: `${doc.authorization_endpoint}?${params}` };
  }

  /** Exchange the code, verify the ID token, JIT-provision, return the user id. */
  async handleCallback(code: string, state: string): Promise<string> {
    const entry = this.pending.get(state);
    this.pending.delete(state);
    if (!entry || entry.expiresAt < Date.now()) {
      throw new BadRequestException('Invalid or expired SSO state');
    }

    const doc = await this.discover();
    const cfg = config();
    const res = await fetch(doc.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${cfg.API_URL}/v1/auth/sso/callback`,
        client_id: cfg.OIDC_CLIENT_ID!,
        client_secret: cfg.OIDC_CLIENT_SECRET!,
      }),
    });
    if (!res.ok) {
      this.logger.warn(`SSO token exchange failed: ${res.status}`);
      throw new UnauthorizedException('SSO token exchange failed');
    }
    const body = (await res.json()) as { id_token?: string };
    if (!body.id_token) throw new UnauthorizedException('IdP returned no id_token');

    const { payload } = await jwtVerify(body.id_token, this.jwks!, {
      issuer: doc.issuer,
      audience: cfg.OIDC_CLIENT_ID!,
    });
    this.assertNonce(payload, entry.nonce);

    const email = (payload.email as string | undefined)?.toLowerCase();
    const sub = payload.sub!;
    if (!email) throw new UnauthorizedException('IdP did not release an email claim');

    const bySubject = await this.prisma.system.user.findUnique({ where: { ssoSubject: sub } });
    if (bySubject) return bySubject.id;

    const byEmail = await this.prisma.system.user.findUnique({ where: { email } });
    if (byEmail) {
      await this.prisma.system.user.update({
        where: { id: byEmail.id },
        data: { ssoSubject: sub, ssoProvider: doc.issuer },
      });
      return byEmail.id;
    }

    const created = await this.prisma.system.user.create({
      data: {
        email,
        displayName: (payload.name as string) ?? email,
        ssoSubject: sub,
        ssoProvider: doc.issuer,
        // No local password — SSO-only account.
      },
    });
    this.logger.log(`JIT-provisioned SSO user ${sha256Hex(email).slice(0, 8)}`);
    return created.id;
  }

  private assertNonce(payload: JWTPayload, expected: string): void {
    if (payload.nonce !== expected) {
      throw new UnauthorizedException('SSO nonce mismatch');
    }
  }
}
