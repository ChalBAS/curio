# -*- coding: utf-8 -*-
"""Give every unsourced question its Wikipedia source.

Two whole categories — Tech and Nature — were written without citations. The
cost was not cosmetic: `entityOf()` reads the source URL to get the entity, so
a question with no source produced no discovery card, no photograph, no hook
and no "Sources" link. 40 of 262 questions, 15% of the bank, were invisible to
the entire discovery layer.

WHY THE MAP IS BY HAND AND NOT A SEARCH. A first pass searched Wikipedia for
each answer and got a dozen wrong in ways that would have been worse than the
gap: "a prime number is divisible only by 1 and what? — Itself" resolved to
*Reflexive pronoun*; the Morse distress signal resolved to *Dots and boxes*;
"how many bits in a byte? — 8" resolved to the article about the number 8.
Searching the ANSWER fails whenever the answer is a number or a common word,
which in a quiz is most of the time.

The hook editors had already read every one of these questions and named the
right entity. This map is theirs, transcribed — matched question by question
against src/hooks.js.

    py tools/fix_missing_sources.py            # show what would change
    py tools/fix_missing_sources.py --apply
"""
import io, os, re, sys, urllib.parse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")
BANK = os.path.join(SRC, "questions.js")

# A distinctive fragment of the question -> the entity that question is about.
MAP = [
    # --- Tech ---
    ("'HTTP' stand for",                    "HTTP"),
    ("In binary, what number",              "Binary_number"),
    ("first computer programmer",           "Ada_Lovelace"),
    ("value of pi",                         "Pi"),
    ("'CPU' stand for",                     "Central_processing_unit"),
    ("Fibonacci sequence",                  "Fibonacci_sequence"),
    ("first mass-market GUI",               "Macintosh_128K"),
    ("bits make up one byte",               "Byte"),
    ("units of digital storage",            "Units_of_information"),
    ("first computer mouse",                "Computer_mouse"),
    ("programs is a web browser",           "Google_Chrome"),
    ("first email sent over the ARPANE",    "Ray_Tomlinson"),
    ("room-sized electronic computer",      "ENIAC"),
    ("Morse code",                          "SOS"),
    ("QWERTY keyboard layout",              "QWERTY"),
    ("Computer chips are built from",       "Silicon"),
    ("hexadecimal number system",           "Hexadecimal"),
    ("machine can pass as human",           "Turing_test"),
    ("first ARPANET link",                  "ARPANET"),
    # --- Science ---
    ("prime number is divisible",           "Prime_number"),
    # --- Nature ---
    ("largest animal ever known",           "Blue_whale"),
    ("true sustained flight",               "Bat"),
    ("hearts does an octopus",              "Octopus"),
    ("bees collect to make honey",          "Honey_bee"),
    ("tallest living thing on Earth",       "Sequoia_sempervirens"),
    ("group of lions",                      "Lion"),
    ("longest known migration",             "Arctic_tern"),
    ("fastest land animal",                 "Cheetah"),
    ("largest land animal alive",           "African_bush_elephant"),
    ("eats only plants",                    "Herbivore"),
    ("largest species of big cat",          "Tiger"),
    ("legs does an insect",                 "Insect"),
    ("Mohs scale",                          "Diamond"),
    ("essentially never spoils",            "Honey"),
    ("baby kangaroo",                       "Kangaroo"),
    ("largest living bird",                 "Common_ostrich"),
    ("violently rotating column of air",    "Tornado"),
    ("oldest known living individual",      "Bristlecone_pine"),
    ("Challenger Deep",                     "Challenger_Deep"),
    ("largest living reptile",              "Saltwater_crocodile"),
]


def main():
    apply = "--apply" in sys.argv
    lines = open(BANK, encoding="utf-8").read().splitlines()
    out, done, missed = [], [], []

    for line in lines:
        needs = ("cat:" in line and "src:" not in line and re.search(r'\bq:\s*"', line))
        if needs:
            slug = None
            for frag, s in MAP:
                if frag.lower() in line.lower():
                    slug = s
                    break
            if slug:
                url = "https://en.wikipedia.org/wiki/" + urllib.parse.quote(slug, safe="_(),'-")
                new = re.sub(r'\}\s*,\s*$', ', src: "%s" },' % url, line, count=1)
                if new != line:
                    line = new
                    q = re.search(r'q:\s*"([^"]{0,54})', line)
                    done.append((q.group(1) if q else "?", slug))
                else:
                    missed.append(line[:70] + "   (could not insert)")
            else:
                q = re.search(r'q:\s*"([^"]{0,64})', line)
                missed.append((q.group(1) if q else line[:64]) + "   (no map entry)")
        out.append(line)

    for q, s in done:
        print("  %-56s -> %s" % (q, s))
    print("\nsourced %d" % len(done))
    if missed:
        print("UNRESOLVED %d — nothing written:" % len(missed))
        for m in missed:
            print("   " + m)
        return 1 if apply else 0

    if apply:
        open(BANK, "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
        print("written: %s" % BANK)
    return 0


if __name__ == "__main__":
    sys.exit(main())
