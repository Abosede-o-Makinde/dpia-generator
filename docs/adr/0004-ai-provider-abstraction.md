# ADR 0004: Provider-agnostic AI service with a self-hosted escape hatch

## Status

Accepted

## Context

The platform's AI features (classification, chat, answer improvement,
summarisation) need an LLM backend. Organisations evaluating a privacy
platform have justifiably strict, varied constraints on sending data to
third-party AI providers — some cannot use a hosted LLM at all for
regulatory or contractual reasons.

## Decision

`apps/ai/app/providers/` defines one interface (`LLMProvider.complete`)
implemented by three backends selected via `AI_PROVIDER`: `anthropic`
(default — Claude Opus 4.8, adaptive thinking, high effort, suited to the
legal/regulatory reasoning this service performs), `openai` (any
OpenAI-compatible chat completions endpoint), and `local` (self-hosted model
behind an OpenAI-compatible API — Ollama, vLLM, etc.), which is a thin
subclass of the OpenAI provider pointed at a local base URL.

## Rationale

- Every route handler (`routers/classify.py`, `chat.py`, `improve.py`,
  `summarise.py`) depends on `LLMProvider` via FastAPI's dependency
  injection (`Depends(get_provider)`), not a concrete client — swapping
  providers is a config change, not a code change, and the same abstraction
  makes the endpoints trivially unit-testable with a mock provider (see
  `apps/ai/tests/test_classify_endpoint.py`).
- Choosing Anthropic as the default (rather than being provider-neutral by
  default) reflects that this service does non-trivial regulatory reasoning
  — classifying processing activities against Article 35(3) triggers and
  the ICO screening checklist benefits materially from a frontier model's
  reasoning depth. Adaptive thinking at high effort is used specifically for
  this reason (see `anthropic_provider.py`), not enabled uniformly across
  all possible use cases.
- The `local` option is not a token gesture — it's a first-class
  deployment path for organisations that must not send data to any external
  API, satisfying the international-transfer concern documented in
  [`privacy-model.md`](../security/privacy-model.md).

## Consequences

- Structured output (the classification JSON contract) is achieved via
  prompt engineering + Pydantic validation with a single retry on parse
  failure (`_extract_json` in `routers/classify.py`), rather than a
  provider-specific structured-output feature — this keeps the contract
  portable across all three providers, at the cost of not using Anthropic's
  native structured-outputs feature for the default provider. Revisit if
  parse-failure rates in production justify a provider-specific fast path.
- Response quality and latency will differ materially between providers —
  documented in `apps/ai/README.md`, not hidden behind a false appearance
  of uniformity.
- Sampling parameters (`temperature`, `top_p`) are deliberately never set on
  the Anthropic provider, since Claude Opus 4.7/4.8 reject them — the
  abstraction's `complete()` signature has no sampling-parameter field at
  all, so a provider that _does_ support them (OpenAI) uses its own
  defaults rather than the interface exposing a parameter one provider
  can't accept.
