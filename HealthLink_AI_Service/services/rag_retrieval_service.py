"""Private, de-identified retrieval from the local student-demo guideline corpus."""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import date
from urllib.request import Request, urlopen

from models.rag_schemas import GuidelineChunk, RagRetrieveResponse
from services.embedding_service import LocalEmbeddingService


class GuidelineRetrievalService:
    """Query Qdrant without logging or persisting query text."""

    def __init__(self, base_url: str, collection: str, *, api_key: str = "",
                 minimum_score: float = 0.75, embedding: LocalEmbeddingService | None = None,
                 search: Callable[[dict], dict] | None = None):
        if not 0.0 <= minimum_score <= 1.0:
            raise ValueError("minimum score must be between zero and one")
        self.base_url = base_url.rstrip("/")
        self.collection = collection
        self.api_key = api_key
        self.minimum_score = minimum_score
        self.embedding = embedding
        self._search_override = search

    def retrieve(self, *, query: str, top_k: int = 5, corpus_version: str = "student-demo-2026.1",
                 specialty: str | None = None, language: str | None = None, issuer: str | None = None,
                 effective_date_on_or_before: date | None = None) -> RagRetrieveResponse:
        if not query.strip() or len(query) > 512:
            raise ValueError("query must contain at most 512 characters")
        if not 1 <= top_k <= 10:
            raise ValueError("top_k must be between one and ten")
        # The locked citation payload deliberately carries no specialty/language field.  Ignoring a
        # requested filter could return unsupported evidence, so this corpus fails closed instead.
        if specialty or language:
            return RagRetrieveResponse(insufficientEvidence=True, chunks=[])
        vector = self._embedding().embed(query)
        must = [{"key": "corpusVersion", "match": {"value": corpus_version}}]
        if issuer:
            must.append({"key": "issuer", "match": {"value": issuer}})
        payload = {
            "vector": vector,
            "limit": top_k * 3,
            "with_payload": True,
            "filter": {"must": must},
        }
        results = self._search(payload).get("result", [])
        chunks: list[GuidelineChunk] = []
        for item in results:
            score = float(item.get("score", 0.0))
            if score < self.minimum_score:
                continue
            chunk = GuidelineChunk.model_validate(item.get("payload", {})).model_copy(update={"score": score})
            if effective_date_on_or_before and chunk.effective_date > effective_date_on_or_before:
                continue
            chunks.append(chunk)
            if len(chunks) == top_k:
                break
        return RagRetrieveResponse(insufficientEvidence=not chunks, chunks=chunks)

    def _embedding(self) -> LocalEmbeddingService:
        if self.embedding is None:
            self.embedding = LocalEmbeddingService()
        return self.embedding

    def _search(self, body: dict) -> dict:
        if self._search_override is not None:
            return self._search_override(body)
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["api-key"] = self.api_key
        request = Request(
            f"{self.base_url}/collections/{self.collection}/points/query",
            data=json.dumps(body).encode("utf-8"), headers=headers, method="POST",
        )
        with urlopen(request, timeout=10) as response:  # nosec B310 - local configured Qdrant
            return json.loads(response.read().decode("utf-8"))
