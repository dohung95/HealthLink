"""Deterministic row parser for OCR detections on laboratory reports."""

import re
from collections.abc import Iterable


LOW_CONFIDENCE = 0.80
_NUMERIC = re.compile(r"^(?P<comparator><=|>=|<|>|=)?\s*(?P<number>[+-]?\d+(?:\.\d+)?)$")
_RANGE = re.compile(r"^\s*([+-]?\d+(?:\.\d+)?)\s*[-–]\s*([+-]?\d+(?:\.\d+)?)\s*$")
_UNIT = re.compile(r"^[A-Za-zµμ%][A-Za-z0-9µμ%/^*.-]*$")
_HEADER_TERMS = {"test", "result", "unit", "reference", "range", "xet nghiem", "ket qua", "don vi", "tham chieu"}


def _box(raw_box: object) -> tuple[int, int, int, int]:
    """Normalize EasyOCR quadrilaterals and test rectangles to x/y/width/height."""
    if isinstance(raw_box, (list, tuple)) and len(raw_box) == 4 and all(isinstance(value, (int, float)) for value in raw_box):
        x1, y1, x2, y2 = raw_box
        return int(x1), int(y1), max(1, int(x2 - x1)), max(1, int(y2 - y1))
    points = list(raw_box)  # type: ignore[arg-type]
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return int(min(xs)), int(min(ys)), max(1, int(max(xs) - min(xs))), max(1, int(max(ys) - min(ys)))


def _rows(detections: Iterable[tuple[object, str, float]]) -> list[list[dict]]:
    tokens = [
        {"box": _box(box), "text": str(text).strip(), "confidence": float(confidence)}
        for box, text, confidence in detections
        if str(text).strip()
    ]
    tokens.sort(key=lambda token: (token["box"][1], token["box"][0]))
    rows: list[list[dict]] = []
    for token in tokens:
        if not rows:
            rows.append([token])
            continue
        prior = rows[-1]
        row_y = sum(item["box"][1] for item in prior) / len(prior)
        tolerance = max(8, max(item["box"][3] for item in prior + [token]))
        if abs(token["box"][1] - row_y) <= tolerance:
            prior.append(token)
        else:
            rows.append([token])
    return rows


def _number(value: str) -> tuple[float | None, str | None, bool]:
    match = _NUMERIC.match(value)
    if not match:
        return None, None, "," in value
    return float(match.group("number")), match.group("comparator"), False


def _range(value: str | None) -> tuple[float | None, float | None]:
    if not value:
        return None, None
    match = _RANGE.match(value)
    if not match:
        return None, None
    return float(match.group(1)), float(match.group(2))


def _flag(value: float | None, low: float | None, high: float | None) -> str:
    if value is None or (low is None and high is None):
        return "UNKNOWN"
    if low is not None and value < low:
        return "LOW"
    if high is not None and value > high:
        return "HIGH"
    return "NORMAL"


def _normalized_union_box(tokens: list[dict], page_width: int, page_height: int) -> dict[str, float]:
    if page_width <= 0 or page_height <= 0:
        raise ValueError("Page dimensions must be positive")
    left = min(token["box"][0] for token in tokens)
    top = min(token["box"][1] for token in tokens)
    right = max(token["box"][0] + token["box"][2] for token in tokens)
    bottom = max(token["box"][1] + token["box"][3] for token in tokens)
    return {
        "x": round(left / page_width, 6),
        "y": round(top / page_height, 6),
        "width": round((right - left) / page_width, 6),
        "height": round((bottom - top) / page_height, 6),
    }


def _is_column_header(tokens: list[dict]) -> bool:
    normalized = " ".join(token["text"].lower() for token in tokens)
    words = set(re.findall(r"[a-z]+", normalized))
    return any(
        (" " in term and term in normalized) or (" " not in term and term in words)
        for term in _HEADER_TERMS
    )


def parse_lab_detections(
    detections: Iterable[tuple[object, str, float]], *, page_number: int, page_width: int, page_height: int
) -> tuple[list[dict], list[dict]]:
    """Convert OCR tokens to review-only candidates without correcting source text."""
    observations: list[dict] = []
    warnings: list[dict] = []
    for tokens in _rows(detections):
        tokens.sort(key=lambda token: token["box"][0])
        if len(tokens) < 2:
            continue
        if _is_column_header(tokens):
            continue
        test_name = tokens[0]["text"]
        value_text = tokens[1]["text"]
        numeric_value, comparator, ambiguous = _number(value_text)
        unit_raw = tokens[2]["text"] if len(tokens) >= 3 else None
        reference_text = tokens[3]["text"] if len(tokens) >= 4 else None
        reference_low, reference_high = _range(reference_text)
        row_order = len(observations) + 1
        confidence = round(sum(token["confidence"] for token in tokens) / len(tokens), 3)
        if ambiguous:
            warnings.append({"code": "AMBIGUOUS_DECIMAL", "rowOrder": row_order})
        if unit_raw and not _UNIT.match(unit_raw):
            warnings.append({"code": "UNIT_NOT_RECOGNIZED", "rowOrder": row_order})
        if confidence < LOW_CONFIDENCE:
            warnings.append({"code": "LOW_CONFIDENCE", "rowOrder": row_order})
        if len(tokens) not in (2, 3, 4):
            warnings.append({"code": "ROW_ALIGNMENT_UNCERTAIN", "rowOrder": row_order})
        observations.append({
            "rowOrder": row_order,
            "testNameRaw": test_name,
            "valueText": value_text,
            "numericValue": numeric_value,
            "comparator": comparator,
            "unitRaw": unit_raw,
            "referenceText": reference_text,
            "referenceLow": reference_low,
            "referenceHigh": reference_high,
            "abnormalFlag": _flag(numeric_value, reference_low, reference_high),
            "confidence": confidence,
            "sourcePage": page_number,
            "sourceBoundingBox": _normalized_union_box(tokens, page_width, page_height),
            "verificationStatus": "UNVERIFIED",
        })
    return observations, warnings
