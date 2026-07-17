"""
HealthLink AI Service - Private & Self-hosted
Run: python main.py
"""

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from config import Config
from models.schemas import (
    ModerationResult, OCRResult, CVParseResult,
    DocumentVerifyResult, ProfileVerifyResult, DocumentScreeningResult,
    HomeVisitScanResult, HealthCheckResponse,
    ReviewModerationRequest, ReviewModerationResult
)

# Lazy imports for services
nudenet_detector = None
ollama_client = None


def init_easyocr():
    """Warm the shared EasyOCR singleton (services.ocr_service) at startup.

    Previously this built its own separate `easyocr.Reader`, distinct from the
    singleton actually used by /parse-cv, /ocr, etc. (services/ocr_service.py) —
    meaning the "pre-load" never avoided the first-request cold start it was
    meant to avoid, and doubled the model-load cost paid at boot. Delegating to
    the real singleton here fixes both.
    """
    from services.ocr_service import get_ocr_reader
    return get_ocr_reader()


def init_nudenet():
    """Initialize NudeNet detector"""
    global nudenet_detector
    if nudenet_detector is None:
        from nudenet import NudeDetector
        nudenet_detector = NudeDetector()
    return nudenet_detector


def init_ollama():
    """Initialize Ollama client"""
    global ollama_client
    if ollama_client is None:
        import ollama
        ollama_client = ollama.Client(host=Config.OLLAMA_HOST, timeout=Config.OLLAMA_TIMEOUT)
    return ollama_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    print("=" * 50)
    print("HealthLink AI Service - Starting...")
    print("=" * 50)

    # Pre-load models (skip gracefully if not installed)
    print("[1/3] Loading EasyOCR...")
    try:
        init_easyocr()
        print("      EasyOCR loaded")
    except ImportError:
        print("      EasyOCR not available (install easyocr + torch for PDF/image OCR)")

    print("[2/3] Loading NudeNet...")
    try:
        init_nudenet()
        print("      NudeNet loaded")
    except ImportError:
        print("      NudeNet not available (install nudenet for NSFW detection)")

    print("[3/3] Checking Ollama connection...")
    try:
        client = init_ollama()
        models = client.list()
        model_names = [m.get('name', m.get('model', '')) for m in models.get('models', [])]
        print(f"      Ollama connected - Models: {model_names}")
    except Exception as e:
        print(f"      Ollama not available: {e}")
        print("      (CV parsing will not work without Ollama)")

    print("=" * 50)
    print(f"AI Service ready at http://{Config.HOST}:{Config.PORT}")
    print("=" * 50)

    yield

    print("Shutting down AI Service...")


