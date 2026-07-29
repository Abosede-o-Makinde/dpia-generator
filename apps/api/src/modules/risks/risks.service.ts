import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_SCORING_CONFIG,
  evaluateRiskRules,
  levelForScore,
  riskScoringConfigSchema,
  type RiskScoringConfig,
} from '@shieldwise/shared';
import type { ControlStatus, RiskStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RISK_RULES } from './risk-rules';
import type { CreateRiskDto, ListRisksDto, UpdateRiskDto } from './dto';

@Injectable()
export class RisksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Org-level scoring config (organisation.settings.riskScoring) over defaults. */
  async scoringConfig(orgId: string): Promise<RiskScoringConfig> {
    const org = await this.prisma.system.organisation.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    const override = (org?.settings as Record<string, unknown> | null)?.riskScoring;
    if (!override) return DEFAULT_SCORING_CONFIG;
    const parsed = riskScoringConfigSchema.safeParse(override);
    return parsed.success ? parsed.data : DEFAULT_SCORING_CONFIG;
  }

  /**
   * Run the rule engine against a DPIA fact map. Replaces previous
   * auto-generated risks (manual risks are preserved) and links recommended
   * controls to each new risk.
   */
  async evaluateForDpia(orgId: string, dpiaId: string, facts: Record<string, unknown>) {
    const config = await this.scoringConfig(orgId);
    const scored = evaluateRiskRules(RISK_RULES, facts, config);

    const controls = await this.prisma.system.control.findMany({
      where: {
        OR: [{ organisationId: null }, { organisationId: orgId }],
        deletedAt: null,
        key: { in: [...new Set(scored.flatMap((s) => s.recommendedControls))] },
      },
    });
    const controlsByKey = new Map(controls.map((c) => [c.key, c]));

    const created = await this.prisma.system.$transaction(async (tx) => {
      const stale = await tx.risk.findMany({
        where: { dpiaId, organisationId: orgId, ruleKey: { not: null } },
        select: { id: true },
      });
      const staleIds = stale.map((r) => r.id);
      await tx.riskControl.deleteMany({ where: { riskId: { in: staleIds } } });
      await tx.risk.deleteMany({ where: { id: { in: staleIds } } });

      const rows = [];
      for (const s of scored) {
        const risk = await tx.risk.create({
          data: {
            organisationId: orgId,
            dpiaId,
            ruleKey: s.ruleKey,
            title: s.title,
            description: s.description,
            category: s.category,
            likelihood: s.likelihood,
            impact: s.impact,
            inherentScore: s.inherentScore,
            residualScore: s.residualScore,
            level: s.level,
            residualLevel: s.residualLevel,
            references: s.references,
          },
        });
        const linked = s.recommendedControls
          .map((key) => controlsByKey.get(key))
          .filter((c): c is NonNullable<typeof c> => !!c);
        if (linked.length > 0) {
          await tx.riskControl.createMany({
            data: linked.map((c) => ({ riskId: risk.id, controlId: c.id })),
          });
        }
        rows.push(risk);
      }
      return rows;
    });

    await this.audit.log({
      action: 'SCAN',
      entityType: 'Dpia',
      entityId: dpiaId,
      metadata: { engine: 'risk-rules', matched: created.length },
    });
    return created;
  }

  async list(orgId: string, q: ListRisksDto) {
    const where = {
      organisationId: orgId,
      deletedAt: null,
      ...(q.level ? { residualLevel: q.level } : {}),
      ...(q.status ? { status: q.status as RiskStatus } : {}),
      ...(q.dpiaId ? { dpiaId: q.dpiaId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.client.risk.findMany({
        where,
        include: {
          dpia: { select: { id: true, reference: true, title: true } },
          controlLinks: { include: { control: { select: { id: true, key: true, name: true } } } },
        },
        orderBy: { residualScore: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.client.risk.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async createManual(orgId: string, dto: CreateRiskDto) {
    const config = await this.scoringConfig(orgId);
    const inherent = dto.likelihood * dto.impact;
    const risk = await this.prisma.client.risk.create({
      data: {
        organisationId: orgId,
        dpiaId: dto.dpiaId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        likelihood: dto.likelihood,
        impact: dto.impact,
        inherentScore: inherent,
        residualScore: inherent,
        level: levelForScore(inherent, config),
        residualLevel: levelForScore(inherent, config),
        ownerId: dto.ownerId,
        dueDate: dto.dueDate,
      },
    });
    await this.audit.log({ action: 'CREATE', entityType: 'Risk', entityId: risk.id });
    return risk;
  }

  async update(orgId: string, id: string, dto: UpdateRiskDto) {
    await this.assertRisk(orgId, id);
    const risk = await this.prisma.client.risk.update({
      where: { id },
      data: {
        status: dto.status as RiskStatus | undefined,
        treatment: dto.treatment,
        ownerId: dto.ownerId,
        dueDate: dto.dueDate,
      },
    });
    await this.audit.log({ action: 'UPDATE', entityType: 'Risk', entityId: id });
    return risk;
  }

  /**
   * Update a linked control's implementation status and recompute the risk's
   * residual score: combined effectiveness = 1 − Π(1 − eᵢ) over IMPLEMENTED
   * controls (independent-controls approximation).
   */
  async setControlStatus(orgId: string, riskId: string, controlId: string, status: ControlStatus) {
    await this.assertRisk(orgId, riskId);
    const link = await this.prisma.system.riskControl.findUnique({
      where: { riskId_controlId: { riskId, controlId } },
    });
    if (!link) throw new NotFoundException('Control is not linked to this risk');

    await this.prisma.system.riskControl.update({ where: { id: link.id }, data: { status } });
    return this.recomputeResidual(orgId, riskId);
  }

  async recomputeResidual(orgId: string, riskId: string) {
    const risk = await this.prisma.system.risk.findUnique({
      where: { id: riskId },
      include: { controlLinks: { include: { control: true } } },
    });
    if (!risk || risk.organisationId !== orgId) throw new NotFoundException('Risk not found');

    const config = await this.scoringConfig(orgId);
    const implemented = risk.controlLinks.filter((l) => l.status === 'IMPLEMENTED');
    const effectiveness =
      1 -
      implemented.reduce((acc, l) => acc * (1 - (l.effectiveness ?? l.control.effectiveness)), 1);
    const residualScore =
      Math.round(risk.inherentScore * (1 - Math.min(effectiveness, 0.95)) * 10) / 10;

    return this.prisma.system.risk.update({
      where: { id: riskId },
      data: { residualScore, residualLevel: levelForScore(residualScore, config) },
    });
  }

  private async assertRisk(orgId: string, id: string) {
    const risk = await this.prisma.client.risk.findFirst({
      where: { id, organisationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!risk) throw new NotFoundException('Risk not found');
  }
}
