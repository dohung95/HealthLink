"""
Face Detection Service using OpenCV Haar Cascades
Validates profile photos by detecting faces
"""

import cv2
import numpy as np
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config


class FaceDetectionService:
    """Service for detecting faces in images using OpenCV"""

    def __init__(self):
        # Load Haar cascade classifier
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )

    def detect(self, image_bytes: bytes) -> dict:
        """
        Detect faces in an image.

        Returns:
            dict with:
            - hasFace: True if at least one face detected
            - singleFace: True if exactly one face detected
            - faceCount: Number of faces detected
            - faceSize: "adequate", "small", "too_small", or "none"
            - confidence: Overall confidence score
        """
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {
                "hasFace": False,
                "singleFace": False,
                "faceCount": 0,
                "faceSize": "none",
                "confidence": 0.0
            }

        # Convert to grayscale for face detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=4,
            minSize=(Config.FACE_MIN_SIZE, Config.FACE_MIN_SIZE)
        )

        has_face = len(faces) > 0
        single_face = len(faces) == 1

        # Determine face size relative to image
        face_size = "none"
        if has_face:
            # Get the largest face
            max_face = max(faces, key=lambda f: f[2] * f[3])
            face_w, face_h = max_face[2], max_face[3]
            img_h, img_w = img.shape[:2]
            face_ratio = (face_w * face_h) / (img_w * img_h)

            if face_ratio > 0.1:  # Face is >10% of image
                face_size = "adequate"
            elif face_ratio > 0.05:  # Face is 5-10% of image
                face_size = "small"
            else:
                face_size = "too_small"

        # Calculate confidence
        confidence = 0.0
        if single_face and face_size == "adequate":
            confidence = 0.95
        elif single_face and face_size == "small":
            confidence = 0.80
        elif has_face and face_size == "adequate":
            confidence = 0.70  # Multiple faces
        elif has_face:
            confidence = 0.50

        return {
            "hasFace": has_face,
            "singleFace": single_face,
            "faceCount": len(faces),
            "faceSize": face_size,
            "confidence": round(confidence, 2)
        }


# Singleton instance
face_detection_service = FaceDetectionService()
