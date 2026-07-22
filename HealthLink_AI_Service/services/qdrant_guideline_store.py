"""Minimal Qdrant HTTP store for approved, non-identifying guideline chunks."""

from __future__ import annotations

import json
from urllib.request import Request, urlopen

from models.rag_schemas import GuidelineChunk


class QdrantGuidelineStore:
    def __init__(self, base_url: str, collection: str):
        self.base_url = base_url.rstrip("/")
        self.collection = collection

    def upsert(self, chunks: list[GuidelineChunk], vectors: list[list[float]]) -> None:
        if len(chunks) != len(vectors):
            raise ValueError("chunk and vector counts must match")
        points = [{"id": chunk.chunk_id, "vector": vector, "payload": self._payload(chunk)} for chunk, vector in zip(chunks, vectors)]
        self._request("PUT", f"/collections/{self.collection}/points?wait=true", {"points": points})

    @staticmethod
    def _payload(chunk: GuidelineChunk) -> dict:
        payload = chunk.model_dump(by_alias=True)
        forbidden = {"patientId", "appointmentId", "clinicalContext", "prompt"}
        if forbidden.intersection(payload):
            raise ValueError("Qdrant guideline payload must not contain PHI fields")
        return payload

    def _request(self, method: str, path: str, body: dict) -> dict:
        request = Request(
            f"{self.base_url}{path}",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method=method,
        )
        with urlopen(request, timeout=10) as response:  # nosec B310 - configured local Qdrant endpoint
            return json.loads(response.read().decode("utf-8"))
