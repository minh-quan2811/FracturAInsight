"""Interface every model family implements. To support a new family, subclass this and
decorate it with `@register_backend("name")` (see registry.py) - nothing else changes."""
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import TYPE_CHECKING, ClassVar

if TYPE_CHECKING:
    from ..training.config import TrainConfig


class DetectorBackend(ABC):
    family: ClassVar[str]            # "rfdetr", "yolo", ...
    dataset_format: ClassVar[str]    # Roboflow export format + on-disk layout
    low_conf: ClassVar[float] = 0.0  # threshold used when collecting predictions for mAP
    best_weight_names: ClassVar[tuple[str, ...]] = ()

    def __init__(self, variant: str, weights: str | Path | None = None):
        self.variant = variant
        self.weights = Path(weights) if weights else None

    @property
    def slug(self) -> str:
        return f"{self.family}-{Path(self.variant).stem}"

    @abstractmethod
    def train(self, dataset_dir: Path, run_dir: Path, cfg: TrainConfig) -> Path | None:
        """Train and return the path of the best checkpoint (or None if not found)."""

    @abstractmethod
    def predict(self, image, threshold: float):
        """PIL RGB image -> `supervision.Detections` (pixel xyxy of the original image)."""

    def torch_module(self):
        raise NotImplementedError(f"ACS / attention analysis is not supported for '{self.family}' models.")

    # ---- helpers -------------------------------------------------------------------
    @classmethod
    def find_best_weights(cls, path: Path) -> Path | None:
        """Accept a checkpoint file, or a run folder and pick its best checkpoint."""
        if path.is_file():
            return path
        for name in cls.best_weight_names:
            hits = sorted(path.rglob(name))
            if hits:
                return hits[0]
        return None
