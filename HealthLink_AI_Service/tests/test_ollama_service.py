import unittest
from unittest.mock import patch

from services import ollama_service


class OllamaServiceJsonTest(unittest.TestCase):
    @patch("services.ollama_service.generate", return_value='{"tests":[{"testName":"WBC"}],"confidence":0.8}')
    def test_generate_json_parses_direct_json(self, _mock_generate):
        data = ollama_service.generate_json("Return JSON")

        self.assertEqual("WBC", data["tests"][0]["testName"])
        self.assertEqual(0.8, data["confidence"])

    @patch("services.ollama_service.generate", return_value='Here is the result:\n```json\n{"doctorAssessmentDraft":"Review result"}\n```')
    def test_generate_json_parses_markdown_json_block(self, _mock_generate):
        data = ollama_service.generate_json("Return JSON")

        self.assertEqual("Review result", data["doctorAssessmentDraft"])

    @patch("services.ollama_service.generate", return_value='{"tests":[{"testName":"A"}],"tests":[{"testName":"B"}]}')
    def test_generate_json_merges_duplicate_test_arrays(self, _mock_generate):
        data = ollama_service.generate_json("Return JSON")

        self.assertEqual(["A", "B"], [item["testName"] for item in data["tests"]])


if __name__ == "__main__":
    unittest.main()
