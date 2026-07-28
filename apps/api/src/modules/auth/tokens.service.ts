import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { API_TOKEN_PREFIX, randomToken, sha256Hex } from '../../common/crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateTokenDto } from './dto';

/** Personal API tokens (stored hashed; raw value shown exactly once). */
@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(orgId: string, userId: string, dto: CreateTokenDto) {
    const raw = `${API_TOKEN_PREFIX}${randomToken(32)}`;
    const record = await this.prisma.system.apiToken.create({
      data: {
        organisationId: orgId,
        userId,
        name: dto.name,
        tokenHash: sha256Hex(raw),
        scopes: dto.scopes,
        expiresAt: dto.expiresInDays ? new Date(Date.now() + dto.expiresInDays * 86_400_000) : null,
      },
    });
    await this.audit.log({
      action: 'TOKEN_ISSUED',
      entityType: 'ApiToken',
      entityId: record.id,
      metadata: { name: dto.name, scopes: dto.scopes },
    });
    return {
      id: record.id,
      name: record.name,
      scopes: record.scopes,
      expiresAt: record.expiresAt,
      /** Shown once — never retrievable again. */
      token: raw,
    };
  }

  async list(orgId: string, userId: string) {
    return this.prisma.system.apiToken.findMany({
      where: { organisationId: orgId, userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(orgId: string, userId: string, id: string): Promise<void> {
    const token = await this.prisma.system.apiToken.findFirst({
      where: { id, organisationId: orgId, userId, revokedAt: null },
    });
    if (!token) throw new NotFoundException('Token not found');
    await this.prisma.system.apiToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ action: 'TOKEN_REVOKED', entityType: 'ApiToken', entityId: id });
  }
}
