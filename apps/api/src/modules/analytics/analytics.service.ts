import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Executive dashboard aggregates. */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(orgId: string) {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [dpiasByStatus, risksByLevel, riskRows, upcomingReviews, recentEvents, totals] =
      await Promise.all([
        this.prisma.system.dpia.groupBy({
          by: ['status'],
          where: { organisationId: orgId, deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.system.risk.groupBy({
          by: ['residualLevel'],
          where: { organisationId: orgId, deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.system.risk.findMany({
          where: { organisationId: orgId, deletedAt: null },
          select: { likelihood: true, impact: true, createdAt: true, residualLevel: true },
        }),
        this.prisma.system.dpia.findMany({
          where: {
            organisationId: orgId,
            deletedAt: null,
            nextReviewAt: { not: null, lte: new Date(now.getTime() + 60 * 86_400_000) },
          },
          select: { id: true, reference: true, title: true, nextReviewAt: true },
          orderBy: { nextReviewAt: 'asc' },
          take: 10,
        }),
        this.prisma.system.workflowEvent.findMany({
          where: { dpia: { organisationId: orgId } },
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: { dpia: { select: { reference: true, title: true } } },
        }),
        Promise.all([
          this.prisma.system.dpia.count({ where: { organisationId: orgId, deletedAt: null } }),
          this.prisma.system.risk.count({
            where: {
              organisationId: orgId,
              deletedAt: null,
              residualLevel: { in: ['HIGH', 'CRITICAL'] },
              status: { notIn: ['CLOSED', 'MITIGATED', 'ACCEPTED'] },
            },
          }),
          this.prisma.system.evidence.count({ where: { organisationId: orgId, deletedAt: null } }),
        ]),
      ]);

    // 5×5 heat map: count of risks per likelihood/impact cell.
    const heatmap = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
    for (const r of riskRows) {
      heatmap[r.likelihood - 1]![r.impact - 1]! += 1;
    }

    // Monthly risk trend for the last 6 months.
    const trend: Array<{ month: string; total: number; highOrCritical: number }> = [];
    for (let i = 0; i < 6; i += 1) {
      const start = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const inMonth = riskRows.filter((r) => r.createdAt >= start && r.createdAt < end);
      trend.push({
        month: start.toISOString().slice(0, 7),
        total: inMonth.length,
        highOrCritical: inMonth.filter((r) => ['HIGH', 'CRITICAL'].includes(r.residualLevel))
          .length,
      });
    }

    const [totalDpias, openHighRisks, evidenceCount] = totals;
    return {
      kpis: {
        totalDpias,
        openHighRisks,
        evidenceCount,
        dueForReview: upcomingReviews.length,
      },
      dpiasByStatus: Object.fromEntries(dpiasByStatus.map((d) => [d.status, d._count._all])),
      risksByLevel: Object.fromEntries(risksByLevel.map((r) => [r.residualLevel, r._count._all])),
      heatmap,
      trend,
      upcomingReviews,
      recentActivity: recentEvents.map((e) => ({
        dpia: e.dpia.reference,
        title: e.dpia.title,
        from: e.fromStatus,
        to: e.toStatus,
        at: e.createdAt,
      })),
    };
  }
}
