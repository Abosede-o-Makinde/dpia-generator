import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AUDIT_ACTIONS } from '@shieldwise/shared';
import type { AuditAction } from '@prisma/client';
import { CurrentOrg, RequireRoles, type OrgContext } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { PrismaService } from '../../common/prisma/prisma.service';

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  action: z.enum(AUDIT_ACTIONS).optional(),
  entityType: z.string().max(60).optional(),
  entityId: z.string().max(60).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

@ApiTags('audit')
@ApiBearerAuth()
@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'SECURITY_REVIEWER')
  @ApiOperation({ summary: 'Query the immutable audit trail' })
  async query(
    @CurrentOrg() org: OrgContext,
    @Query(new ZodPipe(auditQuerySchema)) q: z.infer<typeof auditQuerySchema>,
  ) {
    const where = {
      organisationId: org.orgId,
      ...(q.action ? { action: q.action as AuditAction } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.from || q.to
        ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.system.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.system.auditLog.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
}
