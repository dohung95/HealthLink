"""Local-only, fail-closed generation of doctor-review CDS suggestions."""

from __future__ import annotations

import json
import logging
from collections.abc import Mapping
from typing import Any

from config import Config
from evaluation.score_model_qualification import score_case_output
from models.cds_schemas import CdsGenerateRequest, CdsSuggestion
from services.openrouter_fallback_service import OpenRouterFallbackService

logger = logging.getLogger(__name__)


class CdsGenerationError(Exception):
    """A stable, non-sensitive generation failure code."""


class CdsGenerationService:
    _GENERATION_OPTIONS = {
        "temperature": 0,
        "seed": 20260722,
        "num_ctx": 4096,
        "num_predict": 1024,
    }
    _MAX_REPAIR_OUTPUT_CHARS = 16_000

    def __init__(
        self,
        *,
        client: Any | None = None,
        fallback: OpenRouterFallbackService | None = None,
    ) -> None:
        self._client = client
        self._fallback = fallback or OpenRouterFallbackService(
            enabled=Config.OPENROUTER_FALLBACK_ENABLED
        )

    def generate(self, request: CdsGenerateRequest) -> CdsSuggestion:
        if not request.deidentified_snapshot.clinical_facts:
            raise CdsGenerationError("CONTEXT_NOT_READY")
        if not request.evidence_chunks:
            raise CdsGenerationError("RAG_INSUFFICIENT")

        client = self._client or self._create_local_client()
        if not self._model_is_qualified(client):
            raise CdsGenerationError("LOCAL_MODEL_UNAVAILABLE")

        try:
            output = self._generate_local(client, self._render_prompt(request))
        except CdsGenerationError as local_error:
            output = self._fallback.generate(
                self._fallback_payload(request),
                local_error_code=str(local_error),
            )
        score = self._score(output, request)
        if score.passed:
            return self._validated_suggestion(output)
        if self._is_terminal_safety_failure(score.hard_failures):
            raise self._safety_error(score.hard_failures)

        # One repair only. Its prompt contains the malformed model output and
        # output schema, never the original request, facts, or evidence text.
        repaired_output = self._generate_local(client, self._repair_prompt(output))
        repaired_score = self._score(repaired_output, request)
        if repaired_score.passed:
            return self._validated_suggestion(repaired_output)
        if self._is_terminal_safety_failure(repaired_score.hard_failures):
            raise self._safety_error(repaired_score.hard_failures)
        raise CdsGenerationError("MODEL_SCHEMA_INVALID")

    @classmethod
    def _score(cls, output: str | Mapping[str, object], request: CdsGenerateRequest):
        return score_case_output(
            output,
            evidence_ids=(chunk.chunk_id for chunk in request.evidence_chunks),
            allow_dosage=False,
            critical_rules=(
                {"severity": finding.severity, "ruleId": finding.code}
                for finding in request.rule_findings
            ),
        )

    @staticmethod
    def _is_terminal_safety_failure(failures: tuple[str, ...]) -> bool:
        return any(
            failure.startswith("FABRICATED_CITATION")
            or failure in {"ACTIONABLE_WITHOUT_EVIDENCE", "UNSAFE_DOSAGE", "UNACKNOWLEDGED_CRITICAL_RULE"}
            for failure in failures
        )

    @staticmethod
    def _safety_error(failures: tuple[str, ...]) -> CdsGenerationError:
        if any(failure.startswith("FABRICATED_CITATION") or failure == "ACTIONABLE_WITHOUT_EVIDENCE" for failure in failures):
            return CdsGenerationError("CITATION_INVALID")
        return CdsGenerationError("RULES_BLOCKED")

    @staticmethod
    def _validated_suggestion(output: str | Mapping[str, object]) -> CdsSuggestion:
        try:
            return CdsSuggestion.model_validate_json(output) if isinstance(output, str) else CdsSuggestion.model_validate(output)
        except Exception as exc:
            raise CdsGenerationError("MODEL_SCHEMA_INVALID") from exc

    def _generate_local(self, client: Any, prompt: str) -> str | Mapping[str, object]:
        try:
            response = client.generate(
                model=Config.CDS_LOCAL_MODEL,
                prompt=prompt,
                format=CdsSuggestion.model_json_schema(by_alias=True),
                options=dict(self._GENERATION_OPTIONS),
            )
        except Exception as exc:
            logger.warning(
                "Ollama CDS generation failed cause_type=%s status_code=%s",
                type(exc).__name__,
                getattr(exc, "status_code", None),
            )
            raise CdsGenerationError("LOCAL_MODEL_UNAVAILABLE") from exc
        return self._response_content(response)

    @staticmethod
    def _create_local_client() -> Any:
        import ollama

        return ollama.Client(host=Config.OLLAMA_HOST, timeout=Config.OLLAMA_TIMEOUT)

    @staticmethod
    def _response_content(response: object) -> str | Mapping[str, object]:
        if isinstance(response, Mapping):
            content = response.get("response")
        else:
            content = getattr(response, "response", None)
        return content if isinstance(content, (str, Mapping)) else ""

    @staticmethod
    def _model_is_qualified(client: Any) -> bool:
        try:
            listed = client.list()
            models = listed.get("models", []) if isinstance(listed, Mapping) else getattr(listed, "models", [])
        except Exception:
            return False
        for item in models:
            if not isinstance(item, Mapping):
                continue
            name = item.get("name", item.get("model"))
            digest = str(item.get("digest", "")).removeprefix("sha256:")
            if name == Config.CDS_LOCAL_MODEL and digest == Config.CDS_LOCAL_MODEL_DIGEST:
                return True
        return False

    @staticmethod
    def _render_prompt(request: CdsGenerateRequest) -> str:
        payload = request.model_dump(by_alias=True, mode="json")
        return (
            "Return exactly one CDS JSON object. Doctor review only; no diagnosis, prescription, or dosage. "
            "Set requiresDoctorApproval to true. Cite only supplied evidence IDs and preserve every CRITICAL rule code.\n"
            + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        )

    @staticmethod
    def _fallback_payload(request: CdsGenerateRequest) -> dict[str, object]:
        payload = request.model_dump(by_alias=True, mode="json")
        payload.pop("runId", None)
        return payload

    @classmethod
    def _repair_prompt(cls, invalid_output: str | Mapping[str, object]) -> str:
        raw_output = invalid_output if isinstance(invalid_output, str) else json.dumps(invalid_output, ensure_ascii=False, separators=(",", ":"))
        return (
            "Repair the following model output into exactly one valid JSON object matching this schema. "
            "Do not add clinical facts, recommendations, or citations not already present in the output. "
            "Return JSON only.\nSCHEMA:\n"
            + json.dumps(CdsSuggestion.model_json_schema(by_alias=True), ensure_ascii=False, separators=(",", ":"))
            + "\nMODEL_OUTPUT:\n"
            + raw_output[: cls._MAX_REPAIR_OUTPUT_CHARS]
        )
