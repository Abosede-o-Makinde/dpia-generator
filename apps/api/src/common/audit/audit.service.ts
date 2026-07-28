import { Injectable, Logger } from '@nestjs/common';
import type { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { currentTenant } from '../tenancy';

export interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  organisationId?: string;
  actorId?: string;
  actorType?: 'user' | 'api_token' | 'system';
  metadata?: Record<string, unknown>;
}

/**
 * Append-only audit trail. Failures are logged but never break the business
 * operation (availability over completeness for the request; the write is
 * retried by the caller's transaction where atomicity matters).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    const store = currentTenant();
    try {
      await this.prisma.system.auditLog.create({
        data: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          organisationId: entry.organisationId ?? store?.orgId ?? null,
          actorId: entry.actorId ?? store?.userId ?? null,
          actorType: entry.actorType ?? 'user',
          ip: store?.ip,
          userAgent: store?.userAgent,
          requestId: store?.requestId,
          metadata: (entry.metadata ?? {}) as object,
        },
      });
    } catch (err) {
      this.logger.error(`Audit write failed: ${(err as Error).message}`);
    }
  }
}
