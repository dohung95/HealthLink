"""Stable, section-local guideline chunking."""

from __future__ import annotations

import re
from uuid import NAMESPACE_URL, uuid5

from models.rag_schemas import GuidelineChunk, ParsedGuideline


class GuidelineChunker:
    def __init__(self, max_tokens: int = 500, overlap_tokens: int = 75):
        if max_tokens < 1 or overlap_tokens < 0 or overlap_tokens >= max_tokens:
            raise ValueError("invalid chunk token bounds")
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens

    def chunk(self, document: ParsedGuideline) -> list[GuidelineChunk]:
        chunks: list[GuidelineChunk] = []
        for section in document.sections:
            tokens = re.findall(r"\S+", section.text)
            start = 0
            order = 0
            while start < len(tokens):
                selected = tokens[start : start + self.max_tokens]
                text = " ".join(selected)
                stable_material = "|".join((document.manifest.sha256, section.section_path, str(section.page), str(order)))
                chunks.append(GuidelineChunk(
                    chunkId=str(uuid5(NAMESPACE_URL, stable_material)),
                    documentId=document.manifest.document_id,
                    title=document.manifest.title,
                    issuer=document.manifest.issuer,
                    version=document.manifest.version,
                    effectiveDate=document.manifest.effective_date,
                    sectionPath=section.section_path,
                    page=section.page,
                    text=text,
                    checksum=document.manifest.sha256,
                    licenseClass=document.manifest.license_class,
                    corpusVersion=document.manifest.corpus_version,
                ))
                order += 1
                if start + self.max_tokens >= len(tokens):
                    break
                start += self.max_tokens - self.overlap_tokens
        return chunks
