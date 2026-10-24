"""One-call ACS analysis: collect -> CSVs -> statistics -> null baselines -> figures."""
from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from pathlib import Path

import pandas as pd

from ..common import display_names
from ..data import get_samples
from ..paths import display
from .collect import AcsConfig, collect_attention
from .nulls import compute_null_baselines, null_statistics
from .stats import run_standard_comparisons
from .visualize import render_layer_evolution

log = logging.getLogger(__name__)


@dataclass
class AnalysisOptions:
    acs: AcsConfig = field(default_factory=AcsConfig)
    null_baselines: bool = True
    n_shuffles: int = 200
    seed: int = 42
    class_pairs: list = field(default_factory=list)   # [("Comminuted", "Transverse"), ...]
    healthy_class: str | None = None
    n_figures: int = 2                  # figures for the lowest- and highest-entropy TP detections
    figure_targets: list = field(default_factory=list)   # [(image_idx, detection_idx), ...]
    max_images: int | None = None


def run_acs_analysis(backend, ds, out_dir: Path, opts: AnalysisOptions, class_map=None) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    samples = get_samples(ds)
    names = display_names(list(ds.classes), class_map)

    res = collect_attention(backend, samples, names, opts.acs, opts.max_images)
    if res.df.empty:
        raise RuntimeError("No attention was captured. Is this an RF-DETR model with deformable decoder attention?")
    df, last = res.df, res.num_layers
    df.to_csv(out_dir / "attention_analysis.csv", index=False)

    # per-layer overview
    df.groupby(["layer", "status"])[["acs", "entropy"]].agg(["count", "mean", "std"]).to_csv(
        out_dir / "acs_by_layer_and_status.csv")

    stats_df = run_standard_comparisons(df, last, class_pairs=opts.class_pairs, healthy_class=opts.healthy_class)
    stats_df.to_csv(out_dir / "statistical_results.csv", index=False)

    if opts.null_baselines and res.tp_grids:
        null_df = compute_null_baselines(res.tp_grids, opts.acs.grid_size, opts.n_shuffles, seed=opts.seed)
        null_df.to_csv(out_dir / "null_baseline_acs.csv", index=False)
        null_statistics(null_df, last).to_csv(out_dir / "null_baseline_statistical_results.csv", index=False)

    # figures
    targets = list(opts.figure_targets)
    tp_last = df[(df["status"] == "TP") & (df["layer"] == last)]
    if not targets and opts.n_figures > 0 and len(tp_last):
        picks = pd.concat([tp_last.nsmallest(opts.n_figures, "entropy").assign(tag="focused"),
                           tp_last.nlargest(opts.n_figures, "entropy").assign(tag="diffuse")])
        targets = [(int(r.image_idx), int(r.detection_idx), r.tag) for r in picks.itertuples()]
    for t in targets:
        idx, det_i = int(t[0]), int(t[1])
        tag = t[2] if len(t) > 2 else "case"
        path = samples[idx][0]
        render_layer_evolution(backend, path, det_i, out_dir / "figures" / f"{tag}_img{idx}_det{det_i}.png",
                               opts.acs)

    last_df = df[df["layer"] == last]
    summary = {
        "n_images": int(df["image_idx"].nunique()), "decoder_layers": last,
        "n_TP": int((last_df["status"] == "TP").sum()), "n_FP": int((last_df["status"] == "FP").sum()),
        "n_FN": int((last_df["status"] == "FN").sum()),
        "mean_acs_last_layer_by_status": last_df.groupby("status")["acs"].mean().round(4).to_dict(),
        "config": asdict(opts.acs),
    }
    (out_dir / "run_summary.json").write_text(json.dumps(summary, indent=2, default=str))
    log.info("ACS analysis saved to %s", display(out_dir))
    return summary
