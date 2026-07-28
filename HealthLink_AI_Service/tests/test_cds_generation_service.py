from __future__ import annotations

from fastapi.testclient import TestClient
import logging
import pytest
from pydantic import ValidationError

from config import Config
from main import app
from models.cds_schemas import CdsGenerateRequest
from services.cds_generation_service import CdsGenerationError, CdsGenerationService
from services.openrouter_fallback_service import OpenRouterFallbackService


def valid_request_payload() -> dict:
    return {
        "schemaVersion": "cds-schema-v1",
        "runId": "run-synthetic-001",
        "promptVersion": "cds-prompt-v1",
        "deidentifiedSnapshot": {
            "clinicalFacts": [{"code": "FASTING_GLUCOSE", "value": "7.8", "unit": "mmol/L"}],
            "contextCodes": ["ADULT"],
        },
        "ruleFindings": [{"code": "RULE-GLUCOSE-REVIEW", "severity": "CRITICAL"}],
        "evidenceChunks": [{
            "chunkId": "chunk-1", "documentId": "synthetic-glucose-guide", "title": "Synthetic glucose guidance",
            "issuer": "HealthLink Student Demo", "version": "2026.1", "effectiveDate": "2026-01-01",
            "sectionPath": "Review", "page": 1, "text": "Synthetic evidence for doctor review.",
            "checksum": "a" * 64, "licenseClass": "STUDENT_DEMO_ONLY", "corpusVersion": "student-demo-2026.1",
        }],
    }


def valid_model_response(**changes) -> dict:
    output = {
        "urgency": "SOON",
        "clinicalSummary": "Synthetic result requires review of RULE-GLUCOSE-REVIEW.",
        "abnormalFindings": ["Synthetic fasting glucose finding."],
        "possibleExplanations": [],
        "differentialDiagnoses": [],
        "recommendedAdditionalTests": [],
        "treatmentOptionsForDoctorReview": [],
        "drugWarnings": ["RULE-GLUCOSE-REVIEW"],
        "missingInformation": [],
        "evidence": [{"evidenceId": "chunk-1"}],
        "confidence": "LOW",
        "requiresDoctorApproval": True,
    }
    output.update(changes)
    return output


class QualifiedLocalClient:
    def list(self):
        return {"models": [{
            "name": "qwen3:4b-instruct-2507-q4_K_M",
            "digest": "sha256:0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0",
        }]}

    def generate(self, **_kwargs):
        return {"response": valid_model_response()}


class JsonStringQualifiedLocalClient(QualifiedLocalClient):
    def generate(self, **_kwargs):
        return {"response": __import__("json").dumps(valid_model_response())}


def test_generation_service_returns_only_citations_supplied_by_approved_evidence():
    request = CdsGenerateRequest.model_validate(valid_request_payload())

    result = CdsGenerationService(client=QualifiedLocalClient()).generate(request)

    assert result.requires_doctor_approval is True
    assert [citation.evidence_id for citation in result.evidence] == ["chunk-1"]


def test_generation_service_accepts_the_json_string_returned_by_ollama():
    request = CdsGenerateRequest.model_validate(valid_request_payload())

    result = CdsGenerationService(client=JsonStringQualifiedLocalClient()).generate(request)

    assert result.clinical_summary == "Synthetic result requires review of RULE-GLUCOSE-REVIEW."


def test_generation_uses_the_context_window_qualified_in_t09():
    class CapturingClient(QualifiedLocalClient):
        def __init__(self):
            self.options = None

        def generate(self, **kwargs):
            self.options = kwargs["options"]
            return super().generate(**kwargs)

    client = CapturingClient()
    CdsGenerationService(client=client).generate(CdsGenerateRequest.model_validate(valid_request_payload()))

    assert client.options["num_ctx"] == 4096


def test_generation_service_fails_closed_when_local_model_fabricates_a_citation():
    class FabricatingClient(QualifiedLocalClient):
        def generate(self, **_kwargs):
            return {"response": valid_model_response(evidence=[{"evidenceId": "invented"}])}

    request = CdsGenerateRequest.model_validate(valid_request_payload())

    with pytest.raises(CdsGenerationError, match="CITATION_INVALID"):
        CdsGenerationService(client=FabricatingClient()).generate(request)


def test_generation_repairs_one_invalid_initial_json_without_resending_clinical_context():
    class RepairingClient(QualifiedLocalClient):
        def __init__(self):
            self.calls = []

        def generate(self, **kwargs):
            self.calls.append(kwargs)
            return {"response": "not valid json" if len(self.calls) == 1 else valid_model_response()}

    client = RepairingClient()
    result = CdsGenerationService(client=client).generate(CdsGenerateRequest.model_validate(valid_request_payload()))

    assert result.requires_doctor_approval is True
    assert len(client.calls) == 2
    assert client.calls[0]["model"] == client.calls[1]["model"] == Config.CDS_LOCAL_MODEL
    assert "FASTING_GLUCOSE" not in client.calls[1]["prompt"]
    assert "not valid json" in client.calls[1]["prompt"]


