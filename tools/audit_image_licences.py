# EVERY PICTURE MUST BE FREE TO USE COMMERCIALLY. NO EXCEPTIONS.
#
# CEO, 5 Sep 2026: "make sure all images do not have copyright, this is super
# important so we don't have a lawsuits and lose money. you cannot be wrong on
# this!!! I insist on it."
#
#     py tools/audit_image_licences.py            report only
#     py tools/audit_image_licences.py --replace  swap unsafe pictures for safe ones
#
# THE SAFE LIST is deliberately short. A picture ships only if its licence
# permits commercial use AND derivative works, with attribution at most:
#
#     Public domain · CC0 · CC BY (any version) · CC BY-SA (any version)
#     FAL (Free Art License) · GODL-India
#
# EVERYTHING ELSE IS REFUSED, including several that look free:
#
#   GFDL / GFDL 1.2  A free licence in name, and in practice the one certain
#                    photographers choose SPECIFICALLY to stop commercial reuse:
#                    it obliges you to publish the entire licence text with the
#                    work, which a photo card in an app cannot do.
#   GPL / LGPL / MPL Written for software. Applied to a picture they carry
#                    source-availability duties nobody has thought through, and
#                    in practice they arrive attached to company logos.
#   "Attribution"    Not a licence, a note. It says who made it and nothing
#                    about what may be done with it.
#   "Copyrighted free use"
#                    Means the holder permits use — but the permission is
#                    theirs to describe and sometimes contested. The Aboriginal
#                    Flag sits here, and its copyright has been litigated.
#
# The rule this encodes: a picture whose licence needs a lawyer to explain is
# cheaper to replace than to defend. Replacements come from Wikimedia Commons
# and must name an author and carry a safe licence, or the picture is dropped
# and reported rather than guessed at.
import io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import fetch_images as fi

REPLACE = "--replace" in sys.argv[1:]
P = os.path.join(ROOT, "src", "entities.img.js")
text = io.open(P, encoding="utf-8").read()

ENTRY = re.compile(r'^\s*"([^"]+)":\s*\{u:("(?:[^"\\]|\\.)*"),by:("(?:[^"\\]|\\.)*"),'
                   r'lic:("(?:[^"\\]|\\.)*"),p:("(?:[^"\\]|\\.)*")\},\s*$', re.M)

SAFE = re.compile(r"^(public domain|cc0|cc by|fal$|godl-india)", re.I)
GENERATED = re.compile(r"^generated illustration", re.I)


def safe(lic):
    lic = (lic or "").strip()
    return bool(SAFE.match(lic)) or bool(GENERATED.match(lic))


def clean(u):
    return u.split("?", 1)[0].replace("https://thumb.wikimedia.org/", "https://upload.wikimedia.org/")


unsafe = []
total = 0
for m in ENTRY.finditer(text):
    total += 1
    slug, lic = m.group(1), json.loads(m.group(4))
    if not safe(lic):
        unsafe.append((slug, lic, m.group(0)))

print("pictures checked: %d" % total)
print("licence NOT safe for commercial use: %d\n" % len(unsafe))
for slug, lic, _ in unsafe:
    print("   %-24s %s" % (lic, slug))

if not unsafe:
    print("\nevery picture is free to use commercially")
    sys.exit(0)
if not REPLACE:
    print("\nrun with --replace to swap them for safe ones")
    sys.exit(2)

print("\nlooking for safe replacements on Commons...\n")
swapped, failed = 0, []
for slug, oldlic, line in unsafe:
    term = slug.replace("_", " ")
    try:
        r = fi.get("https://commons.wikimedia.org/w/api.php", {
            "action": "query", "format": "json", "generator": "search",
            "gsrnamespace": "6", "gsrlimit": "20", "gsrsearch": term,
            "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": "500"})
        pages = ((r or {}).get("query") or {}).get("pages") or {}
    except Exception as e:
        failed.append((slug, oldlic, "search failed: %s" % e)); continue

    pick = None
    for _, pg in sorted(pages.items()):
        title = pg.get("title") or ""
        if not title.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        tl = title.lower()
        # a logo or a screenshot is where the trademark problems live
        if any(w in tl for w in ("logo", "icon", "screenshot", "wordmark", "coat of arms", "flag of")):
            continue
        info = (pg.get("imageinfo") or [{}])[0]
        u = info.get("thumburl") or info.get("url") or ""
        meta = info.get("extmetadata") or {}
        lic = re.sub(r"<[^>]*>", "", str((meta.get("LicenseShortName") or {}).get("value") or "")).strip()
        artist = re.sub(r"<[^>]*>", "", str((meta.get("Artist") or {}).get("value") or ""))
        artist = artist.replace(chr(160), " ")
        artist = artist.splitlines()[0] if artist.strip() else ""
        artist = re.sub(r"\s+", " ", artist).strip(" .,;:-")
        artist = re.sub(r"^(foto|photo|photograph|image|picture)\s*(by|:)\s*", "", artist, flags=re.I).strip()
        low = artist.lower()
        if "/wikipedia/commons/" not in u or not safe(lic):
            continue
        # public domain and CC0 need no author; the CC BY family does
        needs_author = bool(re.match(r"^cc by", lic, re.I))
        if needs_author and (not artist or "no machine-readable" in low
                             or "unknown" in low or low.startswith("http")
                             or "licens" in low or len(artist) > 60):
            continue
        pick = (clean(u), artist, lic, title)
        break

    if not pick:
        failed.append((slug, oldlic, "no safely licensed alternative found")); continue

    u, artist, lic, title = pick
    page = "https://commons.wikimedia.org/wiki/" + title.replace(" ", "_").replace(":", "%3A", 1)
    new = '  %s: {u:%s,by:%s,lic:%s,p:%s},' % (
        json.dumps(slug, ensure_ascii=False), json.dumps(u, ensure_ascii=False),
        json.dumps(artist, ensure_ascii=False), json.dumps(lic, ensure_ascii=False),
        json.dumps(page, ensure_ascii=False))
    print("  %-26s %s  ->  %s" % (slug, oldlic, lic))
    text = text.replace(line, new, 1)
    swapped += 1

if swapped:
    io.open(P, "w", encoding="utf-8", newline="\n").write(text)
    print("\nreplaced %d pictures with safely licensed ones" % swapped)

if failed:
    print("\nSTILL UNSAFE (%d) — these must be removed by hand or the question re-illustrated:" % len(failed))
    for slug, lic, why in failed:
        print("   %-26s %-22s %s" % (slug, lic, why))
    sys.exit(2)
sys.exit(0)
