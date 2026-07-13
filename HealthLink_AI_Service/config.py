import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Ollama
    OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
    OLLAMA_TEMPERATURE = 0.1
    OLLAMA_NUM_PREDICT = 768  # CV/document JSON schemas need well under 1k tokens; caps worst-case generation time
    OLLAMA_TIMEOUT = 45  # seconds; fail fast instead of hanging if Ollama is stuck/overloaded

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
