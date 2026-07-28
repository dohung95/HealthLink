from pathlib import Path


def test_ai_service_logging_does_not_embed_clinical_payload_fields():
    source_root = Path(__file__).resolve().parents[1]
    forbidden = ("patient_name", "patientName", "phone_number", "phoneNumber", "address", "raw_prompt")
    offenders = []
    for path in source_root.rglob("*.py"):
        if "tests" in path.parts or "venv" in path.parts or "__pycache__" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), start=1):
            if ("log." in line or "logger." in line) and any(token in line for token in forbidden):
                offenders.append(f"{path.relative_to(source_root)}:{line_number}")

    assert offenders == []
