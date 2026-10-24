"""mAP, per-class precision/recall/F1 and confusion matrix for any DetectorBackend."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image
from tqdm import tqdm

from ..common import display_names
from ..data import get_samples


@dataclass
class EvalResult:
    per_class: pd.DataFrame          # classes with test support
    summary: pd.DataFrame            # mean P / R / F1 over classes with support
    map_scores: dict
    matrix: np.ndarray               # (K+1, K+1); rows = true, cols = predicted, last = background
    classes: list[str]
    support: np.ndarray
    conf_threshold: float
    iou_threshold: float

    def save(self, out_dir: Path):
        out_dir.mkdir(parents=True, exist_ok=True)
        self.per_class.to_csv(out_dir / "per_class_metrics.csv", index=False)
        self.summary.to_csv(out_dir / "summary_metrics.csv", index=False)
        (out_dir / "map.json").write_text(json.dumps(self.map_scores, indent=2))
        pd.DataFrame(self.matrix, index=self.classes + ["background"],
                     columns=self.classes + ["background"]).to_csv(out_dir / "confusion_matrix_counts.csv")


def _clean_matrix(matrix, raw_classes, placeholder):
    """Drop Roboflow's placeholder pseudo-class; keep original class order."""
    keep = [i for i, n in enumerate(raw_classes) if not placeholder or str(n).lower() != placeholder.lower()]
    core = matrix[:-1, :-1][np.ix_(keep, keep)]
    fn_col = matrix[:-1, -1:][keep, :]
    fp_row = matrix[-1:, :-1][:, keep]
    return np.block([[core, fn_col], [fp_row, matrix[-1:, -1:]]]), keep


def evaluate_detector(backend, ds, conf=0.5, iou=0.5, placeholder=None, class_map=None) -> EvalResult:
    import supervision as sv
    from supervision.metrics import MeanAveragePrecision

    raw_classes = list(ds.classes)
    gts, preds_all = [], []
    for path, annotations in tqdm(get_samples(ds), desc="Inference"):
        image = Image.open(path).convert("RGB")
        gts.append(annotations)
        preds_all.append(backend.predict(image, backend.low_conf))  # one pass; filtered below

    map_result = MeanAveragePrecision().update(preds_all, gts).compute()

    preds = [d[d.confidence >= conf] if len(d) and d.confidence is not None else d for d in preds_all]
    cm = sv.ConfusionMatrix.from_detections(predictions=preds, targets=gts, classes=raw_classes,
                                            iou_threshold=iou)
    matrix, keep = _clean_matrix(cm.matrix, raw_classes, placeholder)
    classes = display_names([raw_classes[i] for i in keep], class_map)
    K = len(classes)

    TP = np.diag(matrix)[:K]
    FN = matrix[:K, :].sum(axis=1) - TP
    FP = matrix[:, :K].sum(axis=0) - TP
    support = TP + FN
    has_support = support > 0

    with np.errstate(divide="ignore", invalid="ignore"):
        precision = np.where((TP + FP) > 0, TP / (TP + FP), np.nan)
        recall = np.where(support > 0, TP / support, np.nan)
        f1 = np.where((TP + FP + FN) > 0, 2 * TP / (2 * TP + FP + FN), np.nan)

    ap50 = np.full(K, np.nan)
    for row, cls_id in enumerate(map_result.matched_classes):
        raw_idx = int(cls_id)
        if raw_idx in keep:
            ap50[keep.index(raw_idx)] = map_result.ap_per_class[row, 0]

    full = pd.DataFrame({
        "class": classes, "support": support.astype(int), "TP": TP.astype(int), "FP": FP.astype(int),
        "FN": FN.astype(int), "precision": np.round(precision, 4), "recall": np.round(recall, 4),
        "f1": np.round(f1, 4), "AP@50": np.round(ap50, 4),
    })
    per_class = full[full["support"] > 0].reset_index(drop=True)

    summary = pd.DataFrame({
        "metric": ["Precision", "Recall", "F1"],
        "mean_over_classes_with_support": [np.nanmean(precision[has_support]),
                                           np.nanmean(recall[has_support]),
                                           np.nanmean(f1[has_support])],
    }).round(4)

    map_scores = {"mAP@50:95": float(map_result.map50_95), "mAP@50": float(map_result.map50),
                  "mAP@75": float(map_result.map75), "conf_threshold": conf, "iou_threshold": iou}
    return EvalResult(per_class, summary, map_scores, matrix, classes, support, conf, iou)
