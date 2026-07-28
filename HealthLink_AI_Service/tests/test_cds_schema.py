import pytest
from pydantic import ValidationError

from models.cds_schemas import CdsSuggestion


def valid_output():
    return {
        "urgency": "SOON",
        "clinicalSummary": "Synthetic summary.",
        "abnormalFindings": [],
        "possibleExplanations": [],
        "differentialDiagnoses": [],
        "recommendedAdditionalTests": [],
        "treatmentOptionsForDoctorReview": [],
        "drugWarnings": [],
        "missingInformation": [],
        "evidence": [{"evidenceId": "ev-1"}],
        "confidence": "MEDIUM",
        "requiresDoctorApproval": True,
    }


def test_schema_accepts_the_locked_cds_contract():
    parsed = CdsSuggestion.model_validate(valid_output())

    assert parsed.requires_doctor_approval is True
    assert parsed.evidence[0].evidence_id == "ev-1"


@pytest.mark.parametrize(("field", "value"), [("urgency", "NOW"), ("confidence", "CERTAIN")])
def test_schema_rejects_unknown_enum_values(field, value):
    output = valid_output()
    output[field] = value

    with pytest.raises(ValidationError):
        CdsSuggestion.model_validate(output)


def test_schema_rejects_missing_doctor_approval():
    output = valid_output()
    output.pop("requiresDoctorApproval")

    with pytest.raises(ValidationError):
        CdsSuggestion.model_validate(output)


def test_schema_rejects_auto_approval_and_extra_fields():
    output = valid_output()
    output["requiresDoctorApproval"] = False
    output["unapproved"] = "field"

    with pytest.raises(ValidationError):
        CdsSuggestion.model_validate(output)
