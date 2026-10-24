"""Model-name parsing + backend registry.

    create_model("rfdetr-small")                      # RF-DETR Small, default pretrained weights
    create_model("yolo11n", weights="runs/x/weights/best.pt")
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from ..paths import display, resolve
from .base import DetectorBackend

log = logging.getLogger(__name__)
_BACKENDS: dict[str, type[DetectorBackend]] = {}


def register_backend(family: str):
    def deco(cls: type[DetectorBackend]):
        cls.family = family
        _BACKENDS[family] = cls
        return cls
    return deco


@dataclass(frozen=True)
class ModelSpec:
    family: str
    variant: str


def parse_model_name(name: str) -> ModelSpec:
    raw = name.strip()
    low = raw.lower().replace("_", "-")
    for prefix in ("rf-detr", "rfdetr"):
        if low.startswith(prefix):
            from .rfdetr_backend import RFDETR_VARIANTS
            variant = low[len(prefix):].strip("-") or "base"
            if variant not in RFDETR_VARIANTS:
                raise ValueError(f"Unknown RF-DETR variant '{variant}'. Choose from: "
                                 f"{', '.join('rfdetr-' + v for v in RFDETR_VARIANTS)}")
            return ModelSpec("rfdetr", variant)
    if low.startswith("yolo") or low.endswith((".pt", ".yaml")):
        return ModelSpec("yolo", raw)  # keep original case: it may be a file name
    raise ValueError(f"Cannot tell which model family '{name}' belongs to. {available_models_hint()}")


def available_models_hint() -> str:
    return ("Examples: rfdetr-nano | rfdetr-small | rfdetr-medium | rfdetr-base | rfdetr-large | "
            "yolo11n | yolo11s | yolov8m | any Ultralytics model name or .pt file")


def create_model(name: str, weights: str | Path | None = None) -> DetectorBackend:
    from . import rfdetr_backend, yolo_backend  # noqa: F401  (import registers the backends)

    spec = parse_model_name(name)
    cls = _BACKENDS[spec.family]
    resolved = None
    if weights:
        resolved = cls.find_best_weights(resolve(weights))
        if resolved is None:
            raise FileNotFoundError(f"No checkpoint found in {display(resolve(weights))}")
        log.info("Using weights: %s", display(resolved))
    return cls(spec.variant, resolved)