# Create FastAPI app
app = FastAPI(
    title="HealthLink AI Service",
    description="Private AI Service for document processing and verification",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check with truthful dependency status."""
    from services.ollama_service import check_ollama_connection
    from services.ocr_service import get_ocr_reader

    dependencies = {}

    try:
        # Reuse the shared singleton reader (warmed at startup) instead of
        # constructing a fresh EasyOCR reader on every health check.
        get_ocr_reader()
        dependencies["easyocr"] = {"available": True, "error": None}
    except Exception as exc:
        dependencies["easyocr"] = {"available": False, "error": str(exc)}

    try:
        import pytesseract
        version = str(pytesseract.get_tesseract_version())
        dependencies["tesseract"] = {"available": True, "version": version, "error": None}
    except Exception as exc:
        dependencies["tesseract"] = {"available": False, "version": None, "error": str(exc)}

    ollama_connected, model_available, ollama_error = check_ollama_connection()
    dependencies["ollama"] = {
        "available": ollama_connected,
        "modelAvailable": model_available,
        "model": Config.OLLAMA_MODEL,
        "error": ollama_error,
    }

    return {
        "status": "healthy",
        "service": "HealthLink Local AI Service",
        "version": "1.0.0",
        "dependencies": dependencies,
    }


@app.post("/moderate-image", response_model=ModerationResult)
async def moderate_image(file: UploadFile = File(...)):
    """Check image for NSFW/inappropriate content"""
    from services.moderation_service import moderate

    content = await file.read()
    return moderate(content)


@app.post("/ocr", response_model=OCRResult)
async def perform_ocr(file: UploadFile = File(...)):
    """Extract text from image or document"""
    from services.ocr_service import extract_text

    content = await file.read()
    filename = file.filename.lower() if file.filename else "image.jpg"
    # Offload the blocking OCR work to a thread so it doesn't stall the
    # single event loop for other concurrent requests (e.g. /health).
    return await run_in_threadpool(extract_text, content, filename)


@app.post("/parse-cv", response_model=CVParseResult)
async def parse_cv(
    file: UploadFile = File(...),
    doc_type: str = Form(default="doctor")
):
    """Parse CV/resume and extract structured data"""
    from services.cv_parser_service import parse

    content = await file.read()
    filename = file.filename.lower() if file.filename else "document.pdf"
    return await run_in_threadpool(parse, content, filename, doc_type)


def _verify_document_sync(content: bytes, filename: str, expected_type: str) -> "DocumentVerifyResult":
    from services.doc_verification_service import doc_verification_service
    from services.ocr_service import extract_text

    ocr_result = extract_text(content, filename)
    if not ocr_result.success:
        return DocumentVerifyResult(
            valid=False,
            documentType=expected_type,
            confidence=0.0,
            issues=["Could not extract text from document"]
        )

    result = doc_verification_service.verify(ocr_result.text, expected_type)
    return DocumentVerifyResult(
        documentType=expected_type,
        **result
    )


@app.post("/verify-document", response_model=DocumentVerifyResult)
async def verify_document(
    file: UploadFile = File(...),
    expected_type: str = Form(...)
):
    """Verify document type using OCR + keyword matching"""
    content = await file.read()
    filename = file.filename.lower() if file.filename else "document.jpg"
    return await run_in_threadpool(_verify_document_sync, content, filename, expected_type)


def _verify_profile_sync(content: bytes) -> "ProfileVerifyResult":
    from services.face_detection_service import face_detection_service
    from services.moderation_service import moderate

    # Check NSFW first
    mod_result = moderate(content)
    if not mod_result.safe:
        return ProfileVerifyResult(
            valid=False,
            hasFace=False,
            singleFace=False,
            contentSafe=False,
            confidence=0.0,
            issues=["Inappropriate content detected"]
        )

    # Detect face
    face_result = face_detection_service.detect(content)

    issues = []
    if not face_result["hasFace"]:
        issues.append("No face detected in photo")
    elif not face_result["singleFace"]:
        issues.append(f"Multiple faces detected ({face_result['faceCount']} faces)")
    elif face_result["faceSize"] == "too_small":
        issues.append("Face is too small in the photo")
    elif face_result["faceSize"] == "small":
        issues.append("Face could be larger for better visibility")

    return ProfileVerifyResult(
        valid=face_result["singleFace"] and face_result["faceSize"] in ["adequate", "small"],
        hasFace=face_result["hasFace"],
        singleFace=face_result["singleFace"],
        faceSize=face_result["faceSize"],
        contentSafe=True,
        confidence=face_result["confidence"],
        issues=issues
    )


@app.post("/verify-profile", response_model=ProfileVerifyResult)
async def verify_profile(file: UploadFile = File(...)):
    """Verify profile photo (face detection + NSFW check)"""
    content = await file.read()
    return await run_in_threadpool(_verify_profile_sync, content)


def _screen_document_sync(content: bytes, filename: str, expected_type: str) -> "DocumentScreeningResult":
    from services.moderation_service import moderate
    from services.ocr_service import extract_text
    from services.doc_verification_service import doc_verification_service
    from services.face_detection_service import face_detection_service
    from services.document_service import get_file_type

    is_profile_photo = expected_type.lower() in ["profile photo", "profile_photo", "profilephoto", "profile"]
    is_image = get_file_type(filename) == "image"

    # Step 1: NSFW Check (only for raster images; PDFs/DOCX are validated by OCR below)
    if is_image:
        mod_result = moderate(content)
        if not mod_result.safe:
            return DocumentScreeningResult(
                passed=False,
                contentSafe=False,
                nsfwDetected=True,
                confidence=0.0,
                issues=["NSFW/inappropriate content detected"],
                safetyIssues=[d["class"] for d in mod_result.blockedDetections]
            )

    # Step 2: Profile photo - use face detection
    if is_profile_photo:
        face_result = face_detection_service.detect(content)
        passed = face_result["singleFace"] and face_result["faceSize"] in ["adequate", "small"]

        issues = []
        if not face_result["hasFace"]:
            issues.append("No face detected in photo")
        elif not face_result["singleFace"]:
            issues.append(f"Multiple faces detected ({face_result['faceCount']} faces)")
        elif face_result["faceSize"] == "too_small":
            issues.append("Face is too small")

        return DocumentScreeningResult(
            passed=passed,
            contentSafe=True,
            typeMatches=True,
            detectedType="Profile Photo",
            confidence=face_result["confidence"],
            isProfilePhoto=True,
            hasFaceDetected=face_result["hasFace"],
            isProfessionalPhoto=passed,
            issues=issues
        )

    # Step 3: Document - use OCR + keyword verification
    ocr_result = extract_text(content, filename)

    # If OCR completely fails, REJECT the document
    if not ocr_result.success or len(ocr_result.text.strip()) < 10:
        return DocumentScreeningResult(
            passed=False,  # REJECT - can't verify unreadable documents
            contentSafe=True,
            confidence=0.0,
            readable=False,
            typeMatches=False,
            detectedType="unknown",
            issues=[
                f"Cannot verify this document as '{expected_type}'. "
                "The image is not readable or does not contain text. "
                "Please upload a clear image of the actual document."
            ]
        )

    # Verify document type using keywords
    doc_result = doc_verification_service.verify(ocr_result.text, expected_type)

    # Build detailed issues for rejection
    issues = doc_result.get("issues", [])
    if not doc_result["valid"] and not issues:
        issues = [
            f"This document does not match the expected type '{expected_type}'. "
            "Please upload the correct document."
        ]

    return DocumentScreeningResult(
        passed=doc_result["valid"],  # False = AUTO REJECT
        contentSafe=True,
        typeMatches=doc_result["typeMatches"],
        detectedType=expected_type if doc_result["typeMatches"] else "unknown/unrelated",
        readable=True,
        appearsAuthentic=doc_result["valid"],
        complete=doc_result["valid"],
        confidence=doc_result["confidence"],
        issues=issues
    )


@app.post("/screen-document", response_model=DocumentScreeningResult)
async def screen_document(
    file: UploadFile = File(...),
    expected_type: str = Form(...)
):
    """
    Full document screening (replaces Gemini verifyDocument).
    Combines NSFW check + face detection (for photos) + document verification.
    """
    content = await file.read()
    filename = file.filename.lower() if file.filename else "document.jpg"
    return await run_in_threadpool(_screen_document_sync, content, filename, expected_type)


@app.post("/moderate-review-text", response_model=ReviewModerationResult)
async def moderate_review_text(request: ReviewModerationRequest):
    """Classify a patient review's text before it is published."""
    from services.review_moderation_service import moderate

    return await run_in_threadpool(moderate, request.comment, request.rating)


@app.post("/parse-home-visit", response_model=HomeVisitScanResult)
async def parse_home_visit(file: UploadFile = File(...)):
    """Extract home visit receiver info from a document/image for form auto-fill."""
    from services.home_visit_parser_service import parse

    content = await file.read()
    filename = file.filename.lower() if file.filename else "document.jpg"
    return await run_in_threadpool(parse, content, filename)


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=False
    )
