from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from config import Config
from models.rag_schemas import RagRetrieveResponse
from main import app
from models.rag_schemas import RagRetrieveRequest
from services.rag_retrieval_service import GuidelineRetrievalService


class SyntheticEmbedding:
    def embed(self, _query: str) -> list[float]:
        return [0.0] * 384


def test_retrieval_returns_insufficient_evidence_when_no_hit_meets_threshold():
    service = GuidelineRetrievalService(
        "http://qdrant.test",
        "student-demo-guidelines",
        minimum_score=0.75,
        embedding=SyntheticEmbedding(),
        search=lambda _body: {"result": [
            {"score": 0.74, "payload": {"chunkId": "ignored"}},
        ]},
    )

    result = service.retrieve(query="verified fasting glucose", top_k=3)

    assert result.insufficient_evidence is True
    assert result.chunks == []


def test_retrieval_returns_only_contract_citations_from_active_corpus():
    checksum = "a" * 64
    service = GuidelineRetrievalService(
        "http://qdrant.test",
        "student-demo-guidelines",
        minimum_score=0.75,
        embedding=SyntheticEmbedding(),
        search=lambda _body: {"result": [
            {
                "score": 0.91,
                "payload": {
                    "chunkId": "chunk-1", "documentId": "glucose-guide", "title": "Synthetic glucose guide",
                    "issuer": "HealthLink Student Demo", "version": "2026.1", "effectiveDate": "2026-01-01",
                    "sectionPath": "Verified values", "page": 2, "text": "Doctor review only.",
                    "checksum": checksum, "licenseClass": "STUDENT_DEMO_ONLY", "corpusVersion": "student-demo-2026.1",
                },
            },
        ]},
    )

    result = service.retrieve(query="verified fasting glucose", corpus_version="student-demo-2026.1")

    assert result.insufficient_evidence is False
    assert result.chunks[0].chunk_id == "chunk-1"
    assert result.chunks[0].score == 0.91
    assert result.chunks[0].checksum == checksum


def test_retrieval_reads_qdrant_points_envelope():
    checksum = "b" * 64
    service = GuidelineRetrievalService(
        "http://qdrant.test",
        "student-demo-guidelines",
        embedding=SyntheticEmbedding(),
        search=lambda _body: {"result": {"points": [{
            "score": 0.91,
            "payload": {
                "chunkId": "chunk-2", "documentId": "who-hearts-d-type-2-diabetes-2020",
                "title": "Synthetic diabetes guide", "issuer": "World Health Organization",
                "version": "2020", "effectiveDate": "2020-04-22", "sectionPath": "Diagnosis",
                "page": 2, "text": "Doctor review only.", "checksum": checksum,
                "licenseClass": "STUDENT_DEMO_ONLY", "corpusVersion": "student-demo-2026.1",
            },
        }] }},
    )

    result = service.retrieve(query="type 2 diabetes")

    assert result.insufficient_evidence is False
    assert [chunk.chunk_id for chunk in result.chunks] == ["chunk-2"]


def test_retrieval_uses_qdrant_query_field_for_the_embedding_vector():
    captured = {}

    def capture_search(body):
        captured.update(body)
        return {"result": []}

    service = GuidelineRetrievalService(
        "http://qdrant.test", "student-demo-guidelines", embedding=SyntheticEmbedding(), search=capture_search,
    )

    service.retrieve(query="type 2 diabetes")

    assert captured["query"] == [0.0] * 384
    assert "vector" not in captured


def test_retrieval_fails_closed_when_requested_language_is_not_in_chunk_contract():
    service = GuidelineRetrievalService(
        "http://qdrant.test", "student-demo-guidelines", embedding=SyntheticEmbedding(),
        search=lambda _body: {"result": []},
    )

    result = service.retrieve(query="glucose", language="vi")

    assert result.insufficient_evidence is True
    assert result.chunks == []


def test_retrieval_request_rejects_patient_or_prompt_fields():
    with pytest.raises(ValueError):
        RagRetrieveRequest.model_validate({"query": "glucose", "patientId": "must-not-be-accepted"})


def test_internal_retrieval_endpoint_uses_configured_active_collection(monkeypatch):
    captured = {}

    class FakeRetrievalService:
        def __init__(self, _base_url, collection, *, api_key):
            captured["collection"] = collection

        def retrieve(self, **_kwargs):
            return RagRetrieveResponse(insufficientEvidence=True, chunks=[])

    monkeypatch.setattr("services.rag_retrieval_service.GuidelineRetrievalService", FakeRetrievalService)

    response = TestClient(app).post(
        "/internal/v1/rag/retrieve",
        headers={"X-HealthLink-Worker-Key": Config.AI_SERVICE_KEY},
        json={"query": "glucose"},
    )

    assert response.status_code == 200
    assert captured["collection"] == Config.GUIDELINE_COLLECTION
