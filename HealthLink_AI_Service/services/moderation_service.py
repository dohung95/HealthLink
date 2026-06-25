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


def _is_readable_image(image_bytes: bytes) -> bool:
    """True if the bytes decode to a raster image that OpenCV/NudeNet can process.

    PDFs, DOCX and corrupt files decode to None; NudeNet would then crash with
    'NoneType has no attribute shape'. We detect that here and skip NudeNet.
    """
    try:
        import numpy as np
        import cv2
        arr = np.frombuffer(image_bytes, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR) is not None
    except Exception:
        return False


def _not_analyzable(reason: str) -> ModerationResult:
    """NSFW could not be evaluated (non-image / unreadable). Don't block here;
    the document is still validated downstream by OCR + type verification."""
    return ModerationResult(
        safe=True,
        needsReview=True,
        reason=reason,
        blockedDetections=[],
        reviewDetections=[]
    )


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
    # NudeNet/OpenCV only handle raster images; short-circuit anything else.
    if not _is_readable_image(image_bytes):
        return _not_analyzable("Content could not be analyzed for NSFW (not a readable image)")

    detector = get_detector()

    # NudeNet requires file path, so save temporarily
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        detections = detector.detect(tmp_path)
    except Exception as e:
        # Never let a detector failure bubble up as a 500
        return _not_analyzable(f"Content could not be analyzed for NSFW: {e}")
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    blocked = []
    review = []

    for detection in (detections or []):
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
