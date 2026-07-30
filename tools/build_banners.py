# -*- coding: utf-8 -*-
"""Composed social banners: mark + 'Quaero, ergo Sapio', gold and teal sets.

YouTube minimum is 2048x1152 (6MB cap); we ship 2560x1440 with everything
important inside the centred 1546x423 safe area. Design: navy ground with a
soft radial glow, a faint oversized compass watermark for depth, the lockup
centred with the motto letterspaced beneath between hairline rules.

Run: py tools/build_banners.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
B = os.path.join(ROOT, "brand")
S = os.path.join(B, "social")

NAVY = (7, 23, 34)
GOLD = (217, 164, 65)
CYAN = (58, 198, 224)
MOTTO = "QUAERO, ERGO SAPIO"
FONT = "C:/Windows/Fonts/georgia.ttf"


def trim(im, thresh=45):
    a = np.array(im)[:, :, 3]
    cols = np.where(a.max(axis=0) > thresh)[0]
    rows = np.where(a.max(axis=1) > thresh)[0]
    return im.crop((cols.min(), rows.min(), cols.max() + 1, rows.max() + 1))


def ground(W, H):
    """Navy canvas with a soft radial glow behind the composition centre."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt((xx - W / 2) ** 2 + ((yy - H / 2) * 1.4) ** 2)
    t = np.clip(1 - d / (min(W, H) * 0.85), 0, 1) ** 2
    glow = np.array([12, 38, 53], dtype=np.float32)
    base = np.array(NAVY, dtype=np.float32)
    img = base + (glow - base) * t[:, :, None]
    return Image.fromarray(img.astype(np.uint8)).convert("RGBA")


def tracked(draw, xy, text, font, fill, tracking):
    """Letterspaced text, returns total width. xy is the left-centre anchor."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill, anchor="lm")
        x += draw.textlength(ch, font=font) + tracking
    return x - tracking - xy[0]


def measure(draw, text, font, tracking):
    return sum(draw.textlength(c, font=font) for c in text) + tracking * (len(text) - 1)


def compose(size, lockup, compass, accent, motto_px, lock_h, out):
    W, H = size
    im = ground(W, H)
    # faint oversized compass, right of centre, for depth
    wm = compass.resize(
        (int(compass.size[0] * (H * 1.15 / compass.size[1])), int(H * 1.15)),
        Image.LANCZOS)
    wm_a = wm.split()[3].point(lambda v: int(v * 0.045))
    wm.putalpha(wm_a)
    im.paste(wm, (W - int(wm.size[0] * 0.55), (H - wm.size[1]) // 2), wm)

    d = ImageDraw.Draw(im)
    font = ImageFont.truetype(FONT, motto_px)
    tracking = motto_px * 0.42
    mw = measure(d, MOTTO, font, tracking)

    lk = lockup.resize(
        (int(lockup.size[0] * (lock_h / lockup.size[1])), lock_h), Image.LANCZOS)
    gap = int(motto_px * 1.3)
    block = lock_h + gap + motto_px
    top = (H - block) // 2 - int(H * 0.01)
    im.paste(lk, ((W - lk.size[0]) // 2, top), lk)

    my = top + lock_h + gap + motto_px // 2
    mx = (W - mw) / 2
    tracked(d, (mx, my), MOTTO, font, accent + (235,), tracking)
    # hairline rules flanking the motto
    ry = my
    rw = int(mw * 0.42)
    pad = int(motto_px * 1.4)
    for x0, x1 in ((mx - pad - rw, mx - pad), (mx + mw + pad, mx + mw + pad + rw)):
        d.line((x0, ry, x1, ry), fill=accent + (90,), width=2)
    im.convert("RGB").save(out, quality=95)
    kb = os.path.getsize(out) // 1024
    print("  %-40s %dx%d  %dKB" % (os.path.basename(out), W, H, kb))


def main():
    sets = [
        ("", os.path.join(B, "qpio-mark-hd-gold.png"), GOLD),
        ("-teal", os.path.join(B, "qpio-mark-hd.png"), CYAN),
    ]
    for suffix, src, accent in sets:
        m = trim(Image.open(src).convert("RGBA"))
        compass = trim(m.crop((0, 0, int(m.size[0] * 0.345), m.size[1])))
        compose((2560, 1440), m, compass, accent, 46, 264,
                os.path.join(S, f"qpio-banner-yt-2560x1440{suffix}.png"))
        compose((1640, 856), m, compass, accent, 40, 236,
                os.path.join(S, f"qpio-cover-fb-1640x856{suffix}.png"))
        compose((1200, 630), m, compass, accent, 34, 196,
                os.path.join(S, f"qpio-og-1200x630{suffix}.png"))

    # regenerate the small in-app marks from the cleaned HD master so no
    # speckled file survives anywhere in brand/
    for name, src in (("qpio-mark.png", os.path.join(B, "qpio-mark-hd.png")),
                      ("qpio-mark-gold.png", os.path.join(B, "qpio-mark-hd-gold.png"))):
        hd = trim(Image.open(src).convert("RGBA"))
        hd.resize((557, int(557 * hd.size[1] / hd.size[0])), Image.LANCZOS).save(
            os.path.join(B, name))
        hd.resize((int(96 * hd.size[0] / hd.size[1]), 96), Image.LANCZOS).save(
            os.path.join(B, name.replace(".png", "").replace("qpio-mark", "qpio-mark-96") + ".png"))
    print("  small marks regenerated from clean HD")


if __name__ == "__main__":
    main()
