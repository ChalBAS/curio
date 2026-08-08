# -*- coding: utf-8 -*-
"""Build the entity metadata map: what each thing IS, in a few words.

Wikipedia keeps a one-line description on every article — "French painter",
"mountain in Nepal", "painting by Leonardo da Vinci". Two things fall out of it
that the app cannot get anywhere else:

  · a real subtitle for a discovery card, in the reader's language
  · a TYPE, so the app knows a person from a place from a work — which is what
    turns six category doors into shelves of actual things (Meet / Visit /
    Read / Watch)

Without this, "People" is a button. With it, "People" is Frida Kahlo, Marie
Curie and Mansa Musa, with their faces on.

Build time only; nothing is fetched in the browser.

    py tools/fetch_meta.py           # rebuild
    py tools/fetch_meta.py --check   # report, write nothing
"""
import io, json, os, re, sys, time, urllib.parse, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(SRC, "entities.meta.js")
API = "https://en.wikipedia.org/w/api.php"
UA = "QpioMetaMap/1.0 (https://qpio.app; QpioCorp@mail.com)"

# Order matters — first match wins. A cathedral is a building before it is a
# place; a painting is a work before it is anything else.
TYPES = [
    ("person", r"\b(painter|artist|writer|author|poet|composer|musician|scientist|"
               r"physicist|chemist|biologist|mathematician|astronomer|philosopher|"
               r"emperor|empress|king|queen|monarch|ruler|sultan|pharaoh|general|"
               r"explorer|navigator|inventor|engineer|physician|scholar|"
               r"politician|leader|aviator|nurse|activist|historian|"
               r"born |–\d{4}|\(\d{4}–)"),
    ("work",   r"\b(painting|sculpture|novel|poem|epic|play|opera|symphony|song|"
               r"album|film|book|manuscript|codex|artwork|drawing|portrait|"
               r"fresco|mural|treatise|text)\b"),
    ("visit",  r"\b(museum|gallery|palace|castle|cathedral|basilica|temple|mosque|"
               r"church|monastery|library|monument|memorial|tower|pyramid|"
               r"archaeological|ruins|heritage site|landmark|observatory)\b"),
    ("go",     r"\b(country|capital|city|town|region|province|island|mountain|"
               r"volcano|river|lake|desert|ocean|sea|reef|waterfall|canyon|"
               r"national park|glacier|strait|peninsula|continent|valley|"
               r"archipelago|bay|plateau)\b"),
    ("event",  r"\b(war|battle|revolution|treaty|siege|expedition|voyage|"
               r"pandemic|epidemic|empire|dynasty|civilisation|civilization|"
               r"period|era|age|movement)\b"),
]


def get(params):
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
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


def classify(desc):
    d = (desc or "").lower()
    for kind, pat in TYPES:
        if re.search(pat, d):
            return kind
    return "idea"


def batch(slugs):
    """{slug: (description_en, description_fr)}"""
    data = get({
        "action": "query", "format": "json", "formatversion": "2",
        "prop": "description", "redirects": "1",
        "titles": "|".join(t.replace("_", " ") for t in slugs),
    })
    alias = {}
    for key in ("normalized", "redirects"):
        for m in data.get("query", {}).get(key, []) or []:
            alias[m["to"]] = m["from"]
    out = {}
    for page in data.get("query", {}).get("pages", []) or []:
        desc = page.get("description")
        if not desc:
            continue
        original = page.get("title", "")
        for _ in range(4):
            original = alias.get(original, original)
        out[original.replace(" ", "_")] = desc
    return out


def main():
    check = "--check" in sys.argv
    slugs = slugs_in_bank()
    print("entities: %d" % len(slugs))

    meta = {}
    for i in range(0, len(slugs), 50):
        chunk = slugs[i:i + 50]
        try:
            got = batch(chunk)
        except Exception as e:
            print("  batch %d failed: %s" % (i // 50 + 1, e))
            got = {}
        for s, d in got.items():
            meta[s] = {"d": d[:110], "t": classify(d)}
        print("  %d/%d" % (min(i + 50, len(slugs)), len(slugs)))
        time.sleep(0.4)

    kinds = {}
    for v in meta.values():
        kinds[v["t"]] = kinds.get(v["t"], 0) + 1
    print("\ndescriptions found: %d of %d (%.1f%%)" % (len(meta), len(slugs), 100.0 * len(meta) / max(1, len(slugs))))
    for k in sorted(kinds, key=lambda x: -kinds[x]):
        print("   %-8s %d" % (k, kinds[k]))
    if check:
        return 0

    lines = [
        "// © 2026 Qpio. All rights reserved.",
        "// GENERATED — do not hand-edit. Rebuild: py tools/fetch_meta.py",
        "//",
        "// What each entity IS, in Wikipedia's own one-line description, plus a",
        "// type derived from it. The type is what lets the app show shelves of",
        "// real things — people, places, works — instead of category buttons.",
        "//",
        "// d = description · t = person | work | visit | go | event | idea",
        "",
        "window.CURIO_META = {",
    ]
    for s in sorted(meta):
        lines.append("  %s: {d:%s,t:%s}," % (
            json.dumps(s, ensure_ascii=False),
            json.dumps(meta[s]["d"], ensure_ascii=False),
            json.dumps(meta[s]["t"], ensure_ascii=False)))
    lines.append("};")
    open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    print("\nwritten: %s" % OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
