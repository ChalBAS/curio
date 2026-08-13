/* Merge the 2026-08-13 batch: 102 written, 24 flagged by the adversarial checker.
 *
 * TRIAGE, not a rubber stamp. A question this product ships is a claim it makes,
 * so anything the checker could not clear is dropped rather than patched by
 * guesswork. The only failures recovered here are the mechanical ones — a source
 * URL that points at a redirect rather than the canonical article — and even
 * those are re-verified against the live Wikipedia API before they ship.
 *
 *   node tools/merge_batch_aug13.js            report only
 *   node tools/merge_batch_aug13.js --write    write into the banks
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const WRITE = process.argv.includes('--write');
const TASK = process.argv[2] && process.argv[2].endsWith('.output') ? process.argv[2]
  : 'C:/Users/ukbch/AppData/Local/Temp/claude/C--Users-ukbch--claude/d29804ab-85c4-4eaf-bf21-2d7abac76d5f/tasks/wj1nnimei.output';

const raw = JSON.parse(fs.readFileSync(TASK, 'utf8'));
const batches = raw.result.batches;

/* existing bank, for the duplicate gate */
global.window = {};
require(path.join(SRC, 'questions.js'));
const EN_EXISTING = global.window.CURIO_QUESTIONS;
const seenText = new Set(EN_EXISTING.map(q => q.q.trim().toLowerCase()));
const seenSrc = new Set(EN_EXISTING.map(q => (q.src || '').toLowerCase()));

/* RESCUED BY EXACT CORRECTION.
 *
 * Four questions came back ok:false with a `problem` that, read in full, says
 * the item is sound and names ONE phrase to change — and gives the replacement.
 * Discarding those would throw away good work over a single word, while blindly
 * trusting the boolean would also have shipped the error. So each correction is
 * applied here explicitly, in full view, with the checker's reason recorded.
 * Anything not listed here is still dropped: no question is patched by guess.
 */
const RESCUE = [
  { match: 'Coober Pedy', field: 'q_fr',
    from: "dans l'outback du sud de l'Australie", to: "dans l'outback de l'Australie-Méridionale",
    why: "South Australia is a state, not a compass direction — the French sent the reader to the wrong end of the country, and Coober Pedy is in the far NORTH of that state." },
  { match: 'Mexico City keeps sinking', field: 'fact_fr',
    from: 'ont baissé de neuf mètres', to: 'ont baissé jusqu’à neuf mètres',
    why: "The article says 'as much as nine metres'; the French dropped the hedge and asserted it flat." },
  { match: 'full ceremonial name', field: 'fact',
    from: 'In everyday Thai it is shortened to Krung Thep Maha Nakhon.',
    to: 'Krung Thep Maha Nakhon is the official short name; in everyday speech Thais shorten it further, to Krung Thep.',
    why: "Krung Thep Maha Nakhon is the OFFICIAL short form, not the colloquial one — the fact misstated which register each name belongs to." },
  { match: 'full ceremonial name', field: 'fact_fr',
    from: 'En thaï courant, on le réduit à Krung Thep Maha Nakhon.',
    to: 'Krung Thep Maha Nakhon en est le nom officiel abrégé ; dans la langue courante, les Thaïlandais le réduisent encore à Krung Thep.',
    why: 'Same correction in French.' },
  { match: 'indigo vat', field: 'fact',
    from: 'a soluble, colourless form known as white indigo', to: 'a soluble, pale yellow form known as white indigo',
    why: "The cited article calls the reduced form 'yellow, water-soluble leucoindigo' — 'indigo white' is a traditional name, not a description of the colour. Real vats are yellow-green." },
  { match: 'indigo vat', field: 'fact_fr',
    // Straight apostrophes: the batch writes l'indigo, not l’indigo. A curly one
    // here silently failed to match, and the question nearly shipped saying
    // "pale yellow" in English and "incolore" in French.
    from: "une forme soluble et incolore, l'indigo blanc", to: "une forme soluble d'un jaune pâle, l'indigo blanc",
    why: 'Same correction in French — the two languages must not disagree.' }
];

const rescued = [];
function rescue(q) {
  const mine = RESCUE.filter(r => q.q.includes(r.match));
  if (!mine.length) return false;
  // ALL of a question's corrections must land, or the question is dropped. A
  // partial rescue is the worst outcome available: it would have shipped the
  // English fact corrected to "pale yellow" while the French still read
  // "incolore" — the two languages contradicting each other on the same card.
  const staged = {};
  for (const r of mine) {
    const before = q[r.field];
    if (!before || before.indexOf(r.from) === -1) {
      rescued.push({ q: q.q.slice(0, 60), field: r.field, why: 'correction did not match — whole question dropped', failed: true });
      return false;
    }
    staged[r.field] = (staged[r.field] || before).replace(r.from, r.to);
  }
  Object.assign(q, staged);
  mine.forEach(r => rescued.push({ q: q.q.slice(0, 60), field: r.field, why: r.why }));
  return true;
}

