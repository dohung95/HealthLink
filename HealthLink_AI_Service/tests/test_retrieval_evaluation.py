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
    section_path: str = "Page 1"
    page: int = 1


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
    cases = load_student_demo_cases()
    service = DeterministicRetrievalFake({
        case.query: FakeResponse(
            insufficient_evidence=case.expects_no_answer,
            chunks=[] if case.expects_no_answer else [FakeChunk(
                case.expected_document_id, case.expected_version, case.expected_checksum,
                case.expected_corpus_version, case.expected_section_path, case.expected_page,
            )],
        )
        for case in cases
    })
    report = run_student_demo(service)

    assert len(cases) == 65
    assert all(result.status == "PASS" for result in report.cases)


def test_student_demo_fixture_has_65_evidence_grounded_cases_with_page_citations():
    cases = load_student_demo_cases()
    relevant = [case for case in cases if not case.expects_no_answer]
    no_answer = [case for case in cases if case.expects_no_answer]

    assert len(cases) == 65
    assert len(relevant) >= 50
    assert len(no_answer) >= 15
    assert len({case.expected_document_id for case in relevant}) == 5
    assert all(case.language is None for case in cases)
    assert all(case.expected_section_path and case.expected_page for case in relevant)


def test_evaluation_fails_when_retrieved_page_or_section_citation_is_wrong():
    checksum = "a" * 64
    service = DeterministicRetrievalFake({
        "catalogued evidence": FakeResponse(
            insufficient_evidence=False,
            chunks=[FakeChunk("glucose-guide", "2026.1", checksum, "student-demo-2026.1", "Page 2", 2)],
        ),
    })
    case = EvaluationCase(
        case_id="synthetic-page-check", query="catalogued evidence",
        expected_document_id="glucose-guide", expected_version="2026.1",
        expected_checksum=checksum, expected_corpus_version="student-demo-2026.1",
        expected_section_path="Page 1", expected_page=1,
    )

    report = evaluate_retrieval(service, [case])

    assert report.cases[0].status == "FAIL"
    assert report.cases[0].failures == ("citation section path mismatch", "citation page mismatch")
