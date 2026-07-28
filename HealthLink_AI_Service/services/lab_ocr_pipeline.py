"""Private, deterministic lab OCR orchestration. No LLM is used in this module."""

import hashlib
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen

from models.lab_ocr_schemas import LabOcrRequest, LabOcrResponse
from services.lab_document_renderer import extract_pages
from services.lab_table_parser import LOW_CONFIDENCE, parse_lab_detections

ENGINE_VERSION = "easyocr-deterministic-1"
PARSER_VERSION = "lab-table-parser-1.0"
MAX_DOCUMENT_BYTES = 25 * 1024 * 1024


def download_grant(object_grant: str) -> bytes:
    """Download a short-lived presigned grant without retaining or logging it."""
    parsed = urlparse(object_grant)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Invalid object grant")
    expires_values = parse_qs(parsed.query).get("X-Amz-Expires", [])
    if len(expires_values) != 1 or not expires_values[0].isdigit() or int(expires_values[0]) > 60:
        raise ValueError("Object grant must expire within 60 seconds")
    with urlopen(object_grant, timeout=15) as response:
        content = response.read(MAX_DOCUMENT_BYTES + 1)
    if len(content) > MAX_DOCUMENT_BYTES:
        raise ValueError("Lab report exceeds the 25 MB OCR limit")
    return content


def process_lab_report(request: LabOcrRequest) -> LabOcrResponse:
    """Verify bytes then produce schema-versioned, doctor-unverified OCR candidates."""
    content = download_grant(request.object_grant)
    actual_sha256 = hashlib.sha256(content).hexdigest()
    if actual_sha256 != request.sha256:
        raise ValueError("Lab report checksum mismatch")

    pages = extract_pages(content, request.mime_type)
    observations: list[dict] = []
    warnings: list[dict] = []
    response_pages: list[dict] = []
    for page_number, (width, height, detections) in enumerate(pages, start=1):
        page_observations, page_warnings = parse_lab_detections(
            detections,
            page_number=page_number,
            page_width=width,
            page_height=height,
        )
        offset = len(observations)
        for observation in page_observations:
            observation["rowOrder"] += offset
        for warning in page_warnings:
            if warning["rowOrder"] is not None:
                warning["rowOrder"] += offset
        observations.extend(page_observations)
        warnings.extend(page_warnings)
        response_pages.append({"pageNumber": page_number, "width": width, "height": height})

    return LabOcrResponse(
        engineVersion=ENGINE_VERSION,
        parserVersion=PARSER_VERSION,
        sha256=actual_sha256,
        pages=response_pages,
        observations=observations,
        warnings=warnings,
        processingMetrics={
            "pageCount": len(response_pages),
            "candidateCount": len(observations),
            "lowConfidenceCount": sum(1 for observation in observations if observation["confidence"] < LOW_CONFIDENCE),
        },
    )
