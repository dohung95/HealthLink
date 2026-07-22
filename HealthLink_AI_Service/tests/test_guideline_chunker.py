from __future__ import annotations

import hashlib
from pathlib import Path
from uuid import UUID

import pytest

from models.rag_schemas import GuidelineManifest
from services.embedding_service import LocalEmbeddingService
from services.guideline_chunker import GuidelineChunker
from services.guideline_parser import GuidelineParser
from services.qdrant_guideline_store import QdrantGuidelineStore


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


def test_local_embedding_is_deterministic_and_normalized():
    embedding = LocalEmbeddingService()

    vector = embedding.embed("verified fasting glucose")

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
