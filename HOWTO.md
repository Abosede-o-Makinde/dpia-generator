# How to Use Shieldwise

One document, two questions: what is this for, and how do you actually drive
it. Everything described below has been run for real against a live build —
not aspirational.

---

## What Shieldwise aims to achieve

### The problem

Most organisations run Data Protection Impact Assessments (DPIAs) — the
UK GDPR Article 35 requirement to formally assess risk before high-risk
processing — as a Word document routed through email or a ticketing system.
That approach breaks down in three specific ways once an organisation has
more than a handful of DPIAs a year:

1. **No consistency.** Two assessors scoring the same fact pattern ("we
   process health data at scale") arrive at different risk judgements
   because there's no shared model behind the score — it's whatever the
   author felt was reasonable that day.
2. **No visibility.** A DPO cannot answer "what is our aggregate residual
   risk exposure" or "what fraction of our ISO 27001 controls are actually
   evidenced by a DPIA" without manually opening every document.
3. **No feedback loop.** A DPIA is a snapshot. When infrastructure changes,
   a new vendor is added, or a new AI feature ships, nothing re-triggers
   assessment — the document just goes stale.

### What Shieldwise is instead

Shieldwise is a **privacy decision engine**, not a document generator. Concretely:

- The questionnaire is **adaptive** — one condition DSL drives which
  questions appear, what counts as "required," and what the automated risk
  engine evaluates. Answer "no children involved" and the age-assurance
  follow-ups never appear; answer "yes" and they do, automatically.
- Risk scoring is **deterministic and explainable**, not an LLM guessing a
  number. ~20 built-in rules (special category processing, large-scale
  processing, cross-border transfers, automated decision-making, weak
  access control, …) each cite the specific UK GDPR article or ICO/EDPB
  guidance that justifies them, and combine likelihood × impact × sensitivity
  modifiers into a score any reviewer can trace back to its source. AI is
  used for _classification and explanation_ (what data categories are
  involved, is a DPIA even required), never for silently assigning the
  number.
- Controls are **mapped once, reused everywhere** — implementing "encryption
  at rest" for one risk simultaneously moves the needle on UK GDPR, ISO
  27001, NIST CSF 2.0, and four other frameworks' coverage dashboards,
  because the mapping lives on the control, not duplicated per framework.
- The **data flow model** feeds infrastructure and processing topology back
  into the DPIA — cross-border transfers, third-party processors, and
  unencrypted flows are flagged from the diagram rather than guessed from
  memory.

### Who it's for

DPOs, privacy engineers, security reviewers, legal reviewers, CISOs and GRC
teams, and the engineers who need to know what a new feature requires from a
privacy standpoint before they build it — across government, healthcare,
financial services, and any organisation with a UK/EU GDPR obligation and
more DPIAs than a spreadsheet can track.

---

## How to use it

### 1. Get it running

The fastest path is Docker Compose — one command, the whole stack:

```bash
git clone <this-repo> && cd dpia-generator
cp .env.example .env
# JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be ≥16 chars — generate real
# ones and paste them in, e.g.: openssl rand -base64 48

docker compose -f infra/compose/docker-compose.yml up -d --build
docker compose -f infra/compose/docker-compose.yml exec api \
  sh -c "cd /repo/apps/api && node_modules/.bin/prisma migrate deploy"
docker compose -f infra/compose/docker-compose.yml exec -e SEED_DEMO=true api \
  sh -c "cd /repo/apps/api && node_modules/.bin/ts-node --transpile-only prisma/seed.ts"
```

Open **http://localhost:3000** and sign in:

```
Email:    dpo@demo.shieldwise.local
Password: Demo-Passw0rd-Shieldwise!
```

Full walkthrough, the hot-reload dev-mode alternative, and a troubleshooting
table: [`docs/guides/local-deployment.md`](docs/guides/local-deployment.md).
AI features (classification, chat assistant, answer improvement) need a real
`ANTHROPIC_API_KEY` in `.env` — everything else works without one.

### 2. Screen a processing activity (before you even open a DPIA)

Not sure whether something needs a formal DPIA? Open the **AI Assistant**
panel and describe the processing in plain language — what data, from whom,
for what purpose, using what technology. The classifier returns:

- Detected data categories, and whether any are special category (Art. 9),
  children's data, or criminal offence data
- Whether AI/automated decision-making is involved
- A `REQUIRED` / `RECOMMENDED` / `NOT_REQUIRED` verdict against Article
  35(3) and the ICO's screening checklist, with the specific triggering
  criteria cited

This is grounded retrieval (RAG) over curated UK GDPR/ICO guidance excerpts
— not a bare model guess — so every claim carries a source.

### 3. Create a DPIA and complete the questionnaire

**DPIAs → New DPIA.** It's created from the built-in UK GDPR template in
`DRAFT` status, organised into five sections (processing context; data and
data subjects; technology and security; sharing and international
transfers; rights, transparency and consultation).

- Answers **autosave** as you type.
- Questions **reveal follow-ups** based on your answers — selecting "Health
  data" as a category, for instance, feeds the special-category risk rules
  before you've even submitted.
- Click **Improve with AI** next to any free-text answer for a critique and
  an improved rewrite you can accept or keep editing.
- The completion percentage only counts _visible, required_ questions, so
  it never asks you to answer something that doesn't apply.

### 4. Model the data flow (optional, strongly recommended)

On the **Data flow** tab, drag out nodes for each system, API, database,
user type, vendor, and cloud service, and draw directed flows between them.
Saving it automatically flags:

- Cross-border transfers (by node country vs. UK adequacy)
- Third-party processor exposure
- Unencrypted flows, especially where they carry sensitive categories
- Trust-boundary crossings

These findings feed straight into the risk engine — a data flow showing an
unencrypted link to a US-based vendor produces different, worse risks than
the same questionnaire answers with no data flow modelled at all.

### 5. Submit for review → watch the risk engine run

**Submit for review** becomes available once every required, visible
question is answered. This runs the deterministic risk engine against your
full answer set and data flow, moves the DPIA to `IN_REVIEW`, and freezes
the questionnaire until it's returned to draft.

Open the **Risks** tab: each identified risk shows likelihood, impact,
inherent and residual score, its level, and the specific article/guidance
citation that justifies it — plus a ranked list of recommended controls.

### 6. Implement controls and watch residual risk drop

Mark a recommended control `IMPLEMENTED` (on the risk itself, or from
**Controls**) and the residual score recalculates immediately — combined
control effectiveness reduces `residual = inherent × (1 − effectiveness)`.
You can watch a risk move from `CRITICAL` to `HIGH` to `MEDIUM` in real
time as mitigations land.

### 7. Route it through approval

Depending on configuration, a submitted DPIA moves through some combination
of Legal review → Security review → DPO approval → Executive approval, each
gated to the relevant role server-side (not just hidden in the UI). Some
transitions require a comment — rejecting or returning to draft, for
instance. Every transition is recorded, permanently, in **History**.

### 8. Export a report

From any DPIA, **Export report** generates PDF, DOCX, HTML, Markdown, CSV,
or JSON, using one of six templates: full DPIA, ICO-ready, board report, DPO
report, audit report, or executive summary (the last two of which the AI
assistant can also draft in plain business language).

### 9. Check the org-wide picture

- **Dashboard** — open DPIA counts by status, a likelihood×impact risk heat
  map, a 6-month risk trend, upcoming reviews, and recent workflow activity.
- **Risk register** — every risk across every DPIA, filterable by level,
  with linked controls and their implementation status.
- **Controls** — the full catalogue with per-framework coverage percentages
  (UK GDPR, EU GDPR, ISO 27001, ISO 27701, NIST CSF 2.0, NIST Privacy
  Framework, CIS v8, OWASP ASVS 4, SOC 2, PCI DSS 4, HIPAA) and the specific
  gaps ranked by impact.

### 10. Set up the organisation (admin tasks)

**Settings → Members** to invite colleagues and assign roles
(Owner/Admin/DPO/Privacy Engineer/Security Reviewer/Legal
Reviewer/Contributor/Viewer). **Settings → Organisation** for departments,
teams, and projects if you want DPIAs grouped by business unit.
Full detail:
[`docs/guides/administrator-guide.md`](docs/guides/administrator-guide.md).

---

## Where to go next

| I want to...                                   | Read                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| Run it (full detail, troubleshooting)          | [`docs/guides/local-deployment.md`](docs/guides/local-deployment.md)                   |
| Understand a DPIA lifecycle in more depth      | [`docs/guides/user-guide.md`](docs/guides/user-guide.md)                               |
| Configure SSO and roles                        | [`docs/guides/administrator-guide.md`](docs/guides/administrator-guide.md)             |
| Contribute code or extend the risk rules       | [`docs/guides/developer-guide.md`](docs/guides/developer-guide.md)                     |
| Understand the architecture                    | [`docs/architecture/system-architecture.md`](docs/architecture/system-architecture.md) |
| See why a technical decision was made          | [`docs/adr/`](docs/adr/)                                                               |
| Understand the security posture                | [`docs/security/threat-model.md`](docs/security/threat-model.md)                       |
| Understand the compliance-mapping methodology  | [`docs/compliance/framework-mapping.md`](docs/compliance/framework-mapping.md)         |
| Deploy beyond localhost (Render, Vercel, etc.) | [`docs/architecture/deployment.md`](docs/architecture/deployment.md)                   |
