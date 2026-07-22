"""Offline evaluation for the approved synthetic guideline-retrieval corpus."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol


class RetrievalService(Protocol):
    def retrieve(self, *, query: str, language: str | None = None, **kwargs: Any) -> Any: ...


@dataclass(frozen=True)
class EvaluationCase:
    case_id: str
    query: str
    language: str | None = None
    expected_document_id: str | None = None
    expected_version: str | None = None
    expected_checksum: str | None = None
    expected_corpus_version: str | None = None

    @property
    def expects_no_answer(self) -> bool:
        return self.expected_document_id is None


@dataclass(frozen=True)
class CaseResult:
    case_id: str
    status: str
    failures: tuple[str, ...]


@dataclass(frozen=True)
class EvaluationReport:
    cases: tuple[CaseResult, ...]
    recall_at_k: float
    mrr: float
    no_answer_precision: float


def evaluate_retrieval(service: RetrievalService, cases: list[EvaluationCase], *, top_k: int = 5) -> EvaluationReport:
    """Call the public retrieval interface and calculate deterministic retrieval metrics."""
    if not 1 <= top_k <= 10:
        raise ValueError("top_k must be between one and ten")

    results: list[CaseResult] = []
    relevant_cases = 0
    recalled_cases = 0
    reciprocal_rank_total = 0.0
    predicted_no_answer = 0
    correct_no_answer = 0

    for case in cases:
        response = service.retrieve(query=case.query, language=case.language, top_k=top_k)
        chunks = list(getattr(response, "chunks", []))[:top_k]
        no_answer = bool(getattr(response, "insufficient_evidence", False)) or not chunks
        failures: list[str] = []

        if case.expects_no_answer:
            if not no_answer:
                failures.append("expected no answer")
            else:
                correct_no_answer += 1
        else:
            relevant_cases += 1
            rank = _rank_for_document(chunks, case.expected_document_id)
            if rank is None:
                failures.append("expected document not retrieved")
            else:
                recalled_cases += 1
                reciprocal_rank_total += 1.0 / rank
                failures.extend(_citation_failures(chunks[rank - 1], case))

        if no_answer:
            predicted_no_answer += 1
        results.append(CaseResult(case.case_id, "PASS" if not failures else "FAIL", tuple(failures)))

    return EvaluationReport(
        cases=tuple(results),
        recall_at_k=recalled_cases / relevant_cases if relevant_cases else 0.0,
        mrr=reciprocal_rank_total / relevant_cases if relevant_cases else 0.0,
        no_answer_precision=correct_no_answer / predicted_no_answer if predicted_no_answer else 0.0,
    )


def load_student_demo_cases(path: Path | None = None) -> list[EvaluationCase]:
    """Load the repository's non-PHI student-demo fixture."""
    fixture = path or Path(__file__).with_name("student_demo_cases.json")
    rows = json.loads(fixture.read_text(encoding="utf-8"))
    return [
        EvaluationCase(
            case_id=row["caseId"], query=row["query"], language=row.get("language"),
            expected_document_id=row.get("documentId"), expected_version=row.get("version"),
            expected_checksum=row.get("checksum"), expected_corpus_version=row.get("corpusVersion"),
        )
        for row in rows
    ]


def run_student_demo(service: RetrievalService, *, top_k: int = 5) -> EvaluationReport:
    """Callable entrypoint for a local, deterministic student-demo evaluation."""
    return evaluate_retrieval(service, load_student_demo_cases(), top_k=top_k)


def _rank_for_document(chunks: list[Any], document_id: str | None) -> int | None:
    for index, chunk in enumerate(chunks, start=1):
        if _field(chunk, "document_id", "documentId") == document_id:
            return index
    return None


def _citation_failures(chunk: Any, case: EvaluationCase) -> list[str]:
    expected = (
        ("document id", case.expected_document_id, ("document_id", "documentId")),
        ("version", case.expected_version, ("version",)),
        ("checksum", case.expected_checksum, ("checksum",)),
        ("corpus version", case.expected_corpus_version, ("corpus_version", "corpusVersion")),
    )
    return [f"citation {label} mismatch" for label, value, names in expected if _field(chunk, *names) != value]


def _field(value: Any, *names: str) -> Any:
    if isinstance(value, dict):
        for name in names:
            if name in value:
                return value[name]
    for name in names:
        if hasattr(value, name):
            return getattr(value, name)
    return None
