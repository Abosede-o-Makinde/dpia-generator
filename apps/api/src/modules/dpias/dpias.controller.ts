import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrg,
  CurrentUser,
  RequireRoles,
  type AuthPrincipal,
  type OrgContext,
} from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { DpiasService } from './dpias.service';
import {
  commentSchema,
  createDpiaSchema,
  dataFlowSchema,
  listDpiasSchema,
  patchAnswersSchema,
  transitionSchema,
  updateDpiaSchema,
  type CommentDto,
  type CreateDpiaDto,
  type DataFlowDto,
  type ListDpiasDto,
  type PatchAnswersDto,
  type TransitionDto,
  type UpdateDpiaDto,
} from './dto';

@ApiTags('dpias')
@ApiBearerAuth()
@Controller({ path: 'dpias', version: '1' })
export class DpiasController {
  constructor(private readonly dpias: DpiasService) {}

  @Post()
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'CONTRIBUTOR')
  @ApiOperation({ summary: 'Create a DPIA from a questionnaire template' })
  create(
    @CurrentOrg() org: OrgContext,
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodPipe(createDpiaSchema)) dto: CreateDpiaDto,
  ) {
    return this.dpias.create(org.orgId, user.userId, dto);
  }

  @Get()
  list(@CurrentOrg() org: OrgContext, @Query(new ZodPipe(listDpiasSchema)) q: ListDpiasDto) {
    return this.dpias.list(org.orgId, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'DPIA detail with visibility-resolved questionnaire' })
  get(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.dpias.get(org.orgId, id, org.roles);
  }

  @Patch(':id')
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'CONTRIBUTOR')
  update(
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
    @Body(new ZodPipe(updateDpiaSchema)) dto: UpdateDpiaDto,
  ) {
    return this.dpias.update(org.orgId, id, dto);
  }

  @Patch(':id/answers')
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'CONTRIBUTOR')
  @ApiOperation({ summary: 'Save a partial answer patch (draft autosave)' })
  patchAnswers(
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
    @Body(new ZodPipe(patchAnswersSchema)) dto: PatchAnswersDto,
  ) {
    return this.dpias.patchAnswers(org.orgId, id, dto.answers);
  }

  @Post(':id/transition')
  @ApiOperation({ summary: 'Move the DPIA through the approval workflow' })
  transition(
    @CurrentOrg() org: OrgContext,
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodPipe(transitionSchema)) dto: TransitionDto,
  ) {
    return this.dpias.transition(org.orgId, id, user.userId, org.roles, dto);
  }

  @Post(':id/evaluate-risks')
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER')
  @ApiOperation({ summary: 'Re-run the automated risk assessment' })
  evaluateRisks(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.dpias.evaluateRisks(org.orgId, id);
  }

  @Put(':id/data-flow')
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'CONTRIBUTOR')
  @ApiOperation({ summary: 'Save the data-flow model; returns automated findings' })
  putDataFlow(
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
    @Body(new ZodPipe(dataFlowSchema)) dto: DataFlowDto,
  ) {
    return this.dpias.putDataFlow(org.orgId, id, dto);
  }

  @Get(':id/comments')
  listComments(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.dpias.listComments(org.orgId, id);
  }

  @Post(':id/comments')
  addComment(
    @CurrentOrg() org: OrgContext,
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body(new ZodPipe(commentSchema)) dto: CommentDto,
  ) {
    return this.dpias.addComment(org.orgId, id, user.userId, dto);
  }

  @Post(':id/comments/:commentId/resolve')
  @HttpCode(204)
  resolveComment(
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.dpias.resolveComment(org.orgId, id, commentId);
  }

  @Delete(':id')
  @RequireRoles('OWNER', 'ADMIN', 'DPO')
  @HttpCode(204)
  remove(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.dpias.softDelete(org.orgId, id);
  }
}
