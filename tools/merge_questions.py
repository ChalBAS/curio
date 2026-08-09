# -*- coding: utf-8 -*-
"""Append a batch of new questions to the English and French banks, together.

The two banks are INDEX-ALIGNED — app.js overlays every non-textual field from
the English bank onto the French one by position, which is what finally stopped
the three metadata drifts found on 2026-08-09 (40 French questions with no
source, `sub` missing from all 262, one question in two different categories).
That alignment is now load-bearing, so nothing may ever be appended to one file
without appending to the other in the same order. Hence one script, both files.

Input is a JSON array (or a list of {questions:[...]} groups) whose items carry
both languages:
    cat sub region diff kids q options answer fact src img
    q_fr options_fr fact_fr

    py tools/merge_questions.py tools/generated_flags.json           # dry run
    py tools/merge_questions.py tools/generated_flags.json --write
"""
import io, json, os, re, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
EN = os.path.join(SRC, "questions.js")
FR = os.path.join(SRC, "questions.fr.js")
CATS = {"History", "Science", "Geography", "Arts", "Tech", "Nature"}
REGIONS = {"Africa", "Americas", "Asia", "Europe", "MiddleEast", "Global"}


def load(path):
    raw = json.load(open(path, encoding="utf-8"))
    if isinstance(raw, dict):
        raw = raw.get("questions") or raw.get("result", {}).get("questions") or []
    out = []
    for x in raw:
        if isinstance(x, dict) and "questions" in x:
            out.extend(x["questions"])
        else:
            out.append(x)
    return out


def validate(items, existing_q):
    """Refuse the whole batch on any structural fault. Half a batch is worse."""
    errs = []
    seen = set()
    for i, q in enumerate(items):
        w = lambda m: errs.append("[%d] %s — %s" % (i, m, str(q.get("q", ""))[:60]))
        if q.get("cat") not in CATS:
            w("bad cat %r" % q.get("cat"))
        if q.get("region") and q["region"] not in REGIONS:
            w("bad region %r" % q["region"])
        if q.get("diff") not in (1, 2, 3):
            w("bad diff %r" % q.get("diff"))
        if not isinstance(q.get("kids"), bool):
            w("kids must be true/false")
        for f in ("q", "fact", "src", "q_fr", "fact_fr"):
            if not str(q.get(f) or "").strip():
                w("empty %s" % f)
        for f in ("options", "options_fr"):
            v = q.get(f)
            if not isinstance(v, list) or len(v) != 4 or any(not str(o).strip() for o in v):
                w("%s must be 4 non-empty strings" % f)
            elif len(set(v)) != 4:
                w("%s has a duplicate option" % f)
        if q.get("answer") not in (0, 1, 2, 3):
            w("bad answer index %r" % q.get("answer"))
        if not re.match(r"^https://en\.wikipedia\.org/wiki/\S+$", str(q.get("src") or "")):
            w("src is not an English Wikipedia article URL")
        img = q.get("img")
        if img is not None:
            if not isinstance(img, dict) or not img.get("u"):
                w("img present but has no url")
            elif not img.get("alt"):
                # A picture that IS the question is unanswerable without this.
                w("img has no alt text")
        # Identity matches app.js qid(): a picture question is identified by its
        # picture, because 68 flag questions share one sentence of text.
        key = str(q.get("q", "")).strip().lower()
        if img and isinstance(img, dict) and img.get("u"):
            key += "|" + img["u"]
        if key in seen:
            w("duplicate question inside this batch")
        seen.add(key)
        if key in existing_q:
            w("this question is already in the bank")
    return errs


def js(v):
    return json.dumps(v, ensure_ascii=False)


def en_line(q):
    parts = ['cat: %s' % js(q["cat"])]
    if q.get("sub"):
        parts.append('sub: %s' % js(q["sub"]))
    if q.get("region"):
        parts.append('region: %s' % js(q["region"]))
    parts += ['diff: %d' % q["diff"], 'kids: %s' % ("true" if q["kids"] else "false"),
              'q: %s' % js(q["q"]), 'options: %s' % js(q["options"]),
              'answer: %d' % q["answer"], 'fact: %s' % js(q["fact"]),
              'src: %s' % js(q["src"])]
    if q.get("img"):
        parts.append('img: %s' % js(q["img"]))
    return "  { " + ", ".join(parts) + " },"


def fr_line(q):
    # `answer` is duplicated here on purpose and is not read for gameplay — the
    # English bank supplies it. It is the CHECKSUM app.js uses to decide the two
    # banks are still index-aligned before it overlays metadata. Omit it and the
    # guard sees undefined != 2, concludes the banks have drifted, and silently
    # serves French without any of the merged fields. Caught exactly that way.
    return "  " + js({"q": q["q_fr"], "options": q["options_fr"],
                      "answer": q["answer"], "fact": q["fact_fr"]}) + ","


def append(path, lines, closer):
    s = open(path, encoding="utf-8").read()
    i = s.rstrip().rfind(closer)
    if i == -1:
        raise SystemExit("could not find the end of the array in %s" % path)
    head, tail = s[:i], s[i:]
    if not head.rstrip().endswith(","):
        head = head.rstrip() + ",\n"
    return head + "\n" + "\n".join(lines) + "\n" + tail.lstrip()


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: py tools/merge_questions.py <batch.json> [--write]")
    batch, write = sys.argv[1], "--write" in sys.argv
    items = load(batch)
    print("batch: %d questions from %s" % (len(items), os.path.basename(batch)))

    en_text = open(EN, encoding="utf-8").read()
    existing = set()
    for m in re.finditer(r'\bq:\s*"((?:[^"\\]|\\.)*)".*?(?:img:\s*\{"u":\s*"([^"]*)")?\s*\},?\s*$',
                         en_text, re.M):
        existing.add((m.group(1).strip().lower() + ("|" + m.group(2) if m.group(2) else "")))
    errs = validate(items, existing)
    if errs:
        print("\nREFUSED — %d problems:" % len(errs))
        for e in errs[:40]:
            print("  " + e)
        sys.exit(1)
    print("validation: clean")

    new_en = append(EN, [en_line(q) for q in items], "];")
    new_fr = append(FR, [fr_line(q) for q in items], "];")

    if not write:
        print("\n(dry run — pass --write to apply)")
        print("EN would grow %d -> %d bytes" % (os.path.getsize(EN), len(new_en.encode("utf-8"))))
        return
    open(EN, "w", encoding="utf-8", newline="\n").write(new_en)
    open(FR, "w", encoding="utf-8", newline="\n").write(new_fr)
    print("\nWROTE both banks (+%d each)" % len(items))


if __name__ == "__main__":
    main()
