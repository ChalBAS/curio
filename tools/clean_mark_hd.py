# -*- coding: utf-8 -*-
"""Despeckle the HD masters: kill residual background pixels near stroke edges.

The 4x upscale left near-white low-saturation pixels at anti-aliased
boundaries (the original key was brightness>165 & sat<42; edge pixels sit just
outside it). Two passes:
  1. wider key: brightness>150 & saturation<60 -> transparent
  2. remove orphan alpha islands under 400px (specks), keep real counters

Run: py tools/clean_mark_hd.py
"""
import numpy as np
from PIL import Image
from scipy import ndimage

for name in ("brand/qpio-mark-hd.png", "brand/qpio-mark-hd-gold.png"):
    im = Image.open(name).convert("RGBA")
    a = np.array(im).astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    before = (a[:, :, 3] > 0).sum()
    a[:, :, 3] = np.where((mx > 150) & (mx - mn < 60), 0, a[:, :, 3])

    # orphan-island removal: label connected opaque regions, drop tiny ones
    solid = a[:, :, 3] > 20
    labels, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, labels, range(1, n + 1))
    kill = np.isin(labels, np.where(sizes < 400)[0] + 1)
    a[:, :, 3] = np.where(kill, 0, a[:, :, 3])
    after = (a[:, :, 3] > 0).sum()

    Image.fromarray(a.astype(np.uint8)).save(name)
    print(f"{name}: removed {before - after} px ({n} regions -> {(sizes >= 400).sum()})")
