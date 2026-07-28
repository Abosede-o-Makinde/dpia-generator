import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { tenantContext, type TenantStore } from '../tenancy';

/**
 * Opens the AsyncLocalStorage tenant scope for the whole request lifecycle.
 * The store starts empty; auth/org guards mutate it (same object reference)
 * once the principal and organisation are resolved.
 * Also assigns the correlation id surfaced in responses, logs and audit rows.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('X-Request-Id', requestId);

    const store: TenantStore = {
      orgId: null,
      userId: null,
      roles: [],
      requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      bypassTenant: false,
    };
    (req as Request & { tenantStore: TenantStore }).tenantStore = store;
    tenantContext.run(store, next);
  }
}
