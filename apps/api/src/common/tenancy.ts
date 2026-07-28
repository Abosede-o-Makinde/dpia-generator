import { AsyncLocalStorage } from 'node:async_hooks';
import type { Role } from '@shieldwise/shared';

/**
 * Per-request tenant context, established by TenantContextMiddleware and
 * populated by the auth/org guards. The Prisma tenant extension reads this
 * store to enforce organisation scoping on every query (defence layer 2 of 3
 * — explicit service filters are layer 1, Postgres RLS is layer 3).
 */
export interface TenantStore {
  orgId: string | null;
  userId: string | null;
  roles: Role[];
  requestId: string;
  ip?: string;
  userAgent?: string;
  /** True only for system paths (seeds, auth bootstrap) that legitimately cross tenants. */
  bypassTenant: boolean;
}

export const tenantContext = new AsyncLocalStorage<TenantStore>();

export function currentTenant(): TenantStore | undefined {
  return tenantContext.getStore();
}

export function requireOrgId(): string {
  const store = tenantContext.getStore();
  if (!store?.orgId) throw new Error('No organisation in tenant context');
  return store.orgId;
}
