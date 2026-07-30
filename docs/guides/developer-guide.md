# Developer Guide

## Prerequisites

- Node.js 22+, pnpm 9+ (`corepack enable` gets you the pinned version)
- Python 3.12+
- Docker (for Postgres/MinIO via Compose)

## First-time setup

```bash
git clone https://github.com/Abosede-o-Makinde/dpia-generator.git && cd dpia-generator
cp .env.example .env
pnpm install
```

Before continuing, fix `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in
`.env` — the `.env.example` placeholders are under the 16-character minimum
the config layer enforces at boot, so the API crashes immediately if left
as-is. Generate real ones (`openssl rand -base64 48`, twice) and paste them
in.

```bash
pnpm run compose:up
pnpm --filter @shieldwise/shared run build
pnpm --filter @shieldwise/api run db:migrate
SEED_DEMO=true pnpm --filter @shieldwise/api run db:seed
```

Demo login: `dpo@demo.shieldwise.local` / `Demo-Passw0rd-Shieldwise!` (seeded only
when `SEED_DEMO=true`; refuses to run when `NODE_ENV=production`).

See [`local-deployment.md`](./local-deployment.md) for the fully-verified,
step-by-step version of this (including the Docker Compose path and a
troubleshooting table) if anything here doesn't work as described.

## Running services individually

```bash
pnpm --filter @shieldwise/api run dev     # http://localhost:4000, Swagger at /docs
pnpm --filter @shieldwise/web run dev     # http://localhost:3000

cd apps/ai
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

`packages/shared` needs to be built (`pnpm --filter @shieldwise/shared run dev`
for watch mode) before the API or web app can resolve its exports — the
root `pnpm run dev` runs all workspace `dev` scripts in parallel, which
works because `tsup --watch` picks up changes fast enough that consumers
rarely hit a stale build in practice; run the shared build once up front if
you see a resolution error on cold start.

## Project layout

```
apps/
  api/    NestJS — src/modules/* is one directory per domain (auth, dpias,
          risks, controls, evidence, ai, analytics, reports,
          organisations, audit, users, health); src/common/* is cross-
          cutting (guards, prisma extension, crypto, config)
  ai/     FastAPI — app/providers (LLM abstraction), app/rag (retrieval),
          app/routers (endpoints), app/prompts.py (system prompts)
  web/    Next.js App Router — app/(auth) and app/(dashboard) route groups,
          components/{ui,layout,dpia,dashboard,ai}, hooks/*, lib/*
packages/
  shared/ Zod schemas, enums, condition DSL, workflow state machine,
          risk scoring — imported by both api and web
infra/
  compose/   Local Docker Compose stack
  README.md  What lives under infra/
docs/        this documentation set
```

## Testing

```bash
pnpm run test                                    # everything (Node workspaces)
pnpm --filter @shieldwise/shared run test             # condition DSL, workflow, risk scoring
pnpm --filter @shieldwise/api run test                # NestJS unit tests (risk rules, data-flow analysis, crypto)
pnpm --filter @shieldwise/web run test                # frontend unit tests

cd apps/ai && pytest                             # AI service (retriever, endpoints)
```

The API's test suite requires a reachable Postgres — point `DATABASE_URL` at
the Compose instance or a disposable test database and run
`prisma migrate deploy` first (see `.github/workflows/ci.yml` for the exact
sequence CI uses, including the ephemeral Postgres service container).

## Adding a new risk rule

1. Add an entry to `RULES` in `apps/api/src/modules/risks/risk-rules.ts` —
   `condition` uses the shared condition DSL, `references` must cite a
   specific article or guidance document (not just "GDPR").
2. Add a test case to `risk-rules.spec.ts` asserting the rule fires (or
   doesn't) for a representative fact map.
3. If it should recommend a control that doesn't exist yet, add the control
   to `apps/api/prisma/seed-data/controls.ts` with its framework mappings,
   and re-run `pnpm --filter @shieldwise/api run db:seed`.
4. See `CONTRIBUTING.md` — privacy-domain content needs a privacy-reviewer
   sign-off in addition to engineering review.

## Adding a new questionnaire question

Edit `apps/api/prisma/seed-data/uk-dpia-template.ts`. To add a follow-up
question, set `visibleWhen` on the new question using the condition DSL;
to feed the risk engine, add `riskTags` to the relevant option(s) of a
`MULTI_SELECT`/`SINGLE_SELECT` question — these become `tag:*` entries in
the fact map that risk rule conditions can match on. Bump the template's
`version` field if the change is structural (removes/renames a question
key that existing DPIA answers reference) rather than purely additive.

## Adding a new report template

`apps/api/src/modules/reports/report-model.ts` — add a key to
`REPORT_TEMPLATES` controlling which sections (questionnaire, risks,
controls, approvals, history) it includes. All six renderers
(`text.renderers.ts` for md/html/csv, `binary.renderers.ts` for pdf/docx,
plus json which is a direct model dump) consume the same `ReportModel`, so a
new template needs no renderer changes — only the inclusion flags.

## Code style

- TypeScript: default to no comments; when one is warranted, explain _why_,
  not _what_. `pnpm run format` / `pnpm run lint` before committing.
- Python: `ruff check . && ruff format .` in `apps/ai`.
- Don't add abstractions or config flags for hypothetical future
  requirements — see `CONTRIBUTING.md`.

## Debugging tips

- Every API response carries `X-Request-Id` — grep the API logs and
  `audit_logs` table by it to trace a specific failed request end-to-end.
- The AI service logs which provider/model served each request; if
  `/v1/ai/*` calls are failing, check `apps/ai` logs before assuming the
  API is at fault — `AiClientService` surfaces AI-service errors as
  `ServiceUnavailableException` (503) with the underlying detail logged,
  not swallowed.
