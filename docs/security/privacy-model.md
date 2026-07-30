# Privacy Model — Shieldwise's Own Processing

Shieldwise processes personal data about the _users_ of the platform (DPO,
privacy engineers, etc.) and, incidentally, whatever personal data a
deployer's own DPIA content references (e.g. a data subject count, a vendor
contact). This document applies GDPR-by-design to the platform itself —
distinct from the DPIA _content_ deployers author using the platform.

## Data inventory

| Data                                           | Category                                 | Purpose                       | Retention                                                                     |
| ---------------------------------------------- | ---------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| Account email, display name                    | Identifiers                              | Authentication, attribution   | Until account deletion                                                        |
| Password hash (Argon2id)                       | Authentication                           | Login                         | Until password change/account deletion                                        |
| TOTP seed (encrypted), recovery codes (hashed) | Authentication                           | MFA                           | Until MFA disabled                                                            |
| WebAuthn public key + counter                  | Authentication                           | Passkey login                 | Until credential removed                                                      |
| Session/refresh tokens (hashed)                | Authentication                           | Session management            | TTL-bound (`JWT_REFRESH_TTL`, default 14 days) or explicit revocation         |
| IP address, user agent                         | Technical                                | Audit trail, session metadata | Per audit retention policy (deployer-configurable)                            |
| DPIA answers, comments, evidence               | Whatever the deployer enters             | The platform's core function  | Deployer-controlled (soft-delete, then per deployer's own retention schedule) |
| AI conversation history                        | Derived from DPIA content + user prompts | Assistant context continuity  | Deployer-controlled; soft-deletable                                           |

## Lawful basis for Shieldwise's own processing

Account data is processed under **contract** (Art. 6(1)(b)) — necessary to
provide the service the organisation signed up for. Audit logs are processed
under **legal obligation** and **legitimate interests** (Art. 6(1)(c)/(f)) —
security monitoring and, for regulated deployers, statutory record-keeping.

## Data minimisation in the AI pipeline

The AI service never receives more than the specific fields a given
operation needs (`apps/api/src/modules/ai/ai.service.ts` → `dpiaContext()`):

- Classification (`/v1/ai/classify`) receives only the free-text description
  the user is actively classifying — not the full DPIA record.
- Chat receives the current DPIA's answers and top risks _only when the
  conversation is scoped to that DPIA_ (`dpiaId` supplied); general
  questions carry no DPIA context at all.
- Executive summary generation receives title, description, answers, and
  top 20 risks — not evidence file contents, not other users' comments.

No raw uploaded evidence files (documents, screenshots) are ever sent to the
LLM provider — only structured answer text.

## Data subject rights

- **Access / portability** — DPIA data is exportable in JSON via the
  reporting engine (`/v1/reports/dpia/:id` with `format=json`) at any time;
  account data is retrievable via `/v1/me`.
- **Erasure** — soft-delete is the default (`deletedAt`), giving deployers a
  recovery window consistent with their own retention policy; hard deletion
  for erasure requests is an operational runbook (direct DB operation,
  documented for administrators rather than exposed as a self-service API,
  since immutable audit rows referencing a deleted user must be handled
  deliberately — see the audit trail's `actorId` design note below).
- **Rectification** — all user-editable fields support standard update
  operations; audit rows are never rectified (they are a historical record
  of what was true at the time, not a live profile).

## Audit trail and the erasure tension

`AuditLog.actorId` references a user but is not a foreign key with cascade
delete — deliberately. If a user account is erased, their historical audit
rows must remain (they document what _happened_, which has independent
retention justification — often statutory), but should not continue to
resolve to a live, personally-identifying account. The recommended pattern
for a full erasure request is to anonymise (not delete) the `User` row
(replace email/displayName with a placeholder, clear credentials) while
leaving `actorId` pointing at the now-anonymised row — preserving referential
integrity and the "what happened" record without retaining the erased
individual's identifying details. This is a deliberate design tension
disclosed here rather than silently resolved either way, because the correct
answer depends on the deployer's own retention/erasure policy and applicable
sector-specific record-keeping obligations.

## International transfers (Shieldwise's own processing)

- Self-hosted deployments (Docker Compose or container hosts with managed
  Postgres) keep personal data on infrastructure the deployer controls —
  Shieldwise makes no transfer decisions on the deployer's behalf.
- The only inherent third-country dependency is the LLM provider (if using
  a hosted provider rather than `AI_PROVIDER=local`). Deployers with data
  residency requirements should either use the `local` provider option
  (self-hosted model, no external call) or confirm their chosen provider's
  data processing terms and location before enabling AI features on
  DPIAs containing data they cannot permit to leave a jurisdiction.

## Security measures supporting this model

See [`threat-model.md`](./threat-model.md) for the full technical control
set (encryption, access control, audit immutability). This document covers
the _purpose and lawful basis_ layer that sits above those technical
controls.
