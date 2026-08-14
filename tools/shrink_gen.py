# -*- coding: utf-8 -*-
"""Shrink generated illustrations to card size and register them.

The generator returns 1K PNGs of 1-2 MB each. Card art is displayed at 54-96px
and the Wikimedia thumbnails it sits beside are 480px / ~40 KB, so shipping the
originals would add ~14 MB to a build whose whole proposition is a spare minute
on a phone — and the CEO has just asked for speed to be monitored (#53).

    py tools/shrink_gen.py
"""
import io, json, os, sys
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEN = os.path.join(ROOT, "img", "gen")
WIDTH = 480

total_before = total_after = 0
for name in sorted(os.listdir(GEN)):
    if not name.lower().endswith(".png"):
        continue
    p = os.path.join(GEN, name)
    before = os.path.getsize(p)
    im = Image.open(p).convert("RGB")
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    out = os.path.join(GEN, os.path.splitext(name)[0] + ".jpg")
    # JPEG, not PNG: these are photographic-feel illustrations, not flat UI art,
    # and quality 82 is indistinguishable at 90px while being ~20x smaller.
    im.save(out, "JPEG", quality=82, optimize=True, progressive=True)
    os.remove(p)
    after = os.path.getsize(out)
    total_before += before
    total_after += after
    print("  %-24s %7.0f KB -> %5.0f KB" % (os.path.splitext(name)[0], before / 1024, after / 1024))

print("\n  %.1f MB -> %.0f KB  (%.0f%% smaller)" % (
    total_before / 1048576, total_after / 1024,
    100 * (1 - total_after / total_before) if total_before else 0))
