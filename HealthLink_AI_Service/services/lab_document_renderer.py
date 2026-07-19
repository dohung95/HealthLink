"""Bounded document rendering used only by the deterministic OCR pipeline."""

from io import BytesIO

MAX_PDF_PAGES = 20
PDF_DPI = 300


def _detect(image_bytes: bytes) -> tuple[int, int, list[tuple[object, str, float]]]:
    import numpy as np
    from PIL import Image

    from services.ocr_service import get_ocr_reader

    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    width, height = image.size
    results = get_ocr_reader().readtext(np.asarray(image))
    return width, height, [(box, text, confidence) for box, text, confidence in results]


def extract_pages(content: bytes, mime_type: str) -> list[tuple[int, int, list[tuple[object, str, float]]]]:
    """Render supported documents at a fixed DPI and return OCR detections per page."""
    if mime_type in {"image/jpeg", "image/png"}:
        return [_detect(content)]
    if mime_type != "application/pdf":
        raise ValueError("Unsupported lab report MIME type")

    import fitz

    document = fitz.open(stream=content, filetype="pdf")
    try:
        if len(document) > MAX_PDF_PAGES:
            raise ValueError("PDF exceeds the 20-page OCR limit")
        scale = PDF_DPI / 72
        pages = []
        for page in document:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            pages.append(_detect(pixmap.tobytes("png")))
        return pages
    finally:
        document.close()
