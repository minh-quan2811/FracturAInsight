import threading
import time
from typing import Any, Dict, Optional

from ultralytics import YOLO

from ..common import load_rgb_image, make_detection, make_result

CLASS_TO_FRACTURE_TYPE = {
    0: "comminuted",
    1: "greenstick",
    2: "oblique",
    3: "spiral",
    4: "transverse",
}


class YoloPredictor:
    name = "yolo"
    model_version = "YOLOv8"

    def __init__(self, model_path: str, confidence_threshold: float = 0.25):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self._model: Optional[YOLO] = None
        self._lock = threading.Lock()

    def _ensure_loaded(self) -> YOLO:
        if self._model is None:
            with self._lock:
                if self._model is None:
                    self._model = YOLO(self.model_path)
                    print(f"YOLO model loaded from {self.model_path}")
        return self._model

    def predict(self, image_bytes: bytes) -> Dict[str, Any]:
        model = self._ensure_loaded()
        image = load_rgb_image(image_bytes)

        start = time.perf_counter()
        results = model.predict(image, conf=self.confidence_threshold, verbose=False)
        inference_time = time.perf_counter() - start

        detections = []
        if len(results) > 0 and results[0].boxes is not None and len(results[0].boxes) > 0:
            boxes = results[0].boxes
            for xyxy, conf, cls in zip(
                boxes.xyxy.cpu().numpy(),
                boxes.conf.cpu().numpy(),
                boxes.cls.cpu().numpy().astype(int),
            ):
                detections.append(
                    make_detection(
                        class_id=cls,
                        class_name="fracture",
                        confidence=conf,
                        fracture_type=CLASS_TO_FRACTURE_TYPE.get(int(cls)),
                        xyxy=xyxy,
                    )
                )

        return make_result(detections, inference_time)