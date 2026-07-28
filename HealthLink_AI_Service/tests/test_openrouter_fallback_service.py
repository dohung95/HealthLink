from __future__ import annotations

import pytest

from services.cds_generation_service import CdsGenerationError
from services.openrouter_fallback_service import OpenRouterFallbackService


def test_disabled_fallback_never_invokes_transport():
    calls = []
    fallback = OpenRouterFallbackService(enabled=False, transport=lambda payload: calls.append(payload))

    with pytest.raises(CdsGenerationError, match="FALLBACK_DISABLED"):
        fallback.generate({"synthetic": "deidentified"}, local_error_code="LOCAL_MODEL_UNAVAILABLE")

    assert calls == []


@pytest.mark.parametrize(
    "settings",
    [
        {"deployment_approved": False, "zdr_ready": True, "data_collection": "deny", "privacy_allowed": lambda _payload: True},
        {"deployment_approved": True, "zdr_ready": False, "data_collection": "deny", "privacy_allowed": lambda _payload: True},
        {"deployment_approved": True, "zdr_ready": True, "data_collection": "allow", "privacy_allowed": lambda _payload: True},
        {"deployment_approved": True, "zdr_ready": True, "data_collection": "deny", "privacy_allowed": lambda _payload: False},
    ],
)
def test_privacy_gates_fail_closed_without_transport(settings):
    calls = []
    fallback = OpenRouterFallbackService(enabled=True, transport=lambda payload: calls.append(payload), **settings)

    with pytest.raises(CdsGenerationError, match="FALLBACK_PRIVACY_BLOCKED"):
        fallback.generate({"synthetic": "deidentified"}, local_error_code="LOCAL_MODEL_UNAVAILABLE")

    assert calls == []


def test_approved_eligible_infrastructure_failure_calls_fake_transport_once():
    calls = []
    fallback = OpenRouterFallbackService(
        enabled=True,
        deployment_approved=True,
        zdr_ready=True,
        data_collection="deny",
        privacy_allowed=lambda payload: payload == {"synthetic": "deidentified"},
        transport=lambda payload: calls.append(payload) or {"response": "synthetic"},
    )

    result = fallback.generate({"synthetic": "deidentified"}, local_error_code="LOCAL_MODEL_UNAVAILABLE")

    assert result == {"response": "synthetic"}
    assert calls == [{"synthetic": "deidentified"}]


@pytest.mark.parametrize("local_error_code", ["MODEL_SCHEMA_INVALID", "CITATION_INVALID"])
def test_schema_and_citation_failures_are_not_fallback_eligible(local_error_code):
    calls = []
    fallback = OpenRouterFallbackService(
        enabled=True,
        deployment_approved=True,
        zdr_ready=True,
        data_collection="deny",
        privacy_allowed=lambda _payload: True,
        transport=lambda payload: calls.append(payload),
    )

    with pytest.raises(CdsGenerationError, match=local_error_code):
        fallback.generate({"synthetic": "deidentified"}, local_error_code=local_error_code)

    assert calls == []
