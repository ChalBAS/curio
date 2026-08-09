# -*- coding: utf-8 -*-
"""Confirm every question's Wikipedia source is a real article about a real thing.

This is the one part of fact-checking a machine can do properly, so it should
never be left to a model: a src that 404s, or that silently redirects to a
disambiguation page, breaks the discovery card, the image, the French title and
the hook all at once — and it does it quietly.

Checks, per source:
  · the article exists
  · it is not a redirect to somewhere unrelated (redirects are reported, with
    their target, because the slug is what the app keys everything on)
  · it is not a disambiguation page
  · it has a French counterpart (so a French reader gets a French title)
  · it has a lead image (so the discovery card is not blank)

    py tools/check_sources.py                     # the shipped banks
    py tools/check_sources.py tools/foo.json      # a pending JSON batch
"""
import io, json, os, re, sys, time, urllib.parse, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
API = "https://en.wikipedia.org/w/api.php"
UA = "QpioSourceCheck/1.0 (https://qpio.app; QpioCorp@mail.com)"
BATCH = 40          # the API takes up to 50 titles per call


def get(params, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(
                API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1:
                print("   ! %s" % e)
                return None
            time.sleep(1.5 * (i + 1))


def slugs_from_files():
    out = {}
    for name in ("questions.js", "truthlab.js", "citypacks.js"):
        p = os.path.join(SRC, name)
        if not os.path.exists(p):
            continue
        for m in re.finditer(r'https://en\.wikipedia\.org/wiki/([^"\'#?\\]+)', open(p, encoding="utf-8").read()):
            out.setdefault(urllib.parse.unquote(m.group(1)), name)
    return out


def slugs_from_json(path):
    raw = json.load(open(path, encoding="utf-8"))
    items = []
    if isinstance(raw, list):
        for x in raw:
            items.extend(x.get("questions", [x]) if isinstance(x, dict) and "questions" in x else [x])
    elif isinstance(raw, dict):
        items = raw.get("questions") or raw.get("result", {}).get("questions") or []
    out = {}
    for q in items:
        s = q.get("src") or ""
        m = re.match(r'https://en\.wikipedia\.org/wiki/(.+)$', s)
        if m:
            out.setdefault(urllib.parse.unquote(m.group(1)), os.path.basename(path))
        elif s:
            out.setdefault("!! NOT A WIKIPEDIA URL: " + s, os.path.basename(path))
    return out


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else None
    slugs = slugs_from_json(src) if src else slugs_from_files()
    titles = [s for s in slugs if not s.startswith("!!")]
    print("checking %d distinct sources%s\n" % (len(titles), " from " + src if src else ""))

    bad, redirects, nofr, noimg, disamb = [], [], [], [], []
    for i in range(0, len(titles), BATCH):
        chunk = titles[i:i + BATCH]
        d = get({"action": "query", "titles": "|".join(t.replace("_", " ") for t in chunk),
                 "prop": "langlinks|pageimages|pageprops", "lllang": "fr", "lllimit": "500",
                 "ppprop": "disambiguation", "redirects": "1",
                 "format": "json", "formatversion": "2"})
        if not d:
            continue
        q = d.get("query", {})
        for r in q.get("redirects", []) or []:
            redirects.append((r.get("from"), r.get("to")))
        for p in q.get("pages", []) or []:
            title = p.get("title", "")
            if p.get("missing"):
                bad.append(title)
                continue
            if "disambiguation" in (p.get("pageprops") or {}):
                disamb.append(title)
            if not (p.get("langlinks") or []):
                nofr.append(title)
            if not p.get("pageimage"):
                noimg.append(title)
        sys.stdout.write("\r  %d/%d" % (min(i + BATCH, len(titles)), len(titles)))
        sys.stdout.flush()
        time.sleep(0.1)
    print("\n")

    notwiki = [s for s in slugs if s.startswith("!!")]
    for label, rows in (("DEAD LINK — article does not exist", bad),
                        ("DISAMBIGUATION PAGE — points at a list, not a thing", disamb),
                        ("NOT A WIKIPEDIA URL", notwiki)):
        print("%s: %d" % (label, len(rows)))
        for r in rows:
            print("   %s   [%s]" % (r, slugs.get(r.replace(" ", "_"), slugs.get(r, "?"))))
    print("REDIRECTED — the slug we store is not the article's real title: %d" % len(redirects))
    for a, b in redirects:
        print("   %s  ->  %s" % (a, b))
    print("NO FRENCH ARTICLE — French readers keep the English title: %d" % len(nofr))
    print("NO LEAD IMAGE — discovery card falls back to the category tile: %d" % len(noimg))
    for r in noimg:
        print("   %s" % r)

    fatal = len(bad) + len(disamb) + len(notwiki)
    print("\n%s" % ("FAIL: %d fatal" % fatal if fatal else "OK: every source resolves to a real article"))
    sys.exit(1 if fatal else 0)


if __name__ == "__main__":
    main()
