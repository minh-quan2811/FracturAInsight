"""Picks the detection model; predictors are cached and load their weights on first use."""
import os
import threading
from typing import Dict, Union

from app.enums.model_choice import ModelChoice

from .prediction_model.rfdetr_predictor import RFDETRPredictor
from .prediction_model.yolo_predictor import YoloPredictor

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

YOLO_WEIGHTS_PATH = "app/services/bone_fracture_predict/prediction_model/fracture_model.pt"
YOLO_CONFIDENCE_THRESHOLD = 0.25
RFDETR_WEIGHTS_PATH = "app/services/bone_fracture_predict/prediction_model/rfdetr_small.pth"
RFDETR_CONFIDENCE_THRESHOLD = 0.5
RFDETR_ATTENTION_GRID_SIZE = 160

_predictors: Dict[ModelChoice, object] = {}
_lock = threading.Lock()


def _resolve(path: str) -> str:
    return path if os.path.isabs(path) else os.path.join(_PROJECT_ROOT, path)


def _build(choice: ModelChoice):
    if choice == ModelChoice.YOLO:
        return YoloPredictor(
            model_path=_resolve(YOLO_WEIGHTS_PATH),
            confidence_threshold=YOLO_CONFIDENCE_THRESHOLD,
        )
    if choice == ModelChoice.RFDETR:
        return RFDETRPredictor(
            weights_path=_resolve(RFDETR_WEIGHTS_PATH),
            confidence_threshold=RFDETR_CONFIDENCE_THRESHOLD,
            attention_grid_size=RFDETR_ATTENTION_GRID_SIZE,
        )
    raise ValueError(f"Unsupported model: {choice}")


def get_predictor(model: Union[ModelChoice, str] = ModelChoice.YOLO):
    choice = ModelChoice(model)
    with _lock:
        if choice not in _predictors:
            _predictors[choice] = _build(choice)
        return _predictors[choice]