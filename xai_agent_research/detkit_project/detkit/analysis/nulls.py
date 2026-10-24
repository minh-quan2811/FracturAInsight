"""Null baselines for ACS (real TP attention vs. three 'no real localisation' references)."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .acs import acs_from_grid, gaussian_null_grid
from .stats import safe_wilcoxon

NULLS = [("Uniform-attention null", "uniform_null_acs"),
         ("Center-biased Gaussian null", "gaussian_null_acs"),
         ("Shuffled-box null", "shuffled_null_acs")]


def compute_null_baselines(tp_grids, grid_size=64, n_shuffles=200, gaussian_sigma_frac=0.15, seed=42):
    rng = np.random.default_rng(seed)
    gauss = gaussian_null_grid(grid_size, gaussian_sigma_frac)
    boxes = [r.box_frac for r in tp_grids]
    n = len(tp_grids)

    rows = []
    for i, r in enumerate(tp_grids):
        bx1, by1, bx2, by2 = r.box_frac
        if n > 1:
            others = [j for j in range(n) if j != i]
            draws = rng.choice(others, size=min(n_shuffles, len(others)), replace=True)
            shuffled = float(np.mean([acs_from_grid(r.grid, boxes[j]) for j in draws]))
        else:
            shuffled = np.nan
        rows.append({
            "image_idx": r.image_idx, "detection_idx": r.detection_idx, "class": r.cls,
            "real_acs": acs_from_grid(r.grid, r.box_frac),
            "uniform_null_acs": (bx2 - bx1) * (by2 - by1),  # uniform attention -> ACS == box area fraction
            "gaussian_null_acs": acs_from_grid(gauss, r.box_frac),
            "shuffled_null_acs": shuffled,
        })
    return pd.DataFrame(rows)


def null_statistics(null_df: pd.DataFrame, layer: int, alpha=0.05) -> pd.DataFrame:
    """Paired Wilcoxon signed-rank, real vs each null, Bonferroni-corrected over 3 comparisons."""
    corrected = alpha / len(NULLS)
    out = []
    for label, col in NULLS:
        d = null_df[["real_acs", col]].dropna()
        p = safe_wilcoxon(d["real_acs"], d[col])
        out.append({
            "comparison": f"Real TP ACS (layer {layer}) vs. {label}", "n": len(d),
            "mean_real": float(d["real_acs"].mean()) if len(d) else np.nan,
            "sd_real": float(d["real_acs"].std(ddof=1)) if len(d) > 1 else np.nan,
            "mean_null": float(d[col].mean()) if len(d) else np.nan,
            "sd_null": float(d[col].std(ddof=1)) if len(d) > 1 else np.nan,
            "test": "wilcoxon_signed_rank_paired", "p_value": p,
            f"significant_bonferroni_{alpha}_over_{len(NULLS)}": bool(p < corrected) if p == p else False,
        })
    return pd.DataFrame(out)
