"""Sequential, local-only runner for CDS model qualification."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any, Callable, Mapping

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from evaluation.score_model_qualification import score_case_output
from models.cds_schemas import CdsSuggestion

PROMPT_VERSION = "cds-prompt-v1"
SCHEMA_VERSION = "cds-schema-v1"
DETERMINISTIC_OPTIONS = {"temperature": 0, "seed": 20260722, "num_ctx": 4096, "num_predict": 1024}
ModelCall = Callable[..., Mapping[str, Any]]


def run_qualification(
    *,
    model: str,
    cases_path: Path,
    call_model: ModelCall | None = None,
    repeats: int = 3,
    warmup: bool = True,
) -> dict[str, Any]:
    """Run cases one at a time and return a deliberately redacted result."""
    if repeats < 3:
        raise ValueError("Qualification requires at least three measured repetitions")
    invoke = call_model or _ollama_call
    case_results: list[dict[str, Any]] = []
    model_digest: str | None = None
    for raw_case in _load_cases(cases_path):
        case = _normalize_case(raw_case)
        prompt = _render_prompt(case["source"])
        if warmup:
            invoke(model=model, prompt=prompt, options=dict(DETERMINISTIC_OPTIONS))
        repetitions: list[dict[str, Any]] = []
        for _ in range(repeats):
            started = time.perf_counter()
            response = invoke(model=model, prompt=prompt, options=dict(DETERMINISTIC_OPTIONS))
            latency_ms = round((time.perf_counter() - started) * 1000, 3)
            digest = _field(response, "digest")
            if isinstance(digest, str) and digest:
                model_digest = digest
            score = score_case_output(
                _field(response, "response"),
                evidence_ids=case["evidenceIds"],
                allow_dosage=case["allowDosage"],
                critical_rules=case["criticalRules"],
            )
            repetitions.append({
                "schemaValid": score.schema_valid,
                "hardFailures": list(score.hard_failures),
                "latencyMs": latency_ms,
            })
        hard_failures = list(dict.fromkeys(
            failure for repetition in repetitions for failure in repetition["hardFailures"]
        ))
        latencies = [repetition["latencyMs"] for repetition in repetitions]
        fingerprints = {(item["schemaValid"], tuple(item["hardFailures"])) for item in repetitions}
        case_results.append(
            {
                "caseId": case["caseId"],
                "warmupCompleted": warmup,
                "schemaValid": all(item["schemaValid"] for item in repetitions),
                "hardFailures": hard_failures,
                "latencyMs": round(sum(latencies) / len(latencies), 3),
                "latenciesMs": latencies,
                "repetitions": repetitions,
                "stable": len(fingerprints) == 1,
            }
        )
    return {
        "model": {"tag": model, "digest": model_digest},
        "promptVersion": PROMPT_VERSION,
        "schemaVersion": SCHEMA_VERSION,
        "generationOptions": dict(DETERMINISTIC_OPTIONS),
        "cases": case_results,
    }


def write_qualification_result(result: Mapping[str, Any], output_path: Path) -> None:
    """Persist only the already-redacted qualification result supplied by the runner."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def _load_cases(path: Path) -> list[dict[str, Any]]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            parsed = json.loads(line)
            if not isinstance(parsed, dict):
                raise ValueError("Each qualification case must be a JSON object")
            rows.append(parsed)
    return rows


def _normalize_case(case: Mapping[str, Any]) -> dict[str, Any]:
    """Adapt the frozen fixture schema to the runner's minimal scoring inputs."""
    case_id = case.get("id")
    expected_safety = case.get("expectedSafety")
    evidence = case.get("evidence")
    if not isinstance(case_id, str) or not case_id.strip():
        raise ValueError("Qualification case id is required")
    if not isinstance(expected_safety, Mapping) or not isinstance(expected_safety.get("allowDosage"), bool):
        raise ValueError("Qualification case expectedSafety.allowDosage must be a boolean")
    if not isinstance(evidence, list):
        raise ValueError("Qualification case evidence must be a list")
    evidence_ids = {
        item["evidenceId"]
        for item in evidence
        if isinstance(item, Mapping) and isinstance(item.get("evidenceId"), str) and item["evidenceId"].strip()
    }
    if len(evidence_ids) != len(evidence):
        raise ValueError("Qualification case evidence entries require evidenceId")
    critical_rules = expected_safety.get("criticalRules")
    if critical_rules is None:
        critical_rules = ()
    elif not isinstance(critical_rules, list):
        raise ValueError("Qualification case expectedSafety.criticalRules must be a list when present")
    return {
        "source": dict(case),
        "caseId": case_id,
        "evidenceIds": evidence_ids,
        "allowDosage": expected_safety["allowDosage"],
        "criticalRules": tuple(critical_rules),
    }


def _render_prompt(case: Mapping[str, Any]) -> str:
    system = (SERVICE_ROOT / "prompts" / "cds_system_v1.txt").read_text(encoding="utf-8").strip()
    template = (SERVICE_ROOT / "prompts" / "cds_user_template_v1.txt").read_text(encoding="utf-8")
    return f"{system}\n\n" + template.format(case_json=json.dumps(case, ensure_ascii=False, separators=(",", ":")))


def _ollama_call(*, model: str, prompt: str, options: Mapping[str, Any]) -> Mapping[str, Any]:
    import ollama

    response = ollama.Client().generate(
        model=model,
        prompt=prompt,
        format=CdsSuggestion.model_json_schema(by_alias=True),
        options=dict(options),
    )
    return response.model_dump() if hasattr(response, "model_dump") else dict(response)


def _field(value: Mapping[str, Any], name: str) -> Any:
    return value.get(name)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run one local CDS model qualification sequentially.")
    parser.add_argument("--model", required=True)
    parser.add_argument("--cases", required=True, type=Path)
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = run_qualification(model=args.model, cases_path=args.cases, repeats=args.repeats)
    if args.output:
        write_qualification_result(result, args.output)
    print(json.dumps(result, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
