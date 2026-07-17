"""
Review Moderation Service
Uses Ollama to classify patient review text before it is published.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models.schemas import ReviewModerationResult
from services.ollama_service import generate_json

SYSTEM_PROMPT = (
    "You are a content moderator for a healthcare platform's doctor review section. "
    "Read the patient review below and decide if it should be flagged. Flag it if it contains "
    "abusive or offensive language, spam or promotional content, or content unrelated to a "
    "medical appointment experience. Do NOT flag a review just because it is negative or "
    "critical of the doctor - genuine complaints are allowed. "
    "Respond with ONLY a JSON object, no other text: "
    '{"flagged": true or false, "reason": "short reason, empty string if not flagged"}'
)


def moderate(comment: str, rating: int) -> ReviewModerationResult:
    prompt = f"Rating: {rating}/5\nReview text: {comment}"
    data = generate_json(prompt, system_prompt=SYSTEM_PROMPT)

    if not data:
        # Ollama unreachable or returned unparsable output - fail closed so nothing
        # unmoderated slips through; the caller queues it for manual admin review.
        return ReviewModerationResult(flagged=True, reason="Automated check failed - needs manual review")

    return ReviewModerationResult(
        flagged=bool(data.get("flagged", False)),
        reason=str(data.get("reason") or ""),
    )
