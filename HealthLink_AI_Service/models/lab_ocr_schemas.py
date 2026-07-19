"""Pydantic contracts for the private deterministic lab OCR worker."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class LabOcrRequest(BaseModel):
    job_id: UUID = Field(alias="jobId")
    report_id: UUID = Field(alias="reportId")
    object_grant: str = Field(alias="objectGrant", min_length=1)
    mime_type: Literal["application/pdf", "image/jpeg", "image/png"] = Field(alias="mimeType")
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")


class SourceBoundingBox(BaseModel):
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    width: float = Field(ge=0.0, le=1.0)
    height: float = Field(ge=0.0, le=1.0)


class LabOcrPage(BaseModel):
    page_number: int = Field(alias="pageNumber")
    width: int
    height: int


class LabOcrObservation(BaseModel):
    row_order: int = Field(alias="rowOrder")
    test_name_raw: str = Field(alias="testNameRaw")
    value_text: str = Field(alias="valueText")
    numeric_value: float | None = Field(default=None, alias="numericValue")
    comparator: Literal["<", "<=", ">", ">=", "="] | None = None
    unit_raw: str | None = Field(default=None, alias="unitRaw")
    reference_text: str | None = Field(default=None, alias="referenceText")
    reference_low: float | None = Field(default=None, alias="referenceLow")
    reference_high: float | None = Field(default=None, alias="referenceHigh")
    abnormal_flag: Literal["HIGH", "LOW", "NORMAL", "UNKNOWN"] = Field(alias="abnormalFlag")
    confidence: float
    source_page: int = Field(alias="sourcePage")
    source_bounding_box: SourceBoundingBox = Field(alias="sourceBoundingBox")
    verification_status: Literal["UNVERIFIED"] = Field(default="UNVERIFIED", alias="verificationStatus")


class LabOcrWarning(BaseModel):
    code: Literal["AMBIGUOUS_DECIMAL", "UNIT_NOT_RECOGNIZED", "LOW_CONFIDENCE", "ROW_ALIGNMENT_UNCERTAIN"]
    row_order: int | None = Field(default=None, alias="rowOrder")


class ProcessingMetrics(BaseModel):
    page_count: int = Field(alias="pageCount")
    candidate_count: int = Field(alias="candidateCount")
    low_confidence_count: int = Field(alias="lowConfidenceCount")


class LabOcrResponse(BaseModel):
    schema_version: Literal["1.0"] = Field(default="1.0", alias="schemaVersion")
    engine_version: str = Field(alias="engineVersion")
    parser_version: str = Field(alias="parserVersion")
    sha256: str
    pages: list[LabOcrPage]
    observations: list[LabOcrObservation]
    warnings: list[LabOcrWarning]
    processing_metrics: ProcessingMetrics = Field(alias="processingMetrics")
