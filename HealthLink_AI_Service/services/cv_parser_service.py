"""
CV Parser Service
Uses OCR + Ollama to extract structured data from CVs/resumes
"""

import hashlib
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models.schemas import CVParseResult
from services.ocr_service import extract_text
from services.ollama_service import generate_json

# Load prompts
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# Prompt templates rarely change at runtime — read each one from disk once.
_prompt_cache: dict = {}

# Short-lived cache of full parse results, keyed by file content hash, so
# re-submitting the same file (retry after a network hiccup, re-testing)
# skips OCR + the Ollama call entirely instead of rerunning the whole pipeline.
_result_cache: dict = {}
_RESULT_CACHE_TTL_SECONDS = 15 * 60


def load_prompt(doc_type: str) -> str:
    """Load prompt template for document type (cached after first read)"""
    if doc_type not in _prompt_cache:
        prompt_file = PROMPTS_DIR / f"{doc_type}_cv.txt"
        _prompt_cache[doc_type] = prompt_file.read_text(encoding='utf-8') if prompt_file.exists() else ""
    return _prompt_cache[doc_type]


def _cache_key(content: bytes, doc_type: str) -> str:
    return f"{doc_type}:{hashlib.sha256(content).hexdigest()}"


def _get_cached_result(key: str) -> "CVParseResult | None":
    entry = _result_cache.get(key)
    if entry is None:
        return None
    result, cached_at = entry
    if time.time() - cached_at > _RESULT_CACHE_TTL_SECONDS:
        _result_cache.pop(key, None)
        return None
    return result


def calculate_confidence(data: dict, doc_type: str) -> dict:
    """
    Calculate confidence scores for each extracted field.
    Based on whether the field is present and non-null.
    """
    confidence = {}

    if doc_type == "doctor":
        required_fields = ["fullName", "email", "specialty"]
        optional_fields = ["phoneNumber", "qualifications", "yearsOfExperience",
                          "languageSpoken", "location", "bio", "clinicName", "clinicAddress"]
    else:  # pharmacy
        required_fields = ["pharmacyName", "email", "address"]
        optional_fields = ["phoneNumber", "licenseNumber", "city", "district", "ward", "description"]

    # Calculate per-field confidence
    for field in required_fields + optional_fields:
        value = data.get(field)
        if value is not None and value != "" and value != "null":
            if field in required_fields:
                confidence[field] = 0.9
            else:
                confidence[field] = 0.85
        else:
            confidence[field] = 0.0

    # Calculate overall confidence
    total_fields = len(required_fields) + len(optional_fields)
    filled_fields = sum(1 for v in confidence.values() if v > 0)
    confidence["overall"] = round(filled_fields / total_fields, 2)

    return confidence


def clean_parsed_data(data: dict) -> dict:
    """Clean and normalize parsed data"""
    cleaned = {}

    for key, value in data.items():
        if value is None or value == "null" or value == "":
            cleaned[key] = None
        elif isinstance(value, str):
            cleaned[key] = value.strip()
        else:
            cleaned[key] = value

    return cleaned


def parse(content: bytes, filename: str, doc_type: str = "doctor") -> CVParseResult:
    """
    Parse CV/resume and extract structured data.

    Args:
        content: File content bytes
        filename: Original filename (for type detection)
        doc_type: "doctor" or "pharmacy"

    Returns:
        CVParseResult with extracted data
    """
    cache_key = _cache_key(content, doc_type)
    cached = _get_cached_result(cache_key)
    if cached is not None:
        return cached

    try:
        # Step 1: Extract text using OCR service
        ocr_result = extract_text(content, filename)

        if not ocr_result.success or not ocr_result.text.strip():
            return CVParseResult(
                success=False,
                error="Could not extract text from document",
                rawText=""
            )

        raw_text = ocr_result.text

        # Step 2: Load appropriate prompt
        prompt_template = load_prompt(doc_type)
        if not prompt_template:
            # Use default inline prompt
            if doc_type == "doctor":
                prompt_template = """Extract information from this CV/resume and return ONLY valid JSON.
Use null for fields not found.

Required JSON format:
{
  "fullName": "string or null",
  "email": "string or null",
  "phoneNumber": "string or null",
  "qualifications": "comma-separated string or null",
  "specialty": "string or null",
  "yearsOfExperience": number or null,
  "languageSpoken": "comma-separated string or null",
  "location": "string or null",
  "bio": "max 200 words or null",
  "clinicName": "string or null",
  "clinicAddress": "string or null"
}

CV TEXT:
{text}"""
            else:
                prompt_template = """Extract information from this document and return ONLY valid JSON.
Use null for fields not found.

Required JSON format:
{
  "pharmacyName": "string or null",
  "email": "string or null",
  "phoneNumber": "string or null",
  "licenseNumber": "string or null",
  "address": "string or null",
  "city": "string or null",
  "district": "string or null",
  "ward": "string or null",
  "description": "max 200 words or null"
}

DOCUMENT TEXT:
{text}"""

        # Step 3: Generate structured data using Ollama
        prompt = prompt_template.replace("{text}", raw_text[:4000])  # Limit text length
        data = generate_json(prompt)

        if not data:
            return CVParseResult(
                success=False,
                error="Could not parse CV content",
                rawText=raw_text[:500]
            )

        # Step 4: Clean and calculate confidence
        cleaned_data = clean_parsed_data(data)
        confidence = calculate_confidence(cleaned_data, doc_type)

        result = CVParseResult(
            success=True,
            data=cleaned_data,
            confidence=confidence,
            rawText=raw_text[:500]
        )
        _result_cache[cache_key] = (result, time.time())
        return result

    except Exception as e:
        return CVParseResult(
            success=False,
            error=str(e),
            rawText=""
        )
