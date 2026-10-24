"""Group comparisons of ACS / entropy (Mann-Whitney U for groups, Wilcoxon for paired layers)."""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import mannwhitneyu, wilcoxon


def safe_wilcoxon(x, y) -> float:
    """Paired Wilcoxon p-value; NaN when undefined (too few pairs / all differences zero)."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    if len(x) < 2 or np.allclose(x, y):
        return float("nan")
    try:
        return float(wilcoxon(x, y).pvalue)
    except ValueError:
        return float("nan")


def compare_groups(df, group_col, val_col, a, b, layer, status_filter=None) -> dict:
    d = df[df["layer"] == layer]
    if status_filter is not None:
        d = d[d["status"].isin(status_filter)]
    xa, xb = d[d[group_col] == a][val_col].dropna(), d[d[group_col] == b][val_col].dropna()
    row = {"comparison": f"{a} vs {b}", "metric": val_col, "layer": layer, "n_a": len(xa), "n_b": len(xb),
           "mean_a": xa.mean() if len(xa) else np.nan, "mean_b": xb.mean() if len(xb) else np.nan}
    if len(xa) < 2 or len(xb) < 2:
        return {**row, "p_value": np.nan, "test": "insufficient_n"}
    return {**row, "p_value": float(mannwhitneyu(xa, xb, alternative="two-sided").pvalue),
            "test": "mannwhitneyu"}


def run_standard_comparisons(df, last_layer, first_layer=1, class_pairs=(), healthy_class=None) -> pd.DataFrame:
    res = []
    metrics = ("acs", "entropy")

    for m in metrics:  # 1. TP vs FP vs FN
        for a, b in (("TP", "FP"), ("TP", "FN"), ("FP", "FN")):
            res.append(compare_groups(df, "status", m, a, b, last_layer))

    tp = df[(df["status"] == "TP") & (df["layer"] == last_layer)].copy()  # 2. tight vs loose boxes
    tp["iou_bucket"] = np.where(tp["iou_with_gt"] >= 0.85, "tight",
                                np.where(tp["iou_with_gt"] <= 0.7, "loose", "mid"))
    for m in metrics:
        res.append(compare_groups(tp, "iou_bucket", m, "tight", "loose", last_layer))

    for a, b in class_pairs:  # 3. user-chosen class pairs (TP only)
        for m in metrics:
            res.append(compare_groups(df, "class", m, a, b, last_layer, status_filter=["TP"]))

    if healthy_class:  # 4. healthy vs everything else (TP only)
        grp = tp.assign(group=np.where(tp["class"] == healthy_class, healthy_class, "Other classes"))
        for m in metrics:
            res.append(compare_groups(grp, "group", m, "Other classes", healthy_class, last_layer))

    # detection_idx mixes ints (predictions) and "gt_N" strings (FN) -> make it sortable
    pivot = df.assign(detection_idx=df["detection_idx"].astype(str)).pivot_table(
        index=["image_idx", "detection_idx"], columns="layer", values=list(metrics))
    for m in metrics:  # 5. first vs last layer, paired
        if (m, first_layer) not in pivot or (m, last_layer) not in pivot:
            continue
        pair = pivot[[(m, first_layer), (m, last_layer)]].dropna()
        if len(pair) >= 2:
            p = safe_wilcoxon(pair[(m, first_layer)], pair[(m, last_layer)])
            res.append({"comparison": f"Layer{first_layer} vs Layer{last_layer} (paired)", "metric": m,
                        "layer": f"{first_layer},{last_layer}", "n_a": len(pair), "n_b": len(pair),
                        "mean_a": pair[(m, first_layer)].mean(), "mean_b": pair[(m, last_layer)].mean(),
                        "p_value": p, "test": "wilcoxon"})
    return pd.DataFrame(res)
