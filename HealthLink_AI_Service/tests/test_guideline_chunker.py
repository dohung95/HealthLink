from __future__ import annotations

import hashlib
import json
from pathlib import Path
from urllib.error import HTTPError
from uuid import UUID

import pytest

from models.rag_schemas import GuidelineManifest
from services.embedding_service import LocalEmbeddingService
from services.guideline_chunker import GuidelineChunker
from services.guideline_parser import GuidelineParser
from services.qdrant_guideline_store import QdrantGuidelineStore
from scripts.ingest_guidelines import load_manifest


FIXTURE = Path(__file__).parent / "fixtures" / "guidelines" / "synthetic-guideline.md"


def approved_manifest(path: Path = FIXTURE) -> GuidelineManifest:
    return GuidelineManifest(
        documentId="synthetic-glucose-2026",
        title="Synthetic glucose guidance",
        issuer="HealthLink Student Demo",
        version="2026.1",
        effectiveDate="2026-01-01",
        licenseClass="STUDENT_DEMO_ONLY",
        sourcePath=str(path),
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        approvalStatus="APPROVED",
        corpusVersion="student-demo-2026.1",
    )


def test_chunker_preserves_section_page_checksum_and_stable_id():
    manifest = approved_manifest()
    document = GuidelineParser().parse(manifest)

    first = GuidelineChunker(max_tokens=40, overlap_tokens=5).chunk(document)
    second = GuidelineChunker(max_tokens=40, overlap_tokens=5).chunk(document)

    assert [chunk.chunk_id for chunk in first] == [chunk.chunk_id for chunk in second]
    assert all(UUID(chunk.chunk_id).version == 5 for chunk in first)
    assert [chunk.section_path for chunk in first] == [
        "Adult glucose review > Verified fasting results",
        "Adult glucose review > Missing context",
    ]
    assert all(chunk.page == 1 for chunk in first)
    assert all(chunk.checksum == manifest.sha256 for chunk in first)
    assert all(chunk.license_class == "STUDENT_DEMO_ONLY" for chunk in first)


def test_parser_rejects_checksum_mismatch_before_chunking():
    manifest = approved_manifest().model_copy(update={"sha256": "0" * 64})

    with pytest.raises(ValueError, match="checksum"):
        GuidelineParser().parse(manifest)


def test_parser_rejects_manifest_without_approval():
    manifest = approved_manifest().model_copy(update={"approval_status": "PENDING"})

    with pytest.raises(ValueError, match="approved"):
        GuidelineParser().parse(manifest)


def test_local_embedding_uses_pinned_multilingual_model_and_normalizes_vectors():
    embedding = LocalEmbeddingService()

    vector = embedding.embed("verified fasting glucose")

    assert embedding.model_name == "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    assert embedding.dimension == 384
    assert vector == embedding.embed("verified fasting glucose")
    assert len(vector) == embedding.dimension
    assert sum(value * value for value in vector) == pytest.approx(1.0)


def test_qdrant_payload_contains_only_guideline_contract_fields():
    document = GuidelineParser().parse(approved_manifest())
    chunk = GuidelineChunker().chunk(document)[0]

    payload = QdrantGuidelineStore("http://127.0.0.1:6333", "student-demo")._payload(chunk)

    assert payload["chunkId"] == chunk.chunk_id
    assert "patientId" not in payload
    assert "appointmentId" not in payload
    assert json.loads(json.dumps(payload))["effectiveDate"] == "2026-01-01"


def test_qdrant_creates_cosine_collection_with_embedding_dimension_before_upsert(monkeypatch):
    document = GuidelineParser().parse(approved_manifest())
    chunk = GuidelineChunker().chunk(document)[0]
    store = QdrantGuidelineStore("http://127.0.0.1:6333", "student-demo")
    calls = []

    def record_request(method, path, body=None):
        calls.append((method, path, body))
        if method == "GET":
            raise HTTPError("http://127.0.0.1:6333/collections/student-demo", 404, "missing", {}, None)
        return {"result": {"status": "ok"}}

    monkeypatch.setattr(store, "_request", record_request)

    store.upsert([chunk], [[0.0] * 384])

    assert calls[0] == (
        "GET",
        "/collections/student-demo",
        None,
    )
    assert calls[1] == (
        "PUT",
        "/collections/student-demo",
        {"vectors": {"size": 384, "distance": "Cosine"}},
    )
    assert calls[2][0:2] == ("PUT", "/collections/student-demo/points?wait=true")


def test_qdrant_request_uses_configured_api_key_without_putting_it_in_payload(monkeypatch):
    request_headers = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

        def read(self):
            return b"{}"

    def capture(request, timeout):
        request_headers.update(dict(request.header_items()))
        return FakeResponse()

    monkeypatch.setattr("services.qdrant_guideline_store.urlopen", capture)

    QdrantGuidelineStore("http://127.0.0.1:6333", "student-demo", api_key="local-test-key")._request(
        "GET", "/collections/student-demo"
    )

    assert request_headers["Api-key"] == "local-test-key"


def test_qdrant_upsert_sends_large_guideline_in_bounded_batches_after_one_collection_check(monkeypatch):
    document = GuidelineParser().parse(approved_manifest())
    first = GuidelineChunker().chunk(document)[0]
    chunks = [first.model_copy(update={"chunk_id": f"chunk-{index}"}) for index in range(3)]
    store = QdrantGuidelineStore("http://127.0.0.1:6333", "student-demo", batch_size=2)
    calls = []

    def record_request(method, path, body=None):
        calls.append((method, path, body))
        if method == "GET":
            return {"result": {"config": {"params": {"vectors": {"size": 384}}}}}
        return {"result": {"status": "ok"}}

    monkeypatch.setattr(store, "_request", record_request)

    store.upsert(chunks, [[0.0] * 384 for _ in chunks])

    point_puts = [call for call in calls if call[1].endswith("/points?wait=true")]
    assert [len(call[2]["points"]) for call in point_puts] == [2, 1]
    assert [point["id"] for call in point_puts for point in call[2]["points"]] == ["chunk-0", "chunk-1", "chunk-2"]
    assert [call[0:2] for call in calls].count(("GET", "/collections/student-demo")) == 1


def test_load_manifest_converts_only_approved_student_demo_resource_manifest(tmp_path):
    source_pdf = tmp_path / "source-pdf" / "guide.pdf"
    source_pdf.parent.mkdir()
    source_pdf.write_bytes(b"synthetic guideline")
    resource_manifest = tmp_path / "manifests" / "guide.manifest.json"
    resource_manifest.parent.mkdir()
    resource_manifest.write_text(json.dumps({
        "documentId": "synthetic-guide",
        "title": "Synthetic guidance",
        "issuer": "HealthLink Student Demo",
        "publishedDate": "2026-01-01",
        "version": "2026.1",
        "license": "STUDENT_DEMO_ONLY",
        "status": "APPROVED_STUDENT_DEMO",
        "pdfFile": "source-pdf/guide.pdf",
        "sha256": hashlib.sha256(source_pdf.read_bytes()).hexdigest(),
    }), encoding="utf-8")

    manifest = load_manifest(resource_manifest)

    assert manifest.approval_status == "APPROVED"
    assert manifest.effective_date.isoformat() == "2026-01-01"
    assert manifest.source_path == str(source_pdf)
    assert manifest.corpus_version == "student-demo-2026.1"
