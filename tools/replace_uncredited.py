# REPLACE PICTURES THAT CANNOT BE CREDITED.
#
# A CC BY / CC BY-SA licence asks for the author's name. A handful of Commons
# files carry that licence and record no author at all — the metadata gap is
# Wikimedia's, not ours, but the obligation is still ours. Rather than invent an
# attribution or ship an uncredited one, swap the picture for one of the same
# subject that DOES name its author.
#
#     py tools/replace_uncredited.py            show what would be swapped
#     py tools/replace_uncredited.py --apply    swap them
import io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import fetch_images as fi

APPLY = "--apply" in sys.argv[1:]
P = os.path.join(ROOT, "src", "entities.img.js")
text = io.open(P, encoding="utf-8").read()

ENTRY = re.compile(r'^\s*"([^"]+)":\s*\{u:("(?:[^"\\]|\\.)*"),by:("(?:[^"\\]|\\.)*"),'
                   r'lic:("(?:[^"\\]|\\.)*"),p:("(?:[^"\\]|\\.)*")\},\s*$', re.M)
NEEDS_CREDIT = re.compile(r"^CC BY", re.I)


def clean(u):
    u = u.split("?", 1)[0]
    return u.replace("https://thumb.wikimedia.org/", "https://upload.wikimedia.org/")


targets = []
for m in ENTRY.finditer(text):
    if json.loads(m.group(3)).strip():
        continue
    if not NEEDS_CREDIT.match(json.loads(m.group(4)).strip()):
        continue
    targets.append((m.group(1), m.group(0)))

print("uncreditable pictures to replace: %d" % len(targets))
if not targets:
    sys.exit(0)

swapped, failed = 0, []
for slug, line in targets:
    term = slug.replace("_", " ")
    try:
        r = fi.get("https://commons.wikimedia.org/w/api.php", {
            "action": "query", "format": "json", "generator": "search",
            "gsrnamespace": "6", "gsrlimit": "12", "gsrsearch": term,
            "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": "500"})
        pages = ((r or {}).get("query") or {}).get("pages") or {}
    except Exception as e:
        failed.append((slug, "search failed: %s" % e)); continue

    pick = None
    for _, pg in sorted(pages.items()):
        title = pg.get("title") or ""
        if not title.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        info = (pg.get("imageinfo") or [{}])[0]
        u = info.get("thumburl") or info.get("url") or ""
        meta = info.get("extmetadata") or {}
        artist = re.sub(r"<[^>]*>", "", str((meta.get("Artist") or {}).get("value") or ""))
        # The Artist field is free text on a wiki: it arrives with markup, line
        # breaks, and sometimes a whole licensing paragraph. Take the first line,
        # collapse the spacing, and drop the "Foto:"/"Photograph by" lead-ins.
        artist = artist.replace(chr(160), " ")
        artist = artist.splitlines()[0] if artist.strip() else ""
        artist = re.sub(r"\s+", " ", artist).strip(" .,;:-")
        artist = re.sub(r"^(foto|photo|photograph|image|picture)\s*(by|:)\s*", "", artist, flags=re.I).strip()
        lic = re.sub(r"<[^>]*>", "", str((meta.get("LicenseShortName") or {}).get("value") or "")).strip()
        if not u or "/wikipedia/commons/" not in u:
            continue
        # Commons uses placeholder strings where there is no real author, and a
        # bare URL is not a name either. Neither satisfies an attribution licence.
        low = artist.lower()
        if (not artist or not lic
                or "no machine-readable author" in low
                or "unknown" in low
                or low.startswith("http")
                or "licens" in low or "permission" in low or "copyright" in low
                or len(artist) > 60):
            continue
        # A logo, a map, a diagram or a screenshot of a brand is not a picture of
        # the subject. Swapping a photograph of simit bread for the logo of a
        # bakery chain is worse than the problem being fixed.
        tl = title.lower()
        if any(w in tl for w in ("logo", "icon", "coat of arms", "screenshot", "wordmark")):
            continue
        pick = (clean(u), artist, lic, title)
        break

    if not pick:
        failed.append((slug, "no credited alternative on Commons")); continue

    u, artist, lic, title = pick
    page = "https://commons.wikimedia.org/wiki/" + title.replace(" ", "_").replace(":", "%3A", 1)
    new = '  %s: {u:%s,by:%s,lic:%s,p:%s},' % (
        json.dumps(slug, ensure_ascii=False), json.dumps(u, ensure_ascii=False),
        json.dumps(artist, ensure_ascii=False), json.dumps(lic, ensure_ascii=False),
        json.dumps(page, ensure_ascii=False))
    print("  %-20s -> %s  (%s, %s)" % (slug, title[:44], artist[:26], lic))
    if APPLY:
        text = text.replace(line, new, 1)
    swapped += 1

if APPLY and swapped:
    io.open(P, "w", encoding="utf-8", newline="\n").write(text)
    print("\nreplaced %d pictures" % swapped)
elif not APPLY:
    print("\n(dry run — pass --apply to write)")

if failed:
    print("\nNO CREDITED ALTERNATIVE (%d) — these need a human:" % len(failed))
    for s, why in failed:
        print("   %-22s %s" % (s, why))
sys.exit(2 if failed else 0)
