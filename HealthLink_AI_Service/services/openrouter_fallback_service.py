"""Cloud fallback is intentionally disabled for the T10 local-only path."""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any


_ELIGIBLE_LOCAL_FAILURES = {"LOCAL_MODEL_UNAVAILABLE", "LOCAL_MODEL_TIMEOUT", "LOCAL_MODEL_NOT_FOUND"}


class OpenRouterFallbackService:
    def __init__(
        self,
        *,
        enabled: bool = False,
        deployment_approved: bool = False,
        zdr_ready: bool = False,
        data_collection: str = "allow",
        privacy_allowed: Callable[[Mapping[str, Any]], bool] | None = None,
        transport: Callable[[Mapping[str, Any]], object] | None = None,
    ) -> None:
        self._enabled = enabled
        self._deployment_approved = deployment_approved
        self._zdr_ready = zdr_ready
        self._data_collection = data_collection
        self._privacy_allowed = privacy_allowed or (lambda _payload: False)
        self._transport = transport

    def generate(self, payload: Mapping[str, Any], *, local_error_code: str) -> object:
        """Dispatch only an approved, de-identified infrastructure recovery request."""
        from services.cds_generation_service import CdsGenerationError

        if not self._enabled:
            raise CdsGenerationError("FALLBACK_DISABLED")
        if local_error_code not in _ELIGIBLE_LOCAL_FAILURES:
            raise CdsGenerationError(local_error_code)
        if (
            not self._deployment_approved
            or not self._zdr_ready
            or self._data_collection != "deny"
            or not self._privacy_allowed(payload)
            or self._transport is None
        ):
            raise CdsGenerationError("FALLBACK_PRIVACY_BLOCKED")
        return self._transport(payload)
