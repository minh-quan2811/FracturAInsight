"""Train a model.   python train.py --model rfdetr-small --epochs 25"""
from __future__ import annotations

import argparse

from ..models import available_models_hint
from ..training import TrainConfig, parse_overrides, run_training
from .common import add_model_args, parse_with_config, require, setup_logging


def build_parser():
    p = argparse.ArgumentParser(description="Train an RF-DETR or YOLO model on a Roboflow dataset.")
    add_model_args(p, "optional starting checkpoint (file or run folder) - fine-tune from it")
    p.add_argument("--epochs", type=int, default=50)
    p.add_argument("--batch-size", type=int, default=8)
    p.add_argument("--imgsz", type=int, help="YOLO input size (default 640)")
    p.add_argument("--lr", type=float)
    p.add_argument("--device", help="e.g. cuda:0, cpu")
    p.add_argument("--seed", type=int)
    p.add_argument("--run-name", help="folder name under runs/ (default: <model>_<timestamp>)")
    p.add_argument("--force-download", action="store_true", help="re-download the Roboflow dataset")
    p.add_argument("--set", action="append", default=[], metavar="KEY=VALUE",
                   help="extra model-specific option, repeatable (e.g. --set weight_decay=1e-3)")
    p.add_argument("--attention-loss", action="store_true", help="RF-DETR: add the attention-containment loss")
    p.add_argument("--lambda-attn", type=float, default=0.5)
    p.add_argument("--attn-temperature", type=float, default=0.02)
    p.add_argument("--list-models", action="store_true")
    return p


def main(argv=None):
    setup_logging()
    parser = build_parser()
    args, yaml_extra = parse_with_config(parser, argv)
    if args.list_models:
        print(available_models_hint())
        return
    require(parser, args, "model")

    cfg = TrainConfig(
        epochs=args.epochs, batch_size=args.batch_size, imgsz=args.imgsz, lr=args.lr,
        device=args.device, seed=args.seed, attention_loss=args.attention_loss,
        lambda_attn=args.lambda_attn, attn_temperature=args.attn_temperature,
        extra={**yaml_extra, **parse_overrides(args.set)},
    )
    result = run_training(args.model, cfg, dataset=args.dataset, weights=args.weights,
                          run_name=args.run_name, force_download=args.force_download)
    print(f"\nRun folder   : {result.run_dir}")
    print(f"Best weights : {result.best_weights}")
    if result.best_weights:
        rel = result.run_dir.name
        print(f"\nNext:\n  python evaluate.py --model {args.model} --weights runs/{rel}"
              f"\n  python analyze_acs.py --model {args.model} --weights runs/{rel}")


if __name__ == "__main__":
    main()
