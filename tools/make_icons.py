"""Generate Qpio PWA icons with Pillow. Run: py tools/make_icons.py"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

# Brand palette
C1 = (124, 108, 255)   # accent violet
C2 = (255, 143, 163)   # brand pink
GOLD = (255, 209, 102)
INK = (16, 15, 40)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size):
    """Diagonal violet->pink gradient."""
    img = Image.new("RGB", (size, size), C1)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = lerp(C1, C2, t)
    return img


def load_font(px):
    for name in ("georgiab.ttf", "Georgia Bold.ttf", "arialbd.ttf", "ariblk.ttf"):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    for path in (r"C:\Windows\Fonts\georgiab.ttf", r"C:\Windows\Fonts\arialbd.ttf"):
        if os.path.exists(path):
            return ImageFont.truetype(path, px)
    return ImageFont.load_default()


def draw_monogram(img, scale=0.62, dy=0.0):
    """Draw a centered 'Q' monogram sized to `scale` of the canvas."""
    size = img.size[0]
    d = ImageDraw.Draw(img)
    font = load_font(int(size * scale * 1.35))
    ch = "Q"
    box = d.textbbox((0, 0), ch, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    x = (size - w) / 2 - box[0]
    y = (size - h) / 2 - box[1] + dy * size
    # soft shadow for depth
    d.text((x + size * 0.012, y + size * 0.012), ch, font=font, fill=(0, 0, 0, 90))
    d.text((x, y), ch, font=font, fill=(255, 252, 245))
    # a small gold "spark" accent to say 'curiosity'
    r = size * 0.055
    cx, cy = size * 0.70, size * 0.30
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD)
    return img


def rounded(img, radius_frac=0.22):
    """Round the corners, transparent outside (for 'any' purpose icons)."""
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size, size], radius=int(size * radius_frac), fill=255
    )
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def make_any(size):
    img = gradient(size).convert("RGBA")
    draw_monogram(img)
    return rounded(img)


def make_maskable(size):
    # full-bleed (safe zone): background fills whole square, mark smaller
    img = gradient(size).convert("RGBA")
    draw_monogram(img, scale=0.50)
    return img


def make_apple(size=180):
    img = gradient(size).convert("RGBA")
    draw_monogram(img, scale=0.58)
    return img  # iOS masks its own corners; keep full-bleed


make_any(192).save(os.path.join(OUT, "icon-192.png"))
make_any(512).save(os.path.join(OUT, "icon-512.png"))
make_maskable(512).save(os.path.join(OUT, "icon-maskable-512.png"))
make_apple(180).save(os.path.join(OUT, "apple-touch-icon.png"))
make_any(32).resize((32, 32)).save(os.path.join(OUT, "favicon-32.png"))
print("Icons written to", os.path.abspath(OUT))
