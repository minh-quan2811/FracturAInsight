from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from .base import DetectorBackend
from .registry import register_backend

if TYPE_CHECKING:
    from ..training.config import TrainConfig


RFDETR_VARIANTS = {
    "nano": "RFDETRNano",
    "small": "RFDETRSmall",
    "medium": "RFDETRMedium",
    "base": "RFDETRBase",
    "large": "RFDETRLarge",
}

# Hyperparameters from your rf_detr.py notebook; override with --set key=value
DEFAULT_TRAIN_KWARGS = {
    "grad_accum_steps": 2,
    "lr_scheduler": "cosine",
    "lr_min_factor": 0.05,
    "weight_decay": 5e-4,
    "drop_path": 0.1,
}


@register_backend("rfdetr")
class RFDETRBackend(DetectorBackend):
    dataset_format = "coco"
    low_conf = 0.0
    best_weight_names = ("checkpoint_best_ema.pth", "checkpoint_best_total.pth",
                         "checkpoint_best_regular.pth", "checkpoint_best*.pth", "*.pth")

    def __init__(self, variant, weights=None):
        super().__init__(variant, weights)
        self._model = None

    @property
    def model(self):
        if self._model is None:
            import rfdetr
            cls = getattr(rfdetr, RFDETR_VARIANTS[self.variant])
            self._model = cls(pretrain_weights=str(self.weights)) if self.weights else cls()
        return self._model

    def torch_module(self):
        nn_model = self.model.model.model  # same access path as in your notebooks
        nn_model.eval()
        return nn_model

    def predict(self, image, threshold):
        return self.model.predict(image, threshold=threshold)

    def train(self, dataset_dir: Path, run_dir: Path, cfg: TrainConfig):
        kwargs = {**DEFAULT_TRAIN_KWARGS}
        for key, val in (("lr", cfg.lr), ("device", cfg.device), ("seed", cfg.seed)):
            if val is not None:
                kwargs[key] = val
        kwargs.update(cfg.extra)

        loss = None
        if cfg.attention_loss:
            from ..attention.loss import AttentionContainmentLoss
            loss = AttentionContainmentLoss(cfg.lambda_attn, cfg.attn_temperature)
            loss.install(self.model)
        try:
            self.model.train(dataset_dir=str(dataset_dir), epochs=cfg.epochs,
                             batch_size=cfg.batch_size, output_dir=str(run_dir), **kwargs)
        finally:
            if loss is not None:
                loss.remove()
        return self.find_best_weights(run_dir)
