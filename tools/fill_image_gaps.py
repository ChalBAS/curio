# FILL THE IMAGE GAPS — the repeatable batch, replacing the hand-edited one-off.
#
# CEO, 2026-09-05: "Please fix all the questions, i need a process to trigger
# batch of images from the workflow."
#
# fetch_entity_images.py did this once, with the slugs typed into the file by
# hand. That is fine for nine entities and useless as a standing process: every
# content release adds questions pointing at entities nobody has a picture for,
# and nothing notices until a reader sees a grey emoji where a photograph
# should be.
#
# This finds the gap itself and closes it:
#
#     py tools/fill_image_gaps.py              close every gap
#     py tools/fill_image_gaps.py --dry-run    show what it would fetch
#     py tools/fill_image_gaps.py --limit 25   close the first 25 only
#
# WHERE THE PICTURES COME FROM. Wikimedia Commons, through the repo's own
# fetch_images.py — the same source as the 862 pictures already in the bank.
# Free, already the established source, and every entry carries the author and
# the licence, so nothing enters the app that cannot be credited (CLAUDE.md 7,
# free first). No image is generated: a generated picture of a real place or a
# real person is a fabrication, and this bank is sourced.
#
# Exit codes:  0 nothing left to do   1 gaps closed   2 gaps remain
import io, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import fetch_images as fi

argv = sys.argv[1:]
DRY = "--dry-run" in argv
LIMIT = None
if "--limit" in argv:
    LIMIT = int(argv[argv.index("--limit") + 1])

# ---- 1. ask the gap report what is missing, rather than being told ----------
node = "node"
try:
    out = subprocess.run([node, os.path.join(HERE, "image_gap.js"), "--json"],
                         capture_output=True, text=True, cwd=ROOT, timeout=120)
    if out.returncode != 0:
        print("image_gap.js failed:\n" + (out.stderr or "")[:800]); sys.exit(3)
    gap = json.loads(out.stdout)
except FileNotFoundError:
    print("node is not on PATH — cannot run image_gap.js"); sys.exit(3)

# image_gap.js --json emits a bare array of {slug, questions, cat, sub}
rows = gap if isinstance(gap, list) else (gap.get("missing") or gap.get("entities") or [])
missing = [(r.get("slug") or r.get("entity")) if isinstance(r, dict) else r for r in rows]
missing = [m for m in missing if m]
detail = {(r.get("slug") or r.get("entity")): r for r in rows if isinstance(r, dict)}

print("entities with no picture: %d" % len(missing))
if not missing:
    print("nothing to do — every question already leads to a picture")
    sys.exit(0)

if LIMIT:
    missing = missing[:LIMIT]
for s in missing:
    d = detail.get(s, {})
    print("   %-46s %s / %s   (%s question%s)" % (
        s, d.get("cat", "?"), d.get("sub", "?"), d.get("questions", "?"),
        "" if d.get("questions") == 1 else "s"))

if DRY:
    print("\n--dry-run: nothing fetched, nothing written")
    sys.exit(0)

# ---- 2. fetch, in batches of 50, lead image first then any body image -------
imgs, files = {}, {}
for i in range(0, len(missing), 50):
    for s, (u, fn) in fi.lead_images(missing[i:i + 50]).items():
        imgs[s] = u
        files[s] = fn.replace(" ", "_")

# A lead image hosted on a language Wikipedia rather than Commons is usually
# a non-free "fair use" upload: it exists, and it carries no licence we may
# ship. Treat those exactly like a miss so the body-image search gets a turn.
nonfree = [s for s, u in imgs.items() if "/wikipedia/commons/" not in u]
for s in nonfree:
    print("  lead image for %s is not on Commons — likely non-free, looking further" % s)
    imgs.pop(s, None); files.pop(s, None)

