"""Optional attention-containment training loss (ported from rf_detr.py).

Adds `loss_attention` to RF-DETR's SetCriterion: encourages the last decoder layer's
sampling-point attention mass to fall inside the matched ground-truth box.
Enabled with `--attention-loss`; always removed again after training.
"""
from __future__ import annotations

import logging

from .sampling import recompute_attention

log = logging.getLogger(__name__)


class AttentionContainmentLoss:
    def __init__(self, lambda_attn: float = 0.5, temperature: float = 0.02):
        self.lambda_attn = lambda_attn
        self.temperature = temperature
        self._cache: dict = {}
        self._handle = None
        self._orig_init = None
        self._orig_forward = None

    # -- install / remove ---------------------------------------------------------
    def install(self, rfdetr_model):
        import torch
        from rfdetr.models.lwdetr import SetCriterion

        cross_attn = rfdetr_model.model.model.transformer.decoder.layers[-1].cross_attn
        self._handle = cross_attn.register_forward_hook(
            lambda module, inputs, output: self._cache.update(module=module, inputs=inputs))

        self._orig_init, self._orig_forward = SetCriterion.__init__, SetCriterion.forward
        outer = self

        def patched_init(crit, *args, **kwargs):
            outer._orig_init(crit, *args, **kwargs)
            crit.weight_dict["loss_attention"] = outer.lambda_attn

        def patched_forward(crit, outputs, targets):
            losses = outer._orig_forward(crit, outputs, targets)
            try:
                losses["loss_attention"] = outer._loss(crit, outputs, targets)
            except Exception as e:  # never kill a training run because of the auxiliary loss
                log.warning("[attn-loss] skipped this step (%s)", e)
                losses["loss_attention"] = torch.zeros((), device=outputs["pred_boxes"].device)
            return losses

        SetCriterion.__init__, SetCriterion.forward = patched_init, patched_forward
        log.info("[attn-loss] installed (lambda=%s, temperature=%s)", self.lambda_attn, self.temperature)

    def remove(self):
        from rfdetr.models.lwdetr import SetCriterion
        if self._handle is not None:
            self._handle.remove()
        if self._orig_init is not None:
            SetCriterion.__init__, SetCriterion.forward = self._orig_init, self._orig_forward
        self._cache.clear()
        log.info("[attn-loss] removed")

    # -- the loss itself ----------------------------------------------------------
    def _loss(self, criterion, outputs, targets):
        import torch

        device = outputs["pred_boxes"].device
        if "inputs" not in self._cache:
            return torch.zeros((), device=device)

        locations, weights = recompute_attention(self._cache["module"], self._cache["inputs"])
        no_aux = {k: v for k, v in outputs.items() if k != "aux_outputs"}
        group_detr = criterion.group_detr if criterion.training else 1
        indices = criterion.matcher(no_aux, targets, group_detr=group_detr)

        T, eps = self.temperature, 1e-6
        per_query = []
        for b, (src_idx, tgt_idx) in enumerate(indices):
            if len(src_idx) == 0:
                continue
            boxes = targets[b]["boxes"][tgt_idx]  # normalised (cx, cy, w, h)
            x1, x2 = boxes[:, 0] - boxes[:, 2] / 2, boxes[:, 0] + boxes[:, 2] / 2
            y1, y2 = boxes[:, 1] - boxes[:, 3] / 2, boxes[:, 1] + boxes[:, 3] / 2

            locs = locations[b, src_idx].clamp(0, 1)
            wts = weights[b, src_idx]
            xs, ys = locs[..., 0], locs[..., 1]
            in_x = torch.sigmoid((xs - x1[:, None, None, None]) / T) * torch.sigmoid((x2[:, None, None, None] - xs) / T)
            in_y = torch.sigmoid((ys - y1[:, None, None, None]) / T) * torch.sigmoid((y2[:, None, None, None] - ys) / T)
            inside = (wts * in_x * in_y).sum(dim=(1, 2, 3))
            total = wts.sum(dim=(1, 2, 3)) + eps
            per_query.append(1.0 - inside / total)

        if not per_query:
            return torch.zeros((), device=device)
        return torch.cat(per_query).mean()
