import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '@shieldwise/shared';
import { IS_PUBLIC_KEY, SKIP_ORG_KEY, type AuthPrincipal, type OrgContext } from '../decorators';
import { PrismaService } from '../prisma/prisma.service';
import { currentTenant } from '../tenancy';

/**
 * Resolves the organisation for the request:
 *  - `X-Organisation-Id` header when present (must be a membership), else
 *  - the user's sole membership.
 * Populates the tenant store consumed by the Prisma tenant extension.
 */
@Injectable()
export class OrgContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ||
      this.reflector.getAllAndOverride<boolean>(SKIP_ORG_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    if (skip) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { principal?: AuthPrincipal; orgContext?: OrgContext }>();
    const principal = req.principal;
    if (!principal) return true; // AuthGuard already rejected unauthenticated traffic.

    const requested = req.headers['x-organisation-id'] as string | undefined;
    const memberships = await this.prisma.system.membership.findMany({
      where: { userId: principal.userId, organisation: { deletedAt: null } },
    });
    if (memberships.length === 0) {
      throw new ForbiddenException('User does not belong to any organisation');
    }

    const membership = requested
      ? memberships.find((m) => m.organisationId === requested)
      : memberships.length === 1
        ? memberships[0]
        : undefined;

    if (!membership) {
      throw new ForbiddenException(
        requested
          ? 'Not a member of the requested organisation'
          : 'Multiple organisations — set the X-Organisation-Id header',
      );
    }

    const orgContext: OrgContext = {
      orgId: membership.organisationId,
      roles: [membership.role as Role],
    };
    req.orgContext = orgContext;

    const store = currentTenant();
    if (store) {
      store.orgId = orgContext.orgId;
      store.roles = orgContext.roles;
    }
    return true;
  }
}
