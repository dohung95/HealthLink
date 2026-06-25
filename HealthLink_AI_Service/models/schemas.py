from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ModerationResult(BaseModel):
    safe: bool
    needsReview: bool
    reason: str
    blockedDetections: List[dict] = []
    reviewDetections: List[dict] = []


class OCRResult(BaseModel):
    success: bool
    text: str
    confidence: float
    language: str = "en"


class CVParseResult(BaseModel):
    success: bool
    data: Dict[str, Any] = {}
    confidence: Dict[str, float] = {}
    rawText: str = ""
    error: Optional[str] = None


class DocumentVerifyResult(BaseModel):
    valid: bool
    documentType: str
    confidence: float
    typeMatches: bool = False
    detectedKeywords: List[str] = []
    issues: List[str] = []


class ProfileVerifyResult(BaseModel):
    valid: bool
    hasFace: bool
    singleFace: bool
    faceSize: str = "unknown"
    contentSafe: bool
    confidence: float
    issues: List[str] = []


class DocumentScreeningResult(BaseModel):
    passed: bool
    contentSafe: bool
    nsfwDetected: bool = False
    violenceDetected: bool = False
    hateContentDetected: bool = False
    safetyScore: float = 1.0
    typeMatches: bool = True
    detectedType: Optional[str] = None
    readable: bool = True
    appearsAuthentic: bool = True
    complete: bool = True
    confidence: float = 0.5
    issues: List[str] = []
    safetyIssues: List[str] = []
    isProfilePhoto: bool = False
    hasFaceDetected: bool = False
    isProfessionalPhoto: bool = True


class HomeVisitScanResult(BaseModel):
    success: bool
    receiverName: Optional[str] = None
    receiverAge: Optional[int] = None
    receiverGender: Optional[str] = None
    receiverPhone: Optional[str] = None
    receiverRelationship: Optional[str] = None
    visitAddress: Optional[str] = None
    visitCity: Optional[str] = None
    confidence: float = 0.0
    warnings: List[str] = []
    error: Optional[str] = None


class HealthCheckResponse(BaseModel):
    status: str
    services: Dict[str, str]
