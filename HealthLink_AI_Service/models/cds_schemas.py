"""Strict, doctor-review-only contract for local CDS model qualification."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


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
