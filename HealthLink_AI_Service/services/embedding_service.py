"""Local multilingual embedding adapter; never sends guideline text to a cloud provider."""

from __future__ import annotations

from sentence_transformers import SentenceTransformer

from config import Config


class LocalEmbeddingService:
    """Embed approved guideline text with the pinned offline multilingual model."""

    default_model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    expected_dimension = 384

    def __init__(self, model_name: str | None = None, cache_folder: str | None = None):
        self.model_name = model_name or Config.EMBEDDING_MODEL
        self.cache_folder = cache_folder or Config.EMBEDDING_CACHE_DIR
        self._model = SentenceTransformer(
            self.model_name,
            cache_folder=self.cache_folder,
            local_files_only=True,
        )
        self.dimension = self._model.get_embedding_dimension()
        if self.dimension != self.expected_dimension:
            raise RuntimeError("local embedding model has an unexpected vector dimension")

    def embed(self, text: str) -> list[float]:
        if not text.strip():
            raise ValueError("cannot embed empty text")
        vector = self._model.encode(text, normalize_embeddings=True, convert_to_numpy=True)
        return [float(value) for value in vector.tolist()]
