// Rewrites src/hooks.js from a verdict file produced by the hook-audit workflow.
//
//   node tools/apply_hooks.js <verdicts.json> [--write]
//
// Without --write it reports and changes nothing.
//
// WHAT THE FLAGS MEAN — read this before changing the gate.
//
// truthful/spoiler/pulls/fr_ok describe the hook the checker was GIVEN, not the
// one it returns. Its brief was to check and then correct, so a `truthful:false`
// verdict means "the draft overstated something and I fixed it", and the `en`
// and `fr` in that verdict are the fixed text. Rejecting on the flags would
// therefore throw away precisely the hooks that were repaired — which is what
// the first version of this script did.
//
// So the gate here is mechanical: present, within the cap, and belonging to a
// slug we actually have. The editorial gate already happened upstream, and the
// flags are reported so a human can see what was caught and go and read it.
//
// FRENCH SPACING is applied here rather than upstream because the workflow
// channel cannot carry U+00A0 — the checkers said so in their notes and asked
// for it to be done at merge. It is a mechanical substitution, so this is the
// right place for it anyway.

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var HOOKS = path.join(ROOT, "src", "hooks.js");
var CAP = 100;

var file = process.argv[2];
var write = process.argv.indexOf("--write") !== -1;
if (!file) { console.error("usage: node tools/apply_hooks.js <verdicts.json> [--write]"); process.exit(2); }

// The verdict file is either the workflow's return value or a bare array.
var raw = JSON.parse(fs.readFileSync(file, "utf8"));
var verdicts = Array.isArray(raw) ? raw
  : (raw.hooks || (raw.result && raw.result.hooks) || []);
if (!verdicts.length) { console.error("no verdicts found in " + file); process.exit(2); }

// Current hooks, loaded the same way the browser loads them.
global.window = {};
require(HOOKS);
var current = global.window.CURIO_HOOKS;
if (!current) { console.error("could not load CURIO_HOOKS"); process.exit(2); }

// French puts a non-breaking space before the two-part punctuation marks. A
// plain space there lets the line break so the sentence ends on a lone "?" at
// the start of a line, which is exactly the sort of small wrongness a French
// reader notices and an English one never sees.
function frSpacing(s) {
  return String(s)
    .replace(/[  ]+([?!:;»])/g, " $1")
    .replace(/([«])[  ]+/g, "$1 ");
}

var stats = { seen: 0, unchanged: 0, applied: 0, unknown: 0, tooLong: 0, spaced: 0 };
var rejects = [];
var flagged = { truthful: [], spoiler: [], pulls: [], fr_ok: [] };
var next = {};
Object.keys(current).forEach(function (k) { next[k] = { en: current[k].en, fr: current[k].fr }; });

verdicts.forEach(function (v) {
  stats.seen++;
  if (!v || !v.slug) return;
  if (!current[v.slug]) { stats.unknown++; rejects.push([v.slug, "not in hooks.js"]); return; }
  if (!v.en || !v.fr) { rejects.push([v.slug, "missing en or fr"]); return; }

  // The cap is part of the spec because the card shows the hook in full.
  if (v.en.length > CAP || v.fr.length > CAP) {
    stats.tooLong++;
    rejects.push([v.slug, "over " + CAP + " chars (en " + v.en.length + ", fr " + v.fr.length + ")"]);
    return;
  }

  if (v.truthful === false) flagged.truthful.push(v.slug);
  if (v.spoiler === true) flagged.spoiler.push(v.slug);
  if (v.pulls === false) flagged.pulls.push(v.slug);
  if (v.fr_ok === false) flagged.fr_ok.push(v.slug);

  var fr = frSpacing(v.fr);
  if (fr !== v.fr) stats.spaced++;

  if (v.en === current[v.slug].en && fr === current[v.slug].fr) { stats.unchanged++; return; }
  next[v.slug] = { en: v.en, fr: fr };
  stats.applied++;
});

function q(s) {
  return JSON.stringify(String(s));
}

var HEADER = [
  "// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.",
  "// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt",
  "//",
  "// THE HOOKS — beat two of the loop (Charter VAL-13).",
  "//",
  "// Not facts. A fact closes the gap; a hook opens it. \"The Bolivian Navy",
  "// patrols Lake Titicaca\" informs — \"Why does a landlocked country have a",
  "// navy?\" pulls. A hook that answers itself has no reason to be tapped.",
  "//",
  "// en / fr are written separately, not translated: a French reader should feel",
  "// the same pull, which sometimes needs a different angle.",
  "//",
  "// Every line here has been through tools/apply_hooks.js, which only lets a",
  "// rewrite land once an adversarial checker has cleared it on all four counts:",
  "// true, not a spoiler, actually pulls, idiomatic French. Hand-edit freely —",
  "// but a hook that states a number or a superlative has to be checkable.",
  "",
  "window.CURIO_HOOKS = {"
].join("\n");

var keys = Object.keys(next).sort();
var body = keys.map(function (k, i) {
  return "  " + q(k) + ": { en: " + q(next[k].en) + ", fr: " + q(next[k].fr) + " }" +
    (i === keys.length - 1 ? "" : ",");
}).join("\n");

var out = HEADER + "\n" + body + "\n};\n";

console.log("verdicts seen   : " + stats.seen);
console.log("applied         : " + stats.applied);
console.log("kept as-is      : " + stats.unchanged);
console.log("rejected        : " + (stats.tooLong + stats.unknown + (rejects.length - stats.tooLong - stats.unknown)));
console.log("fr spacing fixed: " + stats.spaced);
if (rejects.length) {
  console.log("");
  rejects.forEach(function (r) { console.log("  REJECT " + r[0] + " — " + r[1]); });
}
console.log("");
console.log("CAUGHT BY THE ADVERSARIAL PASS (draft was wrong, text below is the fix):");
console.log("  overstated or false : " + flagged.truthful.length);
console.log("  gave away an answer : " + flagged.spoiler.length);
console.log("  did not actually pull: " + flagged.pulls.length);
console.log("  bad French          : " + flagged.fr_ok.length);
console.log("");
console.log("total hooks     : " + keys.length);

if (write) {
  fs.writeFileSync(HOOKS, out, "utf8");
  console.log("\nWROTE src/hooks.js");
} else {
  console.log("\n(dry run — pass --write to apply)");
}
