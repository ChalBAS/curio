# One-off: fetch lead images + credits for newly added entities, using the
# repo's own fetch_images.py machinery. Appends entries to entities.img.js.
# Edit SLUGS for the new batch, run: py tools/fetch_entity_images.py
import io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
import fetch_images as fi

ROOT = "C:/Users/ukbch/curio"
SLUGS = ["Hatshepsut", "Complaint_tablet_to_Ea-nassir", "Polychromy",
         "Polynesian_navigation", "Cocoa_bean", "Nazca_lines",
         "Tyrian_purple", "Armour", "Thermopolium"]

imgs, files = {}, {}
for i in range(0, len(SLUGS), 50):
    got = fi.lead_images(SLUGS[i:i+50])
    for s, (u, fn) in got.items():
        imgs[s] = u
        files[s] = fn.replace(" ", "_")

missing = [s for s in SLUGS if s not in imgs]
if missing:
    print("no lead image:", ", ".join(missing), "— trying body images")
    body = fi.page_images(missing)
    turls = fi.thumbs_for(sorted(set(body.values())))
    for s, fn in body.items():
        u = turls.get(fn.replace(" ", "_"))
        if u:
            imgs[s] = u
            files[s] = fn.replace(" ", "_")
            print("  recovered", s)

uniq = sorted(set(files.values()))
cred = fi.credits(uniq)

lines = []
for s in SLUGS:
    if s not in imgs:
        print("STILL MISSING:", s)
        continue
    c = cred.get(files[s], {})
    lines.append("  %s: {u:%s,by:%s,lic:%s,p:%s}," % (
        json.dumps(s, ensure_ascii=False), json.dumps(imgs[s], ensure_ascii=False),
        json.dumps(c.get("by", ""), ensure_ascii=False), json.dumps(c.get("lic", ""), ensure_ascii=False),
        json.dumps(c.get("page", ""), ensure_ascii=False)))

P = os.path.join(ROOT, "src", "entities.img.js")
t = open(P, encoding="utf-8").read()
assert t.rstrip().endswith("};")
t = t.rstrip()[:-2].rstrip() + "\n" + "\n".join(lines) + "\n};\n"
open(P, "w", encoding="utf-8", newline="\n").write(t)
print("appended", len(lines), "entries to entities.img.js")
