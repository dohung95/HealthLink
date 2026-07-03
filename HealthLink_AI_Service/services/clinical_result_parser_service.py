"""
Clinical Result Parser Service
Deterministic-first parser: shared OCR extracts text, regex extracts reliable rows,
then Ollama enriches summaries and assessment drafts.
"""

import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models.schemas import ClinicalResultScanResult, ClinicalResultTestItem
from services.ollama_service import generate_json
from services.ocr_service import extract_text

CLINICAL_RESULT_PROMPT = """You are a medical data extraction assistant for a healthcare platform.

Analyze the following document text extracted from a lab report, imaging result, or clinical test document.
Extract structured information about the patient and their test results.

Return ONLY valid JSON, no markdown, no code block.

Important rules:
- Use null if a field is not found or uncertain.
- Do not invent information.
- Put ALL test items in ONE single "tests" array. Never use duplicate keys.
- For the "flag" field per test, use one of: "NORMAL", "LOW", "HIGH", "CRITICAL", "UNKNOWN", or null.
- "patientMatched" should be null unless you have both the detected patient name AND the provided patient name to compare.
- "category" should be one of: "Blood Test", "Imaging", "Urine Test", "Pathology", "Microbiology", "Other".
- The result is for auto-fill only; the doctor must verify manually.

Required JSON format:
{
  "category": "Blood Test | Imaging | Urine Test | Pathology | Microbiology | Other or null",
  "labFacilityName": "Lab/hospital name or null",
  "documentDate": "Date in YYYY-MM-DD format or null",
  "detectedPatientName": "Patient name found on document or null",
  "patientMatched": true/false/null,
  "tests": [
    {
      "testName": "Name of the test (e.g. Hemoglobin, WBC)",
      "resultValue": "Numeric or textual result value",
      "unit": "Unit of measurement (e.g. g/dL, x10^3/uL)",
      "referenceRange": "Normal reference range (e.g. 13.5-17.5)",
      "flag": "NORMAL | LOW | HIGH | CRITICAL | UNKNOWN or null",
      "confidence": 0.0-1.0
    }
  ],
  "abnormalSummary": "Brief summary of abnormal findings or null",
  "doctorAssessmentDraft": "A draft clinical assessment/interpretation for the doctor to review or null",
  "patientSummaryDraft": "A simple plain-language explanation of the results for the patient or null",
  "warnings": ["List of cautions about data quality or missing information"],
  "confidence": 0.0
}

DOCUMENT TEXT:
{text}"""


def _clean(value):
    if value is None or value == "null" or value == "":
        return None
    if isinstance(value, str):
        return value.strip()
    return value


_CATEGORY_KEYWORDS = {
    "Blood Test": ["hemoglobin", "wbc", "platelet", "rbc", "cbc", "hct", "mcv", "mch"],
    "Urine Test": ["urine", "urobilinogen", "protein urine", "specific gravity"],
    "Imaging": ["x-ray", "xray", "ultrasound", "ct", "mri", "imaging"],
    "Pathology": ["biopsy", "pathology", "histology"],
    "Microbiology": ["culture", "bacteria", "antibiotic", "microbiology"],
}


def _normalize_number(value: str):
    if value is None:
        return None
    match = re.search(r"-?\d+(?:[.,]\d+)?", str(value))
    if not match:
        return None
    return float(match.group(0).replace(",", "."))


def _flag_from_reference(result_value: str, reference_range: str) -> str:
    result = _normalize_number(result_value)
    if result is None or not reference_range:
        return "UNKNOWN"

    range_parts = re.split(r"\s*[-–]\s*", reference_range)
    parsed = [_normalize_number(p) for p in range_parts if _normalize_number(p) is not None]

    if len(parsed) >= 2:
        low, high = parsed[0], parsed[1]
        if result < low:
            return "LOW"
        if result > high:
            return "HIGH"
        return "NORMAL"

    return "UNKNOWN"


def _detect_category(text: str, tests: list) -> str:
    haystack = " ".join([text or ""] + [t.testName or "" for t in tests]).lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return category
    return "Other"


def _extract_lab_facility(text: str):
    for line in text.splitlines():
        clean = line.strip()
        lowered = clean.lower()
        if lowered.startswith("lab:"):
            return _clean(clean.split(":", 1)[1])
        if "hospital" in lowered or "benh vien" in lowered or "lab" in lowered:
            return clean
    return None


