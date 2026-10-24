"""Evaluate a trained model.  python evaluate.py --model rfdetr-small --weights runs/<run>"""
from __future__ import annotations

import argparse
import logging

from ..common import load_class_map
from ..data import load_detection_dataset, resolve_dataset
from ..evaluation import evaluate_detector, plot_confusion_matrix
from ..models import create_model
from ..paths import display, resolve
from ..settings import default_placeholder_class
from .common import add_model_args, default_out_dir, parse_with_config, require, setup_logging

log = logging.getLogger(__name__)


def build_parser():
    p = argparse.ArgumentParser(description="mAP, per-class P/R/F1 and confusion matrix.")
    add_model_args(p, "checkpoint file, or a run folder (best checkpoint is picked automatically)")
    p.add_argument("--split", default="test")
    p.add_argument("--conf", type=float, default=0.5, help="confidence threshold for P/R/F1 + confusion matrix")
    p.add_argument("--iou", type=float, default=0.5)
    p.add_argument("--out", help="output folder (default: outputs/eval/<weights>_<timestamp>)")
    p.add_argument("--class-map", help="JSON {raw_class_name: display_name}")
    p.add_argument("--placeholder-class", help="pseudo-class to ignore (default: ROBOFLOW_PROJECT for RF-DETR)")
    return p


def main(argv=None):
    setup_logging()
    parser = build_parser()
    args, _ = parse_with_config(parser, argv)
    require(parser, args, "model", "weights")

    backend = create_model(args.model, args.weights)
    dataset_dir = resolve_dataset(backend.family, args.dataset)
    ds = load_detection_dataset(backend.family, dataset_dir, args.split)
    placeholder = args.placeholder_class or default_placeholder_class(backend.family)

    result = evaluate_detector(backend, ds, args.conf, args.iou, placeholder, load_class_map(args.class_map))

    out = resolve(args.out) if args.out else default_out_dir("eval", args.weights, args.model)
    result.save(out)
    plot_confusion_matrix(result, out)

    print("\n=== Per-class metrics ===\n", result.per_class.to_string(index=False))
    print(f"\n=== Mean metrics (conf {args.conf}, IoU {args.iou}) ===\n", result.summary.to_string(index=False))
    print("\n=== mAP ===")
    for k in ("mAP@50:95", "mAP@50", "mAP@75"):
        print(f"{k:10s}: {result.map_scores[k]:.4f}")
    print(f"\nSaved to {display(out)}")


if __name__ == "__main__":
    main()
