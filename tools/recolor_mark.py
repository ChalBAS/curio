"""Recolour the Qpio mark (shape is locked, D-056) into palette variants.

The mark's own gradient runs deep-navy -> cyan. We remap hue while keeping the
luminance ramp, so the artwork's shading and depth survive.

Run: py tools/recolor_mark.py
"""
import colorsys
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.join(os.path.dirname(HERE), "brand")
SRC = os.path.join(BRAND, "qpio-mark.png")

# (name, target hue for the dark end, target hue for the light end, saturation scale)
VARIANTS = {
    "teal": None,                       # untouched original
    "violet": (0.72, 0.78, 1.00),       # matches the app's accent #7c6cff
    "gold": (0.09, 0.13, 1.00),         # matches the app's brand gold
    "violetgold": (0.72, 0.11, 1.05),   # dark violet -> gold highlight
    "paper": (0.0, 0.0, 0.0),           # single-ink light (for dark UI)
}


def remap(im, spec):
    if spec is None:
        return im.copy()
    h_dark, h_light, sat_scale = spec
    out = im.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if sat_scale == 0:            # single ink: light warm off-white
                nl = 0.72 + 0.26 * ll
                nr, ng, nb = colorsys.hls_to_rgb(0.09, min(0.98, nl), 0.10)
            else:
                t = min(1.0, max(0.0, (ll - 0.15) / 0.55))   # dark..light position
                nh = h_dark + (h_light - h_dark) * t
                ns = min(1.0, ss * sat_scale)
                nr, ng, nb = colorsys.hls_to_rgb(nh % 1.0, ll, ns)
            px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return out


def main():
    im = Image.open(SRC).convert("RGBA")
    for name, spec in VARIANTS.items():
        v = remap(im, spec)
        r = 96 / v.size[1]
        v.resize((int(v.size[0] * r), 96), Image.LANCZOS).save(
            os.path.join(BRAND, f"qpio-mark-96-{name}.png"))
        v.save(os.path.join(BRAND, f"qpio-mark-{name}.png"))
    print("variants:", ", ".join(VARIANTS))


if __name__ == "__main__":
    main()
