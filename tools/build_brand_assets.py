"""Build Qpio app icons from the CEO's Brain-Infinity Catalyst mark (D-055).

Source: the founder-authored logo. We crop the symbol from the supplied artwork,
remove the paper background, and emit the PWA icon set + an in-app header mark.

Run: py tools/build_brand_assets.py
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SRC = r"C:\Users\ukbch\Downloads\Gemini_Generated_Image_a2hvkaa2hvkaa2hv.png"
ICONS = os.path.join(REPO, "icons")
BRAND = os.path.join(REPO, "brand")
INK = (13, 59, 95)          # deep navy from the mark
PAPER = (247, 249, 251)


def load_mark():
    """Crop the symbol (no wordmark) and key out the paper background."""
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    # symbol occupies roughly the upper-middle third of the artwork
    box = (int(w * 0.29), int(h * 0.17), int(w * 0.71), int(h * 0.58))
    mark = im.crop(box)

    # paper -> transparent: anything bright and low-saturation becomes alpha 0,
    # with a soft ramp so the anti-aliased edges of the mark survive.
    px = mark.load()
    mw, mh = mark.size
    for y in range(mh):
        for x in range(mw):
            r, g, b, a = px[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            sat = mx - mn
            if mx > 165 and sat < 42:
                px[x, y] = (r, g, b, 0)
            elif mx > 140 and sat < 60:
                px[x, y] = (r, g, b, int(a * (mx - 140) / 25 * 0.4))
    return mark.crop(mark.getbbox())


def fit(mark, size, scale, bg=None, radius_frac=None):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if bg:
        plate = Image.new("RGBA", (size, size), bg + (255,))
        if radius_frac:
            from PIL import ImageDraw
            m = Image.new("L", (size, size), 0)
            ImageDraw.Draw(m).rounded_rectangle([0, 0, size, size],
                                                radius=int(size * radius_frac), fill=255)
            canvas.paste(plate, (0, 0), m)
        else:
            canvas.paste(plate, (0, 0))
    target = int(size * scale)
    mw, mh = mark.size
    r = min(target / mw, target / mh)
    m2 = mark.resize((max(1, int(mw * r)), max(1, int(mh * r))), Image.LANCZOS)
    canvas.paste(m2, ((size - m2.size[0]) // 2, (size - m2.size[1]) // 2), m2)
    return canvas


def main():
    os.makedirs(ICONS, exist_ok=True)
    os.makedirs(BRAND, exist_ok=True)
    mark = load_mark()
    mark.save(os.path.join(BRAND, "qpio-mark.png"))
    print("mark cropped:", mark.size)

    # PWA set — paper plate keeps the navy mark legible on any home screen
    fit(mark, 192, 0.82, PAPER, 0.22).save(os.path.join(ICONS, "icon-192.png"))
    fit(mark, 512, 0.82, PAPER, 0.22).save(os.path.join(ICONS, "icon-512.png"))
    fit(mark, 512, 0.62, PAPER).save(os.path.join(ICONS, "icon-maskable-512.png"))
    fit(mark, 180, 0.80, PAPER).save(os.path.join(ICONS, "apple-touch-icon.png"))
    fit(mark, 64, 0.92, PAPER, 0.18).resize((32, 32), Image.LANCZOS).save(
        os.path.join(ICONS, "favicon-32.png"))

    # in-app header mark (transparent, dark UI)
    hdr = mark.copy()
    hr = 96 / hdr.size[1]
    hdr.resize((int(hdr.size[0] * hr), 96), Image.LANCZOS).save(
        os.path.join(BRAND, "qpio-mark-96.png"))
    print("icons + header mark written")


if __name__ == "__main__":
    main()
