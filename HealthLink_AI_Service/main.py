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

from config import Config
from models.schemas import (
    ModerationResult, OCRResult, CVParseResult,
    DocumentVerifyResult, ProfileVerifyResult, DocumentScreeningResult,
    HomeVisitScanResult, HealthCheckResponse
)

# Lazy imports for services
easyocr_reader = None
nudenet_detector = None
ollama_client = None


def init_easyocr():
    """Initialize EasyOCR reader"""
    global easyocr_reader
    if easyocr_reader is None:
        import easyocr
        easyocr_reader = easyocr.Reader(Config.OCR_LANGUAGES, gpu=Config.OCR_GPU)
    return easyocr_reader


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
        ollama_client = ollama.Client(host=Config.OLLAMA_HOST)
    return ollama_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    print("=" * 50)
    print("HealthLink AI Service - Starting...")
    print("=" * 50)

    # Pre-load models
    print("[1/3] Loading EasyOCR...")
    init_easyocr()
    print("      EasyOCR loaded")

    print("[2/3] Loading NudeNet...")
    init_nudenet()
    print("      NudeNet loaded")

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
    """Check service health and component status"""
    ollama_status = "disconnected"
    ollama_model = None

    try:
        client = init_ollama()
        models = client.list()
        ollama_status = "connected"
        model_names = [m.get('name', m.get('model', '')) for m in models.get('models', [])]
        if any(Config.OLLAMA_MODEL in name for name in model_names):
            ollama_model = Config.OLLAMA_MODEL
    except Exception:
        pass

    return HealthCheckResponse(
        status="healthy",
        services={
            "easyocr": "ready",
            "nudenet": "ready",
            "opencv": "ready",
            "ollama": ollama_status,
            "ollama_model": ollama_model or "not loaded"
        }
    )


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
    return extract_text(content, filename)


@app.post("/parse-cv", response_model=CVParseResult)
async def parse_cv(
    file: UploadFile = File(...),
    doc_type: str = Form(default="doctor")
):
    """Parse CV/resume and extract structured data"""
    from services.cv_parser_service import parse

    content = await file.read()
    filename = file.filename.lower() if file.filename else "document.pdf"
    return parse(content, filename, doc_type)


@app.post("/verify-document", response_model=DocumentVerifyResult)
async def verify_document(
    file: UploadFile = File(...),
    expected_type: str = Form(...)
):
    """Verify document type using OCR + keyword matching"""
    from services.doc_verification_service import doc_verification_service
    from services.ocr_service import extract_text

    content = await file.read()
    filename = file.filename.lower() if file.filename else "document.jpg"

    # Extract text first
    ocr_result = extract_text(content, filename)
    if not ocr_result.success:
        return DocumentVerifyResult(
            valid=False,
            documentType=expected_type,
            confidence=0.0,
            issues=["Could not extract text from document"]
        )

    # Verify using keywords
    result = doc_verification_service.verify(ocr_result.text, expected_type)
    return DocumentVerifyResult(
        documentType=expected_type,
        **result
    )


@app.post("/verify-profile", response_model=ProfileVerifyResult)
async def verify_profile(file: UploadFile = File(...)):
    """Verify profile photo (face detection + NSFW check)"""
    from services.face_detection_service import face_detection_service
    from services.moderation_service import moderate

    content = await file.read()

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


@app.post("/screen-document", response_model=DocumentScreeningResult)
async def screen_document(
    file: UploadFile = File(...),
    expected_type: str = Form(...)
):
    """
    Full document screening (replaces Gemini verifyDocument).
    Combines NSFW check + face detection (for photos) + document verification.
    """
    from services.moderation_service import moderate
    from services.ocr_service import extract_text
    from services.doc_verification_service import doc_verification_service
    from services.face_detection_service import face_detection_service
    from services.document_service import get_file_type

    content = await file.read()
    filename = file.filename.lower() if file.filename else "document.jpg"
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


@app.post("/parse-home-visit", response_model=HomeVisitScanResult)
async def parse_home_visit(file: UploadFile = File(...)):
    """Extract home visit receiver info from a document/image for form auto-fill."""
    from services.home_visit_parser_service import parse

    content = await file.read()
    filename = file.filename.lower() if file.filename else "document.jpg"
    return parse(content, filename)


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True
    )
