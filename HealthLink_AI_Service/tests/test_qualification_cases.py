from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = SERVICE_ROOT / "evaluation" / "validate_qualification_cases.py"
FIXTURE = SERVICE_ROOT / "evaluation" / "cds_cases.jsonl"
INVARIANTS = SERVICE_ROOT / "evaluation" / "cds_expected_invariants.json"


class QualificationFixtureTests(unittest.TestCase):
    def test_repository_qualification_fixture_validates_as_100_safe_synthetic_cases(self):
        result = subprocess.run(
            [sys.executable, str(VALIDATOR), "--cases", str(FIXTURE), "--invariants", str(INVARIANTS)],
            cwd=SERVICE_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        self.assertIn("validated 100 qualification cases", result.stdout)
