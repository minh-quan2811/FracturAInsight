from __future__ import annotations

import ast
from dataclasses import dataclass, field


@dataclass
class TrainConfig:
    """Settings shared by every model family. Anything model-specific goes in `extra`
    (CLI: `--set key=value`) and is forwarded untouched to the underlying trainer."""

    epochs: int = 50
    batch_size: int = 8
    imgsz: int | None = None        # YOLO only; RF-DETR resolution is fixed by the variant
    lr: float | None = None
    device: str | None = None
    seed: int | None = None
    # optional attention-containment loss (RF-DETR only), ported from your rf_detr.py
    attention_loss: bool = False
    lambda_attn: float = 0.5
    attn_temperature: float = 0.02
    extra: dict = field(default_factory=dict)


def parse_overrides(items: list[str] | None) -> dict:
    """['weight_decay=1e-3', 'lr_scheduler=cosine'] -> {'weight_decay': 0.001, 'lr_scheduler': 'cosine'}"""
    out: dict = {}
    for item in items or []:
        if "=" not in item:
            raise ValueError(f"--set expects key=value, got '{item}'")
        key, raw = item.split("=", 1)
        try:
            out[key.strip()] = ast.literal_eval(raw)
        except (ValueError, SyntaxError):
            out[key.strip()] = raw
    return out
