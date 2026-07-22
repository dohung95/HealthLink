"""Private client that registers non-PHI local guideline chunk audit hashes with Spring."""

from __future__ import annotations

import hashlib
import json
from urllib.request import Request, urlopen

from models.rag_schemas import GuidelineChunk


class GuidelineRegistryClient:
    def __init__(self, backend_base_url: str, worker_key: str, batch_size: int = 100):
        if not backend_base_url.strip() or batch_size < 1 or batch_size > 100:
            raise ValueError("backend URL and batch size between one and one hundred are required")
        self.backend_base_url = backend_base_url.rstrip("/")
        self.worker_key = worker_key
        self.batch_size = batch_size

    def register(self, chunks: list[GuidelineChunk]) -> None:
        for start in range(0, len(chunks), self.batch_size):
            self._request({"chunks": [self._audit_row(chunk) for chunk in chunks[start : start + self.batch_size]]})

    @staticmethod
    def _audit_row(chunk: GuidelineChunk) -> dict:
        return {
            "documentId": chunk.document_id,
            "version": chunk.version,
            "chunkId": chunk.chunk_id,
            "sectionPath": chunk.section_path,
            "page": chunk.page,
            "checksum": chunk.checksum,
            "textHash": hashlib.sha256(chunk.text.encode("utf-8")).hexdigest(),
            "corpusVersion": chunk.corpus_version,
        }

    def _request(self, body: dict) -> None:
        request = Request(
            f"{self.backend_base_url}/api/internal/ai/guideline-chunks",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "X-HealthLink-Worker-Key": self.worker_key},
            method="POST",
        )
        with urlopen(request, timeout=10):  # nosec B310 - configured local Spring backend
            pass
