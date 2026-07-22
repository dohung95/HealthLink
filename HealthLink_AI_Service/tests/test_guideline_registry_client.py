from __future__ import annotations

from models.rag_schemas import GuidelineChunk
from services.guideline_registry_client import GuidelineRegistryClient


def test_registry_client_sends_non_phi_chunk_audit_metadata_without_chunk_text(monkeypatch):
    chunk = GuidelineChunk(
        chunkId="01234567-89ab-cdef-0123-456789abcdef", documentId="synthetic-glucose-2026",
        title="Synthetic glucose guidance", issuer="HealthLink Student Demo", version="2026.1",
        effectiveDate="2026-01-01", sectionPath="Verified values", page=1,
        text="Synthetic doctor review only.", checksum="a" * 64,
        licenseClass="STUDENT_DEMO_ONLY", corpusVersion="student-demo-2026.1",
    )
    client = GuidelineRegistryClient("http://127.0.0.1:8096", "synthetic-worker-key", batch_size=100)
    sent = []

    monkeypatch.setattr(client, "_request", lambda body: sent.append(body))

    client.register([chunk])

    audit_row = sent[0]["chunks"][0]
    assert audit_row["chunkId"] == chunk.chunk_id
    assert audit_row["textHash"] != chunk.text
    assert "text" not in audit_row
    assert set(audit_row) == {"documentId", "version", "chunkId", "sectionPath", "page", "checksum", "textHash", "corpusVersion"}
