import json
import logging
import re

from fastapi import APIRouter, Depends, HTTPException

from ..auth import verify_service_token
from ..prompts import CLASSIFY_SYSTEM
from ..providers.base import LLMProvider
from ..providers.factory import get_provider
from ..rag.retriever import format_context, get_retriever
from ..schemas import ClassificationResult, ClassifyRequest

logger = logging.getLogger("shieldwise.ai.classify")
router = APIRouter(prefix="/v1", tags=["classify"], dependencies=[Depends(verify_service_token)])


def _extract_json(text: str) -> dict:
    """Models occasionally wrap JSON in markdown fences despite instructions; strip them."""
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```[a-zA-Z]*\n?", "", stripped)
        stripped = re.sub(r"```$", "", stripped.strip())
    return json.loads(stripped)


@router.post("/classify", response_model=ClassificationResult, response_model_by_alias=True)
async def classify(
    req: ClassifyRequest,
    provider: LLMProvider = Depends(get_provider),
) -> ClassificationResult:
    retriever = get_retriever()
    chunks = retriever.search(req.description, k=6)
    guidance = format_context(chunks)

    user_prompt = (
        f"Relevant guidance excerpts:\n\n{guidance}\n\n---\n\n"
        f"Processing activity description:\n{req.description}"
    )
    if req.context:
        user_prompt += f"\n\nAdditional context: {json.dumps(req.context)}"

    response = await provider.complete(
        system=CLASSIFY_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
        max_tokens=4096,
    )
    if response.refused:
        raise HTTPException(status_code=422, detail="Classification declined by the model")

    try:
        parsed = _extract_json(response.text)
    except json.JSONDecodeError:
        logger.warning("classify: retrying after malformed JSON from model %s", response.model)
        retry = await provider.complete(
            system=CLASSIFY_SYSTEM,
            messages=[
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": response.text},
                {
                    "role": "user",
                    "content": "That was not valid JSON. Respond with ONLY the JSON object.",
                },
            ],
            max_tokens=4096,
        )
        parsed = _extract_json(retry.text)
        response = retry

    parsed["model"] = response.model
    return ClassificationResult.model_validate(parsed)
