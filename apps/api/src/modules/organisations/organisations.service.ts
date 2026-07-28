import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AddMemberDto, CreateProjectDto, UpdateMemberDto, UpdateOrgDto } from './dto';

@Injectable()
export class OrganisationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** All organisations the user belongs to (used by the org switcher). */
  async myOrganisations(userId: string) {
    const memberships = await this.prisma.system.membership.findMany({
      where: { userId, organisation: { deletedAt: null } },
      include: { organisation: { select: { id: true, name: true, slug: true, industry: true } } },
    });
    return memberships.map((m) => ({ ...m.organisation, role: m.role }));
  }

  async getCurrent(orgId: string) {
    const org = await this.prisma.system.organisation.findFirst({
      where: { id: orgId, deletedAt: null },
      include: {
        _count: { select: { memberships: true, dpias: true, risks: true } },
      },
    });
    if (!org) throw new NotFoundException('Organisation not found');
    return org;
  }

  async update(orgId: string, dto: UpdateOrgDto) {
    const org = await this.prisma.system.organisation.update({
      where: { id: orgId },
      data: {
        name: dto.name,
        industry: dto.industry,
        ...(dto.settings ? { settings: dto.settings as object } : {}),
      },
    });
    await this.audit.log({ action: 'UPDATE', entityType: 'Organisation', entityId: orgId });
    return org;
  }

  // ── Departments & teams ───────────────────────────────────────────────────

  listDepartments(orgId: string) {
    return this.prisma.client.department.findMany({
      where: { organisationId: orgId, deletedAt: null },
      include: { teams: { where: { deletedAt: null } } },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(orgId: string, name: string) {
    const dep = await this.prisma.client.department.create({
      data: { organisationId: orgId, name },
    });
    await this.audit.log({ action: 'CREATE', entityType: 'Department', entityId: dep.id });
    return dep;
  }

  async deleteDepartment(orgId: string, id: string) {
    await this.prisma.client.department.updateMany({
      where: { id, organisationId: orgId },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({ action: 'DELETE', entityType: 'Department', entityId: id });
  }

  async createTeam(orgId: string, departmentId: string, name: string) {
    const dep = await this.prisma.client.department.findFirst({
      where: { id: departmentId, organisationId: orgId, deletedAt: null },
    });
    if (!dep) throw new NotFoundException('Department not found');
    return this.prisma.system.team.create({ data: { departmentId, name } });
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  listProjects(orgId: string) {
    return this.prisma.client.project.findMany({
      where: { organisationId: orgId, deletedAt: null },
      include: { _count: { select: { dpias: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createProject(orgId: string, dto: CreateProjectDto) {
    const project = await this.prisma.client.project.create({
      data: {
        organisationId: orgId,
        name: dto.name,
        description: dto.description,
        departmentId: dto.departmentId,
      },
    });
    await this.audit.log({ action: 'CREATE', entityType: 'Project', entityId: project.id });
    return project;
  }

  async deleteProject(orgId: string, id: string) {
    await this.prisma.client.project.updateMany({
      where: { id, organisationId: orgId },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({ action: 'DELETE', entityType: 'Project', entityId: id });
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async listMembers(orgId: string) {
    const members = await this.prisma.system.membership.findMany({
      where: { organisationId: orgId },
      include: {
        user: { select: { id: true, email: true, displayName: true, lastLoginAt: true } },
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return members;
  }

  /** Adds an existing platform user to the organisation by email. */
  async addMember(orgId: string, dto: AddMemberDto) {
    const user = await this.prisma.system.user.findUnique({ where: { email: dto.email } });
    if (!user || user.deletedAt) {
      throw new NotFoundException(
        'No platform account with that email — ask them to sign up first',
      );
    }
    const existing = await this.prisma.system.membership.findUnique({
      where: { organisationId_userId: { organisationId: orgId, userId: user.id } },
    });
    if (existing) throw new ConflictException('Already a member');

    const membership = await this.prisma.system.membership.create({
      data: {
        organisationId: orgId,
        userId: user.id,
        role: dto.role,
        departmentId: dto.departmentId,
        teamId: dto.teamId,
      },
    });
    await this.audit.log({
      action: 'PERMISSION_CHANGE',
      entityType: 'Membership',
      entityId: membership.id,
      metadata: { email: dto.email, role: dto.role, change: 'added' },
    });
    return membership;
  }

  async updateMember(orgId: string, membershipId: string, dto: UpdateMemberDto) {
    const membership = await this.prisma.system.membership.findFirst({
      where: { id: membershipId, organisationId: orgId },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    await this.assertNotLastOwner(orgId, membership.userId, membership.role, dto.role);

    const updated = await this.prisma.system.membership.update({
      where: { id: membershipId },
      data: { role: dto.role },
    });
    await this.audit.log({
      action: 'PERMISSION_CHANGE',
      entityType: 'Membership',
      entityId: membershipId,
      metadata: { from: membership.role, to: dto.role },
    });
    return updated;
  }

  async removeMember(orgId: string, membershipId: string) {
    const membership = await this.prisma.system.membership.findFirst({
      where: { id: membershipId, organisationId: orgId },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    await this.assertNotLastOwner(orgId, membership.userId, membership.role, null);

    await this.prisma.system.membership.delete({ where: { id: membershipId } });
    await this.audit.log({
      action: 'PERMISSION_CHANGE',
      entityType: 'Membership',
      entityId: membershipId,
      metadata: { change: 'removed' },
    });
  }

  private async assertNotLastOwner(
    orgId: string,
    _userId: string,
    currentRole: string,
    nextRole: string | null,
  ): Promise<void> {
    if (currentRole !== 'OWNER' || nextRole === 'OWNER') return;
    const owners = await this.prisma.system.membership.count({
      where: { organisationId: orgId, role: 'OWNER' },
    });
    if (owners <= 1) {
      throw new BadRequestException('Cannot demote or remove the last organisation owner');
    }
  }
}
