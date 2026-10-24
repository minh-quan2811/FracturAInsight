from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

from ..data.datasets import prepare_yolo_yaml
from ..settings import weights_dir
from .base import DetectorBackend
from .registry import register_backend


if TYPE_CHECKING:
    from ..training.config import TrainConfig


@register_backend("yolo")
class YOLOBackend(DetectorBackend):
    dataset_format = "yolo"
    low_conf = 0.001  # standard mAP threshold for Ultralytics
    best_weight_names = ("best.pt", "last.pt", "*.pt")

    def __init__(self, variant, weights=None):
        super().__init__(variant, weights)
        self._model = None

    def _weights_arg(self) -> str:
        if self.weights:
            return str(self.weights)
        name = Path(self.variant)
        if name.suffix in (".pt", ".yaml"):
            return str(name)
        target = weights_dir() / f"{name}.pt"  # Ultralytics downloads missing official weights here
        target.parent.mkdir(parents=True, exist_ok=True)
        return str(target)

    @property
    def model(self):
        if self._model is None:
            from ultralytics import YOLO
            self._model = YOLO(self._weights_arg())
        return self._model

    def predict(self, image, threshold):
        import supervision as sv
        result = self.model.predict(np.asarray(image), conf=threshold, verbose=False)[0]
        return sv.Detections.from_ultralytics(result)

    def train(self, dataset_dir: Path, run_dir: Path, cfg: TrainConfig):
        kwargs = dict(
            data=str(prepare_yolo_yaml(dataset_dir)),
            epochs=cfg.epochs, batch=cfg.batch_size, imgsz=cfg.imgsz or 640,
            project=str(run_dir.parent), name=run_dir.name, exist_ok=True,
        )
        for key, val in (("lr0", cfg.lr), ("device", cfg.device), ("seed", cfg.seed)):
            if val is not None:
                kwargs[key] = val
        kwargs.update(cfg.extra)
        self.model.train(**kwargs)
        return self.find_best_weights(run_dir)
