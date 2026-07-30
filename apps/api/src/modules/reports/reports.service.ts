import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { assessPriorConsultation, questionnaireTemplateSchema } from '@shieldwise/shared';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { renderDocx, renderPdf } from './renderers/binary.renderers';
import { renderCsv, renderHtml, renderMarkdown } from './renderers/text.renderers';
import {
  buildSections,
  REPORT_TEMPLATES,
  type ReportModel,
  type ReportTemplateKey,
} from './report-model';

export type ReportFormat = 'pdf' | 'docx' | 'html' | 'md' | 'csv' | 'json';

const CONTENT_TYPES: Record<ReportFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  html: 'text/html; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async generate(
    orgId: string,
    dpiaId: string,
    format: ReportFormat,
    template: ReportTemplateKey,
    userId: string,
  ): Promise<{ filename: string; contentType: string; body: Buffer }> {
    if (!REPORT_TEMPLATES[template]) {
      throw new BadRequestException(`Unknown report template "${template}"`);
    }
    const model = await this.buildModel(orgId, dpiaId);

    let body: Buffer;
    switch (format) {
      case 'md':
        body = Buffer.from(renderMarkdown(model, template), 'utf8');
        break;
      case 'html':
        body = Buffer.from(renderHtml(model, template), 'utf8');
        break;
      case 'csv':
        body = Buffer.from(renderCsv(model), 'utf8');
        break;
      case 'json':
        body = Buffer.from(JSON.stringify(model, null, 2), 'utf8');
        break;
      case 'pdf':
        body = await renderPdf(model, template);
        break;
      case 'docx':
        body = await renderDocx(model, template);
        break;
      default:
        throw new BadRequestException(`Unsupported format "${format as string}"`);
    }

    await this.prisma.client.reportExport.create({
      data: { organisationId: orgId, dpiaId, template, format, generatedById: userId },
    });
    await this.audit.log({
      action: 'EXPORT',
      entityType: 'Dpia',
      entityId: dpiaId,
      metadata: { format, template },
    });

    return {
      filename: `${model.reference}-${template}.${format}`,
      contentType: CONTENT_TYPES[format],
      body,
    };
  }

  listExports(orgId: string) {
    return this.prisma.client.reportExport.findMany({
      where: { organisationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { dpia: { select: { reference: true, title: true } } },
    });
  }

  private async buildModel(orgId: string, dpiaId: string): Promise<ReportModel> {
    const dpia = await this.prisma.client.dpia.findFirst({
      where: { id: dpiaId, organisationId: orgId, deletedAt: null },
      include: {
        organisation: { select: { name: true } },
        template: true,
        risks: {
          where: { deletedAt: null },
          orderBy: { residualScore: 'desc' },
          include: { controlLinks: { include: { control: true } } },
        },
        controlLinks: { include: { control: { include: { mappings: true } } } },
        approvals: { orderBy: { decidedAt: 'asc' } },
        workflowEvents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!dpia) throw new NotFoundException('DPIA not found');

    const template = questionnaireTemplateSchema.parse(dpia.template.document);
    const answers = (dpia.answers ?? {}) as Record<string, unknown>;
    const dataFlow = dpia.dataFlow as {
      findings?: Array<{ severity: string; message: string }>;
    } | null;

    const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : undefined);

    return {
      reference: dpia.reference,
      title: dpia.title,
      status: dpia.status,
      organisation: dpia.organisation.name,
      generatedAt: new Date().toISOString().slice(0, 10),
      approvedAt: iso(dpia.approvedAt),
      nextReviewAt: iso(dpia.nextReviewAt),
      description: dpia.description ?? undefined,
      completeness: dpia.completeness,
      sections: buildSections(template, answers),
      risks: dpia.risks.map((r) => ({
        title: r.title,
        category: r.category,
        likelihood: r.likelihood,
        impact: r.impact,
        inherentScore: r.inherentScore,
        residualScore: r.residualScore,
        level: r.level,
        residualLevel: r.residualLevel,
        status: r.status,
        references: r.references,
        controls: r.controlLinks.map((l) => ({ name: l.control.name, status: l.status })),
      })),
      controls: dpia.controlLinks.map((l) => ({
        key: l.control.key,
        name: l.control.name,
        status: l.status,
        frameworks: [...new Set(l.control.mappings.map((m) => `${m.framework} ${m.reference}`))],
      })),
      approvals: dpia.approvals.map((a) => ({
        stage: a.stage,
        decision: a.decision,
        comment: a.comment ?? undefined,
        decidedAt: a.decidedAt.toISOString().slice(0, 16).replace('T', ' '),
      })),
      workflowHistory: dpia.workflowEvents.map((e) => ({
        from: e.fromStatus,
        to: e.toStatus,
        comment: e.comment ?? undefined,
        at: e.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      })),
      dataFlowFindings: (dataFlow?.findings ?? []).map((f) => ({
        severity: f.severity,
        message: f.message,
      })),
      priorConsultation: assessPriorConsultation(
        dpia.risks.map((r) => ({
          residualLevel: r.residualLevel,
          status: r.status,
          title: r.title,
        })),
      ),
    };
  }
}
