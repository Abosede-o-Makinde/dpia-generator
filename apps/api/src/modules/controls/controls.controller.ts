import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentOrg, RequireRoles, type OrgContext } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { controlStatusSchema, type ControlStatusDto } from '../risks/dto';
import { ControlsService } from './controls.service';

const listQuerySchema = z.object({
  framework: z.string().optional(),
  search: z.string().max(200).optional(),
});

@ApiTags('controls')
@ApiBearerAuth()
@Controller({ path: 'controls', version: '1' })
export class ControlsController {
  constructor(private readonly controls: ControlsService) {}

  @Get()
  @ApiOperation({ summary: 'Control catalogue with framework mappings' })
  list(
    @CurrentOrg() org: OrgContext,
    @Query(new ZodPipe(listQuerySchema)) q: z.infer<typeof listQuerySchema>,
  ) {
    return this.controls.list(org.orgId, q.framework, q.search);
  }

  @Get('compliance-summary')
  @ApiOperation({ summary: 'Per-framework control coverage and gaps' })
  complianceSummary(@CurrentOrg() org: OrgContext) {
    return this.controls.complianceSummary(org.orgId);
  }

  @Get('recommendations/:dpiaId')
  @ApiOperation({ summary: 'Controls recommended for a DPIA, ranked by risk coverage' })
  recommendations(@CurrentOrg() org: OrgContext, @Param('dpiaId') dpiaId: string) {
    return this.controls.recommendationsForDpia(org.orgId, dpiaId);
  }

  @Get(':id')
  get(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.controls.get(org.orgId, id);
  }

  @Put('dpia/:dpiaId/:controlId/status')
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'SECURITY_REVIEWER')
  applyToDpia(
    @CurrentOrg() org: OrgContext,
    @Param('dpiaId') dpiaId: string,
    @Param('controlId') controlId: string,
    @Body(new ZodPipe(controlStatusSchema)) dto: ControlStatusDto,
  ) {
    return this.controls.applyToDpia(org.orgId, dpiaId, controlId, dto.status);
  }
}
