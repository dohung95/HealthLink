import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Ollama
    OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
    OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.1"))
    OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "768"))
    OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "45"))

    # Private AI worker endpoints. This is intentionally supplied only by the
    # ignored local environment, never by a request body or source file.
    AI_SERVICE_KEY = os.getenv("AI_SERVICE_KEY", "")
    MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://127.0.0.1:9000")
    QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6333")
    QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
    DEPENDENCY_HEALTH_TIMEOUT = float(os.getenv("AI_DEPENDENCY_HEALTH_TIMEOUT_SECONDS", "2"))
    EMBEDDING_MODEL = os.getenv("HL_EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    EMBEDDING_CACHE_DIR = os.getenv("HL_EMBEDDING_CACHE_DIR")

    # OCR — Vietnamese + English (both Latin-based, compatible in EasyOCR)
    OCR_LANGUAGES = ["vi", "en"]
    OCR_GPU = False
    OCR_MAX_DIMENSION = 2000  # downscale images above this before preprocessing/OCR

    # Moderation thresholds
    NSFW_BLOCK_THRESHOLD = 0.75
    NSFW_REVIEW_THRESHOLD = 0.8

    # Document verification
    DOC_VERIFY_MIN_CONFIDENCE = 0.3

    # Face detection
    FACE_MIN_SIZE = 50  # pixels

    # Server
    HOST = "127.0.0.1"
    PORT = 8097
