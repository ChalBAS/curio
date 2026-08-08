# -*- coding: utf-8 -*-
"""Build the French entity-name map from Wikipedia's own interlanguage links.

CEO, 2026-08-08: "Great Wall of China = Muraille de Chine, you should be able
to translate this easily no? there are thousands of references in public
domain, or wiki should be able to give you a hint."

He is right, and the hint is exact rather than approximate: every Wikipedia
article stores the title of the same article in every other language. So the
French name of an entity is a lookup, not a translation — no guessing, no
model, no drift. "Great_Wall_of_China" → "Muraille de Chine", from the people
who write the French article.

This runs at BUILD time and bakes a static map into src/entities.fr.js, so the
app stays offline-first: no network call ever happens in the browser.

    py tools/fetch_fr_titles.py          # rebuild the map
    py tools/fetch_fr_titles.py --check  # report coverage, write nothing

Re-run whenever questions are added.
"""
import io, json, os, re, sys, time, urllib.parse, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(SRC, "entities.fr.js")
API = "https://en.wikipedia.org/w/api.php"
# Wikipedia asks for a real User-Agent naming the tool and a contact.
UA = "QpioEntityMap/1.0 (https://qpio.app; QpioCorp@mail.com)"


def slugs_in_bank():
    """Every distinct en.wikipedia slug used as a source, in first-seen order."""
    seen, out = set(), []
    for name in ("questions.js", "truthlab.js", "citypacks.js"):
        p = os.path.join(SRC, name)
        if not os.path.exists(p):
            continue
        text = open(p, encoding="utf-8").read()
        for m in re.finditer(r'https://en\.wikipedia\.org/wiki/([^"\'#?\\]+)', text):
            s = urllib.parse.unquote(m.group(1))
            if s not in seen:
                seen.add(s)
                out.append(s)
    return out


def fetch(batch):
    """{en_slug: fr_title} for up to 50 titles, via langlinks."""
    q = {
        "action": "query", "format": "json", "formatversion": "2",
        "prop": "langlinks", "lllang": "fr", "lllimit": "500",
        "redirects": "1", "titles": "|".join(t.replace("_", " ") for t in batch),
    }
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(q), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)

    # Redirects and normalisation mean the title we asked for is not always the
    # title that comes back. Follow both maps so nothing is silently dropped.
    alias = {}
    for key in ("normalized", "redirects"):
        for m in data.get("query", {}).get(key, []) or []:
            alias[m["to"]] = m["from"]

    found = {}
    for page in data.get("query", {}).get("pages", []) or []:
        title = page.get("title", "")
        ll = page.get("langlinks") or []
        if not ll:
            continue
        # walk back to whatever we originally asked for
        original = title
        for _ in range(4):
            if original in alias:
                original = alias[original]
            else:
                break
        found[original.replace(" ", "_")] = ll[0]["title"]
    return found


def main():
    check = "--check" in sys.argv
    slugs = slugs_in_bank()
    print("entities in the bank: %d" % len(slugs))

    fr, missing = {}, []
    for i in range(0, len(slugs), 50):
        batch = slugs[i:i + 50]
        try:
            got = fetch(batch)
        except Exception as e:
            print("  batch %d failed: %s" % (i // 50 + 1, e))
            got = {}
        for s in batch:
            if s in got:
                fr[s] = got[s]
            else:
                missing.append(s)
        print("  %d/%d looked up" % (min(i + 50, len(slugs)), len(slugs)))
        time.sleep(0.4)   # be a good citizen

    pct = 100.0 * len(fr) / len(slugs) if slugs else 0
    print("\nFrench titles found: %d of %d (%.1f%%)" % (len(fr), len(slugs), pct))
    if missing:
        print("no French article (English name will be used):")
        for m in missing[:40]:
            print("   " + m)
        if len(missing) > 40:
            print("   ... and %d more" % (len(missing) - 40))

    if check:
        return 0

    lines = [
        "// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.",
        "// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt",
        "//",
        "// GENERATED — do not hand-edit. Rebuild with: py tools/fetch_fr_titles.py",
        "//",
        "// The French name of each entity, and the French Wikipedia article, taken",
        "// from Wikipedia's own interlanguage links. A lookup, not a translation:",
        "// these are the titles the French Wikipedia community chose themselves.",
        "// Baked at build time so the app never touches the network to render.",
        "//",
        "// %d of %d entities have a French article (%.1f%%). The rest keep their" % (len(fr), len(slugs), pct),
        "// English name, which is correct — not every subject has a French page.",
        "",
        "window.CURIO_FR_ENTITIES = {",
    ]
    for s in sorted(fr):
        lines.append("  %s: %s," % (json.dumps(s, ensure_ascii=False), json.dumps(fr[s], ensure_ascii=False)))
    lines.append("};")
    open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    print("\nwritten: %s" % OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
