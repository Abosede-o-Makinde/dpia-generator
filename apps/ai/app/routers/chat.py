import json

from fastapi import APIRouter, Depends

from ..auth import verify_service_token
from ..prompts import CHAT_SYSTEM
from ..providers.base import LLMProvider
from ..providers.factory import get_provider
from ..rag.retriever import format_context, get_retriever
from ..schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/v1", tags=["chat"], dependencies=[Depends(verify_service_token)])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    provider: LLMProvider = Depends(get_provider),
) -> ChatResponse:
    last_user = next((m for m in reversed(req.messages) if m.role == "user"), None)
    guidance = ""
    if last_user:
        chunks = get_retriever().search(last_user.content, k=4)
        guidance = format_context(chunks)

    system = CHAT_SYSTEM
    if guidance:
        system += f"\n\nRelevant guidance excerpts for this conversation:\n\n{guidance}"
    if req.context:
        system += f"\n\nDPIA context:\n{json.dumps(req.context)}"

    response = await provider.complete(
        system=system,
        messages=[
            {"role": m.role, "content": m.content} for m in req.messages if m.role != "system"
        ],
        max_tokens=4096,
    )
    reply = (
        response.text
        if not response.refused
        else (
            "I'm not able to help with that request. If you believe this is an error, "
            "please rephrase or contact your DPO."
        )
    )
    return ChatResponse(reply=reply, model=response.model, usage=response.usage)
