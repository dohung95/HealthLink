import os
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from nudenet import NudeDetector

app = FastAPI(title="HealthLink Image Moderation Service")

detector = NudeDetector()

BLOCK_CLASSES = {
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "ANUS_EXPOSED",
}

REVIEW_CLASSES = {
    "BUTTOCKS_EXPOSED",
    "FEMALE_BREAST_EXPOSED",
    "BELLY_EXPOSED",
    "ARMPITS_EXPOSED",
    "FEET_EXPOSED",
    "MALE_BREAST_EXPOSED",
}

BLOCK_THRESHOLD = 0.75
REVIEW_THRESHOLD = 0.8


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/moderate-image")
async def moderate_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        return {
            "safe": True,
            "skipped": True,
            "reason": "Not an image file",
            "detections": [],
        }

    suffix = os.path.splitext(file.filename or "")[1] or ".jpg"

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(await file.read())
            temp_path = temp.name

        detections = detector.detect(temp_path)

        blocked_detections = []
        review_detections = []

        for item in detections:
            class_name = item.get("class")
            score = float(item.get("score", 0))

            if class_name in BLOCK_CLASSES and score >= BLOCK_THRESHOLD:
                blocked_detections.append(item)

            if class_name in REVIEW_CLASSES and score >= REVIEW_THRESHOLD:
                review_detections.append(item)

        if blocked_detections:
            return JSONResponse(
                status_code=200,
                content={
                    "safe": False,
                    "needsReview": False,
                    "reason": "Explicit sensitive content detected.",
                    "detections": detections,
                    "blockedDetections": blocked_detections,
                },
            )

        if review_detections:
            return {
                "safe": True,
                "needsReview": True,
                "reason": "Potentially sensitive medical image. Allowing upload but marking for caution.",
                "detections": detections,
                "reviewDetections": review_detections,
            }

        return {
            "safe": True,
            "needsReview": False,
            "reason": "Image passed moderation.",
            "detections": detections,
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "safe": False,
                "reason": f"Moderation failed: {str(e)}",
                "detections": [],
            },
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)