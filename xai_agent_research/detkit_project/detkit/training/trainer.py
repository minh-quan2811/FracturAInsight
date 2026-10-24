"""Model-agnostic training entry point. Easy to call from other code:

    from detkit.training import run_training, TrainConfig
    result = run_training("rfdetr-small", cfg=TrainConfig(epochs=25))
"""
from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

from ..data import resolve_dataset
from ..models import create_model
from ..paths import display
from ..settings import runs_dir
from .config import TrainConfig

log = logging.getLogger(__name__)


@dataclass
class TrainResult:
    run_dir: Path
    best_weights: Path | None
    dataset_dir: Path


def run_training(
    model: str,
    cfg: TrainConfig | None = None,
    dataset: str | Path | None = None,
    weights: str | Path | None = None,
    run_name: str | None = None,
    force_download: bool = False,
) -> TrainResult:
    cfg = cfg or TrainConfig()
    backend = create_model(model, weights=weights)
    dataset_dir = resolve_dataset(backend.family, dataset, force_download)

    run_name = run_name or f"{backend.slug}_{datetime.now():%Y%m%d_%H%M%S}"
    run_dir = runs_dir() / run_name
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "run_config.json").write_text(json.dumps({
        "model": model,
        "weights": str(weights) if weights else None,
        "dataset": display(dataset_dir),
        "train": asdict(cfg),
    }, indent=2))

    log.info("Training %s on %s -> %s", model, display(dataset_dir), display(run_dir))
    best = backend.train(dataset_dir, run_dir, cfg)
    log.info("Done. Best weights: %s", display(best) if best else "not found (see run folder)")
    return TrainResult(run_dir=run_dir, best_weights=best, dataset_dir=dataset_dir)
