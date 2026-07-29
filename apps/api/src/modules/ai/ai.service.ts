import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DpiasService } from '../dpias/dpias.service';
import { AiClientService, type AiChatMessage } from './ai-client.service';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: AiClientService,
    private readonly dpias: DpiasService,
    private readonly audit: AuditService,
  ) {}

  /** Classify a plain-language processing description; optionally attach to a DPIA. */
  async classify(orgId: string, description: string, dpiaId?: string) {
    const result = await this.client.classify(description);
    if (dpiaId) {
      await this.dpias.attachClassification(orgId, dpiaId, result);
    }
    await this.audit.log({
      action: 'AI_INVOCATION',
      entityType: dpiaId ? 'Dpia' : 'Classification',
      entityId: dpiaId,
      metadata: { operation: 'classify', dpiaRequired: result.dpiaRequired },
    });
    return result;
  }

  /** Conversational assistant with per-DPIA context and persisted history. */
  async chat(
    orgId: string,
    userId: string,
    message: string,
    conversationId?: string,
    dpiaId?: string,
  ) {
    const conversation = conversationId
      ? await this.getConversation(orgId, userId, conversationId)
      : await this.prisma.client.aiConversation.create({
          data: {
            organisationId: orgId,
            userId,
            dpiaId,
            title: message.slice(0, 80),
          },
        });

    const history = await this.prisma.system.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });

    const context = conversation.dpiaId
      ? await this.dpiaContext(orgId, conversation.dpiaId)
      : undefined;

    const messages: AiChatMessage[] = [
      ...history.map((m) => ({ role: m.role as AiChatMessage['role'], content: m.content })),
      { role: 'user', content: message },
    ];

    const result = await this.client.chat(messages, context);

    await this.prisma.system.$transaction([
      this.prisma.system.aiMessage.create({
        data: { conversationId: conversation.id, role: 'user', content: message },
      }),
      this.prisma.system.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: result.reply,
          metadata: { model: result.model, usage: result.usage ?? {} } as object,
        },
      }),
    ]);

    await this.audit.log({
      action: 'AI_INVOCATION',
      entityType: 'AiConversation',
      entityId: conversation.id,
      metadata: { operation: 'chat', model: result.model },
    });
    return { conversationId: conversation.id, reply: result.reply, model: result.model };
  }

  async listConversations(orgId: string, userId: string) {
    return this.prisma.client.aiConversation.findMany({
      where: { organisationId: orgId, userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, dpiaId: true, updatedAt: true },
    });
  }

  async getMessages(orgId: string, userId: string, conversationId: string) {
    await this.getConversation(orgId, userId, conversationId);
    return this.prisma.system.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Improve/critique a questionnaire answer draft. */
  async improveAnswer(orgId: string, dpiaId: string, questionKey: string, draft: string) {
    const context = await this.dpiaContext(orgId, dpiaId);
    const questions = context.questions as Array<{ key: string; label: string; aiHint?: string }>;
    const question = questions.find((q) => q.key === questionKey);
    if (!question) throw new NotFoundException('Question not found in template');

    const result = await this.client.improveAnswer(
      `${question.label}${question.aiHint ? `\nGuidance: ${question.aiHint}` : ''}`,
      draft,
      { title: context.title, description: context.description },
    );
    await this.audit.log({
      action: 'AI_INVOCATION',
      entityType: 'Dpia',
      entityId: dpiaId,
      metadata: { operation: 'improve', questionKey },
    });
    return result;
  }

  async executiveSummary(orgId: string, dpiaId: string) {
    const context = await this.dpiaContext(orgId, dpiaId);
    const result = await this.client.executiveSummary(context);
    await this.audit.log({
      action: 'AI_INVOCATION',
      entityType: 'Dpia',
      entityId: dpiaId,
      metadata: { operation: 'executive-summary' },
    });
    return result;
  }

  /** Compact DPIA context passed to the LLM (data minimisation: no free-text PII scrubbing here — see privacy model). */
  private async dpiaContext(orgId: string, dpiaId: string): Promise<Record<string, unknown>> {
    const dpia = await this.prisma.client.dpia.findFirst({
      where: { id: dpiaId, organisationId: orgId, deletedAt: null },
      include: {
        template: true,
        risks: {
          where: { deletedAt: null },
          select: { title: true, residualLevel: true, category: true },
          orderBy: { residualScore: 'desc' },
          take: 20,
        },
      },
    });
    if (!dpia) throw new NotFoundException('DPIA not found');

    const doc = dpia.template.document as {
      sections: Array<{ questions: Array<{ key: string; label: string; aiHint?: string }> }>;
    };
    return {
      title: dpia.title,
      description: dpia.description,
      status: dpia.status,
      reference: dpia.reference,
      answers: dpia.answers,
      risks: dpia.risks,
      questions: doc.sections.flatMap((s) => s.questions),
    };
  }

  private async getConversation(orgId: string, userId: string, id: string) {
    const conversation = await this.prisma.client.aiConversation.findFirst({
      where: { id, organisationId: orgId, userId, deletedAt: null },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }
}
