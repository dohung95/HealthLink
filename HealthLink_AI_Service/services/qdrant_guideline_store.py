"""Minimal Qdrant HTTP store for approved, non-identifying guideline chunks."""

from __future__ import annotations

import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from models.rag_schemas import GuidelineChunk


class QdrantGuidelineStore:
    def __init__(self, base_url: str, collection: str, api_key: str = ""):
        self.base_url = base_url.rstrip("/")
        self.collection = collection
        self.api_key = api_key

    def upsert(self, chunks: list[GuidelineChunk], vectors: list[list[float]]) -> None:
        if len(chunks) != len(vectors):
            raise ValueError("chunk and vector counts must match")
        if not chunks:
            return
        vector_dimension = len(vectors[0])
        if vector_dimension < 1 or any(len(vector) != vector_dimension for vector in vectors):
            raise ValueError("guideline vectors must have one non-zero dimension")
        self.ensure_collection(vector_dimension)
        points = [{"id": chunk.chunk_id, "vector": vector, "payload": self._payload(chunk)} for chunk, vector in zip(chunks, vectors)]
        self._request("PUT", f"/collections/{self.collection}/points?wait=true", {"points": points})

    def ensure_collection(self, vector_dimension: int) -> None:
        try:
            existing = self._request("GET", f"/collections/{self.collection}")
        except HTTPError as error:
            if error.code != 404:
                raise
            self._request("PUT", f"/collections/{self.collection}", {
                "vectors": {"size": vector_dimension, "distance": "Cosine"},
            })
            return
        configured_dimension = existing["result"]["config"]["params"]["vectors"]["size"]
        if configured_dimension != vector_dimension:
            raise ValueError("Qdrant collection vector dimension does not match embedding model")

    @staticmethod
    def _payload(chunk: GuidelineChunk) -> dict:
        payload = chunk.model_dump(by_alias=True, mode="json")
        forbidden = {"patientId", "appointmentId", "clinicalContext", "prompt"}
        if forbidden.intersection(payload):
            raise ValueError("Qdrant guideline payload must not contain PHI fields")
        return payload

    def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["api-key"] = self.api_key
        request = Request(
            f"{self.base_url}{path}",
            data=json.dumps(body).encode("utf-8") if body is not None else None,
            headers=headers,
            method=method,
        )
        with urlopen(request, timeout=10) as response:  # nosec B310 - configured local Qdrant endpoint
            return json.loads(response.read().decode("utf-8"))
