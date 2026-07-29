import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import chat, classify, improve, summarise

settings = get_settings()
logging.basicConfig(level=settings.LOG_LEVEL.upper())

app = FastAPI(
    title="Shieldwise AI Service",
    description=(
        "Privacy processing classification, DPIA drafting assistant, and RAG "
        "over UK GDPR / ICO guidance. Internal service — called only by the "
        "Shieldwise API, never exposed directly to browsers."
    ),
    version="0.1.0",
    docs_url="/docs" if settings.NODE_ENV != "production" else None,
    redoc_url=None,
)

app.include_router(classify.router)
app.include_router(chat.router)
app.include_router(improve.router)
app.include_router(summarise.router)


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "provider": settings.AI_PROVIDER})
