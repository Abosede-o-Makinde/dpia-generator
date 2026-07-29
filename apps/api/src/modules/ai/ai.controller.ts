import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import {
  CurrentOrg,
  CurrentUser,
  type AuthPrincipal,
  type OrgContext,
} from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { AiService } from './ai.service';

const classifySchema = z.object({
  description: z.string().min(20).max(20_000),
  dpiaId: z.string().uuid().optional(),
});

const chatSchema = z.object({
  message: z.string().min(1).max(20_000),
  conversationId: z.string().uuid().optional(),
  dpiaId: z.string().uuid().optional(),
});

const improveSchema = z.object({
  dpiaId: z.string().uuid(),
  questionKey: z.string().min(1),
  draft: z.string().min(1).max(20_000),
});

@ApiTags('ai')
@ApiBearerAuth()
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('classify')
  @ApiOperation({
    summary: 'Classify a processing activity and determine whether a DPIA is required',
  })
  classify(
    @CurrentOrg() org: OrgContext,
    @Body(new ZodPipe(classifySchema)) dto: z.infer<typeof classifySchema>,
  ) {
    return this.ai.classify(org.orgId, dto.description, dto.dpiaId);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Privacy assistant chat (per-DPIA context aware)' })
  chat(
    @CurrentOrg() org: OrgContext,
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodPipe(chatSchema)) dto: z.infer<typeof chatSchema>,
  ) {
    return this.ai.chat(org.orgId, user.userId, dto.message, dto.conversationId, dto.dpiaId);
  }

  @Get('conversations')
  listConversations(@CurrentOrg() org: OrgContext, @CurrentUser() user: AuthPrincipal) {
    return this.ai.listConversations(org.orgId, user.userId);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @CurrentOrg() org: OrgContext,
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
  ) {
    return this.ai.getMessages(org.orgId, user.userId, id);
  }

  @Post('improve-answer')
  @ApiOperation({ summary: 'AI critique + improved draft for a questionnaire answer' })
  improveAnswer(
    @CurrentOrg() org: OrgContext,
    @Body(new ZodPipe(improveSchema)) dto: z.infer<typeof improveSchema>,
  ) {
    return this.ai.improveAnswer(org.orgId, dto.dpiaId, dto.questionKey, dto.draft);
  }

  @Post('executive-summary/:dpiaId')
  @ApiOperation({ summary: 'Generate an executive summary for a DPIA' })
  executiveSummary(@CurrentOrg() org: OrgContext, @Param('dpiaId') dpiaId: string) {
    return this.ai.executiveSummary(org.orgId, dpiaId);
  }
}
