"""Private, de-identified retrieval from the local student-demo guideline corpus."""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from datetime import date
from urllib.request import Request, urlopen

from models.rag_schemas import GuidelineChunk, RagRetrieveResponse
from services.embedding_service import LocalEmbeddingService


class GuidelineRetrievalService:
    """Query Qdrant without logging or persisting query text."""

    _COMMON_TITLE_TERMS = frozenset({"the", "and", "for", "with", "from", "into", "that", "this", "guideline"})
    _TITLE_ALIASES = {"ckd": frozenset({"chronic", "kidney", "disease"})}

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
            "query": vector,
            "limit": top_k * 3,
            "with_payload": True,
            "filter": {"must": must},
        }
        result = self._search(payload).get("result", [])
        results = result.get("points", []) if isinstance(result, dict) else result
        query_terms = self._meaningful_terms(query)
        best_by_source: dict[tuple[str, str, int], tuple[float, GuidelineChunk]] = {}
        for item in results:
            score = float(item.get("score", 0.0))
            payload = item.get("payload", {})
            overlap = query_terms.intersection(self._meaningful_terms(str(payload.get("title", ""))))
            if not overlap:
                continue
            combined_score = min(1.0, score + min(0.25, 0.1 * len(overlap)))
            if score < self.minimum_score and combined_score < self.minimum_score:
                continue
            chunk = GuidelineChunk.model_validate(payload).model_copy(update={"score": combined_score})
            if effective_date_on_or_before and chunk.effective_date > effective_date_on_or_before:
                continue
            source = (chunk.document_id, chunk.section_path, chunk.page)
            existing = best_by_source.get(source)
            if existing is None or (chunk.score, score) > (existing[1].score, existing[0]):
                best_by_source[source] = (score, chunk)
        chunks = sorted((candidate[1] for candidate in best_by_source.values()),
                        key=lambda chunk: (-chunk.score, chunk.chunk_id))[:top_k]
        return RagRetrieveResponse(insufficientEvidence=not chunks, chunks=chunks)

    @classmethod
    def _meaningful_terms(cls, value: str) -> frozenset[str]:
        terms = {term for term in re.findall(r"[a-z0-9]+", value.lower())
                 if len(term) >= 3 and term not in cls._COMMON_TITLE_TERMS}
        for alias, expansion in cls._TITLE_ALIASES.items():
            if alias in terms:
                terms.update(expansion)
        return frozenset(terms)

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
