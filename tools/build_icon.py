# -*- coding: utf-8 -*-
"""Cut the CEO's responsive icon (symmetric brain + needle, no letters) into assets.

Source: the founder's silver-on-blue 3D render (m67yhc...). The icon is neutral
silver on a saturated blue ground, so the mask is simply "not blue": pixels
whose blue-dominance is low. From the mask we produce:
  - flat GOLD and TEAL versions on navy (brand palette) for avatars/PWA icons
  - a textured avatar crop straight from the metallic render (alternate)

The CEO's own concept sheet marks this icon "Option B: Icone Responsive
(Recommandee)" - it exists precisely because the full lockup dies at small
sizes.

Run: py tools/build_icon.py
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SRC = os.path.join(os.path.expanduser("~"), "Downloads",
                   "Gemini_Generated_Image_m67yhcm67yhcm67y.png")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "brand", "icons")

NAVY = (7, 23, 34)
GOLD_DARK, GOLD_LIGHT = np.array([122, 78, 20]), np.array([233, 185, 90])
TEAL_DARK, TEAL_LIGHT = np.array([16, 90, 120]), np.array([120, 220, 240])


def mask_icon():
    a = np.array(Image.open(SRC).convert("RGB")).astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    # ground is strongly blue (b >> r); the silver icon is neutral
    icon = (b - r) < 40
    icon = ndimage.binary_opening(icon, iterations=2)
    labels, n = ndimage.label(icon)
    sizes = ndimage.sum(icon, labels, range(1, n + 1))
    icon = np.isin(labels, np.where(sizes >= 500)[0] + 1)   # drop dust
    lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255.0
    return icon, lum, a


def flat(icon, lum, dark, light):
    """Recolour the silver shading ramp into a brand ramp, alpha from the mask."""
    t = np.clip((lum - 0.25) / 0.6, 0, 1)[:, :, None]
    rgb = dark[None, None, :] + (light - dark)[None, None, :] * t
    out = np.zeros((*icon.shape, 4), np.uint8)
    out[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.where(icon, 255, 0)
    im = Image.fromarray(out)
    cols = np.where(icon.max(axis=0))[0]
    rows = np.where(icon.max(axis=1))[0]
    im = im.crop((cols.min(), rows.min(), cols.max() + 1, rows.max() + 1))
    # soften the binary mask edge one hair
    al = im.split()[3].filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(al)
    return im


def on_navy(art, size, pad):
    c = Image.new("RGBA", (size, size), NAVY + (255,))
    target = size * (1 - 2 * pad)
    r = min(target / art.size[0], target / art.size[1])
    a = art.resize((round(art.size[0] * r), round(art.size[1] * r)), Image.LANCZOS)
    c.paste(a, ((size - a.size[0]) // 2, (size - a.size[1]) // 2), a)
    return c.convert("RGB")


def main():
    os.makedirs(OUT, exist_ok=True)
    icon, lum, src = mask_icon()
    print("icon mask: %d px" % icon.sum())

    gold = flat(icon, lum, GOLD_DARK, GOLD_LIGHT)
    teal = flat(icon, lum, TEAL_DARK, TEAL_LIGHT)
    gold.save(os.path.join(OUT, "qpio-icon-gold-master.png"))
    teal.save(os.path.join(OUT, "qpio-icon-teal-master.png"))
    print("masters: gold/teal %dx%d" % gold.size)

    for size in (512, 192, 96):                      # PWA + favicon ladder
        on_navy(gold, size, 0.14).save(os.path.join(OUT, f"qpio-icon-{size}.png"))
    on_navy(gold, 1024, 0.14).save(os.path.join(OUT, "qpio-icon-1024.png"))
    # maskable variant needs a bigger safe zone
    on_navy(gold, 512, 0.22).save(os.path.join(OUT, "qpio-icon-512-maskable.png"))

    # textured avatar straight from the metallic render (alternate look)
    a = src
    cols = np.where(icon.max(axis=0))[0]; rows = np.where(icon.max(axis=1))[0]
    cx, cy = (cols.min() + cols.max()) // 2, (rows.min() + rows.max()) // 2
    half = int(max(cols.max() - cols.min(), rows.max() - rows.min()) * 0.62)
    y0, y1 = max(0, cy - half), min(a.shape[0], cy + half)
    x0, x1 = max(0, cx - half), min(a.shape[1], cx + half)
    Image.fromarray(a[y0:y1, x0:x1].astype(np.uint8)).resize((512, 512), Image.LANCZOS)\
        .save(os.path.join(OUT, "qpio-avatar-silverblue-512.png"))

    # size test as circles
    strip = Image.new("RGB", (640, 170), (241, 245, 247))
    d = ImageDraw.Draw(strip)
    x = 24
    av = Image.open(os.path.join(OUT, "qpio-icon-512.png"))
    for s in (128, 96, 64, 48, 32):
        sm = av.resize((s, s), Image.LANCZOS)
        m = Image.new("L", (s, s), 0)
        ImageDraw.Draw(m).ellipse((0, 0, s - 1, s - 1), fill=255)
        strip.paste(sm, (x, (150 - s) // 2), m)
        d.text((x, 140), "%dpx" % s, fill=(109, 140, 157))
        x += s + 28
    strip.save(os.path.join(OUT, "icon-size-test.png"))
    print("done ->", OUT)


if __name__ == "__main__":
    main()
