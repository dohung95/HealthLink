"""Offline, manifest-gated CLI ingestion for approved guideline sources."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from models.rag_schemas import GuidelineManifest
from services.embedding_service import LocalEmbeddingService
from services.guideline_chunker import GuidelineChunker
from services.guideline_parser import GuidelineParser
from services.qdrant_guideline_store import QdrantGuidelineStore


def ingest(manifest_path: Path, qdrant_url: str, collection: str) -> list[str]:
    manifest = GuidelineManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
    document = GuidelineParser().parse(manifest)
    chunks = GuidelineChunker().chunk(document)
    embeddings = LocalEmbeddingService()
    QdrantGuidelineStore(qdrant_url, collection).upsert(chunks, [embeddings.embed(chunk.text) for chunk in chunks])
    return [chunk.chunk_id for chunk in chunks]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest one approved guideline manifest into local Qdrant")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--qdrant-url", default="http://127.0.0.1:6333")
    parser.add_argument("--collection", required=True)
    arguments = parser.parse_args()
    print(json.dumps({"chunkIds": ingest(arguments.manifest, arguments.qdrant_url, arguments.collection)}))