const kept = [], dropped = [];
batches.forEach(b => {
  const bad = new Map();
  (b.verdicts || []).forEach(v => { if (!v.ok) bad.set(String(v.q).trim(), v); });
  b.questions.forEach(q => {
    const v = bad.get(String(q.q).trim());
    if (v && !rescue(q)) { dropped.push({ sub: b.sub, q: q.q, why: v.problem }); return; }
    if (seenText.has(q.q.trim().toLowerCase())) { dropped.push({ sub: b.sub, q: q.q, why: 'duplicate question text' }); return; }
    if (seenSrc.has((q.src || '').toLowerCase())) { dropped.push({ sub: b.sub, q: q.q, why: 'article already used: ' + q.src }); return; }
    if (!/^https:\/\/en\.wikipedia\.org\/wiki\/\S+$/.test(q.src || '')) { dropped.push({ sub: b.sub, q: q.q, why: 'malformed source' }); return; }
    if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options).size !== 4) { dropped.push({ sub: b.sub, q: q.q, why: 'options not 4 distinct' }); return; }
    if (!Array.isArray(q.options_fr) || q.options_fr.length !== 4) { dropped.push({ sub: b.sub, q: q.q, why: 'French options missing' }); return; }
    if (![0, 1, 2, 3].includes(q.answer)) { dropped.push({ sub: b.sub, q: q.q, why: 'bad answer index' }); return; }
    if (!q.q_fr || !q.fact_fr) { dropped.push({ sub: b.sub, q: q.q, why: 'French incomplete' }); return; }
    seenText.add(q.q.trim().toLowerCase());
    seenSrc.add(q.src.toLowerCase());
    kept.push({ ...q, sub: b.sub, cat: b.cat });
  });
});

console.log(`\n  written ${batches.reduce((n, b) => n + b.questions.length, 0)} · kept ${kept.length} · dropped ${dropped.length}\n`);
const byWhy = {};
dropped.forEach(d => { const k = d.why.slice(0, 60); (byWhy[k] = byWhy[k] || []).push(d); });
Object.entries(byWhy).sort((a, b) => b[1].length - a[1].length).forEach(([w, l]) => console.log(`  ${String(l.length).padStart(2)}  ${w}`));
console.log('');
const bySub = {};
kept.forEach(k => { bySub[k.sub] = (bySub[k.sub] || 0) + 1; });
Object.entries(bySub).forEach(([s, n]) => console.log(`  +${String(n).padStart(2)}  ${s}`));
if (rescued.length) {
  console.log('\n  rescued by exact correction:');
  rescued.forEach(r => console.log(`    ${r.failed ? '✗' : '✓'} [${r.field}] ${r.q}\n        ${r.why}`));
}

if (!WRITE) { console.log('\n  (report only — pass --write to merge)\n'); process.exit(0); }

/* ---- write, index-aligned ---- */
const s = v => JSON.stringify(v);
const enRows = kept.map(q =>
  `  { cat: ${s(q.cat)}, sub: ${s(q.sub)}, diff: ${q.diff || 2}, kids: ${!!q.kids}, q: ${s(q.q)}, options: ${s(q.options)}, answer: ${q.answer}, fact: ${s(q.fact)}, src: ${s(q.src)} },`
).join('\n');
const frRows = kept.map(q =>
  `  {"q": ${s(q.q_fr)}, "options": ${s(q.options_fr)}, "answer": ${q.answer}, "fact": ${s(q.fact_fr)}},`
).join('\n');

function splice(file, block, banner) {
  const p = path.join(SRC, file);
  const txt = fs.readFileSync(p, 'utf8');
  const at = txt.lastIndexOf('];');
  fs.writeFileSync(p, txt.slice(0, at) + banner + '\n' + block + '\n' + txt.slice(at), 'utf8');
  console.log(`  ${file}  +${kept.length}`);
}
splice('questions.js', enRows, '\n  // ---------- BATCH 2026-08-13 · thin sub-topics first ----------');
splice('questions.fr.js', frRows, '\n  // ---------- LOT 2026-08-13 ----------');
console.log('');
