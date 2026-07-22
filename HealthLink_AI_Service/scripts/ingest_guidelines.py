"""Offline, manifest-gated CLI ingestion for approved guideline sources."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from models.rag_schemas import GuidelineManifest
from config import Config
from services.embedding_service import LocalEmbeddingService
from services.guideline_chunker import GuidelineChunker
from services.guideline_parser import GuidelineParser
from services.qdrant_guideline_store import QdrantGuidelineStore
from services.guideline_registry_client import GuidelineRegistryClient


def load_manifest(manifest_path: Path) -> GuidelineManifest:
    """Convert the approved student-demo resource manifest to the canonical ingest contract."""
    raw_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if raw_manifest.get("status") != "APPROVED_STUDENT_DEMO":
        raise ValueError("guideline resource manifest is not approved for the student demo")
    source_path = (manifest_path.parent.parent / raw_manifest["pdfFile"]).resolve()
    return GuidelineManifest.model_validate({
        "documentId": raw_manifest["documentId"],
        "title": raw_manifest["title"],
        "issuer": raw_manifest["issuer"],
        "version": raw_manifest["version"],
        "effectiveDate": raw_manifest["publishedDate"],
        "licenseClass": raw_manifest["license"],
        "sourcePath": str(source_path),
        "sha256": raw_manifest["sha256"],
        "approvalStatus": "APPROVED",
        "corpusVersion": "student-demo-2026.1",
    })


def ingest(manifest_path: Path, qdrant_url: str, collection: str) -> list[str]:
    manifest = load_manifest(manifest_path)
    document = GuidelineParser().parse(manifest)
    chunks = GuidelineChunker().chunk(document)
    embeddings = LocalEmbeddingService()
    QdrantGuidelineStore(qdrant_url, collection, Config.QDRANT_API_KEY).upsert(
        chunks, [embeddings.embed(chunk.text) for chunk in chunks]
    )
    register_audit_if_configured(chunks)
    return [chunk.chunk_id for chunk in chunks]


def stage(manifest_path: Path, qdrant_url: str, collection: str) -> tuple[str, list[str]]:
    """Build and validate a versioned staging corpus without changing an active alias."""
    manifest = load_manifest(manifest_path)
    document = GuidelineParser().parse(manifest)
    chunks = GuidelineChunker().chunk(document)
    embeddings = LocalEmbeddingService()
    store = QdrantGuidelineStore(qdrant_url, collection, Config.QDRANT_API_KEY)
    staging_collection = store.stage(
        chunks, [embeddings.embed(chunk.text) for chunk in chunks], manifest.corpus_version
    )
    register_audit_if_configured(chunks)
    return staging_collection, [chunk.chunk_id for chunk in chunks]


def promote(qdrant_url: str, collection: str, active_alias: str, staging_collection: str, vector_dimension: int) -> None:
    QdrantGuidelineStore(qdrant_url, collection, Config.QDRANT_API_KEY).promote(
        staging_collection, active_alias, expected_vector_dimension=vector_dimension
    )


def rollback(qdrant_url: str, collection: str, active_alias: str, previous_collection: str, vector_dimension: int) -> None:
    QdrantGuidelineStore(qdrant_url, collection, Config.QDRANT_API_KEY).rollback(
        previous_collection, active_alias, expected_vector_dimension=vector_dimension
    )


def register_audit_if_configured(chunks) -> None:
    backend_base_url = os.getenv("HL_BACKEND_BASE_URL", "").strip()
    if not backend_base_url:
        print("WARNING: guideline chunk audit registration skipped; HL_BACKEND_BASE_URL is not configured (local-only mode).")
        return
    GuidelineRegistryClient(backend_base_url, os.getenv("AI_SERVICE_KEY", "")).register(chunks)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage local, approved guideline corpora in Qdrant")
    subparsers = parser.add_subparsers(dest="command", required=True)
    stage_parser = subparsers.add_parser("stage", help="build a validated staging corpus")
    stage_parser.add_argument("manifest", type=Path)
    stage_parser.add_argument("--qdrant-url", default="http://127.0.0.1:6333")
    stage_parser.add_argument("--collection", required=True)
    promote_parser = subparsers.add_parser("promote", help="atomically switch an active alias to staging")
    rollback_parser = subparsers.add_parser("rollback", help="atomically restore an active alias")
    for lifecycle_parser in (promote_parser, rollback_parser):
        lifecycle_parser.add_argument("--qdrant-url", default="http://127.0.0.1:6333")
        lifecycle_parser.add_argument("--collection", required=True)
        lifecycle_parser.add_argument("--active-alias", required=True)
        lifecycle_parser.add_argument("--vector-dimension", type=int, required=True)
    promote_parser.add_argument("--staging-collection", required=True)
    rollback_parser.add_argument("--previous-collection", required=True)
    arguments = parser.parse_args()
    if arguments.command == "stage":
        staging_collection, chunk_ids = stage(arguments.manifest, arguments.qdrant_url, arguments.collection)
        print(json.dumps({"stagingCollection": staging_collection, "chunkIds": chunk_ids}))
    elif arguments.command == "promote":
        promote(arguments.qdrant_url, arguments.collection, arguments.active_alias, arguments.staging_collection, arguments.vector_dimension)
        print(json.dumps({"activeAlias": arguments.active_alias, "collection": arguments.staging_collection}))
    else:
        rollback(arguments.qdrant_url, arguments.collection, arguments.active_alias, arguments.previous_collection, arguments.vector_dimension)
        print(json.dumps({"activeAlias": arguments.active_alias, "collection": arguments.previous_collection}))
