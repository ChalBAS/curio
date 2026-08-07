# -*- coding: utf-8 -*-
"""List the Wikipedia slugs used as sources, so we know which entities to curate.

The source URL is already an entity tag we never used: every
en.wikipedia.org/wiki/<Slug> names the thing the question is about.

    py tools/entities.py
"""
import io, os, re, sys, collections, urllib.parse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")

slugs = collections.Counter()
by_cat = collections.defaultdict(collections.Counter)
total = 0
uncited = 0

text = open(os.path.join(SRC, "questions.js"), encoding="utf-8").read()
# each object sits on one line in this bank
for line in text.splitlines():
    if '"q"' not in line and " q:" not in line and "q:" not in line:
        continue
    if "cat:" not in line and '"cat"' not in line:
        continue
    total += 1
    mcat = re.search(r'cat"?\s*:\s*"([^"]+)"', line)
    cat = mcat.group(1) if mcat else "?"
    m = re.search(r'src"?\s*:\s*"([^"]+)"', line)
    if not m:
        uncited += 1
        continue
    u = m.group(1)
    mm = re.search(r'/wiki/([^"#?]+)', u)
    if not mm:
        slugs["[non-wikipedia] " + u[:60]] += 1
        continue
    slug = urllib.parse.unquote(mm.group(1))
    slugs[slug] += 1
    by_cat[cat][slug] += 1

print("questions: %d   uncited: %d   distinct entities: %d" % (total, uncited, len(slugs)))
print("\n--- entities used more than once ---")
for s, n in slugs.most_common():
    if n > 1:
        print("  %2d  %s" % (n, s))

print("\n--- by category, first 12 each ---")
for cat in sorted(by_cat):
    names = [s for s, _ in by_cat[cat].most_common(12)]
    print("\n%s (%d):" % (cat, sum(by_cat[cat].values())))
    print("   " + " · ".join(names))
