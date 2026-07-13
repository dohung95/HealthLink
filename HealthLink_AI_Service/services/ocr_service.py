"""
OCR Service using EasyOCR
Extracts text from images with preprocessing for better accuracy
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from models.schemas import OCRResult
from services.document_service import extract_text as extract_document_text, get_file_type
from services.preprocessing_service import preprocess_for_ocr, bytes_to_cv2

# Global EasyOCR reader (lazy loaded)
_ocr_reader = None


def get_ocr_reader():
    """Get or create EasyOCR reader (singleton)"""
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(Config.OCR_LANGUAGES, gpu=Config.OCR_GPU)
    return _ocr_reader


def ocr_image(image_bytes: bytes, preprocess: bool = True) -> tuple:
    """
    Perform OCR on image.
    Returns: (text, confidence)
    """
    try:
        reader = get_ocr_reader()

        if preprocess:
            try:
                processed = preprocess_for_ocr(image_bytes)
                results = reader.readtext(processed)
            except Exception:
                img = bytes_to_cv2(image_bytes)
                results = reader.readtext(img)
        else:
            img = bytes_to_cv2(image_bytes)
            results = reader.readtext(img)

        if not results:
            return "", 0.0

        texts = []
        confidences = []

        for detection in results:
            text = detection[1]
            conf = detection[2]
            texts.append(text)
            confidences.append(conf)

        full_text = " ".join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return full_text, avg_confidence
    except Exception:
        return "", 0.0


def extract_text(content: bytes, filename: str) -> OCRResult:
    """
    Extract text from any supported file type.
    Automatically handles PDFs, DOCX, and images.
    """
    file_type = get_file_type(filename)

    try:
        if file_type == 'pdf':
            # Try to extract text from PDF first
            text, _, needs_ocr = extract_document_text(content, filename)

            if not needs_ocr and len(text) > 50:
                return OCRResult(
                    success=True,
                    text=text,
                    confidence=0.95,  # High confidence for digital PDFs
                    language="en"
                )
            else:
                # Scanned PDF - convert to images and OCR
                import fitz
                from concurrent.futures import ThreadPoolExecutor

                doc = fitz.open(stream=content, filetype="pdf")
                page_count = len(doc)

                # Render each page to PNG bytes up front (fitz doc must stay
                # open on the main thread), then OCR pages concurrently —
                # EasyOCR/OpenCV release the GIL during the heavy native
                # compute, so a thread pool cuts wall-clock time on
                # multi-page documents instead of OCR-ing page by page.
                page_images = []
                for page_num in range(page_count):
                    page = doc[page_num]
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    page_images.append(pix.tobytes("png"))
                doc.close()

                if len(page_images) <= 1:
                    page_results = [ocr_image(img) for img in page_images]
                else:
                    with ThreadPoolExecutor(max_workers=min(4, len(page_images))) as executor:
                        page_results = list(executor.map(ocr_image, page_images))

                all_text = [text for text, _ in page_results]
                total_conf = sum(conf for _, conf in page_results)

                avg_conf = total_conf / max(page_count, 1)
                return OCRResult(
                    success=True,
                    text="\n".join(all_text),
                    confidence=round(avg_conf, 2),
                    language="en"
                )

        elif file_type == 'docx':
            text, _, _ = extract_document_text(content, filename)
            return OCRResult(
                success=True,
                text=text,
                confidence=0.98,  # Very high confidence for DOCX
                language="en"
            )

        elif file_type == 'image':
            text, confidence = ocr_image(content)
            return OCRResult(
                success=len(text) > 0,
                text=text,
                confidence=round(confidence, 2),
                language="en"
            )

        else:
            return OCRResult(
                success=False,
                text="",
                confidence=0.0,
                language="en"
            )

    except Exception as e:
        return OCRResult(
            success=False,
            text=f"Error: {str(e)}",
            confidence=0.0,
            language="en"
        )
