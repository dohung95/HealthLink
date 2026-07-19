from fastapi.testclient import TestClient

from config import Config
from main import app


def test_internal_dependency_health_rejects_missing_or_invalid_worker_key(monkeypatch):
    """Internal worker endpoints must never be reachable without the shared key."""
    monkeypatch.setattr(Config, "AI_SERVICE_KEY", "synthetic-test-worker-key", raising=False)
    client = TestClient(app, raise_server_exceptions=False)

    missing_key = client.get("/internal/health/dependencies")
    invalid_key = client.get(
        "/internal/health/dependencies",
        headers={"X-HealthLink-Worker-Key": "wrong-key"},
    )
    accepted = client.get(
        "/internal/health/dependencies",
        headers={
            "X-HealthLink-Worker-Key": "synthetic-test-worker-key",
            "X-Correlation-ID": "synthetic-correlation-id",
        },
    )

    assert missing_key.status_code == 401
    assert invalid_key.status_code == 401
    assert accepted.status_code == 200
    assert accepted.headers["X-Correlation-ID"] == "synthetic-correlation-id"
    assert "synthetic-test-worker-key" not in accepted.text


def test_internal_dependency_health_generates_correlation_id_for_authorized_request(monkeypatch):
    monkeypatch.setattr(Config, "AI_SERVICE_KEY", "synthetic-test-worker-key", raising=False)
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get(
        "/internal/health/dependencies",
        headers={"X-HealthLink-Worker-Key": "synthetic-test-worker-key"},
    )

    assert response.status_code == 200
    assert response.headers["X-Correlation-ID"]
    assert set(response.json()["dependencies"]) == {"ollama", "minio", "qdrant"}
    assert all(isinstance(value, bool) for value in response.json()["dependencies"].values())
