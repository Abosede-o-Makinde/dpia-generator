# Contributing to Shieldwise

Thanks for your interest in contributing. Shieldwise is a privacy engineering
platform, so we hold code, documentation, and privacy-domain content (risk
rules, control mappings, questionnaire templates) to a high bar — please read
this guide before opening a PR.

## Getting started

```bash
git clone https://github.com/Abosede-o-Makinde/dpia-generator.git
cd dpia-generator
cp .env.example .env
pnpm install
pnpm run compose:up          # Postgres, MinIO, API, AI, web
pnpm --filter @shieldwise/api run db:migrate
pnpm --filter @shieldwise/api run db:seed
pnpm run dev                 # runs api, web, and (separately) the ai service
```

The AI service is Python — see [`apps/ai/README.md`](apps/ai/README.md) for
its own setup (venv + `pip install -e ".[dev]"`).

## Development workflow

1. **Open an issue first** for anything beyond a small fix — this avoids
   duplicated effort and lets us discuss approach before code is written,
   especially for privacy-domain content (see below).
2. **Branch from `main`**, name it `feat/…`, `fix/…`, `docs/…`, or `chore/…`.
3. **Write tests.** New behaviour needs test coverage; bug fixes need a
   regression test that fails before the fix and passes after.
4. **Keep commits focused.** One logical change per commit; write commit
   messages that explain _why_, not just _what_.
5. **Run the full check suite locally before opening a PR:**
   ```bash
   pnpm run lint && pnpm run typecheck && pnpm run test
   cd apps/ai && ruff check . && pytest
   ```
6. **Open a PR against `main`.** Fill in the PR template. CI must pass
   (lint, typecheck, tests, SAST, secret scan, dependency scan) before review.

## Contributing privacy-domain content

Changes to the risk rule library (`apps/api/src/modules/risks/risk-rules.ts`),
the control catalogue (`apps/api/prisma/seed-data/controls.ts`), or the
built-in DPIA questionnaire (`apps/api/prisma/seed-data/uk-dpia-template.ts`)
require:

- A citation to the specific legal article, ICO guidance document, or
  framework control it's derived from
- Review from a CODEOWNERS-designated privacy reviewer, in addition to
  engineering review

We'd rather merge fewer, well-sourced rules than a large batch of
plausible-sounding ones — incorrect DPIA guidance has real compliance
consequences for deployers.

## Code style

- TypeScript: `pnpm run format` (Prettier) and `pnpm run lint` (ESLint) must
  pass. Follow existing patterns in the module you're editing rather than
  introducing a new style.
- Python: `ruff check .` and `ruff format .` in `apps/ai`.
- No comments explaining _what_ code does — name things clearly instead.
  Comments are reserved for non-obvious _why_ (a workaround, a legal
  citation, a subtle invariant).
- Don't add abstractions, config flags, or generalisation for hypothetical
  future use cases. Solve the problem in front of you.

## Reporting bugs

Use the **Bug report** issue template. Include: what you expected, what
happened, steps to reproduce, and your environment (self-hosted vs Docker
Compose, versions).

## Reporting security vulnerabilities

**Do not open a public issue.** See [SECURITY.md](SECURITY.md).

## Code of conduct

Be respectful and constructive. We're building tools that help organisations
protect people's personal data — bring that same care to how you treat
contributors and maintainers.

## Licence

By contributing, you agree that your contributions are licensed under the
project's [Apache 2.0 licence](LICENSE).
