"""Local deterministic embedding adapter; never sends guideline text to a cloud provider."""

from __future__ import annotations

import hashlib
import re


class LocalEmbeddingService:
    model_name = "local-hash-embedding-v1"
    dimension = 128

    def embed(self, text: str) -> list[float]:
        if not text.strip():
            raise ValueError("cannot embed empty text")
        vector = [0.0] * self.dimension
        for token in re.findall(r"\w+", text.lower()):
            index = int.from_bytes(hashlib.sha256(token.encode("utf-8")).digest()[:4], "big") % self.dimension
            vector[index] += 1.0
        magnitude = sum(value * value for value in vector) ** 0.5
        return [value / magnitude for value in vector] if magnitude else vector
