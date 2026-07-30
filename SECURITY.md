# Security Policy

Shieldwise processes personal data on behalf of its deployers. We take security
reports seriously and appreciate responsible disclosure.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **Abomaabidemi27@gmail.com** with:

- A description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept code or requests welcome)
- The affected version/commit
- Your assessment of severity, if you have one

We aim to:

- Acknowledge your report within **2 business days**
- Provide an initial assessment within **5 business days**
- Keep you updated on remediation progress at least weekly until resolved
- Credit you in the release notes (unless you prefer to stay anonymous)

If you believe the issue is critical (e.g. authentication bypass, tenant
data isolation failure, remote code execution), please say so in the subject
line — we prioritise triage accordingly.

## Supported versions

| Version                        | Supported                            |
| ------------------------------ | ------------------------------------ |
| `main`                         | ✅ Always                            |
| Tagged releases < latest minor | Security fixes backported on request |

## Scope

In scope:

- The `apps/api`, `apps/ai`, `apps/web` applications in this repository
- Docker Compose and deployment guidance under `infra/` and `docs/architecture/`
- Authentication, authorisation, and tenant-isolation logic

Out of scope:

- Vulnerabilities in third-party dependencies with no exploitable path
  through Shieldwise's own code (report these upstream; we track them via
  Dependabot regardless)
- Denial-of-service via resource exhaustion against a self-hosted instance
  you control
- Missing security headers or best-practice hardening on a demo/dev deployment

## Our security practices

- Dependency and container scanning on every merge to `main` (Dependabot,
  Trivy, `pnpm audit`, `pip-audit`)
- Static analysis via CodeQL on every pull request
- Secret scanning via Gitleaks on every push
- Signed container images (Sigstore cosign, keyless)
- SBOM published for every release (CycloneDX)
- Defence-in-depth tenant isolation: application-layer scoping, a Prisma
  query extension, and Postgres Row-Level Security — see
  [`docs/security/threat-model.md`](docs/security/threat-model.md)

See [`docs/security/`](docs/security/) for the full threat model and privacy
architecture documentation.
