"""
Document Verification Service
Verifies document types using OCR + keyword matching
Auto-rejects documents that don't match expected type
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config


class DocumentVerificationService:
    """Service for verifying document types using keyword matching"""

    def __init__(self):
        # Load keywords from JSON file
        keywords_path = Path(__file__).parent.parent / "data" / "document_keywords.json"
        with open(keywords_path, "r", encoding='utf-8') as f:
            self.keywords = json.load(f)

    def verify(self, text: str, expected_type: str) -> dict:
        """
        Verify document type using keyword matching.

        Returns:
            dict with:
            - valid: True if document matches expected type
            - confidence: 0.0 - 1.0
            - typeMatches: True if keywords match
            - issues: List of problems found
        """
        text_lower = text.lower().strip()
        text_length = len(text_lower)

        # Handle profile photo separately (uses face detection, not OCR)
        if self._is_profile_photo(expected_type):
            return {
                "valid": True,
                "confidence": 0.5,
                "typeMatches": True,
                "detectedKeywords": [],
                "issues": [],
                "usesFaceDetection": True
            }

        # Find matching config for expected_type
        doc_config = self._find_config(expected_type)

        if doc_config is None:
            return {
                "valid": False,
                "confidence": 0.0,
                "typeMatches": False,
                "detectedKeywords": [],
                "issues": [f"Unknown document type: {expected_type}"]
            }

        keywords = doc_config.get("keywords", [])
        required_count = doc_config.get("required_count", 2)
        min_text_length = doc_config.get("min_text_length", 20)

        issues = []

        # Check 1: Minimum text length (document must be readable)
        if text_length < min_text_length:
            issues.append(
                f"Document is not readable or not a valid {expected_type}. "
                f"Could not extract enough text from the image."
            )
            return {
                "valid": False,
                "confidence": 0.1,
                "typeMatches": False,
                "detectedKeywords": [],
                "issues": issues,
                "reason": "UNREADABLE_DOCUMENT"
            }

        # Check 2: Keyword matching
        matched_keywords = [kw for kw in keywords if kw.lower() in text_lower]
        match_count = len(matched_keywords)

        # Calculate confidence based on keyword matches
        if required_count > 0:
            confidence = min(match_count / required_count, 1.0)
        else:
            confidence = 0.5

        type_matches = match_count >= required_count

        if not type_matches:
            # Document doesn't match expected type - AUTO REJECT
            issues.append(
                f"This document does not appear to be a valid '{expected_type}'. "
                f"Found only {match_count}/{required_count} required keywords. "
                f"Please upload the correct document type."
            )
            return {
                "valid": False,
                "confidence": round(confidence, 2),
                "typeMatches": False,
                "detectedKeywords": matched_keywords,
                "issues": issues,
                "reason": "DOCUMENT_TYPE_MISMATCH"
            }

        # Document matches!
        return {
            "valid": True,
            "confidence": round(min(confidence, 0.95), 2),  # Cap at 0.95
            "typeMatches": True,
            "detectedKeywords": matched_keywords,
            "issues": []
        }

    def _is_profile_photo(self, expected_type: str) -> bool:
        """Check if expected type is a profile photo"""
        normalized = expected_type.lower().replace(" ", "").replace("_", "")
        return normalized in ["profilephoto", "profile", "avatar", "photo"]

    def _find_config(self, expected_type: str) -> dict:
        """Find matching config for document type (case-insensitive)"""
        # Direct match
        if expected_type in self.keywords:
            return self.keywords[expected_type]

        # Case-insensitive match
        expected_lower = expected_type.lower()
        for key, config in self.keywords.items():
            if key.lower() == expected_lower:
                return config

        # Partial match
        for key, config in self.keywords.items():
            key_normalized = key.lower().replace(" ", "").replace("_", "").replace("-", "")
            expected_normalized = expected_lower.replace(" ", "").replace("_", "").replace("-", "")
            if key_normalized in expected_normalized or expected_normalized in key_normalized:
                return config

        return None

    def get_supported_types(self) -> list:
        """Get list of supported document types"""
        return list(self.keywords.keys())


# Singleton instance
doc_verification_service = DocumentVerificationService()
