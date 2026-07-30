# User Guide — Running a DPIA in Shieldwise

This guide walks a Data Protection Officer or Privacy Engineer through a
complete DPIA lifecycle.

## 1. Decide whether you need a DPIA

Before creating a formal DPIA, use the AI classifier to screen a processing
activity:

1. From the dashboard, open the **AI Assistant** panel (or start a new DPIA
   and describe the activity in the title/description).
2. Describe the processing in plain language — what data, from whom, for
   what purpose, using what technology.
3. The classifier returns detected data categories, whether it's special
   category/children's/criminal offence data, AI/automated-decision
   involvement, and a `dpiaRequired` verdict (`REQUIRED` / `RECOMMENDED` /
   `NOT_REQUIRED`) with a cited rationale against Article 35(3) and the ICO
   screening checklist.

## 2. Create the DPIA

**DPIAs → New DPIA.** Give it a title and optional description. It's created
from the built-in UK GDPR questionnaire template in `DRAFT` status.

## 3. Complete the adaptive questionnaire

The questionnaire is organised into sections (Processing context, Data and
data subjects, Technology and security, Sharing and international
transfers, Rights/transparency/consultation). Questions reveal follow-ups
based on your answers — answering "yes" to "does the processing involve
children" reveals age-assurance follow-up questions; selecting "Health data"
as a category feeds the risk engine's special-category rules.

- Answers **autosave** as you type (a "Saved" indicator confirms).
- Click **Improve with AI** next to any free-text answer to get a critique
  and an improved rewrite you can accept or edit further.
- Progress toward completion is shown as a percentage at the top of the
  questionnaire — this only counts _visible, required_ questions, so it
  won't ask you to answer questions that don't apply based on your other
  answers.

## 4. Model the data flow (optional but recommended)

On the **Data flow** tab, add nodes for each system, API, database, user
type, vendor, and cloud service involved, and draw flows between them.
Saving automatically flags:

- Cross-border transfers (based on node country vs. UK adequacy)
- Third-party processor exposure
- Unencrypted flows, especially where they carry sensitive data categories
- Trust-boundary crossings

These findings feed directly into the automated risk assessment.

## 5. Submit for review

Once all required, visible questions are answered, **Submit for review**
becomes available under the workflow actions at the top of the DPIA. This:

- Runs the automated risk engine against your full answer set and data flow
- Moves the DPIA to `IN_REVIEW`
- Makes the questionnaire read-only until it's returned to draft

## 6. Review the identified risks

The **Risks** tab shows every automatically identified risk: title,
description, likelihood/impact, inherent and residual score, residual
level, and status, each with legal/guidance citations and recommended
controls. As controls are marked `IMPLEMENTED` (Controls tab or per-risk),
the residual score recalculates automatically.

You can also add manual risks the automated engine doesn't cover — click
**Add risk** on the Risk register page and set likelihood/impact yourself.

## 7. Route through approval

Depending on your organisation's configuration, a submitted DPIA moves
through some combination of Legal review → Security review → DPO approval →
Executive approval, each requiring the appropriate role. Some transitions
require a comment (e.g. rejecting or returning to draft) — the UI will
prompt for it. Every transition is recorded in the **History** tab.

## 8. Approve, implement, monitor

Once approved, mark controls as implemented as work completes. Moving to
`MONITORING` starts the periodic review clock — Shieldwise flags DPIAs due for
re-assessment on the dashboard 60 days ahead of their next review date.

## 9. Export a report

From any DPIA, **Export report** generates a PDF (or DOCX/HTML/Markdown/
CSV/JSON via the API) using one of six templates: full DPIA, ICO-ready,
board report, DPO report, audit report, or executive summary. The executive
summary can also be AI-generated in plain business language via the AI
assistant.

## Tips

- Use the **AI Assistant** panel throughout — it has context on the current
  DPIA when opened from a DPIA's detail page, so you can ask "what does
  Art. 28 require for our processor contract?" and get an answer grounded
  in the actual guidance, cited.
- Evidence (policies, contracts, security reports) can be uploaded from the
  **Evidence** section and linked to specific DPIAs or controls to support
  audit trails.
