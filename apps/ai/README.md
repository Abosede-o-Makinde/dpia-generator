# Shieldwise AI Service

FastAPI microservice providing the platform's AI capabilities: UK GDPR processing
classification, the privacy assistant chat, answer improvement, and executive
summary generation. Called only by the NestJS API (`apps/api`) over a
service-token-authenticated internal link — never exposed directly to browsers.

## Run locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp ../../.env.example .env   # or export the AI_* vars directly
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
pytest
```

## Provider abstraction

`app/providers/` implements one interface (`LLMProvider.complete`) against three
backends, selected by `AI_PROVIDER`:

- `anthropic` (default) — Claude Opus 4.8 via the official SDK, adaptive
  thinking at high effort for the legal/regulatory reasoning this service does.
- `openai` — any OpenAI-compatible chat completions endpoint.
- `local` — self-hosted model behind an OpenAI-compatible API (Ollama, vLLM).

## RAG

`app/rag/` retrieves supporting UK GDPR / ICO guidance excerpts before every
classification and chat request, so responses cite a source rather than
hallucinating one. It uses a pure-Python BM25 index over
`app/rag/documents/uk_gdpr_guidance.json` — zero extra infrastructure.
