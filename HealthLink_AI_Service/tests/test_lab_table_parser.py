import json
from pathlib import Path

from services.lab_table_parser import parse_lab_detections


FIXTURE = Path(__file__).parent / "fixtures" / "lab_ocr" / "synthetic_glucose_detections.json"


def test_parse_lab_detections_preserves_candidate_provenance_and_marks_unverified():
    observations, warnings = parse_lab_detections(
        json.loads(FIXTURE.read_text(encoding="utf-8")),
        page_number=1,
        page_width=300,
        page_height=400,
    )

    assert warnings == []
    assert observations == [{
        "rowOrder": 1,
        "testNameRaw": "Glucose",
        "valueText": "126",
        "numericValue": 126.0,
        "comparator": None,
        "unitRaw": "mg/dL",
        "referenceText": "70-99",
        "referenceLow": 70.0,
        "referenceHigh": 99.0,
        "abnormalFlag": "HIGH",
        "confidence": 0.975,
        "sourcePage": 1,
        "sourceBoundingBox": {"x": 0.0, "y": 0.0, "width": 0.85, "height": 0.045},
        "verificationStatus": "UNVERIFIED",
    }]


def test_parse_lab_detections_warns_for_ambiguous_decimal_without_correcting_it():
    observations, warnings = parse_lab_detections(
        [
            ([0, 0, 90, 18], "Creatinine", 0.99),
            ([100, 0, 145, 18], "1,234", 0.98),
            ([155, 0, 200, 18], "mg/dL", 0.97),
        ],
        page_number=1,
        page_width=300,
        page_height=400,
    )

    assert observations[0]["valueText"] == "1,234"
    assert observations[0]["numericValue"] is None
    assert observations[0]["verificationStatus"] == "UNVERIFIED"
    assert warnings == [{"code": "AMBIGUOUS_DECIMAL", "rowOrder": 1}]


def test_parse_lab_detections_skips_column_headers_that_do_not_have_a_numeric_result():
    observations, warnings = parse_lab_detections(
        [
            ([0, 0, 60, 18], "Test", 0.99),
            ([80, 0, 135, 18], "Result", 0.99),
            ([145, 0, 190, 18], "Unit", 0.99),
            ([0, 30, 90, 48], "Glucose", 0.99),
            ([100, 30, 135, 48], "126", 0.98),
        ],
        page_number=1,
        page_width=300,
        page_height=400,
    )

    assert [observation["testNameRaw"] for observation in observations] == ["Glucose"]
    assert warnings == []


def test_parse_lab_detections_skips_document_metadata_before_header_and_keeps_post_header_qualitative_results():
    observations, warnings = parse_lab_detections(
        [
            ([0, 0, 180, 18], "SYNTHETIC LABORATORY REPORT", 0.99),
            ([190, 0, 285, 18], "STUDENT DEMO ONLY", 0.99),
            ([0, 28, 180, 46], "Sample ID: SYNTHETIC-001", 0.99),
            ([190, 28, 285, 46], "Adult demo patient", 0.99),
            ([0, 56, 60, 74], "Test", 0.99),
            ([80, 56, 135, 74], "Result", 0.99),
            ([145, 56, 190, 74], "Unit", 0.99),
            ([0, 84, 90, 102], "Glucose", 0.99),
            ([100, 84, 135, 102], "126", 0.98),
            ([145, 84, 190, 102], "mg/dL", 0.97),
            ([0, 112, 90, 130], "Urine ketones", 0.99),
            ([100, 112, 155, 130], "POSITIVE", 0.98),
        ],
        page_number=1,
        page_width=300,
        page_height=400,
    )

    assert [observation["testNameRaw"] for observation in observations] == ["Glucose", "Urine ketones"]
    assert observations[1]["numericValue"] is None
    assert observations[1]["verificationStatus"] == "UNVERIFIED"
    assert warnings == []


def test_parse_lab_detections_warns_for_unknown_ocr_unit_without_correcting_it():
    observations, warnings = parse_lab_detections(
        [
            ([0, 0, 90, 18], "Hemoglobin", 0.99),
            ([100, 0, 145, 18], "13.4", 0.98),
            ([155, 0, 200, 18], "gldL", 0.97),
        ],
        page_number=1,
        page_width=300,
        page_height=400,
    )

    assert observations[0]["unitRaw"] == "gldL"
    assert observations[0]["verificationStatus"] == "UNVERIFIED"
    assert warnings == [{"code": "UNIT_NOT_RECOGNIZED", "rowOrder": 1}]


def test_parse_lab_detections_keeps_comparator_result_before_a_table_header():
    observations, warnings = parse_lab_detections(
        [
            ([0, 0, 90, 18], "Bilirubin", 0.99),
            ([100, 0, 145, 18], "<5", 0.98),
            ([155, 0, 200, 18], "mg/dL", 0.97),
        ],
        page_number=1,
        page_width=300,
        page_height=400,
    )

    assert observations[0]["numericValue"] == 5.0
    assert observations[0]["comparator"] == "<"
    assert observations[0]["verificationStatus"] == "UNVERIFIED"
    assert warnings == []


def test_parse_lab_detections_normalizes_source_bounding_box_to_original_page_bounds():
    observations, _ = parse_lab_detections(
        json.loads(FIXTURE.read_text(encoding="utf-8")),
        page_number=1,
        page_width=300,
        page_height=400,
    )

    bounding_box = observations[0]["sourceBoundingBox"]
    assert bounding_box == {"x": 0.0, "y": 0.0, "width": 0.85, "height": 0.045}
    assert all(isinstance(value, float) and 0.0 <= value <= 1.0 for value in bounding_box.values())
