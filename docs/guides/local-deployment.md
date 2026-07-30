# Local Deployment Guide

Every command in this guide was run against a real build of the platform —
Docker images built and booted, migrations applied, the demo DPIA seeded,
login and the full authenticated UI exercised in a real browser — not copied
from a template. If something doesn't match what you see, that's a real
regression worth reporting, not a doc/reality drift.

Two paths, pick one:

- **[Path A — Docker Compose](#path-a--docker-compose-recommended)**: closest
  to production, everything containerized, one command to bring the whole
  stack up. Recommended for trying the platform out or demoing it.
- **[Path B — Manual dev mode](#path-b--manual-dev-mode)**: hot-reload on
  every service, best for active development. See also
  [`developer-guide.md`](./developer-guide.md), which this path summarizes.

## Prerequisites

| Tool    | Version                            | Needed for                                         |
| ------- | ---------------------------------- | -------------------------------------------------- |
| Docker  | Desktop or Engine + Compose plugin | Path A (and Path B's dependency containers)        |
| Node.js | 22+                                | Path B (`.nvmrc` pins this)                        |
| pnpm    | 9+                                 | Path B (`corepack enable` gets the pinned version) |
| Python  | 3.12+                              | Path B, AI service only                            |

~2GB free RAM for the Compose stack (Postgres, MinIO, and the three app
services).

## Path A — Docker Compose (recommended)

### 1. Configure environment

```bash
cp .env.example .env
```

Two variables in `.env.example` are **placeholders that will crash the API
at startup** if left as-is — `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
must each be at least 16 characters (the config layer validates this with
Zod and fails fast rather than booting insecurely). Generate real ones:

```bash
# macOS / Linux
python3 - <<'PY'
import re, secrets, base64
with open('.env') as f:
    content = f.read()
def gen():
    return base64.b64encode(secrets.token_bytes(48)).decode()
content = re.sub(r'^JWT_ACCESS_SECRET=.*$', f'JWT_ACCESS_SECRET={gen()}', content, flags=re.M)
content = re.sub(r'^JWT_REFRESH_SECRET=.*$', f'JWT_REFRESH_SECRET={gen()}', content, flags=re.M)
with open('.env', 'w') as f:
    f.write(content)
PY
```

Or just open `.env` and paste the output of `openssl rand -base64 48` into
each field manually — either works.

Everything else in `.env.example` boots fine unmodified for local use:

- `MFA_ENCRYPTION_KEY`'s placeholder is 26 characters (passes validation) —
  fine for local testing, rotate before anything resembling production.
- `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` already match the MinIO
  credentials the Compose file sets (`shieldwise` / `shieldwise_dev_password`).
- `ANTHROPIC_API_KEY` is optional for booting — **without it, every AI
  endpoint (`/v1/ai/*`) returns an error, but the rest of the platform works
  fully**, including the whole DPIA authoring flow, risk engine, reporting,
  and dashboards, which don't depend on AI. Add a real key here to exercise
  classification, the assistant, and answer improvement.

### 2. Bring up the stack

```bash
pnpm run compose:up
# equivalent to: docker compose -f infra/compose/docker-compose.yml up -d --build
```

First run builds all three application images (API, AI, web) — expect a few
minutes. Watch it come up:

```bash
docker compose -f infra/compose/docker-compose.yml ps
```

Wait until every service shows `healthy` (Postgres, MinIO, API, AI, web).
The API and web containers have a 15-second health check start period, so
give it ~20-30 seconds after `Up`.

### 3. Run migrations and seed data

```bash
docker compose -f infra/compose/docker-compose.yml exec api \
  sh -c "cd /repo/apps/api && node_modules/.bin/prisma migrate deploy"

docker compose -f infra/compose/docker-compose.yml exec -e SEED_DEMO=true api \
  sh -c "cd /repo/apps/api && node_modules/.bin/ts-node --transpile-only prisma/seed.ts"
```

The seed step always creates the built-in questionnaire template and the
27-control catalogue; `SEED_DEMO=true` additionally creates a demo
organisation, three users, and a fully-answered sample DPIA (an AI-assisted
patient triage chatbot) so there's something to look at immediately. It
refuses to run with `SEED_DEMO=true` if `NODE_ENV=production`.

### 4. Sign in

Open **http://localhost:3000**. Sign in with:

```
Email:    dpo@demo.shieldwise.local
Password: Demo-Passw0rd-Shieldwise!
```

(Dev/demo credentials only — this account only exists because you seeded it,
and only in whatever database this Compose stack is pointed at.)

You should land on the dashboard with one DPIA, real risk data, and a
populated risk heat map. Open **DPIAs → DPIA-2026-0001** to see the full
questionnaire, submit it for review to trigger the risk engine, and try
**Export report** to generate a real PDF.

### Service map

| Service          | URL                             | Notes                                                                |
| ---------------- | ------------------------------- | -------------------------------------------------------------------- |
| Web              | http://localhost:3000           | The application                                                      |
| API              | http://localhost:4000           | REST API; Swagger at `/docs` (non-production only)                   |
| API health       | http://localhost:4000/v1/health |                                                                      |
| AI service       | http://localhost:8000           | Internal — not meant for direct browser use                          |
| AI health        | http://localhost:8000/health    |                                                                      |
| MinIO console    | http://localhost:9001           | S3-compatible evidence storage; login `shieldwise` / `shieldwise_dev_password` |
| Postgres         | localhost:5432                  | `shieldwise` / `shieldwise_dev_password`, database `shieldwise`                     |

### Stopping / resetting

```bash
pnpm run compose:down                # stop, keep data
docker compose -f infra/compose/docker-compose.yml down -v   # stop and wipe all volumes (fresh start)
```

## Path B — Manual dev mode

Full detail in [`developer-guide.md`](./developer-guide.md); summary:

```bash
cp .env.example .env    # then fix the two JWT secrets as in Path A step 1
pnpm install

pnpm run compose:up     # just the dependency containers — postgres/redis/rabbitmq/minio
pnpm --filter @shieldwise/shared run build
pnpm --filter @shieldwise/api run db:migrate
SEED_DEMO=true pnpm --filter @shieldwise/api run db:seed

pnpm --filter @shieldwise/api run dev     # http://localhost:4000, Swagger at /docs
pnpm --filter @shieldwise/web run dev     # http://localhost:3000

cd apps/ai
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

Same sign-in credentials as Path A once seeded. Hot-reload works on all
three services — edit and save, no rebuild needed.

**Port note:** if you run the web app on a port other than 3000, update the
API's `APP_URL` (used for CORS) to match, or browser requests to the API
will fail with a CORS error. Similarly, `NEXT_PUBLIC_API_URL` (build-time for
Path A, runtime env for Path B) must point at wherever the API is actually
reachable from the browser.

## Troubleshooting

| Symptom                                                                                                          | Cause                                                                                                  | Fix                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| API container exits immediately, log shows a Zod validation error                                                | `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` shorter than 16 chars                                       | Regenerate per step 1 above                                                                                                     |
| `/v1/ai/*` endpoints return 503                                                                                  | No `ANTHROPIC_API_KEY` (or wrong `AI_PROVIDER`)                                                        | Add a real key to `.env`, or set `AI_PROVIDER=local` and point `LOCAL_LLM_BASE_URL` at a self-hosted OpenAI-compatible endpoint |
| Browser console shows a CORS error on login                                                                      | Web app's actual origin doesn't match the API's `APP_URL`                                              | Set `APP_URL` on the API to the exact origin (scheme+host+port) the browser is using                                            |
| `docker compose up` fails with a port conflict                                                                   | Something else on your machine is using 3000/4000/5432/6379/5672/9000/9001/15672/8000                  | Stop the conflicting process, or edit the port mappings in `infra/compose/docker-compose.yml`                                   |
| Web container `docker logs` shows `next-server` bound to a container-internal IP instead of the app just working | You're running an older image before the `HOSTNAME=0.0.0.0` fix — rebuild (`docker compose build web`) | N/A if you're on current `main`                                                                                                 |
| `prisma migrate deploy` inside the API container says "command not found"                                        | You're running an image built before `prisma`/`ts-node` moved to regular dependencies — rebuild        | N/A if you're on current `main`                                                                                                 |

## Going further

- [`docs/architecture/deployment.md`](../architecture/deployment.md) —
For anything beyond local use, see the [deployment guide](../architecture/deployment.md)
(Compose locally; hosted platforms such as Render + Vercel in production).
- [`docs/guides/administrator-guide.md`](./administrator-guide.md) — SSO,
  roles, once you have a real organisation set up.
- [`docs/security/threat-model.md`](../security/threat-model.md) — what
  changes before this is safe to expose beyond localhost.
