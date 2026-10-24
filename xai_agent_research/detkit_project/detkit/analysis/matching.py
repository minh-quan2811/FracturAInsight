from __future__ import annotations

import numpy as np


def box_iou_matrix(boxes1: np.ndarray, boxes2: np.ndarray) -> np.ndarray:
    """Pairwise IoU of Nx4 and Mx4 xyxy arrays."""
    if len(boxes1) == 0 or len(boxes2) == 0:
        return np.zeros((len(boxes1), len(boxes2)))
    x11, y11, x12, y12 = np.split(boxes1, 4, axis=1)
    x21, y21, x22, y22 = np.split(boxes2, 4, axis=1)
    inter = (np.clip(np.minimum(x12, x22.T) - np.maximum(x11, x21.T), 0, None)
             * np.clip(np.minimum(y12, y22.T) - np.maximum(y11, y21.T), 0, None))
    union = (x12 - x11) * (y12 - y11) + ((x22 - x21) * (y22 - y21)).T - inter
    return inter / np.clip(union, 1e-8, None)


def match_detections_to_gt(pred_boxes, pred_cls, gt_boxes, gt_cls, iou_threshold=0.5):
    """Greedy class-aware IoU matching (highest IoU first).
    Returns (per-prediction [{'status': 'TP'|'FP', 'gt_idx', 'iou'}], unmatched GT indices = FN)."""
    iou = box_iou_matrix(pred_boxes, gt_boxes)
    pairs = sorted(
        ((iou[p, g], p, g) for p in range(len(pred_boxes)) for g in range(len(gt_boxes))
         if pred_cls[p] == gt_cls[g] and iou[p, g] >= iou_threshold),
        reverse=True, key=lambda t: t[0])

    results, used_p, used_g = [None] * len(pred_boxes), set(), set()
    for val, p, g in pairs:
        if p in used_p or g in used_g:
            continue
        used_p.add(p)
        used_g.add(g)
        results[p] = {"status": "TP", "gt_idx": g, "iou": float(val)}
    for p in range(len(pred_boxes)):
        if results[p] is None:
            best = float(iou[p].max()) if len(gt_boxes) else 0.0
            results[p] = {"status": "FP", "gt_idx": None, "iou": best}
    return results, [g for g in range(len(gt_boxes)) if g not in used_g]
