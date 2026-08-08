# -*- coding: utf-8 -*-
"""Assign sub-categories inside Science and Geography.

CEO, 2026-08-08:
  "In the Science part we need to split by the science in subcategories:
   Biology, mathematics, Earth and Space Sciences, physics, chemistry,
   Life Sciences (Biological Sciences), Social Sciences."
  "We need a special category for countries and the flags and capitals,
   people who like to travel will love these categories."

Two notes on his lists, both merges rather than omissions:
  · Biology IS the life sciences, so they are one bucket, not two competing
    for the same questions.
  · Flags and capitals are the same audience — someone testing themselves on
    countries — so they sit together under Countries & Flags rather than
    splitting a small pool in half.

MATCHING RULE, learned the hard way: match the QUESTION and its options only,
never the depth fact. A first pass matched whole lines and put "the chemical
name for common table salt" in Earth & Space, because the fact behind it
mentions rock and oceans. The fact is context; the question is the subject.

Order matters — first match wins, so the order of RULES is the specification.
Anything unmatched is printed and nothing is written, because a wrong subject
label is worse than no label.

    py tools/split_science.py            # propose
    py tools/split_science.py --apply    # write sub: into questions.js
"""
import io, os, re, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")
BANK = os.path.join(SRC, "questions.js")

SCIENCE = [
    ("Life Sciences", r"(cell|dna|chromosom|gene\b|bone|skeleton|femur|heart|blood|"
                      r"skin|tooth|teeth|enamel|organ|muscle|brain|photosynth|"
                      r"chlorophyll|plant|root|leaf|animal|bacteri|virus|penicillin|"
                      r"scurvy|vitamin|nocturnal|mitochondri|human body|body|"
                      r"disease|species|insect|mammal|nutrient)"),
    ("Chemistry",     r"(chemical|element|atom|molecul|compound|acid|alkal|\bph\b|"
                      r"hydrogen|oxygen|carbon|nitrogen|sodium|chloride|salt|"
                      r"bicarbonate|baking soda|allotrope|periodic table|symbol|"
                      r"dry ice|rust|reacts?|reaction|gas\b|diamond|graphite)"),
    ("Physics",       r"(electron|proton|neutron|nucleus|energy|force|newton|ohm|"
                      r"sound|speed of|light travels|wave|magnet|electric|quantum|"
                      r"relativ|e ?= ?mc|temperature|fahrenheit|celsius|absolute zero|"
                      r"boiling point|melting|inclined plane|friction|watt|volt|"
                      r"gravity|weight|pressure)"),
    ("Earth & Space", r"(planet|moon|sun\b|solar system|star|galaxy|milky way|orbit|"
                      r"space|comet|asteroid|mars|venus|jupiter|saturn|mercury|"
                      r"olympus mons|light-year|light year|universe|astronom|"
                      r"telescope|eclipse|volcan|earthquake|tecton|mineral|"
                      r"atmosphere|erosion|fossil|day and night|earth)"),
    ("Mathematics",   r"(prime|numeral|zero\b|algebra|geometr|equation|arithmetic|"
                      r"sexagesimal|decimal|fraction|infinit|calculus|theorem|"
                      r"\bpi\b|mathematic|divisible|multipl|angle|triangle)"),
    ("Social Sciences", r"(society|social|economic|psycholog|anthropolog|linguist|"
                        r"population|demograph|behaviou?r)"),
]

GEOGRAPHY = [
    ("Countries & Flags", r"(flag|capital of|capital city|which country|what country|"
                          r"landlocked|border|nation|passport|currency|"
                          r"is the capital|\bstate\b|province)"),
    ("Landscapes",        r"(mountain|peak|everest|volcano|desert|sahara|river|nile|"
                          r"amazon|danube|lake|baikal|waterfall|falls|reef|glacier|"
                          r"island|archipelago|canyon|valley|forest|strait|"
                          r"ocean|sea\b|continent|antarctic|pole\b)"),
    ("Cities & Places",   r"(city|cities|town|capital|canal|bridge|tower|"
                          r"time zone|timezone|metro|port)"),
]


def subject_text(line):
    """The question and its options — never the depth fact."""
    q = re.search(r'q:\s*"((?:[^"\\]|\\.)*)"', line)
    o = re.search(r'options:\s*\[([^\]]*)\]', line)
    return ((q.group(1) if q else "") + " " + (o.group(1) if o else "")).lower()


def classify(line, rules):
    hay = subject_text(line)
    for label, pat in rules:
        if re.search(pat, hay):
            return label
    return None


def main():
    apply = "--apply" in sys.argv
    text = open(BANK, encoding="utf-8").read()
    out, counts, unmatched, done = [], {}, [], 0

    for line in text.splitlines():
        for cat, rules in (("Science", SCIENCE), ("Geography", GEOGRAPHY)):
            tag = 'cat: "%s"' % cat
            if tag in line and " sub:" not in line:
                sub = classify(line, rules)
                q = re.search(r'q:\s*"([^"]{0,62})', line)
                if sub:
                    key = cat + " → " + sub
                    counts[key] = counts.get(key, 0) + 1
                    print("  %-28s %s" % (key, q.group(1) if q else "?"))
                    line = line.replace(tag, tag + ', sub: "%s"' % sub, 1)
                    done += 1
                else:
                    unmatched.append("%s: %s" % (cat, q.group(1) if q else line[:62]))
                break
        out.append(line)

    print("\nassigned %d" % done)
    for k in sorted(counts):
        print("   %-28s %d" % (k, counts[k]))
    if unmatched:
        print("\nUNMATCHED — %d. Nothing written; tighten the rules." % len(unmatched))
        for u in unmatched:
            print("   " + u)
        return 1 if apply else 0

    if apply:
        open(BANK, "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
        print("\nwritten: %s" % BANK)
    return 0


if __name__ == "__main__":
    sys.exit(main())
