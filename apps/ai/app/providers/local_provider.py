from .openai_provider import OpenAIProvider


class LocalProvider(OpenAIProvider):
    """Local/self-hosted LLM via an OpenAI-compatible endpoint (e.g. Ollama, vLLM).

    No API key is required by most local servers; a placeholder satisfies the
    OpenAI client's constructor requirement.
    """

    def __init__(self, base_url: str, model: str):
        super().__init__(api_key="local", model=model, base_url=base_url)
