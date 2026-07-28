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

    # CDS generation is deliberately pinned and is never selectable by a
    # request or environment variable. Qualification is required before use.
    CDS_LOCAL_MODEL = "qwen3:4b-instruct-2507-q4_K_M"
    CDS_LOCAL_MODEL_DIGEST = "0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0"
    CDS_PROMPT_VERSION = "cds-prompt-v1"
    CDS_SCHEMA_VERSION = "cds-schema-v1"
    OPENROUTER_FALLBACK_ENABLED = False

    # Private AI worker endpoints. This is intentionally supplied only by the
    # ignored local environment, never by a request body or source file.
    AI_SERVICE_KEY = os.getenv("AI_SERVICE_KEY", "")
    MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://127.0.0.1:9000")
    QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6333")
    QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
    GUIDELINE_COLLECTION = os.getenv("HL_GUIDELINE_COLLECTION", "healthlink-guidelines-student-demo-v2026-1")
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