still = [s for s in missing if s not in imgs]
if still:
    print("\nno lead image for %d — trying body images" % len(still))
    body = fi.page_images(still)
    turls = fi.thumbs_for(sorted(set(body.values())))
    for s, fn in body.items():
        u = turls.get(fn.replace(" ", "_"))
        if u:
            imgs[s] = u
            files[s] = fn.replace(" ", "_")
            print("  recovered " + s)

# ---- 2c. last resort: search Commons itself -------------------------------
# The article may be a stub, or its pictures may all be non-free, while Commons
# holds plenty of freely licensed photographs filed under the subject name.
# This is the case for well-known places whose Wikipedia lead image happens to
# be a fair-use upload.
still2 = [s for s in missing if s not in imgs]
if still2:
    print("")
    print("searching Commons directly for %d" % len(still2))
    for slug in still2:
        term = slug.replace("_", " ")
        try:
            r = fi.get("https://commons.wikimedia.org/w/api.php", {
                "action": "query", "format": "json", "generator": "search",
                "gsrnamespace": "6", "gsrlimit": "8", "gsrsearch": term,
                "prop": "imageinfo", "iiprop": "url", "iiurlwidth": "500"})
            pages = ((r or {}).get("query") or {}).get("pages") or {}
        except Exception as e:
            print("  search failed for %s: %s" % (slug, e)); continue
        for _, pg in sorted(pages.items()):
            title = pg.get("title") or ""
            info = (pg.get("imageinfo") or [{}])[0]
            u = info.get("thumburl") or info.get("url") or ""
            if not u or "/wikipedia/commons/" not in u:
                continue
            if not title.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            imgs[slug] = u
            files[slug] = title.replace(" ", "_")
            print("  found on Commons: %s -> %s" % (slug, title))
            break

# ---- 2d. clean the URLs before anything is written ------------------------
# The Commons search API hands back thumbnails on thumb.wikimedia.org with utm
# tracking parameters attached. Neither belongs in this app: the host differs
# from every other entry in the file, and a tracking parameter on a URL the
# reader's own browser fetches is precisely what this product does not do.
def _clean(u):
    u = u.split("?", 1)[0]
    return u.replace("https://thumb.wikimedia.org/", "https://upload.wikimedia.org/")

imgs = {k: _clean(v) for k, v in imgs.items()}

# ---- 3. credits are not optional — an uncredited picture does not ship ------
cred = fi.credits(sorted(set(files.values())))

lines, skipped = [], []
for s in missing:
    if s not in imgs:
        skipped.append((s, "no picture found on Commons"))
        continue
    c = cred.get(files[s], {})
    if not c.get("lic"):
        # A picture with no licence is a legal problem wearing a photograph.
        skipped.append((s, "found a picture but no licence — not shipped"))
        continue
    lines.append("  %s: {u:%s,by:%s,lic:%s,p:%s}," % (
        json.dumps(s, ensure_ascii=False), json.dumps(imgs[s], ensure_ascii=False),
        json.dumps(c.get("by", ""), ensure_ascii=False),
        json.dumps(c.get("lic", ""), ensure_ascii=False),
        json.dumps(c.get("page", ""), ensure_ascii=False)))

# ---- 4. append, never rewrite ----------------------------------------------
P = os.path.join(ROOT, "src", "entities.img.js")
t = io.open(P, encoding="utf-8").read()
if not t.rstrip().endswith("};"):
    print("entities.img.js does not end as expected — refusing to write"); sys.exit(3)

if lines:
    t = t.rstrip()[:-2].rstrip() + "\n" + "\n".join(lines) + "\n};\n"
    io.open(P, "w", encoding="utf-8", newline="\n").write(t)
    print("\nadded %d pictures to entities.img.js" % len(lines))
else:
    print("\nnothing written")

if skipped:
    print("\nSTILL WITHOUT A PICTURE (%d) — these need a human decision:" % len(skipped))
    for s, why in skipped:
        print("   %-52s %s" % (s, why))
    print("\n   Either the subject has no free photograph, or the one on Commons")
    print("   carries no usable licence. Neither is fixed by running this again.")

sys.exit(2 if skipped else 1)
