// Writes src/citypacks.fr.js from the translation workflow's output.
//
// Same contract as the question banks (2026-08-09 decision): the French file
// carries ONLY words — blurb, question text, options, facts, phrase meanings,
// pronunciation guides, tips. Everything structural (src, answer, emoji, lang,
// region, the phrases' original-language text) stays in citypacks.js alone, so
// it can never drift the way the question metadata did.
//
// Pronunciation is translated on purpose: "pron" is a respelling for the
// reader's own eyes, and French eyes read "oo" and "ay" differently from
// English ones. An English respelling followed aloud by a French reader
// produces the wrong sounds — so the FR file carries its own.
//
//   node tools/apply_citypacks_fr.js <workflow-output.json> [--write]

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var EN = path.join(ROOT, "src", "citypacks.js");
var OUT = path.join(ROOT, "src", "citypacks.fr.js");

var file = process.argv[2];
var write = process.argv.indexOf("--write") !== -1;
if (!file) { console.error("usage: node tools/apply_citypacks_fr.js <output.json> [--write]"); process.exit(2); }

var raw = JSON.parse(fs.readFileSync(file, "utf8"));
var packs = raw.packs || (raw.result && raw.result.packs) || [];
if (!packs.length) { console.error("no packs in " + file); process.exit(2); }

global.window = {};
require(EN);
var EN_PACKS = global.window.CURIO_CITYPACKS;

// Refuse anything structurally off — half-translated is worse than English.
var errs = [];
packs.forEach(function (p) {
  var e = EN_PACKS[p.index];
  if (!e) { errs.push("index " + p.index + " out of range"); return; }
  if (!p.blurb || !p.city) errs.push(e.city + ": missing blurb or city");
  if (!p.questions || p.questions.length !== e.questions.length)
    errs.push(e.city + ": " + (p.questions || []).length + " questions vs " + e.questions.length);
  else p.questions.forEach(function (q, i) {
    if (!q.q || !q.fact || !q.options || q.options.length !== 4)
      errs.push(e.city + " q" + i + ": incomplete");
  });
  if (!p.phrases || p.phrases.length !== e.phrases.length)
    errs.push(e.city + ": phrase count mismatch");
  if (!p.tips || p.tips.length !== e.tips.length)
    errs.push(e.city + ": tips count mismatch");
});
if (packs.length !== EN_PACKS.length)
  errs.push("only " + packs.length + " of " + EN_PACKS.length + " packs supplied");
if (errs.length) {
  console.error("REFUSED — " + errs.length + " problems:");
  errs.forEach(function (e) { console.error("  " + e); });
  process.exit(1);
}

var by = {};
packs.forEach(function (p) { by[p.index] = p; });
var lines = EN_PACKS.map(function (e, i) {
  var p = by[i];
  return "  " + JSON.stringify({
    city: p.city, country: p.country, blurb: p.blurb,
    questions: p.questions.map(function (q) { return { q: q.q, options: q.options, fact: q.fact }; }),
    phrases: p.phrases.map(function (ph) { return { meaning: ph.meaning, pron: ph.pron }; }),
    tips: p.tips
  }) + (i === EN_PACKS.length - 1 ? "" : ",");
});

var out = [
  "// © 2026 Qpio. Tous droits réservés. Non couvert par la licence MIT (/LICENSE).",
  "// Conditions d'utilisation : /CONTENT-LICENCE.md · Usage machine réservé : /ai.txt",
  "//",
  "// City packs — les mots seulement. La structure (src, answer, emoji, lang,",
  "// region, texte des phrases locales) vit dans citypacks.js et nulle part",
  "// ailleurs; ce fichier est aligné par index et app.js superpose les deux.",
  "// Généré par tools/apply_citypacks_fr.js — ne pas éditer les deux fichiers",
  "// séparément.",
  "",
  "window.CURIO_CITYPACKS_FR = [",
  lines.join("\n"),
  "];",
  ""
].join("\n");

console.log("packs: " + packs.length + " / " + EN_PACKS.length + " — all validated");
if (write) {
  fs.writeFileSync(OUT, out, "utf8");
  console.log("WROTE " + path.relative(ROOT, OUT));
} else {
  console.log("(dry run — pass --write to apply; would write " + out.length + " bytes)");
}
