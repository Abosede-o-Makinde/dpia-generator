import json

from fastapi import APIRouter, Depends, HTTPException

from ..auth import verify_service_token
from ..prompts import SUMMARY_SYSTEM
from ..providers.base import LLMProvider
from ..providers.factory import get_provider
from ..schemas import SummariseRequest, SummariseResponse

router = APIRouter(prefix="/v1", tags=["summarise"], dependencies=[Depends(verify_service_token)])


@router.post("/summarise", response_model=SummariseResponse)
async def summarise(
    req: SummariseRequest,
    provider: LLMProvider = Depends(get_provider),
) -> SummariseResponse:
    response = await provider.complete(
        system=SUMMARY_SYSTEM,
        messages=[{"role": "user", "content": json.dumps(req.dpia, default=str)}],
        max_tokens=1024,
    )
    if response.refused:
        raise HTTPException(status_code=422, detail="Summary declined by the model")
    return SummariseResponse(summary=response.text.strip(), model=response.model)
