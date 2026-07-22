from __future__ import annotations

from dataclasses import dataclass

from evaluation.retrieval_evaluation import (
    EvaluationCase,
    load_student_demo_cases,
    run_student_demo,
    evaluate_retrieval,
)


@dataclass
class FakeChunk:
    document_id: str
    version: str
    checksum: str
    corpus_version: str


@dataclass
class FakeResponse:
    insufficient_evidence: bool
    chunks: list[FakeChunk]


class DeterministicRetrievalFake:
    """A synthetic stand-in for GuidelineRetrievalService.retrieve."""

    def __init__(self, responses: dict[str, FakeResponse]):
        self.responses = responses
        self.calls: list[dict] = []

    def retrieve(self, *, query: str, language: str | None = None, **kwargs) -> FakeResponse:
        self.calls.append({"query": query, "language": language, **kwargs})
        return self.responses[query]


def test_evaluation_reports_case_outcomes_metrics_and_complete_citations():
    checksum = "a" * 64
    service = DeterministicRetrievalFake(
        {
            "fasting glucose": FakeResponse(
                insufficient_evidence=False,
                chunks=[FakeChunk("glucose-guide", "2026.1", checksum, "student-demo-2026.1")],
            ),
            "unrelated synthetic question": FakeResponse(insufficient_evidence=True, chunks=[]),
            "missing citation metadata": FakeResponse(
                insufficient_evidence=False,
                chunks=[FakeChunk("glucose-guide", "", checksum, "student-demo-2026.1")],
            ),
        }
    )
    cases = [
        EvaluationCase(
            case_id="synthetic-glucose",
            query="fasting glucose",
            language="en",
            expected_document_id="glucose-guide",
            expected_version="2026.1",
            expected_checksum=checksum,
            expected_corpus_version="student-demo-2026.1",
        ),
        EvaluationCase(case_id="synthetic-no-answer", query="unrelated synthetic question", language="en"),
        EvaluationCase(
            case_id="synthetic-invalid-citation",
            query="missing citation metadata",
            language="en",
            expected_document_id="glucose-guide",
            expected_version="2026.1",
            expected_checksum=checksum,
            expected_corpus_version="student-demo-2026.1",
        ),
    ]

    report = evaluate_retrieval(service, cases, top_k=2)

    assert [(result.case_id, result.status) for result in report.cases] == [
        ("synthetic-glucose", "PASS"),
        ("synthetic-no-answer", "PASS"),
        ("synthetic-invalid-citation", "FAIL"),
    ]
    assert report.recall_at_k == 1.0
    assert report.mrr == 1.0
    assert report.no_answer_precision == 1.0
    assert "citation version mismatch" in report.cases[2].failures
    assert service.calls[0]["language"] == "en"
    assert service.calls[0]["top_k"] == 2


def test_student_demo_runner_loads_only_synthetic_fixture_cases():
    checksum = "a" * 64
    service = DeterministicRetrievalFake(
        {
            "fasting glucose": FakeResponse(
                insufficient_evidence=False,
                chunks=[FakeChunk("glucose-guide", "2026.1", checksum, "student-demo-2026.1")],
            ),
            "unrelated synthetic question": FakeResponse(insufficient_evidence=True, chunks=[]),
        }
    )

    cases = load_student_demo_cases()
    report = run_student_demo(service)

    assert [case.case_id for case in cases] == ["synthetic-glucose", "synthetic-no-answer"]
    assert [result.status for result in report.cases] == ["PASS", "PASS"]
