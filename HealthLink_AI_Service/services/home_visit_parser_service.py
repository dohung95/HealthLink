"""
Home Visit Info Parser Service
Uses OCR + Ollama to extract patient/receiver information from an uploaded
document or image, for auto-filling the home visit booking form.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models.schemas import HomeVisitScanResult
from services.ocr_service import extract_text
from services.ollama_service import generate_json

# Prompt mirrors the previous Gemini HOME_VISIT_INFO_PROMPT
HOME_VISIT_PROMPT = """You are an information extraction assistant for a healthcare home visit booking system.

Analyze the following document text and extract patient/receiver information.
Return ONLY valid JSON, no markdown, no code block.

Important rules:
- Use null if a field is not found or uncertain.
- Do not invent information.
- This result is only for form auto-fill. The user must verify it manually.

Required JSON format:
{
  "receiverName": "Full name of the person receiving care or null",
  "receiverAge": number or null,
  "receiverGender": "Male/Female/Other or null",
  "receiverPhone": "Phone number or null",
  "receiverRelationship": "Relationship to account owner or null",
  "visitAddress": "Full address or null",
  "visitCity": "City/province or null"
}

DOCUMENT TEXT:
{text}"""

# Fields used to estimate extraction confidence
_FIELDS = [
    "receiverName", "receiverAge", "receiverGender", "receiverPhone",
    "receiverRelationship", "visitAddress", "visitCity",
]


def _clean(value):
    """Normalize a single extracted value."""
    if value is None or value == "null" or value == "":
        return None
    if isinstance(value, str):
        return value.strip()
    return value


def _to_int(value):
    """Best-effort conversion of an age value to int."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def parse(content: bytes, filename: str) -> HomeVisitScanResult:
    """
    Extract home visit receiver information from a document/image.

    Args:
        content: File content bytes
        filename: Original filename (for type detection)

    Returns:
        HomeVisitScanResult with extracted data
    """
    try:
        # Step 1: Extract text using OCR service (handles image / PDF / DOCX)
        ocr_result = extract_text(content, filename)

        if not ocr_result.success or not ocr_result.text.strip():
            return HomeVisitScanResult(
                success=False,
                error="Could not extract text from document",
                warnings=["Please fill the form manually"],
            )

        raw_text = ocr_result.text

        # Step 2: Generate structured data using Ollama
        prompt = HOME_VISIT_PROMPT.replace("{text}", raw_text[:4000])
        data = generate_json(prompt)

        if not data:
            return HomeVisitScanResult(
                success=False,
                error="Could not parse home visit information",
                warnings=["Please fill the form manually"],
            )

        # Step 3: Clean fields
        cleaned = {field: _clean(data.get(field)) for field in _FIELDS}
        cleaned["receiverAge"] = _to_int(cleaned["receiverAge"])

        # Step 4: Confidence + warnings for missing fields
        filled = sum(1 for v in cleaned.values() if v not in (None, ""))
        confidence = round(filled / len(_FIELDS), 2)

        warnings = []
        if cleaned["receiverName"] is None:
            warnings.append("Receiver name not found")
        if cleaned["visitAddress"] is None:
            warnings.append("Visit address not found")

        return HomeVisitScanResult(
            success=True,
            confidence=confidence,
            warnings=warnings,
            **cleaned,
        )

    except Exception as e:
        return HomeVisitScanResult(
            success=False,
            error=str(e),
            warnings=["Please fill the form manually"],
        )
