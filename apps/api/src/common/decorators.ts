import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@shieldwise/shared';
import type { Request } from 'express';

export const IS_PUBLIC_KEY = 'shieldwise:public';
/** Marks a route as unauthenticated (login, health, etc.). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'shieldwise:roles';
/** Restricts a route to the given organisation roles. */
export const RequireRoles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const SKIP_ORG_KEY = 'shieldwise:skip-org';
/** Routes that operate outside an organisation context (profile, org list). */
export const NoOrgContext = () => SetMetadata(SKIP_ORG_KEY, true);

export interface AuthPrincipal {
  userId: string;
  email: string;
  displayName: string;
  /** 'user' for interactive sessions, 'api_token' for PATs. */
  kind: 'user' | 'api_token';
  tokenScopes?: string[];
}

export interface OrgContext {
  orgId: string;
  roles: Role[];
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request & { principal?: AuthPrincipal }>();
  return req.principal;
});

export const CurrentOrg = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request & { orgContext?: OrgContext }>();
  return req.orgContext;
});
