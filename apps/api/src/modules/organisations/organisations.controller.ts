import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  CurrentOrg,
  CurrentUser,
  NoOrgContext,
  RequireRoles,
  type AuthPrincipal,
  type OrgContext,
} from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { OrganisationsService } from './organisations.service';
import {
  addMemberSchema,
  createDepartmentSchema,
  createProjectSchema,
  createTeamSchema,
  updateMemberSchema,
  updateOrgSchema,
  type AddMemberDto,
  type CreateProjectDto,
  type UpdateMemberDto,
  type UpdateOrgDto,
} from './dto';

@ApiTags('organisations')
@ApiBearerAuth()
@Controller({ path: 'orgs', version: '1' })
export class OrganisationsController {
  constructor(private readonly orgs: OrganisationsService) {}

  @NoOrgContext()
  @Get()
  myOrganisations(@CurrentUser() user: AuthPrincipal) {
    return this.orgs.myOrganisations(user.userId);
  }

  @Get('current')
  current(@CurrentOrg() org: OrgContext) {
    return this.orgs.getCurrent(org.orgId);
  }

  @RequireRoles('OWNER', 'ADMIN')
  @Patch('current')
  update(@CurrentOrg() org: OrgContext, @Body(new ZodPipe(updateOrgSchema)) dto: UpdateOrgDto) {
    return this.orgs.update(org.orgId, dto);
  }

  // ── Departments & teams ───────────────────────────────────────────────────

  @Get('departments')
  listDepartments(@CurrentOrg() org: OrgContext) {
    return this.orgs.listDepartments(org.orgId);
  }

  @RequireRoles('OWNER', 'ADMIN')
  @Post('departments')
  createDepartment(
    @CurrentOrg() org: OrgContext,
    @Body(new ZodPipe(createDepartmentSchema)) dto: { name: string },
  ) {
    return this.orgs.createDepartment(org.orgId, dto.name);
  }

  @RequireRoles('OWNER', 'ADMIN')
  @Delete('departments/:id')
  @HttpCode(204)
  deleteDepartment(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.orgs.deleteDepartment(org.orgId, id);
  }

  @RequireRoles('OWNER', 'ADMIN')
  @Post('teams')
  createTeam(
    @CurrentOrg() org: OrgContext,
    @Body(new ZodPipe(createTeamSchema)) dto: z.infer<typeof createTeamSchema>,
  ) {
    return this.orgs.createTeam(org.orgId, dto.departmentId, dto.name);
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  @Get('projects')
  listProjects(@CurrentOrg() org: OrgContext) {
    return this.orgs.listProjects(org.orgId);
  }

  @RequireRoles('OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER')
  @Post('projects')
  createProject(
    @CurrentOrg() org: OrgContext,
    @Body(new ZodPipe(createProjectSchema)) dto: CreateProjectDto,
  ) {
    return this.orgs.createProject(org.orgId, dto);
  }

  @RequireRoles('OWNER', 'ADMIN')
  @Delete('projects/:id')
  @HttpCode(204)
  deleteProject(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.orgs.deleteProject(org.orgId, id);
  }

  // ── Members ───────────────────────────────────────────────────────────────

  @Get('members')
  listMembers(@CurrentOrg() org: OrgContext) {
    return this.orgs.listMembers(org.orgId);
  }

  @RequireRoles('OWNER', 'ADMIN')
  @Post('members')
  addMember(@CurrentOrg() org: OrgContext, @Body(new ZodPipe(addMemberSchema)) dto: AddMemberDto) {
    return this.orgs.addMember(org.orgId, dto);
  }

  @RequireRoles('OWNER', 'ADMIN')
  @Patch('members/:id')
  updateMember(
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
    @Body(new ZodPipe(updateMemberSchema)) dto: UpdateMemberDto,
  ) {
    return this.orgs.updateMember(org.orgId, id, dto);
  }

  @RequireRoles('OWNER', 'ADMIN')
  @Delete('members/:id')
  @HttpCode(204)
  removeMember(@CurrentOrg() org: OrgContext, @Param('id') id: string) {
    return this.orgs.removeMember(org.orgId, id);
  }
}
