from openai import AsyncOpenAI
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .base import LLMProvider, LLMResponse


class OpenAIProvider(LLMProvider):
    """OpenAI (or any OpenAI-compatible) chat completions provider."""

    def __init__(self, api_key: str, model: str, base_url: str | None = None):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    @retry(
        retry=retry_if_exception_type(Exception),
        wait=wait_exponential(multiplier=1, min=1, max=20),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    async def complete(
        self,
        system: str,
        messages: list[dict[str, str]],
        max_tokens: int = 4096,
    ) -> LLMResponse:
        response = await self.client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[{"role": "system", "content": system}, *messages],  # type: ignore[list-item]
        )
        choice = response.choices[0]
        text = choice.message.content or ""
        usage = None
        if response.usage:
            usage = {
                "inputTokens": response.usage.prompt_tokens,
                "outputTokens": response.usage.completion_tokens,
            }
        return LLMResponse(
            text=text,
            model=response.model,
            usage=usage,
            refused=choice.finish_reason == "content_filter",
        )
