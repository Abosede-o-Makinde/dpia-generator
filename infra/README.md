# Infrastructure

Local helpers for Shieldwise.

| Path | Purpose |
|------|---------|
| `compose/` | Docker Compose stack (Postgres, MinIO, API, AI, web) |

Production: managed Postgres + container host (e.g. Render) + Vercel for web +
S3-compatible storage (e.g. Cloudflare R2). See
[`docs/architecture/deployment.md`](../docs/architecture/deployment.md).