def _extract_document_date(text: str):
    patterns = [
        r"\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b",
        r"\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if not match:
            continue

        parts = match.groups()
        try:
            if len(parts[0]) == 4:
                dt = datetime(int(parts[0]), int(parts[1]), int(parts[2]))
            else:
                dt = datetime(int(parts[2]), int(parts[1]), int(parts[0]))
            return dt.date().isoformat()
        except ValueError:
            continue

    return None


def _extract_patient_name(text: str):
    for line in text.splitlines():
        match = re.search(r"(?:patient|name|benh nhan|bệnh nhân)\s*:?\s*(.+)$", line, re.IGNORECASE)
        if match:
            return _clean(match.group(1))
    return None


def _parse_test_rows(text: str) -> list:
    rows = []
    row_pattern = re.compile(
        r"^\s*([A-Za-z][A-Za-z0-9 /().%-]{1,40}?)\s+"
        r"(-?\d+(?:[.,]\d+)?|positive|negative|detected|not detected)\s+"
        r"([A-Za-z0-9^/%.*-]+)?\s+"
        r"(\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?|<\s*\d+(?:[.,]\d+)?|>\s*\d+(?:[.,]\d+)?)",
        re.IGNORECASE,
    )

    for line in text.splitlines():
        clean_line = " ".join(line.strip().split())
        if not clean_line:
            continue

        match = row_pattern.match(clean_line)
        if not match:
            continue

        test_name = _clean(match.group(1))
        result_value = _clean(match.group(2))
        unit = _clean(match.group(3))
        reference_range = _clean(match.group(4).replace("\u2013", "-"))

        if not test_name or test_name.lower() in {"test", "result", "reference"}:
            continue

        rows.append(ClinicalResultTestItem(
            testName=test_name,
            resultValue=result_value,
            unit=unit,
            referenceRange=reference_range,
            flag=_flag_from_reference(result_value, reference_range),
            confidence=0.82,
        ))

    return rows


def parse(content: bytes, filename: str, patient_name: str = None) -> ClinicalResultScanResult:
    try:
        ocr_result = extract_text(content, filename)

        if not ocr_result.success or not ocr_result.text.strip():
            return ClinicalResultScanResult(
                success=False,
                error="Could not extract text from document. Ensure the image is clear and contains text.",
                warnings=["Please enter the result manually"],
            )

        raw_text = ocr_result.text.strip()
        tests = _parse_test_rows(raw_text)
        category = _detect_category(raw_text, tests)
        lab_facility = _extract_lab_facility(raw_text)
        doc_date = _extract_document_date(raw_text)
        detected_name = _extract_patient_name(raw_text)

        prompt = CLINICAL_RESULT_PROMPT.replace("{text}", raw_text[:5000])
        data = generate_json(prompt)

        if not tests:
            raw_tests = data.get("tests", []) if isinstance(data, dict) else []
            if isinstance(raw_tests, list):
                for t in raw_tests:
                    if isinstance(t, dict) and t.get("testName"):
                        result_value = _clean(t.get("resultValue"))
                        reference_range = _clean(t.get("referenceRange"))
                        tests.append(ClinicalResultTestItem(
                            testName=_clean(t.get("testName")),
                            resultValue=result_value,
                            unit=_clean(t.get("unit")),
                            referenceRange=reference_range,
                            flag=_clean(t.get("flag")) or _flag_from_reference(result_value, reference_range),
                            confidence=t.get("confidence") if t.get("confidence") is not None else 0.65,
                        ))

        if not tests:
            return ClinicalResultScanResult(
                success=False,
                error="Could not parse clinical result information. The document may not contain recognizable test data.",
                warnings=["Please enter the result manually"],
            )

        if isinstance(data, dict):
            category = _clean(data.get("category")) or category
            lab_facility = _clean(data.get("labFacilityName")) or lab_facility

        abnormal_tests = [t for t in tests if t.flag in ["LOW", "HIGH", "CRITICAL"]]
        abnormal_summary = _clean(data.get("abnormalSummary")) if isinstance(data, dict) else None
        if not abnormal_summary and abnormal_tests:
            abnormal_summary = ", ".join([f"{t.testName} is {t.flag.lower()}" for t in abnormal_tests])

        doctor_draft = _clean(data.get("doctorAssessmentDraft")) if isinstance(data, dict) else None
        if not doctor_draft:
            if abnormal_tests:
                doctor_draft = f"Review abnormal values: {abnormal_summary}. Correlate with symptoms and clinical history."
            else:
                doctor_draft = "Visible values are within extracted reference ranges. Correlate with symptoms and clinical history."

        patient_draft = _clean(data.get("patientSummaryDraft")) if isinstance(data, dict) else None
        if not patient_draft:
            patient_draft = "Your test result has been reviewed by the doctor. Please follow the doctor's assessment and instructions."

        raw_warnings = data.get("warnings", []) if isinstance(data, dict) else []
        warnings = [str(w).strip() for w in raw_warnings if w] if isinstance(raw_warnings, list) else []
        warnings.append("AI draft must be reviewed by the doctor before saving or publishing.")

        confidence = data.get("confidence") if isinstance(data, dict) else None
        if confidence is None:
            row_confidence = sum([(t.confidence or 0.0) for t in tests]) / max(len(tests), 1)
            confidence = round(min(max(row_confidence, 0.0), 1.0), 2)

        return ClinicalResultScanResult(
            success=True,
            category=category,
            labFacilityName=lab_facility,
            documentDate=doc_date,
            detectedPatientName=detected_name,
            patientMatched=None,
            tests=tests,
            abnormalSummary=abnormal_summary,
            doctorAssessmentDraft=doctor_draft,
            patientSummaryDraft=patient_draft,
            warnings=warnings,
            confidence=confidence,
        )

    except Exception as e:
        return ClinicalResultScanResult(
            success=False,
            error=str(e),
            warnings=["Please enter the result manually"],
        )
