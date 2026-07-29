from fastapi import Header, HTTPException, status

from .config import get_settings


async def verify_service_token(authorization: str | None = Header(default=None)) -> None:
    """Server-to-server auth: the NestJS API is the only expected caller.

    No-op when AI_SERVICE_TOKEN is unset (local dev without the token
    configured) — production deployments must set it.
    """
    settings = get_settings()
    if not settings.AI_SERVICE_TOKEN:
        return
    expected = f"Bearer {settings.AI_SERVICE_TOKEN}"
    if authorization != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing service token"
        )
