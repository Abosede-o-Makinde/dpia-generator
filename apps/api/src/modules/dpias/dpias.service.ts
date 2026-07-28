import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  allowedTransitions,
  buildFactMap,
  canTransition,
  EDITABLE_STATUSES,
  paginate,
  questionnaireTemplateSchema,
  resolveVisibility,
  type DpiaStatus,
  type QuestionnaireTemplate,
  type Role,
} from '@shieldwise/shared';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RisksService } from '../risks/risks.service';
import { analyseDataFlow, dataFlowRiskTags } from './dataflow';
import type {
  CommentDto,
  CreateDpiaDto,
  DataFlowDto,
  ListDpiasDto,
  TransitionDto,
  UpdateDpiaDto,
} from './dto';

@Injectable()
export class DpiasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly risks: RisksService,
  ) {}

  async create(orgId: string, userId: string, dto: CreateDpiaDto) {
    const template = await this.prisma.system.questionnaireTemplate.findFirst({
      where: { key: dto.templateKey, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (!template) throw new BadRequestException(`No active template "${dto.templateKey}"`);

    const year = new Date().getFullYear();
    const count = await this.prisma.client.dpia.count({
      where: { organisationId: orgId, reference: { startsWith: `DPIA-${year}-` } },
    });
    const reference = `DPIA-${year}-${String(count + 1).padStart(4, '0')}`;

    const dpia = await this.prisma.client.dpia.create({
      data: {
        organisationId: orgId,
        projectId: dto.projectId,
        templateId: template.id,
        reference,
        title: dto.title,
        description: dto.description,
        ownerId: userId,
      },
    });
    await this.audit.log({ action: 'CREATE', entityType: 'Dpia', entityId: dpia.id });
    return dpia;
  }

  async list(orgId: string, q: ListDpiasDto) {
    const where = {
      organisationId: orgId,
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.projectId ? { projectId: q.projectId } : {}),
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: 'insensitive' as const } },
              { reference: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.client.dpia.findMany({
        where,
        select: {
          id: true,
          reference: true,
          title: true,
          status: true,
          completeness: true,
          ownerId: true,
          dueDate: true,
          nextReviewAt: true,
          updatedAt: true,
          project: { select: { id: true, name: true } },
          _count: { select: { risks: true, comments: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.client.dpia.count({ where }),
    ]);
    return paginate(items, total, { page: q.page, pageSize: q.pageSize, order: 'desc' });
  }

  /** Full DPIA detail: template, visibility-resolved questionnaire, workflow options. */
  async get(orgId: string, id: string, roles: Role[]) {
    const dpia = await this.prisma.client.dpia.findFirst({
      where: { id, organisationId: orgId, deletedAt: null },
      include: {
        template: true,
        project: { select: { id: true, name: true } },
        risks: { where: { deletedAt: null }, orderBy: { residualScore: 'desc' } },
        approvals: { orderBy: { decidedAt: 'desc' } },
        workflowEvents: { orderBy: { createdAt: 'desc' }, take: 50 },
        controlLinks: { include: { control: { include: { mappings: true } } } },
        evidenceLinks: { include: { evidence: true } },
      },
    });
    if (!dpia) throw new NotFoundException('DPIA not found');

    const template = this.parseTemplate(dpia.template.document);
    const answers = (dpia.answers ?? {}) as Record<string, unknown>;
    const visibility = resolveVisibility(template, answers);

    return {
      ...dpia,
      template: { key: template.key, name: template.name, version: template.version },
      questionnaire: visibility,
      answers,
      availableTransitions: allowedTransitions(dpia.status as DpiaStatus, roles),
      editable: EDITABLE_STATUSES.includes(dpia.status as DpiaStatus),
    };
  }

  async update(orgId: string, id: string, dto: UpdateDpiaDto) {
    await this.getEditable(orgId, id);
    const dpia = await this.prisma.client.dpia.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        projectId: dto.projectId,
        dueDate: dto.dueDate,
      },
    });
    await this.audit.log({ action: 'UPDATE', entityType: 'Dpia', entityId: id });
    return dpia;
  }

  /** Merge a partial answer patch; recompute completeness; return new visibility. */
  async patchAnswers(orgId: string, id: string, patch: Record<string, unknown>) {
    const dpia = await this.getEditable(orgId, id, { template: true });
    const template = this.parseTemplate(dpia.template.document);

    const validKeys = new Set(template.sections.flatMap((s) => s.questions.map((q) => q.key)));
    for (const key of Object.keys(patch)) {
      if (!validKeys.has(key)) {
        throw new BadRequestException(`Unknown question key "${key}"`);
      }
    }

    const answers = { ...((dpia.answers ?? {}) as Record<string, unknown>) };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete answers[key];
      else answers[key] = value;
    }

    const visibility = resolveVisibility(template, answers);
    await this.prisma.client.dpia.update({
      where: { id },
      data: { answers: answers as object, completeness: visibility.completeness },
    });
    await this.audit.log({
      action: 'UPDATE',
      entityType: 'Dpia',
      entityId: id,
      metadata: { answeredKeys: Object.keys(patch) },
    });
    return { answers, questionnaire: visibility };
  }

  /** Workflow transition with server-side state machine + role enforcement. */
  async transition(orgId: string, id: string, userId: string, roles: Role[], dto: TransitionDto) {
    const dpia = await this.prisma.client.dpia.findFirst({
      where: { id, organisationId: orgId, deletedAt: null },
      include: { template: true },
    });
    if (!dpia) throw new NotFoundException('DPIA not found');

    const from = dpia.status as DpiaStatus;
    if (!canTransition(from, dto.to, roles)) {
      throw new ForbiddenException(`Transition ${from} → ${dto.to} not permitted for your role`);
    }
    const spec = allowedTransitions(from, roles).find((t) => t.to === dto.to);
    if (spec?.requiresComment && !dto.comment?.trim()) {
      throw new BadRequestException('This transition requires a comment');
    }

    if (dto.to === 'SUBMITTED') {
      const template = this.parseTemplate(dpia.template.document);
      const answers = (dpia.answers ?? {}) as Record<string, unknown>;
      const { missingRequired } = resolveVisibility(template, answers);
      if (missingRequired.length > 0) {
        throw new BadRequestException(
          `Cannot submit — ${missingRequired.length} required question(s) unanswered: ${missingRequired.slice(0, 5).join(', ')}${missingRequired.length > 5 ? '…' : ''}`,
        );
      }
    }

    const updated = await this.prisma.system.$transaction(async (tx) => {
      const u = await tx.dpia.update({
        where: { id },
        data: {
          status: dto.to,
          ...(dto.to === 'APPROVED'
            ? {
                approvedAt: new Date(),
                nextReviewAt: new Date(Date.now() + 365 * 86_400_000),
              }
            : {}),
        },
      });
      await tx.workflowEvent.create({
        data: {
          dpiaId: id,
          fromStatus: from,
          toStatus: dto.to,
          actorId: userId,
          comment: dto.comment,
        },
      });
      if (['APPROVED', 'REJECTED'].includes(dto.to)) {
        await tx.dpiaApproval.create({
          data: {
            dpiaId: id,
            stage: from,
            approverId: userId,
            decision: dto.to,
            comment: dto.comment,
          },
        });
      }
      return u;
    });

    // Risk engine runs on first submission and whenever content re-enters review.
    if (dto.to === 'SUBMITTED') {
      await this.evaluateRisks(orgId, id);
    }

    await this.audit.log({
      action: 'STATUS_CHANGE',
      entityType: 'Dpia',
      entityId: id,
      metadata: { from, to: dto.to },
    });
    return updated;
  }

  /** Re-run the automated risk assessment against the current answers + data flow. */
  async evaluateRisks(orgId: string, id: string) {
    const dpia = await this.prisma.client.dpia.findFirst({
      where: { id, organisationId: orgId, deletedAt: null },
      include: { template: true },
    });
    if (!dpia) throw new NotFoundException('DPIA not found');

    const template = this.parseTemplate(dpia.template.document);
    const facts = buildFactMap(template, (dpia.answers ?? {}) as Record<string, unknown>);

    if (dpia.dataFlow) {
      const flow = dpia.dataFlow as unknown as DataFlowDto & { findings?: unknown };
      if (Array.isArray(flow.nodes) && Array.isArray(flow.edges)) {
        const findings = analyseDataFlow({ nodes: flow.nodes, edges: flow.edges });
        facts.tags = [...new Set([...(facts.tags as string[]), ...dataFlowRiskTags(findings)])];
      }
    }
    if (dpia.classification) {
      const c = dpia.classification as Record<string, unknown>;
      facts['classification.specialCategory'] = c.specialCategory;
      facts['classification.childrenData'] = c.childrenData;
      facts['classification.aiProcessing'] = c.aiProcessing;
      facts['classification.automatedDecisionMaking'] = c.automatedDecisionMaking;
    }

    return this.risks.evaluateForDpia(orgId, id, facts);
  }

  // ── Data flow ─────────────────────────────────────────────────────────────

  async putDataFlow(orgId: string, id: string, flow: DataFlowDto) {
    await this.getEditable(orgId, id);
    const findings = analyseDataFlow(flow);
    await this.prisma.client.dpia.update({
      where: { id },
      data: { dataFlow: { ...flow, findings } as object },
    });
    await this.audit.log({ action: 'UPDATE', entityType: 'DpiaDataFlow', entityId: id });
    return { ...flow, findings };
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async addComment(orgId: string, id: string, userId: string, dto: CommentDto) {
    await this.assertExists(orgId, id);
    return this.prisma.system.dpiaComment.create({
      data: { dpiaId: id, authorId: userId, body: dto.body, questionKey: dto.questionKey },
    });
  }

  async listComments(orgId: string, id: string) {
    await this.assertExists(orgId, id);
    return this.prisma.system.dpiaComment.findMany({
      where: { dpiaId: id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async resolveComment(orgId: string, id: string, commentId: string) {
    await this.assertExists(orgId, id);
    await this.prisma.system.dpiaComment.updateMany({
      where: { id: commentId, dpiaId: id },
      data: { resolvedAt: new Date() },
    });
  }

  async softDelete(orgId: string, id: string) {
    await this.assertExists(orgId, id);
    await this.prisma.client.dpia.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ action: 'DELETE', entityType: 'Dpia', entityId: id });
  }

  /** Store an AI classification result against the DPIA (also merges suggested answers). */
  async attachClassification(orgId: string, id: string, classification: Record<string, unknown>) {
    await this.assertExists(orgId, id);
    await this.prisma.client.dpia.update({
      where: { id },
      data: { classification: classification as object },
    });
    const suggested = classification.suggestedAnswers as Record<string, unknown> | undefined;
    if (suggested && Object.keys(suggested).length > 0) {
      try {
        await this.patchAnswers(orgId, id, suggested);
      } catch {
        // Suggested answers are best-effort; ignore keys the template doesn't know.
      }
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private parseTemplate(document: unknown): QuestionnaireTemplate {
    return questionnaireTemplateSchema.parse(document);
  }

  private async assertExists(orgId: string, id: string) {
    const found = await this.prisma.client.dpia.findFirst({
      where: { id, organisationId: orgId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!found) throw new NotFoundException('DPIA not found');
    return found;
  }

  private async getEditable<I extends Prisma.DpiaInclude>(
    orgId: string,
    id: string,
    include?: I,
  ): Promise<Prisma.DpiaGetPayload<{ include: I }>> {
    const dpia = await this.prisma.client.dpia.findFirst({
      where: { id, organisationId: orgId, deletedAt: null },
      ...(include ? { include } : {}),
    });
    if (!dpia) throw new NotFoundException('DPIA not found');
    if (!EDITABLE_STATUSES.includes(dpia.status as DpiaStatus)) {
      throw new BadRequestException(
        `DPIA is ${dpia.status} — return it to DRAFT before editing content`,
      );
    }
    // The conditional `include` spread above means Prisma infers the base
    // Dpia type here regardless of I — this cast restores the caller-facing
    // generic type, which is accurate for what was actually queried.
    return dpia as Prisma.DpiaGetPayload<{ include: I }>;
  }
}
