"""Deterministic extraction for structured laboratory result rows."""

import re
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from models.schemas import ClinicalResultParseResult, ClinicalResultRow
from services.ocr_service import extract_text
from services.ollama_service import generate_json


_ROW_PATTERN = re.compile(
    r"^\s*(?P<name>.+?)\s{2,}(?P<value>[<>]?\s*\d+(?:[.,]\d+)?)\s+"
    r"(?P<unit>\S+)\s{2,}(?P<reference>\d+(?:[.,]\d+)?\s*-\s*\d+(?:[.,]\d+)?)\s*$"
)


def _to_number(value: str) -> Optional[float]:
    if value.strip().startswith(("<", ">")):
        return None
    try:
        return float(value.replace(",", "."))
    except (AttributeError, ValueError):
        return None


def _flag_from_reference(value: str, reference_range: str) -> str:
    """Return a flag only when numeric value and range are explicit."""
    numeric_value = _to_number(value)
    match = re.fullmatch(
        r"\s*(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*", reference_range or ""
    )
    if numeric_value is None or match is None:
        return "UNKNOWN"

    low = float(match.group(1).replace(",", "."))
    high = float(match.group(2).replace(",", "."))
    if numeric_value < low:
        return "LOW"
    if numeric_value > high:
        return "HIGH"
    return "NORMAL"


def _parse_rows(ocr_text: str) -> list[ClinicalResultRow]:
    rows: list[ClinicalResultRow] = []
    for line in ocr_text.splitlines():
        match = _ROW_PATTERN.match(line)
        if match is None:
            continue
        value = match.group("value").replace(" ", "")
        reference_range = match.group("reference").replace(" ", "")
        rows.append(
            ClinicalResultRow(
                testName=match.group("name").strip(),
                value=value,
                unit=match.group("unit"),
                referenceRange=reference_range,
                flag=_flag_from_reference(value, reference_range),
            )
        )
    return rows


def _summary_prompt(ocr_text: str) -> str:
    return (
        "Return JSON with optional abnormalSummary, doctorAssessmentDraft, patientSummaryDraft, "
        "warnings, and confidence. Do not return, alter, or infer laboratory rows. "
        "This is a doctor-review draft only.\n\nOCR TEXT:\n" + ocr_text[:4000]
    )


def parse(content: bytes, filename: str, patient_name: Optional[str] = None) -> ClinicalResultParseResult:
    """Extract lab rows from OCR; ``patient_name`` is deliberately not matched or retained."""
    del patient_name
    try:
        ocr_result = extract_text(content, filename)
    except Exception as error:
        return ClinicalResultParseResult(
            success=False,
            error=f"Could not extract text: {error}",
            warnings=["Please enter the result manually"],
        )

    if not ocr_result.success or not ocr_result.text.strip():
        return ClinicalResultParseResult(
            success=False,
            error="Could not extract text from document",
            warnings=["Please enter the result manually"],
        )

    tests = _parse_rows(ocr_result.text)
    if not tests:
        return ClinicalResultParseResult(
            success=False,
            error="Could not detect structured laboratory rows",
            confidence=ocr_result.confidence,
            warnings=["Please enter the result manually"],
        )

    summary = generate_json(_summary_prompt(ocr_result.text)) or {}
    return ClinicalResultParseResult(
        success=True,
        category="Blood Test",
        tests=tests,
        confidence=summary.get("confidence", ocr_result.confidence),
        abnormalSummary=summary.get("abnormalSummary"),
        doctorAssessmentDraft=summary.get("doctorAssessmentDraft"),
        patientSummaryDraft=summary.get("patientSummaryDraft"),
        warnings=summary.get("warnings", []),
    )
