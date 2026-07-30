# ADR 0003: Deterministic, rule-based risk scoring (not LLM-scored)

## Status

Accepted

## Context

The platform needed to translate DPIA answers into risk levels. Given the
AI capabilities elsewhere in the platform, an obvious option was to have the
LLM itself assign likelihood/impact/level per risk.

## Decision

Risk scoring is a deterministic, declarative rule engine
(`packages/shared/src/risk.ts` + `apps/api/src/modules/risks/risk-rules.ts`):
each rule has a fixed likelihood/impact, a condition evaluated against the
DPIA's fact map, and configurable modifier weights (special category,
large-scale, children, cross-border, etc.) that multiply the base score.
`residual = inherent × (1 − combined control effectiveness)`. The AI service
is used for _classification_ (what data categories, is a DPIA required) and
_explanation_, never for assigning the numeric risk score itself.

## Rationale

- **Reproducibility.** Given the same answers, the same risks and scores
  must be produced every time — a regulator or auditor reviewing two DPIAs
  months apart needs to trust the scoring didn't silently drift because a
  model version changed. An LLM-scored system cannot make this guarantee
  even with `temperature=0` (no determinism guarantee across model versions
  or provider infrastructure changes).
- **Explainability.** Every risk's score decomposes into named factors
  (likelihood, impact, which modifiers applied, why) that can be shown to
  the person reviewing it and traced back to the specific rule and legal
  citation that fired. An LLM's score is a single opaque number with, at
  best, a post-hoc rationale that may not actually describe the mechanism
  that produced the number.
- **Configurability without redeployment.** `RiskScoringConfig` (thresholds,
  modifier weights) is stored in `Organisation.settings` and read at
  evaluation time — an organisation with a stricter risk appetite can tune
  thresholds without a code change or LLM prompt change.
- **Cost and latency.** Risk evaluation runs synchronously on every DPIA
  submission and data-flow save; a rule engine evaluating ~20 conditions
  against a fact map is sub-millisecond, versus a multi-second (or,
  adaptive-thinking, multi-minute) LLM call per risk, per submission.

## Consequences

- New risk types require a new rule (code + legal citation), reviewed under
  the privacy-content bar in `CONTRIBUTING.md` — not a prompt tweak. This is
  intentionally higher-friction than editing a prompt, matching the
  seriousness of the content.
- The AI classification step still materially shapes which risks fire,
  because its output (special category, children's data, AI processing,
  etc.) feeds the fact map the deterministic rules evaluate against — so
  AI involvement and deterministic scoring are complementary, not
  competing, design choices.
- A future DB-backed rule editor (tracked in the roadmap) can be built on
  the same `RiskRule`/condition-DSL model without changing this ADR's
  premise — only where rules are authored, not how they're evaluated.
