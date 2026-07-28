from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any


FIXTURE_TYPES = {
    "valid_json",
    "missing_context",
    "critical_rule",
    "insufficient_evidence",
    "refusal",
    "fabricated_citation",
    "unsafe_dosage",
}
SAFETY_FIELDS = {
    "requiresDoctorApproval",
    "allowDosage",
    "mustCiteEvidence",
    "mustIdentifyMissingInformation",
    "mustRefuseUnsupportedRequest",
    "mustWarnContraindication",
}
EVIDENCE_FIELDS = {"evidenceId", "documentId", "version", "page"}
PROHIBITED_PHI_KEYS = {"name", "patientid", "mrn", "email", "phone", "address", "dob", "ssn"}


def _load_json_lines(path: Path) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            raise ValueError(f"{path}: blank line at {line_number}")
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}: invalid JSON at line {line_number}") from exc
        if not isinstance(value, dict):
            raise ValueError(f"{path}: case at line {line_number} must be an object")
        cases.append(value)
    return cases


def _has_prohibited_phi_key(value: Any) -> bool:
    if isinstance(value, dict):
        return any(
            key.casefold() in PROHIBITED_PHI_KEYS or _has_prohibited_phi_key(item)
            for key, item in value.items()
        )
    if isinstance(value, list):
        return any(_has_prohibited_phi_key(item) for item in value)
    return False


def _validate_case(case: dict[str, Any], seen_ids: set[str]) -> None:
    required_fields = {"id", "fixtureType", "context", "evidence", "expectedSafety"}
    if set(case) != required_fields:
        raise ValueError(f"{case.get('id', '<unknown>')}: case fields must be exactly {sorted(required_fields)}")
    case_id = case["id"]
    if not isinstance(case_id, str) or not case_id:
        raise ValueError("case id must be a nonempty string")
    if case_id in seen_ids:
        raise ValueError(f"{case_id}: duplicate case id")
    seen_ids.add(case_id)
    if case["fixtureType"] not in FIXTURE_TYPES:
        raise ValueError(f"{case_id}: unsupported fixtureType")
    context = case["context"]
    if not isinstance(context, dict) or not context:
        raise ValueError(f"{case_id}: context must be a nonempty object")
    if _has_prohibited_phi_key(context) or "synthetic" not in json.dumps(context).casefold():
        raise ValueError(f"{case_id}: context must be synthetic/de-identified and contain no PHI keys")
    evidence = case["evidence"]
    if not isinstance(evidence, list) or not evidence:
        raise ValueError(f"{case_id}: evidence must be a nonempty list")
    for item in evidence:
        if not isinstance(item, dict) or set(item) != EVIDENCE_FIELDS:
            raise ValueError(f"{case_id}: evidence must contain exactly {sorted(EVIDENCE_FIELDS)}")
        if not all(isinstance(item[field], str) and item[field] for field in EVIDENCE_FIELDS - {"page"}):
            raise ValueError(f"{case_id}: evidence identifiers must be nonempty strings")
        if not isinstance(item["page"], int) or item["page"] < 1:
            raise ValueError(f"{case_id}: evidence page must be a positive integer")
    safety = case["expectedSafety"]
    if not isinstance(safety, dict) or set(safety) != SAFETY_FIELDS:
        raise ValueError(f"{case_id}: expectedSafety fields are invalid")
    if not all(isinstance(value, bool) for value in safety.values()):
        raise ValueError(f"{case_id}: expectedSafety values must be boolean")
    if safety["requiresDoctorApproval"] is not True or safety["allowDosage"] is not False:
        raise ValueError(f"{case_id}: doctor approval must be required and dosage disallowed")


def validate(cases_path: Path, invariants_path: Path) -> int:
    cases = _load_json_lines(cases_path)
    invariants = json.loads(invariants_path.read_text(encoding="utf-8"))
    seen_ids: set[str] = set()
    for case in cases:
        _validate_case(case, seen_ids)
    if len(cases) != 100:
        raise ValueError(f"expected 100 cases, found {len(cases)}")
    categories = Counter(case["fixtureType"] for case in cases)
    if set(categories) != FIXTURE_TYPES:
        raise ValueError("fixture must cover every required fixtureType")
    manifest = invariants.get("manifest")
    expected_cases = invariants.get("cases")
    if not isinstance(manifest, dict) or not isinstance(expected_cases, dict):
        raise ValueError("invariants must include manifest and cases objects")
    if manifest.get("caseCount") != len(cases) or manifest.get("fixtureTypes") != dict(sorted(categories.items())):
        raise ValueError("invariant manifest count or categories do not match fixture")
    digest = hashlib.sha256(cases_path.read_bytes()).hexdigest()
    if manifest.get("fixtureSha256") != digest:
        raise ValueError("invariant manifest checksum does not match fixture")
    if set(expected_cases) != seen_ids:
        raise ValueError("invariants must map every and only case id")
    for case in cases:
        expected = expected_cases[case["id"]]
        if expected.get("noPhi") is not True or expected.get("expectedSafety") != case["expectedSafety"]:
            raise ValueError(f"{case['id']}: invariant safety expectations do not match")
    return len(cases)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate synthetic AI CDS qualification fixtures.")
    parser.add_argument("--cases", type=Path, default=Path(__file__).with_name("cds_cases.jsonl"))
    parser.add_argument("--invariants", type=Path, default=Path(__file__).with_name("cds_expected_invariants.json"))
    args = parser.parse_args()
    count = validate(args.cases, args.invariants)
    print(f"validated {count} qualification cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
