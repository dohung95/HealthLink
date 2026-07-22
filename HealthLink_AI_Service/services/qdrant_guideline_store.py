"""Minimal Qdrant HTTP store for approved, non-identifying guideline chunks."""

from __future__ import annotations

import json
import re
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from models.rag_schemas import GuidelineChunk


class QdrantGuidelineStore:
    _COLLECTION_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$")

    def __init__(self, base_url: str, collection: str, api_key: str = "", batch_size: int = 100):
        if batch_size < 1:
            raise ValueError("batch_size must be positive")
        self.base_url = base_url.rstrip("/")
        self.collection = collection
        self.api_key = api_key
        self.batch_size = batch_size

    def upsert(self, chunks: list[GuidelineChunk], vectors: list[list[float]]) -> None:
        if len(chunks) != len(vectors):
            raise ValueError("chunk and vector counts must match")
        if not chunks:
            return
        vector_dimension = len(vectors[0])
        if vector_dimension < 1 or any(len(vector) != vector_dimension for vector in vectors):
            raise ValueError("guideline vectors must have one non-zero dimension")
        self.ensure_collection(vector_dimension)
        for start in range(0, len(chunks), self.batch_size):
            points = [
                {"id": chunk.chunk_id, "vector": vector, "payload": self._payload(chunk)}
                for chunk, vector in zip(chunks[start : start + self.batch_size], vectors[start : start + self.batch_size])
            ]
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

    def staging_collection_name(self, corpus_version: str) -> str:
        """Return the explicit, non-active collection used for a corpus build."""
        if not self._COLLECTION_NAME.fullmatch(corpus_version):
            raise ValueError("corpus version cannot be used in a Qdrant collection name")
        return f"{self.collection}__staging__{corpus_version}"

    def stage(self, chunks: list[GuidelineChunk], vectors: list[list[float]], corpus_version: str) -> str:
        """Write a versioned corpus without changing the active retrieval target."""
        staging_collection = self.staging_collection_name(corpus_version)
        self._require_absent_collection(staging_collection)
        staged_store = QdrantGuidelineStore(
            self.base_url, staging_collection, self.api_key, batch_size=self.batch_size
        )
        staged_store.upsert(chunks, vectors)
        staged_store._validate_collection(staging_collection, len(vectors[0]) if vectors else 1)
        return staging_collection

    def _require_absent_collection(self, collection: str) -> None:
        try:
            self._request("GET", f"/collections/{collection}")
        except HTTPError as error:
            if error.code == 404:
                return
            raise
        raise ValueError("staging collection already exists; corpus versions are immutable")

    def promote(self, staging_collection: str, active_alias: str, *, expected_vector_dimension: int) -> None:
        """Atomically point an active alias to a validated staged corpus."""
        self._validate_staging(staging_collection, expected_vector_dimension)
        self._switch_alias(staging_collection, active_alias)

    def rollback(self, previous_collection: str, active_alias: str, *, expected_vector_dimension: int) -> None:
        """Atomically restore an already validated corpus through the active alias."""
        self._validate_collection(previous_collection, expected_vector_dimension)
        self._switch_alias(previous_collection, active_alias)

    def _validate_staging(self, staging_collection: str, expected_vector_dimension: int) -> None:
        expected_prefix = f"{self.collection}__staging__"
        if not staging_collection.startswith(expected_prefix):
            raise ValueError("staging collection does not belong to this active collection")
        self._validate_collection(staging_collection, expected_vector_dimension)

    def _validate_collection(self, collection: str, expected_vector_dimension: int) -> None:
        if expected_vector_dimension < 1:
            raise ValueError("expected vector dimension must be positive")
        existing = self._request("GET", f"/collections/{collection}")
        configured_dimension = existing["result"]["config"]["params"]["vectors"]["size"]
        if configured_dimension != expected_vector_dimension:
            raise ValueError("Qdrant collection vector dimension does not match embedding model")
        if existing["result"].get("points_count", 0) < 1:
            raise ValueError("Qdrant collection has no staged guideline points")

    def _switch_alias(self, collection: str, alias: str) -> None:
        if not self._COLLECTION_NAME.fullmatch(alias):
            raise ValueError("active alias is not a safe Qdrant alias name")
        # Qdrant applies this action list atomically; failures leave the old alias intact.
        self._request("POST", "/collections/aliases?wait=true", {
            "actions": [
                {"delete_alias": {"alias_name": alias}},
                {"create_alias": {"collection_name": collection, "alias_name": alias}},
            ],
        })

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
