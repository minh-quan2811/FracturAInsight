"""Run the detector over a dataset and record ACS + entropy for every decoder layer."""
from __future__ import annotations

import os
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from PIL import Image
from tqdm import tqdm

from ..attention import DecoderAttentionCapture, nearest_query, pad_aware_scale
from .acs import attention_grid, grid_metrics
from .matching import match_detections_to_gt


@dataclass
class AcsConfig:
    det_threshold: float = 0.5
    iou_threshold: float = 0.5
    grid_size: int = 64
    input_size: int = 640       # model input resolution used for the padding correction
    letterbox: bool = True      # True = keep the notebook's pad-aware mapping; False = plain 0-1 mapping


@dataclass
class TPGrid:
    """Last-layer attention grid of one true-positive detection (needed for null baselines)."""
    image_idx: int
    detection_idx: int
    cls: str
    box_frac: tuple
    grid: np.ndarray


@dataclass
class CollectResult:
    df: pd.DataFrame
    tp_grids: list[TPGrid] = field(default_factory=list)
    num_layers: int = 0


def _name(names, cid):
    return names[cid] if 0 <= cid < len(names) else str(cid)


def collect_attention(backend, samples, class_names, cfg: AcsConfig, max_images=None) -> CollectResult:
    import torch

    nn_module = backend.torch_module()
    rows, tp_grids, num_layers = [], [], 0
    todo = list(enumerate(samples))[: max_images or None]

    for idx, (path, gt) in tqdm(todo, desc="ACS extraction"):
        image = Image.open(path).convert("RGB")
        W, H = image.size
        with DecoderAttentionCapture(nn_module) as cap, torch.no_grad():
            det = backend.predict(image, cfg.det_threshold)
        if not cap.fired:
            continue

        num_layers = cap.num_layers
        layers = cap.layers()
        ref_xy = cap.reference_xy()
        x_max, y_max = pad_aware_scale(W, H, cfg.input_size, cfg.letterbox)

        pred_boxes = det.xyxy if len(det) else np.zeros((0, 4))
        pred_cls = det.class_id if len(det) else np.zeros((0,), dtype=int)
        pred_conf = det.confidence if len(det) else np.zeros((0,))
        matches, unmatched_gt = match_detections_to_gt(pred_boxes, pred_cls, gt.xyxy, gt.class_id,
                                                       cfg.iou_threshold)

        targets = [(pi, pred_boxes[pi], int(pred_cls[pi]), float(pred_conf[pi]), matches[pi]["status"],
                    matches[pi]["iou"], pi) for pi in range(len(pred_boxes))]
        targets += [(f"gt_{gi}", gt.xyxy[gi], int(gt.class_id[gi]), None, "FN", 0.0, None)
                    for gi in unmatched_gt]

        for det_id, box, cid, conf, status, iou, pred_i in targets:
            x1, y1, x2, y2 = box
            q = nearest_query(ref_xy, box, W, H, x_max, y_max)
            box_frac = (x1 / W, y1 / H, x2 / W, y2 / H)
            area = max(0.0, (box_frac[2] - box_frac[0]) * (box_frac[3] - box_frac[1]))
            for ln in sorted(layers):
                grid = attention_grid(layers[ln].loc, layers[ln].w, q, x_max, y_max, cfg.grid_size)
                acs, ent = grid_metrics(grid, box_frac)
                rows.append({
                    "image": os.path.basename(path), "image_idx": idx, "detection_idx": det_id,
                    "query_idx": q, "layer": ln, "class": _name(class_names, cid), "confidence": conf,
                    "status": status, "iou_with_gt": iou, "acs": acs, "entropy": ent,
                    "box_area_frac": area, "img_w": W, "img_h": H,
                })
                if status == "TP" and ln == num_layers:
                    tp_grids.append(TPGrid(idx, pred_i, _name(class_names, cid), box_frac, grid))

    return CollectResult(pd.DataFrame(rows), tp_grids, num_layers)
