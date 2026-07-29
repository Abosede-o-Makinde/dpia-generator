import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentOrg, RequireRoles, type OrgContext } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { RisksService } from './risks.service';
import {
  controlStatusSchema,
  createRiskSchema,
  listRisksSchema,
  updateRiskSchema,
  type ControlStatusDto,
  type CreateRiskDto,
  type ListRisksDto,
  type UpdateRiskDto,
} from './dto';

@ApiTags('risks')
@ApiBearerAuth()
@Controller({ path: 'risks', version: '1' })
export class RisksController {
  constructor(private readonly risks: RisksService) {}

  @Get()
  list(@CurrentOrg() org: OrgContext, @Query(new ZodPipe(listRisksSchema)) q: ListRisksDto) {
    return this.risks.list(org.orgId, q);
  }

  @Post()
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'SECURITY_REVIEWER')
  createManual(
    @CurrentOrg() org: OrgContext,
    @Body(new ZodPipe(createRiskSchema)) dto: CreateRiskDto,
  ) {
    return this.risks.createManual(org.orgId, dto);
  }

  @Patch(':id')
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'SECURITY_REVIEWER')
  update(
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
    @Body(new ZodPipe(updateRiskSchema)) dto: UpdateRiskDto,
  ) {
    return this.risks.update(org.orgId, id, dto);
  }

  @Put(':id/controls/:controlId/status')
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'SECURITY_REVIEWER')
  setControlStatus(
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
    @Param('controlId') controlId: string,
    @Body(new ZodPipe(controlStatusSchema)) dto: ControlStatusDto,
  ) {
    return this.risks.setControlStatus(org.orgId, id, controlId, dto.status);
  }
}
