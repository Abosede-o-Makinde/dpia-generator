import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentOrg, type OrgContext } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Executive dashboard aggregates (KPIs, heat map, trends)' })
  dashboard(@CurrentOrg() org: OrgContext) {
    return this.analytics.dashboard(org.orgId);
  }
}
