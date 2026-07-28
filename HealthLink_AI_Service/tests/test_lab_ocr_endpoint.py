import hashlib
import json
from pathlib import Path

from fastapi.testclient import TestClient

from config import Config
from main import app


FIXTURE = Path(__file__).parent / "fixtures" / "lab_ocr" / "synthetic_glucose_detections.json"


def test_lab_ocr_endpoint_requires_worker_key(monkeypatch):
    monkeypatch.setattr(Config, "AI_SERVICE_KEY", "synthetic-test-worker-key", raising=False)
    client = TestClient(app, raise_server_exceptions=False)

    response = client.post("/internal/v1/ocr/lab-reports", json={})

    assert response.status_code == 401


def test_lab_ocr_endpoint_returns_versioned_unverified_candidates(monkeypatch):
    from services import lab_ocr_pipeline

    synthetic_document = b"synthetic-lab-document"
    digest = hashlib.sha256(synthetic_document).hexdigest()
    monkeypatch.setattr(Config, "AI_SERVICE_KEY", "synthetic-test-worker-key", raising=False)
    monkeypatch.setattr(lab_ocr_pipeline, "download_grant", lambda _: synthetic_document)
    monkeypatch.setattr(
        lab_ocr_pipeline,
        "extract_pages",
        lambda _content, _mime_type: [(300, 400, json.loads(FIXTURE.read_text(encoding="utf-8")))],
    )
    client = TestClient(app, raise_server_exceptions=False)

    response = client.post(
        "/internal/v1/ocr/lab-reports",
        headers={
            "X-HealthLink-Worker-Key": "synthetic-test-worker-key",
            "X-Correlation-ID": "synthetic-correlation-id",
        },
        json={
            "jobId": "6e1efb4c-1b53-422d-9b54-659b99e3a81e",
            "reportId": "6f0be604-052f-4dc4-827b-c566f4ebfef0",
            "objectGrant": "http://minio.test/synthetic?X-Amz-Expires=60",
            "mimeType": "application/pdf",
            "sha256": digest,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert response.headers["X-Correlation-ID"] == "synthetic-correlation-id"
    assert body["schemaVersion"] == "1.0"
    assert body["sha256"] == digest
    assert body["observations"][0]["verificationStatus"] == "UNVERIFIED"
    assert body["observations"][0]["sourceBoundingBox"] == {"x": 0.0, "y": 0.0, "width": 0.85, "height": 0.045}
    assert body["processingMetrics"] == {"pageCount": 1, "candidateCount": 1, "lowConfidenceCount": 0}
