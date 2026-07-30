# ADR 0002: Shared-schema multi-tenancy with three-layer isolation

## Status

Accepted

## Context

Shieldwise is a multi-tenant SaaS-shaped product (though self-hostable). We
needed a tenancy model that prevents cross-organisation data leakage — the
single most damaging failure mode for a privacy-compliance product — while
remaining operable by a small team.

## Decision

One shared PostgreSQL schema, every tenant-scoped table carrying an
`organisationId` column, with isolation enforced at three independent
layers: application-layer explicit filtering, a Prisma query extension that
injects the filter automatically from request-scoped context, and Postgres
Row-Level Security as a database-level backstop. See
[`database.md`](../architecture/database.md) for the mechanics.

## Alternatives considered

- **Schema-per-tenant** — rejected: operationally heavy at scale (migrations
  must run per-schema), and doesn't meaningfully improve isolation over RLS
  for our threat model (the same database credentials would still span all
  schemas unless further partitioned).
- **Database-per-tenant** — rejected for v1: strongest isolation, but the
  operational cost (connection pooling, migration orchestration, backup
  fan-out) is disproportionate before the platform has the tenant count or
  regulatory driver (e.g. a specific customer's data-residency contract)
  that would justify it. The `organisationId`-scoped design doesn't preclude
  migrating a specific high-sensitivity tenant to a dedicated database later
  — the RLS policy and Prisma extension would move with it unchanged.
- **Isolation via application code only** — rejected as the sole mechanism:
  a single missed `where: { organisationId }` in a new endpoint would leak
  data with no defence-in-depth. This is why the Prisma extension and RLS
  policy exist as independent layers, not just code review discipline.

## Consequences

- Every new Prisma model that is tenant-scoped must be added to the
  `TENANT_MODELS` set in `prisma.service.ts` _and_ given an RLS policy in
  `rls.sql` — a deliberate two-place checklist, documented in both files,
  rather than a single point of truth that could be forgotten in one layer
  while updated in the other.
- Cross-tenant lookups by unique key (`findUnique`, `update`, `delete`)
  require an extra existence-and-ownership check before the Prisma call,
  implemented once in the extension rather than duplicated per service.
- A regression in application-layer scoping is caught by RLS in production
  (fails safe) rather than leaking data silently.
