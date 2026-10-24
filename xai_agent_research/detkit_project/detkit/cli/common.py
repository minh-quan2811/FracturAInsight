"""Shared CLI plumbing: logging, --config YAML support, output-folder naming."""
from __future__ import annotations

import argparse
import logging
from datetime import datetime
from pathlib import Path

import yaml

from ..paths import resolve
from ..settings import outputs_dir


def setup_logging():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")


def add_model_args(p: argparse.ArgumentParser, weights_help: str):
    p.add_argument("--config", help="YAML file with default values for any option below (CLI wins)")
    p.add_argument("--model", help="e.g. rfdetr-small, rfdetr-medium, yolo11n, yolov8s")
    p.add_argument("--weights", help=weights_help)
    p.add_argument("--dataset", help="dataset folder (relative to project root). "
                                     "Default: the Roboflow dataset from .env (downloaded if missing)")


def parse_with_config(parser: argparse.ArgumentParser, argv=None):
    """Parse args; values from `--config file.yaml` become defaults. Returns (args, yaml_extra)."""
    pre = argparse.ArgumentParser(add_help=False)
    pre.add_argument("--config")
    known, _ = pre.parse_known_args(argv)
    extra = {}
    if known.config:
        data = yaml.safe_load(resolve(known.config).read_text()) or {}
        extra = data.pop("extra", {}) or {}
        valid = {a.dest for a in parser._actions}
        unknown = sorted(set(data) - valid)
        if unknown:
            parser.error(f"Unknown key(s) in {known.config}: {unknown}")
        parser.set_defaults(**data)
    args = parser.parse_args(argv)
    return args, extra


def require(parser, args, *names):
    for n in names:
        if getattr(args, n) in (None, ""):
            parser.error(f"--{n.replace('_', '-')} is required (or set it in --config)")


def default_out_dir(kind: str, weights: str | None, model: str) -> Path:
    """outputs/<kind>/<run-or-weights-name>_<timestamp>"""
    label = model
    if weights:
        w = Path(weights)
        parts = [w.stem] if w.suffix else [w.name]
        for anc in w.parents:  # file inside a run folder -> use the run folder's name
            if w.suffix and anc.name and anc.name not in ("weights", "output", ""):
                parts = [anc.name]
                break
        label = parts[0]
    return outputs_dir() / kind / f"{label}_{datetime.now():%Y%m%d_%H%M%S}"
