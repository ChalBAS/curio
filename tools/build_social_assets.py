# -*- coding: utf-8 -*-
"""Build avatars and social share assets from the founder's locked mark (D-055).

Two facts drive every choice here:

1. Every brand file on disk is a 2:1 horizontal lockup, and every avatar slot on
   every platform is a CIRCLE. Dropping the lockup into a circle crops the
   wordmark off and leaves an illegible smear.
2. The mark is a single fused drawing -- compass-Q, brain and "pio" are one
   continuous form -- so there is no separable "glyph". Tested at 128/96/64/48/32
   the full lockup dies by 48px; the COMPASS alone survives to 32px and reads as
   a coherent symbol. That is the avatar.

Banners have horizontal room, so they keep the full lockup.

Run: py tools/build_social_assets.py
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MARK = os.path.join(ROOT, "brand", "qpio-mark.png")
OUT = os.path.join(ROOT, "brand", "social")

NAVY = (7, 23, 34)          # --bg, the mark's own darkest value
COMPASS_CUT = 0.36          # fraction of the lockup width that is the compass


def trim(im, thresh=12):
    a = np.array(im)[:, :, 3]
    cols = np.where(a.max(axis=0) > thresh)[0]
    rows = np.where(a.max(axis=1) > thresh)[0]
    return im.crop((cols.min(), rows.min(), cols.max() + 1, rows.max() + 1))


def place(art, size, pad, ground=NAVY, sharpen=False):
    """Centre `art` on a solid ground with `pad` as a fraction of the short side."""
    W, H = size
    canvas = Image.new("RGBA", (W, H), ground + (255,))
    target = min(W, H) * (1 - 2 * pad)
    r = min(target / art.size[0], target / art.size[1])
    a = art.resize((max(1, round(art.size[0] * r)), max(1, round(art.size[1] * r))),
                   Image.LANCZOS)
    if sharpen and r > 1.5:
        # An upscale from a raster master goes soft; a light unsharp mask buys
        # back the edge definition that matters at avatar sizes.
        a = a.filter(ImageFilter.UnsharpMask(radius=2, percent=110, threshold=3))
    canvas.paste(a, ((W - a.size[0]) // 2, (H - a.size[1]) // 2), a)
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)
    lockup = trim(Image.open(MARK).convert("RGBA"))
    compass = trim(lockup.crop((0, 0, int(lockup.size[0] * COMPASS_CUT), lockup.size[1])))
    print("lockup  %dx%d" % lockup.size)
    print("compass %dx%d  <- the avatar; the only crop that survives 32px" % compass.size)

    jobs = [
        # name, art, size, pad, sharpen
        ("qpio-avatar-1024.png", compass, (1024, 1024), 0.17, True),
        ("qpio-avatar-512.png",  compass, (512, 512),   0.17, True),
        ("qpio-og-1200x630.png", lockup,  (1200, 630),  0.14, False),
        ("qpio-banner-yt-2560x1440.png", lockup, (2560, 1440), 0.30, False),
        ("qpio-cover-fb-1640x856.png",   lockup, (1640, 856),  0.22, False),
    ]
    for name, art, size, pad, sharp in jobs:
        place(art, size, pad, sharpen=sharp).convert("RGB").save(
            os.path.join(OUT, name), quality=95)
        print("  %-32s %dx%d" % (name, size[0], size[1]))

    # Legibility proof, rendered as a circle because that is how it ships.
    strip = Image.new("RGB", (700, 170), (241, 245, 247))
    x = 24
    for s in (128, 96, 64, 48, 32):
        av = place(compass, (s, s), 0.17, sharpen=True).convert("RGB")
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, s - 1, s - 1), fill=255)
        strip.paste(av, (x, (170 - s) // 2 - 8), mask)
        ImageDraw.Draw(strip).text((x, 140), "%dpx" % s, fill=(109, 140, 157))
        x += s + 28
    strip.save(os.path.join(OUT, "avatar-size-test.png"))
    print("  %-32s circular render at 128/96/64/48/32" % "avatar-size-test.png")

    print("\nwritten to", OUT)
    print("NOTE: the compass master is %dx%d raster, so 1024 is an upscale."
          % compass.size)
    print("      Fine at real display sizes (32-150px). A vector master is still")
    print("      the fix for print, embroidery and any large reproduction.")


if __name__ == "__main__":
    main()
