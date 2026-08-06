# -*- coding: utf-8 -*-
"""Find every user-facing string the app renders that has no translation.

Static audit: extracts every t("...") / tf("...") literal from the app source,
then checks each against every language dictionary in src/i18n.js.

The tab bar shipped with three of four labels untranslated for months and
nobody noticed, because nothing checked. This is that check.

    py tools/check_i18n.py            # summary + the missing list
    py tools/check_i18n.py --strict   # exit 1 if anything is missing (for CI)
"""
import io, os, re, sys, json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(APP, "src")

# Sources that call t()/tf(). Content banks carry their own translated mirrors.
CALLERS = ["app.js"]


def literals():
    """Every string literal passed to t() or tf(), with the line it came from."""
    found = {}
    for name in CALLERS:
        path = os.path.join(SRC, name)
        if not os.path.exists(path):
            continue
        for n, line in enumerate(open(path, encoding="utf-8"), 1):
            # t("...") and tf("...") — double or single quoted, escapes honoured
            for m in re.finditer(r'\bt[f]?\(\s*("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')', line):
                raw = m.group(1)
                try:
                    s = json.loads(raw) if raw[0] == '"' else raw[1:-1].replace("\\'", "'")
                except Exception:
                    continue
                if s and s not in found:
                    found[s] = (name, n)
    return found


def dictionaries():
    """{lang: set(keys)} parsed from the I18N object in i18n.js."""
    text = open(os.path.join(SRC, "i18n.js"), encoding="utf-8").read()
    langs, current = {}, None
    for line in text.splitlines():
        m = re.match(r'\s*([a-z]{2}(?:-[A-Z]{2})?)\s*:\s*\{\s*$', line)
        if m:
            current = m.group(1)
            langs[current] = set()
            continue
        if current:
            # "key": "value"  — key may be the whole line, value on the next
            k = re.match(r'\s*("(?:[^"\\]|\\.)*")\s*:', line)
            if k:
                try:
                    langs[current].add(json.loads(k.group(1)))
                except Exception:
                    pass
    return langs


def main():
    strings = literals()
    langs = dictionaries()
    if not langs:
        print("!! no language dictionaries parsed from src/i18n.js")
        return 1

    print("Strings rendered through t(): %d" % len(strings))
    print("Languages: %s\n" % ", ".join(sorted(langs)))

    worst = 0
    for lang in sorted(langs):
        missing = [(s, strings[s]) for s in strings if s not in langs[lang]]
        covered = len(strings) - len(missing)
        pct = 100.0 * covered / len(strings) if strings else 100.0
        print("== %s: %d/%d translated (%.1f%%) — %d missing" %
              (lang.upper(), covered, len(strings), pct, len(missing)))
        worst = max(worst, len(missing))
        # Short UI strings first: those are labels, buttons and tabs — the ones
        # a user sees before anything else, and the ones that look worst in the
        # wrong language.
        for s, (f, n) in sorted(missing, key=lambda x: len(x[0]))[:60]:
            flag = "  <-- UI LABEL" if len(s) <= 24 else ""
            print("   %s:%-5d %s%s" % (f, n, json.dumps(s, ensure_ascii=False), flag))
        if len(missing) > 60:
            print("   ... and %d more" % (len(missing) - 60))
        print("")

    if "--strict" in sys.argv and worst:
        print("FAIL: %d untranslated strings" % worst)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