def test_generation_does_not_repair_a_fabricated_citation():
    class FabricatingClient(QualifiedLocalClient):
        def __init__(self):
            self.calls = 0

        def generate(self, **_kwargs):
            self.calls += 1
            return {"response": valid_model_response(evidence=[{"evidenceId": "invented"}])}

    client = FabricatingClient()

    with pytest.raises(CdsGenerationError, match="CITATION_INVALID"):
        CdsGenerationService(client=client).generate(CdsGenerateRequest.model_validate(valid_request_payload()))

    assert client.calls == 1


def test_generation_failure_logs_only_the_safe_exception_type(caplog):
    class FailingClient(QualifiedLocalClient):
        def generate(self, **_kwargs):
            raise RuntimeError("must-not-appear-in-log")

    request = CdsGenerateRequest.model_validate(valid_request_payload())
    with caplog.at_level(logging.WARNING, logger="services.cds_generation_service"):
        with pytest.raises(CdsGenerationError, match="FALLBACK_DISABLED"):
            CdsGenerationService(client=FailingClient()).generate(request)

    assert "cause_type=RuntimeError" in caplog.text
    assert "must-not-appear-in-log" not in caplog.text


def test_eligible_local_failure_can_use_only_an_explicitly_approved_fake_fallback():
    class FailingClient(QualifiedLocalClient):
        def generate(self, **_kwargs):
            raise TimeoutError("synthetic timeout")

    calls = []
    fallback = OpenRouterFallbackService(
        enabled=True,
        deployment_approved=True,
        zdr_ready=True,
        data_collection="deny",
        privacy_allowed=lambda payload: "deidentifiedSnapshot" in payload and "patientId" not in payload,
        transport=lambda payload: calls.append(payload) or valid_model_response(),
    )

    result = CdsGenerationService(client=FailingClient(), fallback=fallback).generate(
        CdsGenerateRequest.model_validate(valid_request_payload())
    )

    assert result.requires_doctor_approval is True
    assert len(calls) == 1
    assert calls[0]["schemaVersion"] == "cds-schema-v1"
    assert "patientId" not in calls[0]


def test_generation_endpoint_requires_worker_key_and_rejects_patient_identifiers(monkeypatch):
    monkeypatch.setattr(Config, "AI_SERVICE_KEY", "synthetic-test-worker-key", raising=False)
    payload = valid_request_payload()
    payload["patientId"] = "must-not-be-accepted"
    client = TestClient(app, raise_server_exceptions=False)

    missing_key = client.post("/internal/v1/cds/generate", json=valid_request_payload())
    rejected = client.post(
        "/internal/v1/cds/generate",
        headers={"X-HealthLink-Worker-Key": "synthetic-test-worker-key"},
        json=payload,
    )

    assert missing_key.status_code == 401
    assert rejected.status_code == 422
    assert rejected.json()["detail"]["code"] == "CDS_REQUEST_REJECTED"


@pytest.mark.parametrize(
    ("code", "value"),
    [
        ("PATIENT_ID", "synthetic-001"),
        ("SYMPTOMS", "patient@example.test"),
        ("SYMPTOMS", "+84901234567"),
        ("SYMPTOMS", "123e4567-e89b-42d3-a456-426614174000"),
        ("SYMPTOMS", "laboratory-report.pdf"),
        ("SYMPTOMS", "2026-07-27"),
    ],
)
def test_generation_request_rejects_nested_direct_identifiers(code, value):
    payload = valid_request_payload()
    payload["deidentifiedSnapshot"]["clinicalFacts"] = [{"code": code, "value": value}]

    with pytest.raises(ValidationError):
        CdsGenerateRequest.model_validate(payload)


def test_generation_endpoint_reports_disabled_fallback_as_service_unavailable(monkeypatch):
    monkeypatch.setattr(Config, "AI_SERVICE_KEY", "synthetic-test-worker-key", raising=False)

    def disabled_fallback(_self, _request):
        raise CdsGenerationError("FALLBACK_DISABLED")

    monkeypatch.setattr(CdsGenerationService, "generate", disabled_fallback)
    client = TestClient(app, raise_server_exceptions=False)

    response = client.post(
        "/internal/v1/cds/generate",
        headers={"X-HealthLink-Worker-Key": "synthetic-test-worker-key"},
        json=valid_request_payload(),
    )

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "FALLBACK_DISABLED"


def test_health_reports_the_qualified_cds_model(monkeypatch):
    monkeypatch.setattr(Config, "CDS_LOCAL_MODEL", "qwen3:4b-instruct-2507-q4_K_M", raising=False)
    monkeypatch.setattr(Config, "CDS_LOCAL_MODEL_DIGEST", "0edcdef34593", raising=False)
    client = TestClient(app, raise_server_exceptions=False)

    health = client.get("/health")

    assert health.status_code == 200
    assert health.json()["dependencies"]["cds"]["model"] == "qwen3:4b-instruct-2507-q4_K_M"
    assert health.json()["dependencies"]["cds"]["qualifiedDigest"] == "0edcdef34593"
