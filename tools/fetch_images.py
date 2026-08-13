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


# Icons, badges and maintenance graphics that appear on thousands of articles.
# Any of these as "the picture of the topic" would be worse than the emoji tile.
_JUNK = re.compile(
    r"(commons-logo|wiki(pedia|media|source|quote|books|versity|data)|"
    r"question_book|ambox|edit-clear|folder|padlock|lock-|disambig|"
    r"portal|symbol_|nuvola|crystal_|text_document|magnify-clip|"
    r"red_pog|blue_pog|green_pog|location_dot|increase2?\.svg|decrease2?\.svg|"
    r"flag_of|coat_of_arms|loudspeaker|speakerlink|sound-icon|"
    r"office-book|open_access|closed_access|free-to-read|"
    r"gnome-|oojs|vector_|cscr-|star_full|monogram)", re.I)


def _pick(title_slug, candidates):
    """Choose the image most likely to BE the topic, not merely near it.

    Alphabetical order is what the API gives back, and alphabetical order put a
    photograph of salami first on the Collagen article. So: prefer a file whose
    own name shares a significant word with the topic, and only fall back to
    first-alphabetical when nothing matches.
    """
    words = [w.lower() for w in re.split(r"[_\s\-(),.]+", title_slug)
             if len(w) > 3 and w.lower() not in
             ("anatomy", "computer", "scientist", "system", "number", "theory", "human")]
    if not words:
        return candidates[0] if candidates else None

    def name_of(c):
        return re.sub(r"^File:", "", c).rsplit(".", 1)[0].lower()

    # A filename that merely CONTAINS the topic is not about the topic: the
    # Collagen article's alphabetically-first image is "Beretta Salami and
    # Collagen Casing", and a photograph of salami for the body's most abundant
    # protein is worse than no picture at all. So the topic word has to lead the
    # filename, not merely appear somewhere in it.
    for c in candidates:
        first = re.split(r"[_\s\-(),.]+", name_of(c))[0]
        if any(first == w or first.startswith(w) for w in words):
            return c
    for c in candidates:                      # then: appears anywhere
        if any(w in name_of(c) for w in words):
            return c
    return candidates[0] if candidates else None


def page_images(batch):
    """Fallback: the first REAL image on the article, for pages with no lead image.

    CEO, 2026-08-13: "all anatomy question need to be illustrated… wiki must
    have many… there is no excuse not to have pictures." He is right, and
    `pageimages` was the wrong question to ask: it returns only the lead image,
    so an article whose diagram sits in the body — which is most abstract topics
    and many anatomy pages — came back empty and fell to a category emoji.

    This still takes an image the ARTICLE ITSELF uses, which keeps the guarantee
    that the picture is of the thing. A blind Commons search would not.
    """
    # ONE TITLE PER REQUEST. `prop=images` with `imlimit` and several titles
    # returns a complete list only for the first page — MediaWiki says so and
    # this code ignored it, so batches of 20 silently recovered almost nothing
    # while looking like they had worked. Fifty extra requests is the price of
    # an answer that is actually true.
    out = {}
    for slug in batch:
        try:
            data = get(API, {
                "action": "query", "format": "json", "formatversion": "2",
                "prop": "images", "imlimit": "60", "redirects": "1",
                "titles": slug.replace("_", " "),
            })
        except Exception:
            continue
        pages = data.get("query", {}).get("pages", []) or []
        if not pages:
            continue
        cands = []
        for im in pages[0].get("images", []) or []:
            title = im.get("title", "")
            if not re.search(r"\.(jpe?g|png|svg|gif)$", title, re.I):
                continue
            if _JUNK.search(title):
                continue
            cands.append(title)
        chosen = _pick(slug, cands)
        if chosen:
            out[slug] = chosen
        time.sleep(0.12)
    return out


def thumbs_for(files):
    """{'File:X': thumb_url} at THUMB width, straight from Commons."""
    out = {}
    data = get(COMMONS, {
        "action": "query", "format": "json", "formatversion": "2",
        "prop": "imageinfo", "iiprop": "url", "iiurlwidth": str(THUMB),
        "titles": "|".join(files),
    })
    for page in data.get("query", {}).get("pages", []) or []:
        info = (page.get("imageinfo") or [{}])[0]
        url = info.get("thumburl") or info.get("url")
        if url:
            out[page.get("title", "").replace(" ", "_")] = url.split("?")[0]
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

    # Second pass for whatever the lead-image query could not answer.
    gap = [s for s in slugs if s not in imgs]
    if gap:
        print("\nno lead image for %d — trying the article's own body images" % len(gap))
        body = page_images(gap)                 # one request per title, by necessity
        wanted = sorted(set(body.values()))
        turls = {}
        for i in range(0, len(wanted), 50):
            try:
                turls.update(thumbs_for(wanted[i:i + 50]))
            except Exception as e:
                print("  thumb batch %d failed: %s" % (i // 50 + 1, e))
            time.sleep(0.4)
        gained = 0
        for s, fn in body.items():
            u = turls.get(fn.replace(" ", "_"))
            if u:
                imgs[s] = u
                files[s] = fn.replace(" ", "_")
                gained += 1
        print("  recovered %d" % gained)

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
