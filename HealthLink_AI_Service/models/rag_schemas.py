"""Contracts shared by the offline guideline ingestion and retrieval workers."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class GuidelineManifest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    document_id: str = Field(alias="documentId", min_length=1)
    title: str = Field(min_length=1)
    issuer: str = Field(min_length=1)
    version: str = Field(min_length=1)
    effective_date: date = Field(alias="effectiveDate")
    license_class: str = Field(alias="licenseClass", min_length=1)
    source_path: str = Field(alias="sourcePath", min_length=1)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    approval_status: Literal["APPROVED"] = Field(alias="approvalStatus")
    corpus_version: str = Field(alias="corpusVersion", min_length=1)


class GuidelineSection(BaseModel):
    section_path: str = Field(alias="sectionPath", min_length=1)
    page: int = Field(ge=1)
    text: str = Field(min_length=1)


class ParsedGuideline(BaseModel):
    manifest: GuidelineManifest
    sections: list[GuidelineSection] = Field(min_length=1)


class GuidelineChunk(BaseModel):
    """Wire contract. All fields are required for auditable citations."""

    model_config = ConfigDict(populate_by_name=True)

    chunk_id: str = Field(alias="chunkId")
    document_id: str = Field(alias="documentId")
    title: str
    issuer: str
    version: str
    effective_date: date = Field(alias="effectiveDate")
    section_path: str = Field(alias="sectionPath")
    page: int = Field(ge=1)
    text: str = Field(min_length=1)
    score: float = 0.0
    checksum: str = Field(pattern=r"^[0-9a-f]{64}$")
    license_class: str = Field(alias="licenseClass")
    corpus_version: str = Field(alias="corpusVersion")
