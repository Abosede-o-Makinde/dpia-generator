from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment configuration, validated once at import time (fail-fast)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    NODE_ENV: str = "development"
    PORT: int = 8000

    AI_SERVICE_TOKEN: str = ""

    AI_PROVIDER: Literal["anthropic", "openai", "local"] = "anthropic"

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-opus-4-8"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    # Optional OpenAI-compatible base (e.g. Gemini:
    # https://generativelanguage.googleapis.com/v1beta/openai/)
    OPENAI_BASE_URL: str = ""

    LOCAL_LLM_BASE_URL: str = "http://localhost:11434/v1"
    LOCAL_LLM_MODEL: str = "llama3.1"

    LOG_LEVEL: str = "info"


@lru_cache
def get_settings() -> Settings:
    return Settings()
