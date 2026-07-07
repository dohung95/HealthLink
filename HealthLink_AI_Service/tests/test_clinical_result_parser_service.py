import unittest
from unittest.mock import patch

from services import clinical_result_parser_service as parser


SAMPLE_OCR_TEXT = """
BENH VIEN NHAN DAN 115
Patient: Nguyen Van A
Date: 2026-06-15
Lab: Trung Tam Xet Nghiem

Test                Result      Unit       Reference Range
Hemoglobin          14.2        g/dL       13.5-17.5
WBC                 11.5        x10^9/L    4.5-11.0
Platelet Count      245         x10^9/L    150-450
"""


class FakeOcrResult:
    def __init__(self, success=True, text=SAMPLE_OCR_TEXT, confidence=0.91):
        self.success = success
        self.text = text
        self.confidence = confidence


class ClinicalResultParserServiceTest(unittest.TestCase):
    @patch("services.clinical_result_parser_service.generate_json", return_value={})
    @patch("services.clinical_result_parser_service.extract_text")
    def test_parse_succeeds_without_llm_when_rows_are_detected(self, mock_extract_text, _mock_generate_json):
        mock_extract_text.return_value = FakeOcrResult()

        result = parser.parse(b"image-bytes", "test_lab3.png", patient_name="Wrong Sample Name")

        self.assertTrue(result.success)
        self.assertEqual("Blood Test", result.category)
        self.assertEqual(3, len(result.tests))
        self.assertEqual("Hemoglobin", result.tests[0].testName)
        self.assertEqual("NORMAL", result.tests[0].flag)
        self.assertEqual("WBC", result.tests[1].testName)
        self.assertEqual("HIGH", result.tests[1].flag)
        self.assertIsNone(result.patientMatched)
        self.assertNotIn("patient", " ".join(result.warnings).lower())

    @patch("services.clinical_result_parser_service.generate_json", return_value={
        "abnormalSummary": "WBC is mildly above the reference range.",
        "doctorAssessmentDraft": "Review WBC elevation with current symptoms.",
        "patientSummaryDraft": "One white blood cell result is slightly high.",
        "warnings": ["AI draft requires doctor review"],
        "confidence": 0.82,
    })
    @patch("services.clinical_result_parser_service.extract_text")
    def test_parse_merges_llm_summary_without_replacing_detected_rows(self, mock_extract_text, _mock_generate_json):
        mock_extract_text.return_value = FakeOcrResult()

        result = parser.parse(b"image-bytes", "test_lab3.png", patient_name=None)

        self.assertTrue(result.success)
        self.assertEqual(3, len(result.tests))
        self.assertEqual("WBC is mildly above the reference range.", result.abnormalSummary)
        self.assertEqual("Review WBC elevation with current symptoms.", result.doctorAssessmentDraft)
        self.assertEqual("One white blood cell result is slightly high.", result.patientSummaryDraft)
        self.assertEqual(0.82, result.confidence)

    @patch("services.clinical_result_parser_service.extract_text")
    def test_parse_fails_cleanly_when_ocr_cannot_read_text(self, mock_extract_text):
        mock_extract_text.return_value = FakeOcrResult(success=False, text="", confidence=0.0)

        result = parser.parse(b"bad-image", "blank.png", patient_name="Nguyen Van A")

        self.assertFalse(result.success)
        self.assertIn("Could not extract text", result.error)
        self.assertIn("Please enter the result manually", result.warnings)

    def test_reference_range_flagging(self):
        self.assertEqual("LOW", parser._flag_from_reference("3.9", "4.5-11.0"))
        self.assertEqual("NORMAL", parser._flag_from_reference("7.2", "4.5-11.0"))
        self.assertEqual("HIGH", parser._flag_from_reference("11.5", "4.5-11.0"))
        self.assertEqual("UNKNOWN", parser._flag_from_reference("positive", "negative"))


if __name__ == "__main__":
    unittest.main()
