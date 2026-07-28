import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { currentTenant } from '../tenancy';

/**
 * Tenant-aware Prisma service.
 *
 * Layer 2 of the isolation stack: every query against a tenant-scoped model
 * is automatically constrained to the organisation in the current request
 * context. Services still filter explicitly (layer 1) and Postgres RLS backs
 * both up (layer 3).
 *
 * Append-only guarantees: update/delete operations on AuditLog and
 * WorkflowEvent are rejected here regardless of tenant.
 */

/** Models carrying a direct organisationId column. */
const TENANT_MODELS = new Set<string>([
  'Department',
  'Project',
  'Membership',
  'Dpia',
  'Risk',
  'Evidence',
  'Connector',
  'AiConversation',
  'ReportExport',
  'ApiToken',
  'AuditLog',
]);

const APPEND_ONLY_MODELS = new Set<string>(['AuditLog', 'WorkflowEvent']);
const WRITE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany', 'upsert']);
const WHERE_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

type Ext = ReturnType<typeof buildExtendedClient>;

export function buildExtendedClient(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (APPEND_ONLY_MODELS.has(model) && WRITE_OPS.has(operation)) {
            throw new Error(`${model} is append-only; ${operation} is not permitted`);
          }

          const store = currentTenant();
          const orgId = store?.orgId;
          const enforce = !!orgId && !store?.bypassTenant && TENANT_MODELS.has(model);
          if (!enforce) return query(args);

          const a = args as Record<string, unknown>;

          if (operation === 'create') {
            const data = (a.data ?? {}) as Record<string, unknown>;
            // Nested-connect style writes are rejected in favour of the scalar FK.
            if ('organisation' in data) delete data.organisation;
            data.organisationId = orgId;
            a.data = data;
            return query(args);
          }
          if (operation === 'createMany' || operation === 'createManyAndReturn') {
            const data = a.data;
            a.data = Array.isArray(data)
              ? data.map((d: Record<string, unknown>) => ({ ...d, organisationId: orgId }))
              : { ...(data as Record<string, unknown>), organisationId: orgId };
            return query(args);
          }

          if (WHERE_OPS.has(operation)) {
            a.where = { AND: [(a.where as object) ?? {}, { organisationId: orgId }] };
            return query(args);
          }

          if (
            operation === 'findUnique' ||
            operation === 'findUniqueOrThrow' ||
            operation === 'update' ||
            operation === 'delete' ||
            operation === 'upsert'
          ) {
            // Unique-keyed operations can't take an extra filter; verify ownership first.
            const where = a.where as Record<string, unknown>;
            type Delegate = { findUnique: (args: unknown) => Promise<unknown> };
            const delegate = (base as unknown as Record<string, Delegate>)[
              model.charAt(0).toLowerCase() + model.slice(1)
            ];
            const existing = (await delegate.findUnique({
              where,
              select: { organisationId: true },
            })) as { organisationId: string | null } | null;
            if (existing && existing.organisationId !== orgId) {
              // Cross-tenant access is indistinguishable from "not found".
              if (operation.startsWith('find')) return null;
              throw new NotFoundException(`${model} not found`);
            }
            return query(args);
          }

          return query(args);
        },
      },
    },
  });
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly base = new PrismaClient();
  /** Tenant-enforcing client — use this for all data access. */
  readonly client: Ext = buildExtendedClient(this.base);

  async onModuleInit(): Promise<void> {
    await this.base.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.base.$disconnect();
  }

  /** Raw client for system paths that legitimately cross tenants (auth, admin). */
  get system(): PrismaClient {
    return this.base;
  }

  /** Interactive transaction on the tenant-enforcing client. */
  $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.base.$transaction(fn);
  }
}
