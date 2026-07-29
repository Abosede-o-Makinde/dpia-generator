import json
import re

from fastapi import APIRouter, Depends, HTTPException

from ..auth import verify_service_token
from ..prompts import IMPROVE_SYSTEM
from ..providers.base import LLMProvider
from ..providers.factory import get_provider
from ..schemas import ImproveRequest, ImproveResponse

router = APIRouter(prefix="/v1", tags=["improve"], dependencies=[Depends(verify_service_token)])


def _extract_json(text: str) -> dict:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```[a-zA-Z]*\n?", "", stripped)
        stripped = re.sub(r"```$", "", stripped.strip())
    return json.loads(stripped)


@router.post("/improve", response_model=ImproveResponse)
async def improve(
    req: ImproveRequest,
    provider: LLMProvider = Depends(get_provider),
) -> ImproveResponse:
    user_prompt = f"Question: {req.question}\n\nDraft answer:\n{req.draft}"
    if req.context:
        user_prompt += f"\n\nDPIA context: {json.dumps(req.context)}"

    response = await provider.complete(
        system=IMPROVE_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
        max_tokens=2048,
    )
    if response.refused:
        raise HTTPException(status_code=422, detail="Request declined by the model")

    try:
        parsed = _extract_json(response.text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Model returned malformed output") from exc

    return ImproveResponse(
        improved=parsed["improved"], issues=parsed.get("issues", []), model=response.model
    )
