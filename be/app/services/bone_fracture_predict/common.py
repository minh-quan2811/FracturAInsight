"""Helpers that give every model the same result shape."""
import io
from typing import Any, Dict, List, Optional

from PIL import Image


def load_rgb_image(image_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def make_detection(
    class_id: int,
    class_name: str,
    confidence: float,
    fracture_type: Optional[str],
    xyxy,
    attention: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    x1, y1, x2, y2 = (int(round(float(v))) for v in xyxy)
    detection: Dict[str, Any] = {
        "class_id": int(class_id),
        "class_name": class_name,
        "confidence": float(confidence),
        "fracture_type": fracture_type,
        "bounding_box": {
            "x_min": x1,
            "y_min": y1,
            "x_max": x2,
            "y_max": y2,
            "width": x2 - x1,
            "height": y2 - y1,
        },
    }
    if attention is not None:
        detection["attention"] = attention
    return detection


def make_result(detections: List[Dict[str, Any]], inference_time: float) -> Dict[str, Any]:
    return {
        "has_fracture": len(detections) > 0,
        "detection_count": len(detections),
        "max_confidence": max((d["confidence"] for d in detections), default=None),
        "detections": detections,
        "inference_time": inference_time,
    }