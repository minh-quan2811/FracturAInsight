from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


def plot_confusion_matrix(result, out_dir: Path, name: str = "confusion_matrix") -> list[Path]:
    """Row-normalised confusion matrix (classes with test support + background). Saves PNG and PDF."""
    K = len(result.classes)
    keep = np.where(result.support > 0)[0]
    idx = np.concatenate([keep, [K]])
    sub = result.matrix[np.ix_(idx, idx)].astype(float)
    n = len(keep)

    disp = np.zeros_like(sub)
    disp[:n, :] = sub[:n, :] / (sub[:n, :].sum(axis=1, keepdims=True) + 1e-8)
    disp[n, :n] = sub[n, :n] / result.support[keep].astype(float)   # background row: FP relative to support

    labels = [result.classes[i] for i in keep] + ["background"]
    plt.rcParams.update({"font.size": 11})
    fig, ax = plt.subplots(figsize=(12, 10), tight_layout=True, facecolor="white")
    im = ax.imshow(disp, cmap="cividis", vmin=0, vmax=1)
    fig.colorbar(im, ax=ax)
    ax.set_xticks(range(len(labels)), labels=labels, rotation=45, ha="right", fontweight="bold")
    ax.set_yticks(range(len(labels)), labels=labels, fontweight="bold")
    for i in range(disp.shape[0]):
        for j in range(disp.shape[1]):
            ax.text(j, i, f"{disp[i, j]:.2f}", ha="center", va="center",
                    color="black" if disp[i, j] > 0.6 else "white")
    ax.set_xlabel("Predicted", fontweight="bold")
    ax.set_ylabel("True", fontweight="bold")
    ax.set_title("Confusion Matrix (row-normalised)", fontweight="bold")

    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for ext in ("png", "pdf"):
        p = out_dir / f"{name}.{ext}"
        fig.savefig(p, bbox_inches="tight", dpi=200)
        paths.append(p)
    plt.close(fig)
    return paths
