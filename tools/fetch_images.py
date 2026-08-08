# -*- coding: utf-8 -*-
"""Build the entity image map from Wikimedia Commons — free, credited, real.

CEO, 2026-08-08: "free source first, then AI generated images, we are not
paying for images, there are enough resources out there. Also it is for
illustration, as long as we always link to the original source that is the
most important part. Without image you are missing a large part of the
population that are visual learners."

Every Wikipedia article carries a lead image, and almost all of them live on
Wikimedia Commons under a free licence. So the picture of the Rosetta Stone is
a photograph OF the Rosetta Stone — which matters more here than on any other
product, because verified truth is the whole proposition. A generated image
would be a plausible-looking object that is not the thing.

Attribution is not optional on most of these licences, so this script collects
the author, the licence and the file page for every image it takes. Nothing
ships without them.

Runs at BUILD time; writes a static map. The app never queries Wikipedia to
render — images load lazily from Commons when online and fall back to the
category tile when not, so offline-first survives.

    py tools/fetch_images.py           # rebuild the map
    py tools/fetch_images.py --check   # report coverage, write nothing
"""
import io, json, os, re, sys, time, urllib.parse, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(SRC, "entities.img.js")
API = "https://en.wikipedia.org/w/api.php"
COMMONS = "https://commons.wikimedia.org/w/api.php"
UA = "QpioImageMap/1.0 (https://qpio.app; QpioCorp@mail.com)"
THUMB = 480          # card art is 54–96px; 480 covers retina and future layouts


def get(url, params):
    req = urllib.request.Request(url + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


def slugs_in_bank():
    seen, out = set(), []
    for name in ("questions.js", "truthlab.js", "citypacks.js"):
        p = os.path.join(SRC, name)
        if not os.path.exists(p):
            continue
        for m in re.finditer(r'https://en\.wikipedia\.org/wiki/([^"\'#?\\]+)', open(p, encoding="utf-8").read()):
            s = urllib.parse.unquote(m.group(1))
            if s not in seen:
                seen.add(s)
                out.append(s)
    return out


def lead_images(batch):
    """{slug: (thumb_url, 'File:Name.jpg')} for up to 50 articles."""
    data = get(API, {
        "action": "query", "format": "json", "formatversion": "2",
        "prop": "pageimages", "piprop": "thumbnail|name", "pithumbsize": str(THUMB),
        "redirects": "1", "titles": "|".join(t.replace("_", " ") for t in batch),
    })
    alias = {}
    for key in ("normalized", "redirects"):
        for m in data.get("query", {}).get(key, []) or []:
            alias[m["to"]] = m["from"]
    out = {}
    for page in data.get("query", {}).get("pages", []) or []:
        thumb = (page.get("thumbnail") or {}).get("source")
        fname = page.get("pageimage")
        if not thumb or not fname:
            continue
        # The API appends utm_* tracking to the thumbnail URL. Strip it: we are
        # not passing analytics about our readers to anyone.
        thumb = thumb.split("?")[0]
        original = page.get("title", "")
        for _ in range(4):
            original = alias.get(original, original)
        out[original.replace(" ", "_")] = (thumb, "File:" + fname)
    return out


def credits(files):
    """{'File:X': {author, licence, page}} — everything attribution needs."""
    data = get(COMMONS, {
        "action": "query", "format": "json", "formatversion": "2",
        "prop": "imageinfo", "iiprop": "extmetadata",
        "iiextmetadatafilter": "Artist|LicenseShortName|LicenseUrl|AttributionRequired",
        "titles": "|".join(files),
    })
    out = {}
    for page in data.get("query", {}).get("pages", []) or []:
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata") or {}
        def val(k):
            v = (meta.get(k) or {}).get("value", "")
            v = re.sub(r"<[^>]+>", "", str(v))          # the API returns HTML here
            return re.sub(r"\s+", " ", v).strip()
        # The API normalises underscores to spaces in the title it echoes back,
        # while pageimage gives underscores. Key on the underscore form or 285
        # of 333 credits silently vanish — which is a licence breach, not a
        # cosmetic gap.
        out[page.get("title", "").replace(" ", "_")] = {
            "by": val("Artist")[:90],
            "lic": val("LicenseShortName")[:40],
            "page": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(page.get("title", "").replace(" ", "_")),
        }
    return out


def main():
    check = "--check" in sys.argv
    slugs = slugs_in_bank()
    print("entities in the bank: %d" % len(slugs))

    imgs, files = {}, {}
    for i in range(0, len(slugs), 50):
        batch = slugs[i:i + 50]
        try:
            got = lead_images(batch)
        except Exception as e:
            print("  images batch %d failed: %s" % (i // 50 + 1, e))
            got = {}
        for s, (url, fn) in got.items():
            imgs[s] = url
            files[s] = fn
        print("  images %d/%d" % (min(i + 50, len(slugs)), len(slugs)))
        time.sleep(0.4)

    uniq = sorted(set(files.values()))
    cred = {}
    for i in range(0, len(uniq), 50):
        try:
            cred.update(credits(uniq[i:i + 50]))
        except Exception as e:
            print("  credits batch %d failed: %s" % (i // 50 + 1, e))
        print("  credits %d/%d" % (min(i + 50, len(uniq)), len(uniq)))
        time.sleep(0.4)

    pct = 100.0 * len(imgs) / len(slugs) if slugs else 0
    print("\nimages found: %d of %d (%.1f%%)" % (len(imgs), len(slugs), pct))
    missing = [s for s in slugs if s not in imgs]
    if missing:
        print("no lead image (category tile will be used):")
        for m in missing[:30]:
            print("   " + m)
        if len(missing) > 30:
            print("   ... and %d more" % (len(missing) - 30))
    if check:
        return 0

    lines = [
        "// © 2026 Qpio. All rights reserved (this file's structure).",
        "// The IMAGES it points to are third-party works on Wikimedia Commons,",
        "// each under its own free licence, credited below and on the file page.",
        "//",
        "// GENERATED — do not hand-edit. Rebuild with: py tools/fetch_images.py",
        "//",
        "// Real photographs of the real things, from Commons. On a product whose",
        "// whole proposition is verified truth, a generated picture of the Rosetta",
        "// Stone would be a plausible object that is not the Rosetta Stone.",
        "//",
        "// u = image url · by = author · lic = licence · p = Commons file page.",
        "// Attribution is a licence condition, not a courtesy: nothing renders",
        "// without a credit and a link back to p.",
        "//",
        "// %d of %d entities have an image (%.1f%%); the rest fall back to the" % (len(imgs), len(slugs), pct),
        "// category tile. Loaded lazily at runtime, so offline still works.",
        "",
        "window.CURIO_IMAGES = {",
    ]
    for s in sorted(imgs):
        c = cred.get(files.get(s, ""), {})
        lines.append("  %s: {u:%s,by:%s,lic:%s,p:%s}," % (
            json.dumps(s, ensure_ascii=False),
            json.dumps(imgs[s], ensure_ascii=False),
            json.dumps(c.get("by", ""), ensure_ascii=False),
            json.dumps(c.get("lic", ""), ensure_ascii=False),
            json.dumps(c.get("page", ""), ensure_ascii=False),
        ))
    lines.append("};")
    open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    print("\nwritten: %s" % OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
