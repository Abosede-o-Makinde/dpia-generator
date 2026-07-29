import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { EVIDENCE_TYPES } from '@shieldwise/shared';
import type { EvidenceType } from '@prisma/client';
import {
  CurrentOrg,
  CurrentUser,
  RequireRoles,
  type AuthPrincipal,
  type OrgContext,
} from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { config } from '../../common/config';
import { EvidenceService } from './evidence.service';

const uploadMetaSchema = z.object({
  type: z.enum(EVIDENCE_TYPES).default('OTHER'),
  description: z.string().max(2000).optional(),
});

const listQuerySchema = z.object({ type: z.enum(EVIDENCE_TYPES).optional() });

@ApiTags('evidence')
@ApiBearerAuth()
@Controller({ path: 'evidence', version: '1' })
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Post()
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'SECURITY_REVIEWER', 'CONTRIBUTOR')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: config().MAX_UPLOAD_BYTES } }))
  upload(
    @CurrentOrg() org: OrgContext,
    @CurrentUser() user: AuthPrincipal,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodPipe(uploadMetaSchema)) meta: z.infer<typeof uploadMetaSchema>,
  ) {
    return this.evidence.upload(
      org.orgId,
      user.userId,
      file,
      meta.type as EvidenceType,
      meta.description,
    );
  }

  @Get()
  list(
    @CurrentOrg() org: OrgContext,
    @Query(new ZodPipe(listQuerySchema)) q: z.infer<typeof listQuerySchema>,
  ) {
    return this.evidence.list(org.orgId, q.type as EvidenceType | undefined);
  }

  @Get(':id/download')
  download(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.evidence.download(org.orgId, id);
  }

  @Post(':id/link/dpia/:dpiaId')
  linkToDpia(
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
    @Param('dpiaId') dpiaId: string,
  ) {
    return this.evidence.linkToDpia(org.orgId, id, dpiaId);
  }

  @Post(':id/link/control/:controlId')
  linkToControl(
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
    @Param('controlId') controlId: string,
  ) {
    return this.evidence.linkToControl(org.orgId, id, controlId);
  }

  @Delete(':id')
  @RequireRoles('OWNER', 'ADMIN', 'DPO')
  @HttpCode(204)
  remove(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.evidence.softDelete(org.orgId, id);
  }
}
