from functools import lru_cache

from ..config import get_settings
from .anthropic_provider import AnthropicProvider
from .base import LLMProvider
from .local_provider import LocalProvider
from .openai_provider import OpenAIProvider


@lru_cache
def get_provider() -> LLMProvider:
    settings = get_settings()
    if settings.AI_PROVIDER == "anthropic":
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic")
        return AnthropicProvider(settings.ANTHROPIC_API_KEY, settings.ANTHROPIC_MODEL)
    if settings.AI_PROVIDER == "openai":
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is required when AI_PROVIDER=openai")
        return OpenAIProvider(settings.OPENAI_API_KEY, settings.OPENAI_MODEL)
    if settings.AI_PROVIDER == "local":
        return LocalProvider(settings.LOCAL_LLM_BASE_URL, settings.LOCAL_LLM_MODEL)
    raise RuntimeError(f"Unknown AI_PROVIDER: {settings.AI_PROVIDER}")
