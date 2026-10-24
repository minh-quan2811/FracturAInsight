"""Attention Containment Score (ACS) and attention entropy. Pure numpy - no torch needed.

ACS = fraction of one query's attention mass that lands inside a box.
The attention of a query is first rasterised onto a coarse grid (default 64x64) of the
real-image area; ACS is the grid mass inside the box divided by total grid mass.
"""
from __future__ import annotations

import numpy as np


def attention_grid(loc, w, q_idx, x_max_norm=1.0, y_max_norm=1.0, grid_size=64) -> np.ndarray:
    """loc: (Q,H,L,P,2) normalised sampling points, w: (Q,H,L,P). Points in padding are dropped."""
    xy = np.clip(loc[q_idx], 0.0, 1.0)
    xs, ys, ws = xy[..., 0].ravel(), xy[..., 1].ravel(), w[q_idx].ravel()
    valid = (xs <= x_max_norm) & (ys <= y_max_norm)
    gx = np.clip(xs[valid] / x_max_norm * grid_size, 0, grid_size - 1).astype(int)
    gy = np.clip(ys[valid] / y_max_norm * grid_size, 0, grid_size - 1).astype(int)
    grid = np.zeros((grid_size, grid_size), dtype=np.float64)
    np.add.at(grid, (gy, gx), ws[valid].astype(np.float64))
    return grid


def acs_from_grid(grid: np.ndarray, box_frac) -> float:
    """box_frac = (x1, y1, x2, y2) as fractions of the ORIGINAL image size."""
    total = grid.sum()
    if total <= 1e-12:
        return 0.0
    n = grid.shape[0]
    bx1, by1, bx2, by2 = box_frac
    gx1, gx2 = int(np.clip(bx1 * n, 0, n)), int(np.clip(np.ceil(bx2 * n), 0, n))
    gy1, gy2 = int(np.clip(by1 * n, 0, n)), int(np.clip(np.ceil(by2 * n), 0, n))
    return float(grid[gy1:gy2, gx1:gx2].sum() / total)


def entropy_from_grid(grid: np.ndarray) -> float:
    """Shannon entropy (nats) of the normalised attention grid."""
    total = grid.sum()
    if total <= 1e-12:
        return 0.0
    p = grid / total
    p = p[p > 0]
    return float(-(p * np.log(p)).sum())


def grid_metrics(grid: np.ndarray, box_frac) -> tuple[float, float]:
    return acs_from_grid(grid, box_frac), entropy_from_grid(grid)


def gaussian_null_grid(grid_size: int = 64, sigma_frac: float = 0.15) -> np.ndarray:
    """Centre-biased Gaussian 'attention' used as a null baseline."""
    yy, xx = np.mgrid[0:grid_size, 0:grid_size]
    c = (grid_size - 1) / 2.0
    g = np.exp(-((xx - c) ** 2 + (yy - c) ** 2) / (2 * (sigma_frac * grid_size) ** 2))
    return g / g.sum()
