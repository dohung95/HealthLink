"""
Image Moderation Service using NudeNet
Detects NSFW and inappropriate content in images
"""

import sys
import tempfile
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from models.schemas import ModerationResult

# Global NudeNet detector (lazy loaded)
_detector = None

# Classes that should be blocked
BLOCK_CLASSES = {
    "FEMALE_GENITALIA_EXPOSED": Config.NSFW_BLOCK_THRESHOLD,
    "MALE_GENITALIA_EXPOSED": Config.NSFW_BLOCK_THRESHOLD,
    "ANUS_EXPOSED": Config.NSFW_BLOCK_THRESHOLD,
}

# Classes that should be flagged for review
REVIEW_CLASSES = {
    "BUTTOCKS_EXPOSED": Config.NSFW_REVIEW_THRESHOLD,
    "FEMALE_BREAST_EXPOSED": Config.NSFW_REVIEW_THRESHOLD,
    "MALE_BREAST_EXPOSED": 0.9,
    "BELLY_EXPOSED": 0.9,
}


def get_detector():
    """Get or create NudeNet detector (singleton)"""
    global _detector
    if _detector is None:
        from nudenet import NudeDetector
        _detector = NudeDetector()
    return _detector


def moderate(image_bytes: bytes) -> ModerationResult:
    """
    Check image for NSFW/inappropriate content.

    Returns:
        ModerationResult with:
        - safe: True if image passes all checks
        - needsReview: True if image has potentially sensitive content
        - blockedDetections: List of blocked content detections
        - reviewDetections: List of content needing review
    """
    detector = get_detector()

    # NudeNet requires file path, so save temporarily
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        detections = detector.detect(tmp_path)
    finally:
        # Clean up temp file
        os.unlink(tmp_path)

    blocked = []
    review = []

    for detection in detections:
        class_name = detection.get('class', '')
        score = detection.get('score', 0.0)

        # Check for blocked content
        if class_name in BLOCK_CLASSES:
            threshold = BLOCK_CLASSES[class_name]
            if score >= threshold:
                blocked.append({
                    "class": class_name,
                    "score": round(score, 3),
                    "threshold": threshold
                })

        # Check for review content
        elif class_name in REVIEW_CLASSES:
            threshold = REVIEW_CLASSES[class_name]
            if score >= threshold:
                review.append({
                    "class": class_name,
                    "score": round(score, 3),
                    "threshold": threshold
                })

    # Determine result
    if blocked:
        return ModerationResult(
            safe=False,
            needsReview=False,
            reason=f"Blocked content detected: {', '.join(d['class'] for d in blocked)}",
            blockedDetections=blocked,
            reviewDetections=review
        )

    if review:
        return ModerationResult(
            safe=True,
            needsReview=True,
            reason=f"Content may need review: {', '.join(d['class'] for d in review)}",
            blockedDetections=[],
            reviewDetections=review
        )

    return ModerationResult(
        safe=True,
        needsReview=False,
        reason="Image is safe",
        blockedDetections=[],
        reviewDetections=[]
    )
