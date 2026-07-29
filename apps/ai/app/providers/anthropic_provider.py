import anthropic
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .base import LLMProvider, LLMResponse


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider.

    Uses adaptive thinking at high effort — appropriate for the legal/
    regulatory reasoning this service performs (DPIA classification, risk
    rationale). Opus 4.7/4.8 reject sampling parameters and manual thinking
    budgets, so neither is set here.
    """

    def __init__(self, api_key: str, model: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model

    @retry(
        retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APIConnectionError)),
        wait=wait_exponential(multiplier=1, min=1, max=20),
        stop=stop_after_attempt(4),
    )
    async def complete(
        self,
        system: str,
        messages: list[dict[str, str]],
        max_tokens: int = 4096,
    ) -> LLMResponse:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,  # type: ignore[arg-type]
            thinking={"type": "adaptive"},
            output_config={"effort": "high"},
        )

        if response.stop_reason == "refusal":
            return LLMResponse(text="", model=response.model, refused=True)

        text = "".join(block.text for block in response.content if block.type == "text")
        usage = {
            "inputTokens": response.usage.input_tokens,
            "outputTokens": response.usage.output_tokens,
        }
        return LLMResponse(text=text, model=response.model, usage=usage)
