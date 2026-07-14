"""Curio content-factory merge tool.

Merges a completed content-factory workflow output (task .output JSON) into
questions.js and citypacks.js, applying every fact-checker verdict:
  ok   -> ship as-is
  fix  -> ship the checker's corrected object
  drop -> exclude
HELD RULE: any batch whose verdicts are missing (checker failed) is NOT
merged — unverified facts never ship. They are reported for a later pass.

Usage:  py tools/merge_batch.py <path-to-task-output.json>
"""
import json, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QFILE = os.path.join(ROOT, "questions.js")
CFILE = os.path.join(ROOT, "citypacks.js")


def js(s):
    return json.dumps(s, ensure_ascii=False)


def fmt_hist(q, region):
    parts = ['cat: "History"', "region: " + js(region)]
    if q.get("country"):
        parts.append("country: " + js(q["country"]))
    parts.append("diff: %d" % q["diff"])
    if q.get("kids"):
        parts.append("kids: true")
    parts.append("q: " + js(q["q"]))
    parts.append("options: [" + ", ".join(js(o) for o in q["options"]) + "]")
    parts.append("answer: %d" % q["answer"])
    parts.append("fact: " + js(q["fact"]))
    if q.get("src"):
        parts.append("src: " + js(q["src"]))
    if q.get("deeper"):
        parts.append("deeper: [" + ", ".join(js(x) for x in q["deeper"]) + "]")
    return "  { " + ", ".join(parts) + " },"


def main(out_path):
    d = json.load(open(out_path, encoding="utf-8"))
    res = d["result"]["results"]

    qtext = open(QFILE, encoding="utf-8").read()
    existing_qs = set()
    for line in qtext.split("\n"):
        i = line.find('q: "')
        if i != -1:
            j = line.find('"', i + 4)
            existing_qs.add(line[i + 4:j])

    hist_lines, held, stats = [], [], {"hist_added": 0, "hist_dropped": 0, "hist_fixed": 0, "dedup_skipped": 0}

    packs_text = open(CFILE, encoding="utf-8").read()
    start = packs_text.index("[")
    end = packs_text.rindex("]")
    packs = json.loads(packs_text[start:end + 1])
    existing_cities = {p["city"] for p in packs}

    for r in res:
        it = r["item"]
        a = r.get("authored")
        v = r.get("verdicts")
        label = it.get("key") or it.get("city") or it.get("region", "?")
        if not a:
            held.append((label, "author failed"))
            continue
        if not v:
            held.append((label, "checker failed — HELD unverified"))
            continue

        if it["type"] == "history":
            vres = {x["index"]: x for x in v["results"]}
            batch = []
            for i, q in enumerate(a["questions"]):
                x = vres.get(i)
                if x and x["verdict"] == "drop":
                    stats["hist_dropped"] += 1
                    continue
                if x and x["verdict"] == "fix" and x.get("fixed"):
                    q = {**q, **x["fixed"]}
                    stats["hist_fixed"] += 1
                if q["q"] in existing_qs:
                    stats["dedup_skipped"] += 1
                    continue
                existing_qs.add(q["q"])
                batch.append(fmt_hist(q, it["region"]))
                stats["hist_added"] += 1
            if batch:
                hist_lines.append("  // -- %s --" % label)
                hist_lines.extend(batch)
        else:
            if it["city"] in existing_cities:
                held.append((label, "city already exists — skipped"))
                continue
            qres = {x["index"]: x for x in v["question_results"]}
            qs = []
            for i, q in enumerate(a["questions"]):
                x = qres.get(i)
                if x and x["verdict"] == "drop":
                    continue
                if x and x["verdict"] == "fix" and x.get("fixed"):
                    q = {**q, **x["fixed"]}
                qs.append({k: q[k] for k in ["q", "options", "answer", "fact", "src", "theme", "diff"] if k in q})
            phrases = [dict(p) for p in a["phrases"]]
            for pf in v.get("phrase_fixes", []):
                if 0 <= pf["index"] < len(phrases):
                    phrases[pf["index"]] = {"phrase": pf["phrase"], "meaning": pf["meaning"], "pron": pf["pron"]}
            tips = list(a["tips"])
            dropt = set()
            for tf in v.get("tip_fixes", []):
                if tf["verdict"] == "drop":
                    dropt.add(tf["index"])
                elif tf.get("fixed_text") and 0 <= tf["index"] < len(tips):
                    tips[tf["index"]] = tf["fixed_text"]
            tips = [t for i, t in enumerate(tips) if i not in dropt]
            packs.append({
                "city": it["city"], "country": it["country"], "region": it["region"],
                "emoji": it.get("emoji", "🌍"), "lang": it.get("lang", ""), "blurb": a["blurb"],
                "questions": qs, "phrases": phrases, "tips": tips,
            })
            existing_cities.add(it["city"])

    if hist_lines:
        lines = qtext.split("\n")
        sci_idx = next(i for i, l in enumerate(lines) if "SCIENCE" in l and "----" in l)
        lines[sci_idx:sci_idx] = [""] + hist_lines + [""]
        open(QFILE, "w", encoding="utf-8").write("\n".join(lines))

    header = ('// Curio city packs — "Before you travel". Fact-checked pre-travel packs.\n'
              '// Each: city, country, region, emoji, lang, blurb, questions[], phrases[], tips[].\n'
              '// The city UI hides when this is empty.\n'
              'window.CURIO_CITYPACKS = ')
    open(CFILE, "w", encoding="utf-8").write(header + json.dumps(packs, ensure_ascii=False, indent=2) + ";\n")

    print("history added:", stats["hist_added"], "| fixed:", stats["hist_fixed"],
          "| dropped:", stats["hist_dropped"], "| dedup-skipped:", stats["dedup_skipped"])
    print("city packs total:", len(packs), sorted(existing_cities))
    if held:
        print("HELD / skipped (not merged):")
        for lbl, why in held:
            print("  -", lbl, "->", why)


if __name__ == "__main__":
    main(sys.argv[1])
