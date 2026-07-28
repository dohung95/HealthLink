"""Authentication helpers for private AI worker endpoints."""

import hmac
from typing import Annotated
from uuid import uuid4

from fastapi import Header, HTTPException, status

from config import Config


def require_worker_key(
    worker_key: Annotated[
        str | None,
        Header(alias="X-HealthLink-Worker-Key"),
    ] = None,
) -> None:
    """Fail closed unless an internal caller supplies the configured worker key."""
    expected_key = Config.AI_SERVICE_KEY
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal worker authentication is not configured",
        )

    if worker_key is None or not hmac.compare_digest(worker_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal worker credentials",
        )


def correlation_id(
    request_correlation_id: Annotated[
        str | None,
        Header(alias="X-Correlation-ID"),
    ] = None,
) -> str:
    """Preserve a caller correlation ID or create a non-identifying replacement."""
    return request_correlation_id.strip() if request_correlation_id and request_correlation_id.strip() else str(uuid4())
