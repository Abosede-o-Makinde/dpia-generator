# Deployment Guide

## Environment matrix

| Environment       | How                                                                                                            | Use case                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Local development | `pnpm run dev` + Python venv                                                                                   | Feature development       |
| Local integration | `docker compose -f infra/compose/docker-compose.yml up`                                                        | Full-stack testing, demos |
| Hosted demo/prod  | Managed Postgres + container hosts (e.g. Render) + Vercel for the web app; object storage via S3-compatible R2 | Public / client demos     |

The application is cloud-agnostic: Docker images for `api`, `ai`, and `web`
run on any container platform. Point `DATABASE_URL` at managed Postgres and
`S3_*` at S3-compatible storage (MinIO locally, Cloudflare R2 or AWS S3 in
production).

## Docker Compose (local / demo)

```bash
cp .env.example .env
pnpm run compose:up
```

Brings up Postgres (`postgres:16-alpine`), MinIO (S3-compatible), the API,
the AI service, and the web app. The `api` and `web` images are built from
their Dockerfiles on first run; the AI service builds from
`apps/ai/Dockerfile`.

Run migrations and seed once the stack is healthy:

```bash
docker compose -f infra/compose/docker-compose.yml exec api \
  node node_modules/.bin/prisma migrate deploy
docker compose -f infra/compose/docker-compose.yml exec api \
  node node_modules/.bin/prisma db seed
```

## Hosted deployment (Render + Vercel example)

Recommended split for demos:

1. **Managed Postgres** (Render PostgreSQL or equivalent) → `DATABASE_URL`
2. **API** Web Service — Dockerfile `apps/api/Dockerfile`, context repo root
3. **AI** Web Service — Dockerfile `apps/ai/Dockerfile`, context `apps/ai`
4. **Web** on Vercel — set `NEXT_PUBLIC_API_URL` to the API URL at build time
5. **Object storage** — Cloudflare R2 or other S3-compatible bucket (`S3_*`)

Set `APP_URL` on the API to the exact Vercel origin (CORS). Run
`prisma migrate deploy` (and seed once) against the managed database after
the first API deploy. See [`.env.example`](../../.env.example) for the full
variable list.

## AI service deployment notes

The AI service is stateless per-request but holds an in-process BM25 index
(rebuilt from `apps/ai/app/rag/documents/*.json` on startup — no external
vector database).

## Configuration reference

All runtime configuration is environment-variable driven — see
[`.env.example`](../../.env.example) at the repo root for the full list,
grouped by concern (core, database, auth, storage, AI, observability).
`apps/api/src/common/config.ts` validates the full set at process start with
Zod and **fails fast** on a missing or malformed required variable, rather
than surfacing a runtime error on first use.

## Observability

Application logs use structured logging (`LOG_LEVEL`). Wire an OpenTelemetry
collector later if you need distributed traces — not required for demos.
