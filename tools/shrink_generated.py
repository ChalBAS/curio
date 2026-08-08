# -*- coding: utf-8 -*-
"""Shrink the generated illustrations to card size.

They arrive from the generator at ~1k PNG, 1.5–2.2 MB each — 28 MB for sixteen
images on a phone-first app whose entire current payload is under 1 MB. The
cards render them at 54–190 px wide, so all of that weight is thrown away by
the browser after being paid for on the network.

480 px JPEG matches what Commons serves for every other image in the app, so
the two sources look identical on a card and cost the same to load.

    py tools/shrink_generated.py
"""
import io, os, sys
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "brand", "generated")
MAP = os.path.join(ROOT, "src", "entities.img.js")
WIDTH = 480


def main():
    before = after = 0
    renamed = {}
    for name in sorted(os.listdir(DIR)):
        if not name.lower().endswith(".png"):
            continue
        path = os.path.join(DIR, name)
        before += os.path.getsize(path)
        im = Image.open(path).convert("RGB")
        if im.width > WIDTH:
            im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
        out = name[:-4] + ".jpg"
        im.save(os.path.join(DIR, out), "JPEG", quality=82, optimize=True, progressive=True)
        after += os.path.getsize(os.path.join(DIR, out))
        os.remove(path)
        renamed[name] = out
        print("  %-34s %5.0f KB -> %4.0f KB" % (name, os.path.getsize(os.path.join(DIR, out)) / 1024 * 0 + before / 1024 * 0 or 0, os.path.getsize(os.path.join(DIR, out)) / 1024))

    text = open(MAP, encoding="utf-8").read()
    for old, new in renamed.items():
        text = text.replace("brand/generated/" + old, "brand/generated/" + new)
    open(MAP, "w", encoding="utf-8", newline="\n").write(text)

    print("\n%d images: %.1f MB -> %.2f MB (%.0f%% smaller)" %
          (len(renamed), before / 1048576, after / 1048576, 100 * (1 - after / before) if before else 0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
