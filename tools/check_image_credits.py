# ATTRIBUTION IS NOT OPTIONAL WHERE THE LICENCE ASKS FOR IT.
#
# Every picture in entities.img.js carries a licence. Most are public domain or
# CC0, which ask for nothing. The CC BY and CC BY-SA family ask for the author's
# name, and shipping one of those without a credit is a licence breach — a small
# one, and still the kind that is embarrassing to be shown rather than to find.
#
#     py tools/check_image_credits.py            report only
#     py tools/check_image_credits.py --fix      re-fetch the missing credits
#
# Exit codes:  0 nothing owed   1 credits were fetched   2 credits still missing
import io, json, os, re, sys, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import fetch_images as fi

FIX = "--fix" in sys.argv[1:]
P = os.path.join(ROOT, "src", "entities.img.js")
text = io.open(P, encoding="utf-8").read()

# One entry per line: "Slug": {u:"...",by:"...",lic:"...",p:"..."},
ENTRY = re.compile(r'^\s*"([^"]+)":\s*\{u:("(?:[^"\\]|\\.)*"),by:("(?:[^"\\]|\\.)*"),'
                   r'lic:("(?:[^"\\]|\\.)*"),p:("(?:[^"\\]|\\.)*")\},\s*$', re.M)

# Licences that require the author to be named. Public domain and CC0 do not.
NEEDS_CREDIT = re.compile(r"^CC BY", re.I)

owed = []
for m in ENTRY.finditer(text):
    slug = m.group(1)
    by = json.loads(m.group(3))
    lic = json.loads(m.group(4))
    page = json.loads(m.group(5))
    if by.strip():
        continue
    if not NEEDS_CREDIT.match(lic.strip()):
        continue          # public domain / CC0 — nothing owed
    owed.append((slug, lic, page, m.group(0)))

print("pictures whose licence requires a credit and have none: %d" % len(owed))
for slug, lic, _, _ in owed:
    print("   %-18s %s" % (lic, slug))

if not owed:
    print("nothing owed — every attribution-requiring picture is credited")
    sys.exit(0)
if not FIX:
    print("\nrun with --fix to fetch them")
    sys.exit(2)

# The Commons file name is recoverable from the page URL we already store.
files, back = [], {}
for slug, lic, page, line in owed:
    tail = page.rsplit("/wiki/", 1)[-1] if "/wiki/" in page else ""
    fname = urllib.parse.unquote(tail).replace(" ", "_")
    if not fname.startswith("File:"):
        print("  cannot recover a file name for %s" % slug)
        continue
    files.append(fname)
    back.setdefault(fname, []).append((slug, line))

cred = fi.credits(sorted(set(files)))

fixed, still = 0, []
for fname, entries in back.items():
    by = (cred.get(fname) or {}).get("by", "").strip()
    for slug, line in entries:
        if not by:
            still.append(slug)
            continue
        new = line.replace(',by:"",', ',by:%s,' % json.dumps(by, ensure_ascii=False), 1)
        if new == line:
            still.append(slug)
            continue
        text = text.replace(line, new, 1)
        fixed += 1
        print("  credited %-26s -> %s" % (slug, by))

if fixed:
    io.open(P, "w", encoding="utf-8", newline="\n").write(text)
    print("\ncredited %d pictures" % fixed)

if still:
    print("\nSTILL UNCREDITED (%d) — Commons has no author recorded for these." % len(still))
    for s in still:
        print("   " + s)
    print("   Replace the picture, or record the licence's own attribution text by hand.")
    sys.exit(2)
sys.exit(1)
