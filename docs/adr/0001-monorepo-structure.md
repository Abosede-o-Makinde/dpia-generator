# ADR 0001: pnpm workspace monorepo with a service split, not polyrepo

## Status

Accepted

## Context

The platform has three runtime services (Next.js web, NestJS API, FastAPI
AI service) plus a shared TypeScript type/schema layer. We needed to decide
between separate repositories per service versus one repository.

## Decision

Single repository, pnpm workspaces (`apps/*`, `packages/*`). TypeScript
services (`api`, `web`) share `packages/shared` via a workspace path
dependency, resolved and built with `tsup`; the Python AI service lives in
the same tree but is not a workspace member (no shared TS import path) —
its Pydantic schemas mirror the shared Zod schemas manually.

## Rationale

- `packages/shared` (the condition DSL, workflow state machine, risk scoring
  model, Zod schemas) is the platform's single source of truth. A polyrepo
  would require publishing it as a versioned npm package and coordinating
  version bumps across three repos for every schema change — friction that
  actively discourages keeping frontend, backend, and shared types in sync,
  which is precisely the failure mode we most want to avoid in a compliance
  product where a schema drift means a DPIA field silently stops validating.
- A single CI pipeline can build `packages/shared` once and reuse the
  artifact across the API and web test/build jobs (see `.github/workflows/ci.yml`),
  rather than every consumer repo re-resolving a published package version.
- The Python service's isolation from the workspace is intentional, not an
  oversight — Python cannot consume a TypeScript package regardless of repo
  layout, so co-locating it in the monorepo buys directory-level proximity
  and one Docker Compose stack, without pretending there's a shared-code
  boundary that doesn't exist.

## Consequences

- A single `git clone` gets a contributor the whole system.
- Cross-service changes (e.g. adding a field to `DetectedCategory`) are one
  PR, not three coordinated releases.
- The Python schema mirror (`apps/ai/app/schemas.py`) must be kept in sync
  by hand — mitigated by the API's `risk-rules.spec.ts` asserting every
  built-in risk rule parses against the shared Zod schema, which is the
  contract the AI service's suggested-answer output must also satisfy;
  a stronger cross-language contract test (e.g. JSON Schema generated from
  Zod, validated against the Pydantic models in CI) is a reasonable future
  addition once the schema surface grows.
