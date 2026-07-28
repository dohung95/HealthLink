"""Deterministic parser for approved guideline sources."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path

import fitz

from models.rag_schemas import GuidelineManifest, GuidelineSection, ParsedGuideline


class GuidelineParser:
    def parse(self, manifest: GuidelineManifest) -> ParsedGuideline:
        path = Path(manifest.source_path)
        if not path.is_file():
            raise ValueError("guideline source path does not exist")
        checksum = hashlib.sha256(path.read_bytes()).hexdigest()
        if checksum != manifest.sha256:
            raise ValueError("guideline checksum does not match manifest")
        if manifest.approval_status != "APPROVED":
            raise ValueError("guideline manifest is not approved")
        if path.suffix.lower() == ".pdf":
            sections = self._parse_pdf(path)
        else:
            sections = self._parse_markdown(path)
        if not sections:
            raise ValueError("guideline source has no ingestible sections")
        return ParsedGuideline(manifest=manifest, sections=sections)

    @staticmethod
    def _parse_markdown(path: Path) -> list[GuidelineSection]:
        content = path.read_text(encoding="utf-8")
        content = re.sub(r"\A---\s*.*?\s*---\s*", "", content, count=1, flags=re.DOTALL)
        headings: list[str] = []
        sections: list[GuidelineSection] = []
        current_text: list[str] = []

        def flush() -> None:
            text = "\n".join(current_text).strip()
            if headings and text:
                sections.append(GuidelineSection(sectionPath=" > ".join(headings), page=1, text=text))

        for line in content.splitlines():
            heading = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
            if heading:
                flush()
                current_text.clear()
                level = len(heading.group(1))
                headings[level - 1 :] = [heading.group(2)]
            else:
                current_text.append(line)
        flush()
        return sections
    @staticmethod
    def _parse_pdf(path: Path) -> list[GuidelineSection]:
        sections: list[GuidelineSection] = []
        with fitz.open(path) as pdf:
            for page_number, page in enumerate(pdf, start=1):
                text = page.get_text("text").strip()
                if text:
                    sections.append(GuidelineSection(sectionPath=f"Page {page_number}", page=page_number, text=text))
        return sections
