import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import {
  CurrentOrg,
  CurrentUser,
  type AuthPrincipal,
  type OrgContext,
} from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { ReportsService, type ReportFormat } from './reports.service';
import type { ReportTemplateKey } from './report-model';

const generateSchema = z.object({
  format: z.enum(['pdf', 'docx', 'html', 'md', 'csv', 'json']).default('pdf'),
  template: z
    .enum(['dpia-full', 'ico', 'board', 'dpo', 'audit', 'executive-summary'])
    .default('dpia-full'),
});

@ApiTags('reports')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('dpia/:dpiaId')
  @ApiOperation({ summary: 'Generate a DPIA report (pdf/docx/html/md/csv/json)' })
  async generate(
    @CurrentOrg() org: OrgContext,
    @CurrentUser() user: AuthPrincipal,
    @Param('dpiaId') dpiaId: string,
    @Body(new ZodPipe(generateSchema)) dto: z.infer<typeof generateSchema>,
    @Res() res: Response,
  ) {
    const report = await this.reports.generate(
      org.orgId,
      dpiaId,
      dto.format as ReportFormat,
      dto.template as ReportTemplateKey,
      user.userId,
    );
    res
      .setHeader('Content-Type', report.contentType)
      .setHeader('Content-Disposition', `attachment; filename="${report.filename}"`)
      .send(report.body);
  }

  @Get('exports')
  listExports(@CurrentOrg() org: OrgContext) {
    return this.reports.listExports(org.orgId);
  }
}
