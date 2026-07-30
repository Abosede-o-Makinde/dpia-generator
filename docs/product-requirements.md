# Product Requirements Document — Shieldwise Privacy Platform

## 1. Problem statement

Organisations subject to UK/EU GDPR must carry out a Data Protection Impact
Assessment (DPIA) before undertaking processing likely to result in high risk
to individuals (Article 35). In practice, most organisations run this process
as a manually-maintained document (Word/Confluence) routed through email or
ticketing for approval. This has three structural failures:

1. **No consistency.** Two assessors scoring the same risk (e.g. "large-scale
   special category processing") arrive at different likelihood/impact
   judgements with no shared model.
2. **No visibility.** A DPO cannot answer "what is our aggregate residual
   risk exposure" or "what fraction of our ISO 27001 controls are actually
   evidenced by a DPIA" without manually collating documents.
3. **No feedback loop.** DPIAs are point-in-time. Infrastructure changes,
   new vendors, and new AI features are not automatically re-assessed.

Shieldwise addresses all three: a shared, versioned risk model; org-wide
dashboards and compliance coverage; and infrastructure/data-flow-aware
re-assessment triggers.

## 2. Target users / personas

| Persona                       | Primary jobs-to-be-done                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Data Protection Officer**   | Approve/reject DPIAs; monitor aggregate risk and review-due items; produce board and ICO-ready reports.             |
| **Privacy Engineer**          | Author DPIAs; model data flows; track remediation of identified risks; liaise with engineering on controls.         |
| **Security Reviewer**         | Review DPIAs for technical control adequacy; run cloud/IaC scans; verify control implementation.                    |
| **Legal Reviewer**            | Verify lawful basis, special category conditions, and transfer mechanisms are correctly identified.                 |
| **CISO / Compliance Officer** | Track framework coverage (ISO 27001, SOC 2, NIST) derived from privacy control implementation.                      |
| **Engineering lead**          | Understand what a new feature (e.g. adding an AI classifier) requires from a privacy standpoint before building it. |
| **Executive / Board member**  | Consume plain-language risk summaries and approve high-risk processing.                                             |

## 3. Functional requirements

### 3.1 Authentication & organisation management

- FR-1: Users MUST be able to register, sign in with password + optional
  TOTP MFA, or via WebAuthn passkey, or via an organisation's configured
  OIDC IdP.
- FR-2: Organisations MUST support departments, teams, and projects, with
  role-based membership (Owner/Admin/DPO/Privacy Engineer/Security
  Reviewer/Legal Reviewer/Contributor/Viewer).
- FR-3: The system MUST prevent removal or demotion of the last Owner of an
  organisation.

### 3.2 DPIA authoring

- FR-4: The questionnaire MUST adapt visibility of sections/questions based
  on prior answers (skip logic and automatic follow-ups).
- FR-5: Draft answers MUST autosave without an explicit save action.
- FR-6: A DPIA MUST NOT be submittable while required, visible questions are
  unanswered.
- FR-7: Users MUST be able to attach evidence, leave question-scoped
  comments, and view answer/workflow history.

### 3.3 AI assistance

- FR-8: Given a plain-language processing description, the system MUST
  classify data categories and determine DPIA necessity per Article 35(3)
  and the ICO screening checklist, with cited rationale.
- FR-9: The AI assistant MUST ground factual claims about legal requirements
  in retrieved guidance excerpts rather than unsourced assertions.
- FR-10: Users MUST be able to request an AI-improved rewrite of any
  free-text answer, in place.

### 3.4 Risk & controls

- FR-11: Submitting a DPIA MUST trigger automated risk scoring against the
  full answer set and any modelled data flow.
- FR-12: Each identified risk MUST show inherent and residual score, with
  residual recalculated as linked controls are marked implemented.
- FR-13: Every control MUST be able to carry mappings to one or more
  compliance frameworks with a specific reference (e.g. "ISO 27001 A.8.24").
- FR-14: The system MUST provide a per-framework coverage view showing
  mapped vs. implemented controls and the specific gaps.

### 3.5 Workflow

- FR-15: State transitions MUST be enforced server-side against a declared
  state machine, gated by role, with certain transitions requiring a
  comment.
- FR-16: All transitions MUST be recorded in an immutable, append-only
  history.

### 3.6 Data flow modelling

- FR-17: Users MUST be able to model systems, APIs, databases, users,
  vendors, and cloud services as nodes with directed data flows between
  them.
- FR-18: Saving a data flow MUST automatically flag cross-border transfers
  (by node country vs. UK adequacy list), third-party processor exposure,
  unencrypted flows, and trust-boundary crossings, and feed these into the
  risk engine.

### 3.7 Reporting & analytics

- FR-19: DPIA reports MUST be exportable as PDF, DOCX, HTML, Markdown, CSV,
  and JSON, with at least: full DPIA, ICO-ready, board, DPO, audit, and
  executive-summary templates.
- FR-20: The dashboard MUST show open DPIA counts by status, risk counts by
  level, a likelihood×impact heat map, a 6-month risk trend, upcoming
  reviews, and recent workflow activity — scoped to the caller's
  organisation only.

### 3.8 Audit

- FR-21: Every create/update/delete/login/permission-change/export/AI
  invocation MUST be recorded with actor, timestamp, IP, and correlation
  ID, and MUST NOT be editable or deletable via the application.

## 4. Non-functional requirements

| Category          | Requirement                                                                                                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-tenancy** | Complete data isolation between organisations, defended at three independent layers (application scoping, ORM-level enforcement, database RLS).                                                                                    |
| **Security**      | OWASP ASVS Level 2 alignment; encryption at rest (AES-256-GCM for secrets, provider SSE for storage) and in transit (TLS); Argon2id password hashing; constant-time comparisons for tokens.                                        |
| **Availability**  | Stateless API/AI services behind horizontal autoscaling; no in-process session state that prevents multi-replica operation (WebAuthn challenge cache is the one documented exception — swap for Redis at scale, see code comment). |
| **Performance**   | Dashboard aggregate queries must return in < 500ms at 10k DPIAs / org (indexed on organisationId + status/level).                                                                                                                  |
| **Auditability**  | Audit log retention MUST be configurable per deployment and MUST NOT be deletable through the application layer.                                                                                                                   |
| **Portability**   | No cloud-provider lock-in in the application layer; Terraform reference targets AWS but the Docker images run unmodified on any container platform.                                                                                |
| **Accessibility** | Web UI targets WCAG 2.1 AA for core workflows (forms, navigation, status indication via colour + text).                                                                                                                            |

## 5. Out of scope (v1)

- Real-time collaborative editing (last-write-wins on answers is acceptable
  for v1; comments provide the collaboration surface).
- Native mobile apps.
- Non-UK/EU regulatory frameworks as first-class questionnaire templates
  (CCPA, LGPD, etc.) — the template system is designed to support them, but
  only the UK GDPR template ships built-in.
- Automated legal-basis determination without human confirmation (the AI
  suggests; a human always confirms lawful basis).
- Cloud/IaC configuration scanning (AWS, Terraform, Docker, Kubernetes, etc.)
  — removed from v1 scope; data-flow modelling covers topology-derived risk
  flags instead.

## 6. Known limitations and implementation gaps (v1)

Distinct from §5's deliberate exclusions, this section tracks capability
that was attempted but shipped narrower than originally specified, risk the
team has knowingly accepted for v1, and NFR claims in §4 that are design
targets rather than independently verified facts. Kept here, rather than
only in code comments or conversation, so it's tracked against the
requirements it qualifies.

### 6.1 Shipped narrower than originally scoped

- **Observability.** No OpenTelemetry instrumentation, Prometheus metrics
  endpoint, or log aggregation (Grafana/Loki) ships, despite being named as
  a target in the architecture docs. Operators currently rely on container
  logs and the `audit_logs` table; there is no metrics/tracing backend to
  point at.

### 6.2 Documented risk acceptances

Full detail lives in the [threat model](security/threat-model.md) and the
relevant ADRs; summarised here against the requirements they affect:

- API personal access tokens carry declared scopes (issued per FR-2's role
  model), but scope enforcement is not implemented at the guard level — a
  token can currently perform anything its bearer's role permits, regardless
  of which scopes were selected at creation.
- The WebAuthn challenge store is in-process, not Redis-backed — the one
  documented exception to the Availability row of §4, and the one component
  that currently prevents scaling the API to multiple replicas without
  sticky sessions.
- MFA (FR-1) is per-user opt-in only; there is no organisation-level
  "require MFA for all members" policy.
- Member invitations are created in a pending state but no email is sent —
  there is no outbound email integration yet, so an invited user must
  currently be given their invite link out of band.
- Data erasure (org offboarding, right-to-erasure requests against Shieldwise's
  own processing) is a documented manual runbook, not a self-service action
  in the product.
- Risk rules (FR-11) are a curated, hardcoded rule set
  (`apps/api/src/modules/risks/risk-rules.ts`), not a database-backed,
  org-editable store — see the roadmap item below.

### 6.3 Non-functional claims not yet independently verified

- **Accessibility (§4).** No automated accessibility testing (axe,
  Lighthouse CI, etc.) is wired into CI, and no manual audit has been
  performed. The UI uses semantic HTML and colour+text status indicators by
  construction, but WCAG 2.1 AA is currently a design target, not a tested
  guarantee.
- **Performance (§4).** The dashboard aggregate queries are indexed as
  described, but no load test has been run to confirm the <500ms/10k-DPIA
  figure at that scale.
- **Release pipeline.** `release.yml` (cosign signing, SBOM publication) is
  defined and statically validated but has never been triggered end-to-end —
  it fires on tag push, and no tag has been pushed yet.

## 7. Success metrics

- Time to complete a DPIA from creation to DPO approval (target: reduce by
  50% vs. document-based baseline).
- % of organisation risks with a residual score below the organisation's
  risk appetite threshold.
- Framework coverage percentage trend over time (should increase as controls
  are implemented and linked).
- DPIA review-due items resolved within 30 days of due date.

## 8. Roadmap (indicative, post-v1)

**Hardening what's already partially built** (closes gaps tracked in §6):

- Enforce API token scopes at the guard level, not just at issuance.
- Move the WebAuthn challenge store to Redis to unblock multi-replica API
  scaling.
- Organisation-level MFA policy (require, not just permit, MFA for members).
- Outbound email integration for member invitations.
- Automated accessibility testing (axe/Lighthouse CI) in the CI pipeline,
  ahead of an independent WCAG 2.1 AA audit.
- Load-testing harness to validate the dashboard performance target at scale
  before quoting it as a guarantee.

**Further out (net-new capability):**

- Additional questionnaire templates (EU GDPR variant, sector-specific:
  healthcare, financial services).
- Optional cloud/IaC connectors (AWS/Azure/GCP, Terraform, Kubernetes) if
  infrastructure-derived prefill is needed later.
- Vendor risk assessment module with third-party questionnaire distribution.
- SCIM provisioning for enterprise SSO deployments.
- Configurable, DB-backed risk rule editor (v1 ships a strong built-in rule
  set; org-level rule authoring is the natural next step).
