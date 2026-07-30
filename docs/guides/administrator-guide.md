# Administrator Guide

For organisation Owners/Admins setting up and managing an Shieldwise deployment.

## Organisation setup

1. The user who registers first becomes the organisation's `OWNER`.
2. **Settings → Organisation** shows member/DPIA/risk counts and lets you
   rename the organisation or set an industry (used to tailor risk-rule
   context in future).
3. **Settings → Members** — add members by email (they must already have a
   platform account; there is no email-invite flow in v1, so ask new
   members to register first) and assign a role:

   | Role                | Typical use                                               |
   | ------------------- | --------------------------------------------------------- |
   | `OWNER`             | Full control; cannot be removed if they're the last owner |
   | `ADMIN`             | Full control except owner-only operations                 |
   | `DPO`               | Approve DPIAs, manage workflow, view audit log            |
   | `PRIVACY_ENGINEER`  | Author DPIAs, model data flows, recommend controls        |
   | `SECURITY_REVIEWER` | Review DPIAs and manage controls                          |
   | `LEGAL_REVIEWER`    | Review lawful basis and transfer mechanisms               |
   | `CONTRIBUTOR`       | Author DPIA content, cannot approve                       |
   | `VIEWER`            | Read-only                                                 |

## Departments, teams, projects

Organise DPIAs under **Projects**, optionally grouped by **Department** and
further by **Team** — useful for larger organisations that want DPIAs
filterable by business unit. This is optional; a small organisation can
create DPIAs without ever touching this hierarchy.

## SSO (OIDC)

Set the following in the API's environment and restart:

```
OIDC_ISSUER_URL=https://your-idp.example.com
OIDC_CLIENT_ID=shieldwise
OIDC_CLIENT_SECRET=<from your IdP>
```

Register `<API_URL>/v1/auth/sso/callback` as the redirect URI in your IdP.
Works with any spec-compliant OIDC provider — Keycloak, Microsoft Entra ID,
Okta, and Google have all been validated against the generic implementation
(`apps/api/src/modules/auth/sso.service.ts`); no per-provider configuration
beyond standard OIDC client registration is required. Users are
JIT-provisioned on first SSO login, matched by verified email thereafter.

## MFA policy

MFA (TOTP) is opt-in per user in v1 (**Settings → account → Enable MFA** in
the UI, or `POST /v1/auth/mfa/enroll` → `/mfa/confirm`). Passkeys
(WebAuthn) are similarly self-service per user. Organisation-wide
MFA-required enforcement is not yet a v1 feature — see the roadmap in the
[PRD](../product-requirements.md).

## Personal API tokens

Members can generate scoped API tokens (**Settings → API tokens** — via
`POST /v1/tokens`) for CI/automation use cases (e.g. triggering a DPIA
export from a release pipeline). Tokens are shown once at creation and
stored hashed; revoke via the same page.

## Audit log

**Settings → Audit** (API: `GET /v1/audit`, role-gated to
Owner/Admin/DPO/Security Reviewer) — every create/update/delete/login/
permission-change/export/AI-invocation is recorded with actor, IP, and
correlation ID, and cannot be edited or deleted through the application
(see [`threat-model.md`](../security/threat-model.md)).

## Compliance framework coverage

**Controls** page shows per-framework coverage cards computed from your
organisation's actual control implementation status — see
[`compliance/framework-mapping.md`](../compliance/framework-mapping.md) for
the methodology.

## Backups and data retention

Shieldwise does not manage backups itself — this is an infrastructure concern.
Use your host's managed Postgres backups (e.g. Render, RDS, or your provider's
point-in-time recovery). Soft-deleted records
(`deletedAt` set) remain in the database until you implement your own
retention/purge policy — Shieldwise deliberately does not hard-delete
automatically, to avoid irreversible data loss from an accidental deletion
(see [`privacy-model.md`](../security/privacy-model.md) for the erasure
request pattern).
