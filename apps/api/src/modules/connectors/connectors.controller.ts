import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CONNECTOR_PROVIDERS } from '@shieldwise/shared';
import type { ConnectorProvider } from '@prisma/client';
import { CurrentOrg, RequireRoles, type OrgContext } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { ConnectorsService } from './connectors.service';

const createConnectorSchema = z.object({
  provider: z.enum(CONNECTOR_PROVIDERS),
  name: z.string().min(1).max(120),
  config: z.record(z.unknown()).default({}),
});

const scanSchema = z.object({
  files: z
    .array(z.object({ path: z.string().min(1).max(500), content: z.string().max(1_000_000) }))
    .max(200)
    .default([]),
});

@ApiTags('connectors')
@ApiBearerAuth()
@Controller({ path: 'connectors', version: '1' })
export class ConnectorsController {
  constructor(private readonly connectors: ConnectorsService) {}

  @Get('providers')
  providers() {
    return { implemented: this.connectors.supportedProviders(), declared: CONNECTOR_PROVIDERS };
  }

  @Get()
  list(@CurrentOrg() org: OrgContext) {
    return this.connectors.list(org.orgId);
  }

  @Post()
  @RequireRoles('OWNER', 'ADMIN', 'SECURITY_REVIEWER', 'PRIVACY_ENGINEER')
  create(
    @CurrentOrg() org: OrgContext,
    @Body(new ZodPipe(createConnectorSchema)) dto: z.infer<typeof createConnectorSchema>,
  ) {
    return this.connectors.create(
      org.orgId,
      dto.provider as ConnectorProvider,
      dto.name,
      dto.config,
    );
  }

  @Delete(':id')
  @RequireRoles('OWNER', 'ADMIN')
  @HttpCode(204)
  remove(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.connectors.remove(org.orgId, id);
  }

  @Post(':id/scan')
  @RequireRoles('OWNER', 'ADMIN', 'SECURITY_REVIEWER', 'PRIVACY_ENGINEER')
  @ApiOperation({
    summary: 'Run a scan (static providers take files; live providers use stored credentials)',
  })
  scan(
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
    @Body(new ZodPipe(scanSchema)) dto: z.infer<typeof scanSchema>,
  ) {
    return this.connectors.scan(org.orgId, id, dto.files);
  }

  @Get('scans/:scanId')
  findings(@CurrentOrg() org: OrgContext, @Param('scanId') scanId: string) {
    return this.connectors.findings(org.orgId, scanId);
  }

  @Post('scans/:scanId/prefill/:dpiaId')
  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER')
  @ApiOperation({ summary: 'Pre-populate DPIA answers from scan findings' })
  prefill(
    @CurrentOrg() org: OrgContext,
    @Param('scanId') scanId: string,
    @Param('dpiaId') dpiaId: string,
  ) {
    return this.connectors.prefillDpia(org.orgId, scanId, dpiaId);
  }
}
