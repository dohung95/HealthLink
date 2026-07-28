"""Strict, doctor-review-only contract for local CDS model qualification."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from models.rag_schemas import GuidelineChunk


_DIRECT_IDENTIFIER_CODES = {
    "ADDRESS",
    "APPOINTMENT_ID",
    "DATE_OF_BIRTH",
    "DOB",
    "DOCUMENT_NAME",
    "EMAIL",
    "FILENAME",
    "MRN",
    "NAME",
    "NOTE",
    "PATIENT_ID",
    "PATIENT_NAME",
    "PHONE",
    "RAW_OCR",
    "USER_ID",
}
_DIRECT_IDENTIFIER_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        r"(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)",
        r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b",
        r"\b\d{4}-\d{2}-\d{2}\b",
        r"\b[^\\/\s]+\.(?:pdf|png|jpe?g|docx?)\b",
    )
)


class EvidenceReference(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    evidence_id: str = Field(alias="evidenceId", min_length=1)


class CdsSuggestion(BaseModel):
    """The complete model response; no uncontracted fields are accepted."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    urgency: Literal["ROUTINE", "SOON", "URGENT"]
    clinical_summary: str = Field(alias="clinicalSummary")
    abnormal_findings: list[str] = Field(alias="abnormalFindings")
    possible_explanations: list[str] = Field(alias="possibleExplanations")
    differential_diagnoses: list[str] = Field(alias="differentialDiagnoses")
    recommended_additional_tests: list[str] = Field(alias="recommendedAdditionalTests")
    treatment_options_for_doctor_review: list[str] = Field(alias="treatmentOptionsForDoctorReview")
    drug_warnings: list[str] = Field(alias="drugWarnings")
    missing_information: list[str] = Field(alias="missingInformation")
    evidence: list[EvidenceReference]
    confidence: Literal["LOW", "MEDIUM", "HIGH"]
    requires_doctor_approval: Literal[True] = Field(alias="requiresDoctorApproval")


class CdsClinicalFact(BaseModel):
    """A bounded, de-identified clinical datum, never free-text notes."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    code: str = Field(min_length=1, max_length=80, pattern=r"^[A-Z0-9_.-]+$")
    value: str = Field(min_length=1, max_length=64)
    unit: str | None = Field(default=None, max_length=32)
    status: str | None = Field(default=None, max_length=32)

    @field_validator("code")
    @classmethod
    def reject_identifier_codes(cls, value: str) -> str:
        if value in _DIRECT_IDENTIFIER_CODES:
            raise ValueError("direct identifier fact codes are forbidden")
        return value

    @field_validator("value")
    @classmethod
    def reject_identifier_values(cls, value: str) -> str:
        if any(pattern.search(value) for pattern in _DIRECT_IDENTIFIER_PATTERNS):
            raise ValueError("direct identifiers are forbidden")
        return value


class CdsDeidentifiedSnapshot(BaseModel):
    """The only context shape admitted to generation; no IDs or narrative fields."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    clinical_facts: list[CdsClinicalFact] = Field(default_factory=list, alias="clinicalFacts", max_length=100)
    context_codes: list[str] = Field(default_factory=list, alias="contextCodes", max_length=30)


class CdsRuleFinding(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    code: str = Field(min_length=1, max_length=80, pattern=r"^[A-Z0-9_.-]+$")
    severity: Literal["INFO", "WARNING", "CRITICAL"]


class CdsGenerateRequest(BaseModel):
    """Internal-only input, restricted to de-identified facts and approved evidence."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    schema_version: Literal["cds-schema-v1"] = Field(alias="schemaVersion")
    run_id: str = Field(alias="runId", min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.-]+$")
    prompt_version: Literal["cds-prompt-v1"] = Field(alias="promptVersion")
    deidentified_snapshot: CdsDeidentifiedSnapshot = Field(alias="deidentifiedSnapshot")
    rule_findings: list[CdsRuleFinding] = Field(alias="ruleFindings", max_length=100)
    evidence_chunks: list[GuidelineChunk] = Field(alias="evidenceChunks", max_length=10)
