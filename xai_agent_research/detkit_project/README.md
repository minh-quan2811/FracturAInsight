# detkit - train, evaluate and explain (ACS) RF-DETR / YOLO detectors

```
.env.example            Roboflow credentials + optional folder overrides  (copy to .env)
train.py                pick a model, epochs, ...        -> runs/<run>/
evaluate.py             mAP, P/R/F1, confusion matrix    -> outputs/eval/<name>/
analyze_acs.py          ACS / entropy / null baselines   -> outputs/acs/<name>/   (or --out <folder>)
configs/                optional YAML presets (CLI flags override them)
detkit/
  paths.py, settings.py   relative-path handling, .env loading
  data/                   Roboflow download, dataset loading
  models/                 base.py (interface), registry.py, rfdetr_backend.py, yolo_backend.py
  training/               TrainConfig + run_training()
  attention/              hook + recompute of decoder attention, optional attention-containment loss
  evaluation/             metrics + confusion-matrix plot
  analysis/               acs.py, matching.py, collect.py, nulls.py, stats.py, visualize.py, pipeline.py
tests/                    pytest (no GPU needed)
```

All paths are relative to the project root (where this README is), whatever folder you launch from.

## Setup
```bash
pip install -r requirements.txt
cp .env.example .env
```

## Train
```bash
python train.py --model rfdetr-small --epochs 25 --batch-size 8
python train.py --model yolo11n --epochs 100 --imgsz 640
python train.py --config configs/rfdetr_small_attnloss.yaml          # attention-containment loss
python train.py --model rfdetr-small --set weight_decay=1e-3 --set lr_scheduler=cosine
python train.py --model rfdetr-small --dataset datasets/my-local-dataset   # skip Roboflow
python train.py --list-models
```
The dataset is downloaded once into `datasets/` (COCO for RF-DETR, YOLO format for YOLO).
`--weights` on train = checkpoint to fine-tune from. Output: `runs/<model>_<timestamp>/`.

## Evaluate
```bash
python evaluate.py --model rfdetr-small --weights runs/rfdetr-small_20260101_120000
python evaluate.py --model yolo11n --weights runs/yolo11n_.../weights/best.pt --conf 0.4
```
`--weights` accepts a file **or a run folder** (best checkpoint is picked automatically).
Use `--class-map configs/class_names.example.json` for readable class names.

## ACS analysis (RF-DETR)
```bash
python analyze_acs.py --model rfdetr-small --weights runs/<run> --out outputs/acs/my_run
python analyze_acs.py --model rfdetr-small --weights weights/best.pth \
    --compare-classes Comminuted Transverse --healthy-class Healthy --figures 3
python analyze_acs.py ... --figure-for 12 0          # render image #12, detection #0
python analyze_acs.py ... --max-images 10            # quick smoke run
```
Exported to the `--out` folder: `attention_analysis.csv` (every detection x layer: ACS, entropy,
TP/FP/FN, IoU), `acs_by_layer_and_status.csv`, `statistical_results.csv`,
`null_baseline_acs.csv`, `null_baseline_statistical_results.csv`, `figures/*.png`, `run_summary.json`.


## Add a new model family
Subclass `DetectorBackend` in `detkit/models/`, implement `train()` and `predict()`, decorate with
`@register_backend("name")`, and add one line to `parse_model_name` in `registry.py`.
Training, evaluation and the CLIs then work with it unchanged.

## Tests
`python -m pytest -q tests`
