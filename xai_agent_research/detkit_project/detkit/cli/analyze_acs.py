"""ACS analysis.  python analyze_acs.py --model rfdetr-small --weights runs/<run> --out outputs/acs/my_run"""
from __future__ import annotations

import argparse
import json

from ..analysis import AcsConfig, AnalysisOptions, run_acs_analysis
from ..common import load_class_map
from ..data import load_detection_dataset, resolve_dataset
from ..models import create_model
from ..paths import resolve
from .common import add_model_args, default_out_dir, parse_with_config, require, setup_logging


def build_parser():
    p = argparse.ArgumentParser(description="Attention Containment Score (ACS) analysis for RF-DETR.")
    add_model_args(p, "checkpoint file, or a run folder (best checkpoint is picked automatically)")
    p.add_argument("--split", default="test")
    p.add_argument("--out", help="export folder (default: outputs/acs/<weights>_<timestamp>)")
    p.add_argument("--det-threshold", type=float, default=0.5)
    p.add_argument("--iou-threshold", type=float, default=0.5)
    p.add_argument("--grid-size", type=int, default=64, help="grid used only to compute ACS / entropy")
    p.add_argument("--input-size", type=int, default=640)
    p.add_argument("--no-letterbox", action="store_true",
                   help="map attention to the image with a plain 0-1 range instead of the pad-aware mapping")
    p.add_argument("--no-nulls", action="store_true", help="skip null-baseline comparison")
    p.add_argument("--n-shuffles", type=int, default=200)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--compare-classes", nargs=2, action="append", default=[], metavar=("A", "B"),
                   help="extra TP comparison of two class names, repeatable")
    p.add_argument("--healthy-class", help="class name to compare against all other classes")
    p.add_argument("--figures", type=int, default=2,
                   help="number of most-focused and most-diffuse TP cases to render (0 = none)")
    p.add_argument("--figure-for", nargs=2, type=int, action="append", default=[],
                   metavar=("IMAGE_IDX", "DETECTION_IDX"), help="render one specific detection, repeatable")
    p.add_argument("--max-images", type=int, help="only analyse the first N images (quick test)")
    p.add_argument("--class-map", help="JSON {raw_class_name: display_name}")
    return p


def main(argv=None):
    setup_logging()
    parser = build_parser()
    args, _ = parse_with_config(parser, argv)
    require(parser, args, "model", "weights")

    backend = create_model(args.model, args.weights)
    if backend.family != "rfdetr":
        parser.error("ACS analysis needs RF-DETR's deformable decoder attention; YOLO is not supported.")

    dataset_dir = resolve_dataset(backend.family, args.dataset)
    ds = load_detection_dataset(backend.family, dataset_dir, args.split)

    opts = AnalysisOptions(
        acs=AcsConfig(args.det_threshold, args.iou_threshold, args.grid_size, args.input_size,
                      letterbox=not args.no_letterbox),
        null_baselines=not args.no_nulls, n_shuffles=args.n_shuffles, seed=args.seed,
        class_pairs=[tuple(p) for p in args.compare_classes], healthy_class=args.healthy_class,
        n_figures=args.figures, figure_targets=[tuple(t) for t in args.figure_for],
        max_images=args.max_images,
    )
    out = resolve(args.out) if args.out else default_out_dir("acs", args.weights, args.model)
    summary = run_acs_analysis(backend, ds, out, opts, load_class_map(args.class_map))

    print("\n=== ACS run summary ===")
    print(json.dumps(summary, indent=2, default=str))
    print(f"\nAll files exported to: {out}")


if __name__ == "__main__":
    main()
