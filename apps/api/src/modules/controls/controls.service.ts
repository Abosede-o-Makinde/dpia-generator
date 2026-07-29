import { Injectable, NotFoundException } from '@nestjs/common';
import { FRAMEWORKS } from '@shieldwise/shared';
import type { ControlStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ControlsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Catalogue: global controls + this org's custom controls. */
  list(orgId: string, framework?: string, search?: string) {
    return this.prisma.system.control.findMany({
      where: {
        OR: [{ organisationId: null }, { organisationId: orgId }],
        deletedAt: null,
        ...(framework ? { mappings: { some: { framework } } } : {}),
        ...(search
          ? {
              name: { contains: search, mode: 'insensitive' as const },
            }
          : {}),
      },
      include: { mappings: true },
      orderBy: { key: 'asc' },
    });
  }

  async get(orgId: string, id: string) {
    const control = await this.prisma.system.control.findFirst({
      where: { id, OR: [{ organisationId: null }, { organisationId: orgId }], deletedAt: null },
      include: { mappings: true },
    });
    if (!control) throw new NotFoundException('Control not found');
    return control;
  }

  /** Controls recommended for a DPIA, aggregated from its identified risks. */
  async recommendationsForDpia(orgId: string, dpiaId: string) {
    const risks = await this.prisma.client.risk.findMany({
      where: { dpiaId, organisationId: orgId, deletedAt: null },
      include: {
        controlLinks: { include: { control: { include: { mappings: true } } } },
      },
    });

    const byControl = new Map<
      string,
      {
        control: unknown;
        risks: Array<{ id: string; title: string; residualLevel: string }>;
        status: string;
      }
    >();
    for (const risk of risks) {
      for (const link of risk.controlLinks) {
        const entry = byControl.get(link.controlId) ?? {
          control: link.control,
          risks: [],
          status: link.status,
        };
        entry.risks.push({ id: risk.id, title: risk.title, residualLevel: risk.residualLevel });
        byControl.set(link.controlId, entry);
      }
    }
    return [...byControl.values()].sort((a, b) => b.risks.length - a.risks.length);
  }

  /** Apply/track a control at the DPIA level. */
  async applyToDpia(orgId: string, dpiaId: string, controlId: string, status: ControlStatus) {
    const dpia = await this.prisma.client.dpia.findFirst({
      where: { id: dpiaId, organisationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!dpia) throw new NotFoundException('DPIA not found');
    await this.get(orgId, controlId);

    const link = await this.prisma.system.dpiaControl.upsert({
      where: { dpiaId_controlId: { dpiaId, controlId } },
      create: { dpiaId, controlId, status },
      update: { status },
    });
    await this.audit.log({
      action: 'UPDATE',
      entityType: 'DpiaControl',
      entityId: link.id,
      metadata: { dpiaId, controlId, status },
    });
    return link;
  }

  /**
   * Compliance mapping summary: for each framework, how many catalogue
   * controls map to it and how many of those the org has implemented
   * anywhere (risk- or DPIA-level). Highlights gaps for remediation.
   */
  async complianceSummary(orgId: string) {
    const controls = await this.prisma.system.control.findMany({
      where: { OR: [{ organisationId: null }, { organisationId: orgId }], deletedAt: null },
      include: {
        mappings: true,
        riskLinks: {
          where: { status: 'IMPLEMENTED', risk: { organisationId: orgId, deletedAt: null } },
          select: { id: true },
        },
        dpiaLinks: {
          where: { status: 'IMPLEMENTED', dpia: { organisationId: orgId, deletedAt: null } },
          select: { id: true },
        },
      },
    });

    const summary = FRAMEWORKS.map((framework) => {
      const mapped = controls.filter((c) => c.mappings.some((m) => m.framework === framework));
      const implemented = mapped.filter((c) => c.riskLinks.length > 0 || c.dpiaLinks.length > 0);
      return {
        framework,
        mappedControls: mapped.length,
        implementedControls: implemented.length,
        coverage: mapped.length === 0 ? 0 : Math.round((implemented.length / mapped.length) * 100),
        gaps: mapped
          .filter((c) => c.riskLinks.length === 0 && c.dpiaLinks.length === 0)
          .map((c) => ({ id: c.id, key: c.key, name: c.name }))
          .slice(0, 20),
      };
    });
    return summary;
  }
}
