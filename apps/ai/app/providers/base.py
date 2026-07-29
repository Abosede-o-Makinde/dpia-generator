from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LLMResponse:
    text: str
    model: str
    usage: dict[str, int] | None = None
    refused: bool = False


class LLMProvider(ABC):
    """Provider-agnostic chat completion interface.

    Implementations must not raise on a model-level refusal — return
    `LLMResponse(refused=True, ...)` instead, so callers can branch without
    a try/except around every call site.
    """

    @abstractmethod
    async def complete(
        self,
        system: str,
        messages: list[dict[str, str]],
        max_tokens: int = 4096,
    ) -> LLMResponse: ...
