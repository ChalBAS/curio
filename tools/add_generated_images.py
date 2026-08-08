# -*- coding: utf-8 -*-
"""Pull the generated illustrations into the repo and register them.

Sixteen entities have no photograph on Wikimedia Commons because they are not
photographable — Pi, a byte, hexadecimal, the four fundamental forces. The CEO,
2026-08-09: "you can use AI to generate an image that represents the gravity,
that's what we said we would do if free images were not available, otherwise it
looks like a bug is in the app."

Two rules applied here:

  · WE HOST THEM. The generator's CDN is not our infrastructure and its URLs
    are not a promise. Files land in brand/generated/ and ship with the app.
  · THEY ARE LABELLED AS GENERATED. On a product whose whole proposition is
    verified truth, an illustration must never be mistaken for a photograph of
    the thing. Every one carries "Illustration generated for Qpio" where a
    Commons photograph carries its photographer.

    py tools/add_generated_images.py
"""
import io, json, os, re, sys, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
OUTDIR = os.path.join(ROOT, "brand", "generated")
MAP = os.path.join(SRC, "entities.img.js")
UA = "QpioAssetFetch/1.0 (https://qpio.app)"

GENERATED = {
    "Binary_number":              "hf_20260808_191445_d312c8e5-aeab-4b00-ac27-1e3399ec092e.png",
    "Byte":                       "hf_20260808_191445_ad614565-9f4c-4a72-afe0-72accf6ae52d.png",
    "Fundamental_interaction":    "hf_20260808_191445_5d591a7b-3c9b-4f3c-a5a3-134d71475b85.png",
    "Hexadecimal":                "hf_20260808_191445_f57ace86-4232-4def-a1b5-1414b423018d.png",
    "Pi":                         "hf_20260808_191445_21c323a3-3fdc-4f05-acc8-c4c051dee9f0.png",
    "Units_of_information":       "hf_20260808_191445_3068350c-9f74-4245-81bc-5e93800a6ec1.png",
    "Nitrogen_fixation":          "hf_20260808_191445_4f699f8f-2a7c-44e3-9d48-3723e5907459.png",
    "Sexagesimal":                "hf_20260808_191445_c68de6ac-8d10-489a-a16e-430ae6c1cebb.png",
    "Phoenician_alphabet":        "hf_20260808_191445_9c54269f-210b-45d0-a4e7-dd6602ad8911.png",
    "Persepolis":                 "hf_20260808_191445_c6eaf313-c574-4f83-863b-95389ea2bcf4.png",
    "Taghaza":                    "hf_20260808_191445_f362501e-2a38-4b8f-9561-a0b32683707b.png",
    "Yam_(route)":                "hf_20260808_191445_21213744-b740-45ff-8527-4d72ebe93749.png",
    "Brahmagupta":                "hf_20260808_191507_e42bd8c2-6a89-4491-944f-bd87caf9a35b.png",
    "Can't_Buy_Me_Love":          "hf_20260808_191507_4bb794c7-b78c-4a15-b94f-862a7073924f.png",
    "One_Hundred_Years_of_Solitude": "hf_20260808_191507_adfc1f7c-7a37-441a-b326-f11bf5734c6c.png",
    "Things_Fall_Apart":          "hf_20260808_191507_a2e6f53f-9b39-4e68-a747-4885a18b0541.png",
}
CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3HG6xszlwfvRG4R3Z6JkXBO46uw/"


def slugfile(slug):
    return re.sub(r"[^A-Za-z0-9_-]", "", slug.replace("'", "").replace("(", "").replace(")", "")) + ".png"


def main():
    if not os.path.isdir(OUTDIR):
        os.makedirs(OUTDIR)
    saved = {}
    for slug, remote in GENERATED.items():
        local = slugfile(slug)
        path = os.path.join(OUTDIR, local)
        if not os.path.exists(path):
            req = urllib.request.Request(CDN + remote, headers={"User-Agent": UA})
            try:
                with urllib.request.urlopen(req, timeout=90) as r, open(path, "wb") as f:
                    f.write(r.read())
            except Exception as e:
                print("  FAILED %s: %s" % (slug, e))
                continue
        saved[slug] = "brand/generated/" + local
        print("  %-32s %s  (%.0f KB)" % (slug, local, os.path.getsize(path) / 1024))

    text = open(MAP, encoding="utf-8").read()
    added = 0
    lines = text.rstrip().rstrip("};").rstrip().splitlines()
    for slug in sorted(saved):
        if '"%s":' % slug in text:
            continue
        lines.append('  %s: {u:%s,by:%s,lic:%s,p:%s},' % (
            json.dumps(slug, ensure_ascii=False),
            json.dumps(saved[slug]),
            json.dumps("Illustration generated for Qpio"),
            json.dumps("Generated illustration — not a photograph"),
            json.dumps("")))
        added += 1
    lines.append("};")
    open(MAP, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    print("\ndownloaded %d · added %d entries to entities.img.js" % (len(saved), added))
    return 0


if __name__ == "__main__":
    sys.exit(main())
