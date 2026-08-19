/* BUILD INTELLIGENCE CORPUS — enriches the whole EN bank with Question
 * Intelligence (v77 final model) and emits:
 *
 *   src/intelligence.data.js    — the EDITOR set (calibration 30 mapped from
 *                                 V1 + the 11 new v77 questions), readable,
 *                                 with rationale notes. Source of truth for
 *                                 hand-scored rows.
 *   src/intelligence.corpus.js  — 760 packed rows aligned to the bank by
 *                                 index, shipped to the app.
 *
 *     node tools/build_intelligence_corpus.js           build both
 *     node tools/build_intelligence_corpus.js --check   report only
 *
 * Editor rows win over heuristic rows. Heuristic scores are machine-assisted
 * editorial metadata (provenance "heuristic-v77") built from TRANSPARENT
 * rules over observable features (difficulty, kids flag, question form, fact
 * text signals, entity shelves, deeper material) — documented in
 * docs/CURIOSITY_ENGINE_V77.md. They are not measurements.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');

global.window = {};
['questions', 'intelligence', 'intelligence.data', 'entities.meta', 'entities.img', 'hooks', 'golinks', 'resources']
  .forEach(n => require(path.join(ROOT, 'src', n + '.js')));
const W = global.window;
const QI = W.CURIO_QI;
const BANK = W.CURIO_QUESTIONS;
const PLACES = (W.CURIO_GO || {}).places || {};
const META = W.CURIO_META || {};
const HOOKS = W.CURIO_HOOKS || {};
const CRN = W.CurioResourceNetwork;

function slugOf(q) { const m = /\/wiki\/([^"#?]+)/.exec(q.src || ''); if (!m) return null; try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }

/* ---------- editor set: V1 calibration entries, mapped to the final model.
 * The existing intelligence.data.js carries V1-shaped intelligence for the
 * first 30 entries; once regenerated it is already v2 and passes through. */
function mapV1(v1) {
  if (v1.entry_pull) return v1; // already final model
  return {
    archetypes: v1.archetypes.slice(),
    entry_pull: {
      curiosity_gap: v1.curiosity.curiosity_gap,
      familiarity: v1.tension.familiarity,
      novelty: v1.tension.novelty,
      tension: v1.tension.optimality,
      intrigue: v1.curiosity.curiosity_gap
    },
    spark: {
      surprise: v1.curiosity.surprise,
      discovery: v1.curiosity.discovery,
      human_pull: v1.curiosity.human_pull,
      perspective_shift: v1.curiosity.perspective_shift,
      closure_risk: v1.closure.risk
    },
    portal: {
      connection: v1.curiosity.connection,
      rabbit_hole_depth: v1.rabbit_hole.depth,
      resource_depth: v1.resource_depth.depth,
      resource_density: v1.resource_depth.density,
      resource_diversity: v1.resource_depth.diversity,
      resource_resonance: v1.resource_depth.resonance,
      experiential: v1.resource_depth.experiential,
      next_step: v1.resource_depth.next_step
    },
    rabbit_hole: { branches: v1.rabbit_hole.branches.slice(), entities: v1.rabbit_hole.entities.slice() },
    diagnosis: 'keep',
    provenance: 'editor'
  };
}

/* ---------- editor scores for the 11 new v77 questions (ChatGPT package).
 * bank_index 749..759 in append order. Roles per the package's targets. */
const EDITOR_NEW = {
 749: { theme: 'portal · Hatshepsut erased',
  intel: { archetypes: ['mystery', 'human_story', 'perspective_shift', 'portal'],
   entry_pull: { curiosity_gap: 4, familiarity: 3, novelty: 3, tension: 4, intrigue: 4 },
   spark: { surprise: 4, discovery: 5, human_pull: 4, perspective_shift: 4, closure_risk: 1 },
   portal: { connection: 4, rabbit_hole_depth: 4, resource_depth: 4, resource_density: 4, resource_diversity: 4, resource_resonance: 5, experiential: 4, next_step: 5 },
   rabbit_hole: { branches: ['history', 'people', 'politics', 'archaeology', 'culture'], entities: ['Hatshepsut', 'Thutmose_III', 'Deir_el-Bahri', 'Damnatio_memoriae'] },
   diagnosis: 'keep' },
  note: 'The erasure is the mystery and the motive is still debated — next_step 5 by construction. Met collection gives it experiential weight.' },
 750: { theme: 'deep · the 3,700-year-old complaint',
  intel: { archetypes: ['reveal', 'human_story', 'connection', 'portal'],
   entry_pull: { curiosity_gap: 4, familiarity: 2, novelty: 4, tension: 4, intrigue: 4 },
   spark: { surprise: 4, discovery: 5, human_pull: 4, perspective_shift: 3, closure_risk: 1 },
   portal: { connection: 5, rabbit_hole_depth: 4, resource_depth: 4, resource_density: 4, resource_diversity: 4, resource_resonance: 5, experiential: 4, next_step: 4 },
   rabbit_hole: { branches: ['history', 'economics', 'people', 'place', 'archaeology'], entities: ['Complaint_tablet_to_Ea-nassir', 'Ur', 'Cuneiform', 'British_Museum'] },
   diagnosis: 'keep' },
  note: 'An angry customer across 3,700 years — the human bridge makes a low-familiarity subject enterable. British Museum object page is the resonant continuation.' },
 751: { theme: 'discovery · statues were not white',
  intel: { archetypes: ['contradiction', 'surprise', 'perspective_shift', 'portal'],
   entry_pull: { curiosity_gap: 3, familiarity: 4, novelty: 3, tension: 4, intrigue: 3 },
   spark: { surprise: 4, discovery: 4, human_pull: 1, perspective_shift: 5, closure_risk: 2 },
   portal: { connection: 4, rabbit_hole_depth: 3, resource_depth: 3, resource_density: 4, resource_diversity: 4, resource_resonance: 4, experiential: 2, next_step: 3 },
   rabbit_hole: { branches: ['art', 'history', 'archaeology', 'culture'], entities: ['Polychromy', 'Ancient_Greek_sculpture'] },
   diagnosis: 'keep' },
  note: 'Perspective 5: the white-marble ancient world is a modern invention. The familiar image (familiarity 4) is exactly what makes the contradiction land.' },
 752: { theme: 'deep · wayfinding without instruments',
  intel: { archetypes: ['reveal', 'human_story', 'connection', 'perspective_shift', 'portal'],
   entry_pull: { curiosity_gap: 4, familiarity: 2, novelty: 4, tension: 4, intrigue: 4 },
   spark: { surprise: 4, discovery: 5, human_pull: 4, perspective_shift: 4, closure_risk: 0 },
   portal: { connection: 5, rabbit_hole_depth: 4, resource_depth: 5, resource_density: 3, resource_diversity: 4, resource_resonance: 5, experiential: 3, next_step: 5 },
   rabbit_hole: { branches: ['culture', 'science', 'place', 'people', 'history'], entities: ['Polynesian_navigation', 'Hōkūleʻa', 'Mau_Piailug', 'Nainoa_Thompson', 'Polynesian_Voyaging_Society'] },
   diagnosis: 'keep' },
  note: 'Indigenous science that reframes what "technology" means. Hōkūleʻa still sails — the rabbit hole is alive.' },
 753: { theme: 'portal · cacao as money',
  intel: { archetypes: ['surprise', 'origin', 'connection'],
   entry_pull: { curiosity_gap: 3, familiarity: 4, novelty: 2, tension: 4, intrigue: 3 },
   spark: { surprise: 4, discovery: 3, human_pull: 2, perspective_shift: 3, closure_risk: 2 },
   portal: { connection: 5, rabbit_hole_depth: 3, resource_depth: 4, resource_density: 3, resource_diversity: 4, resource_resonance: 4, experiential: 2, next_step: 3 },
   rabbit_hole: { branches: ['history', 'economics', 'culture', 'environment', 'place'], entities: ['Cocoa_bean', 'Maya_civilization', 'Aztec', 'Columbian_exchange'] },
   diagnosis: 'keep' },
  note: 'Chocolate is the foothold (familiarity 4); money is the stretch. Connection 5: food, ritual, trade, colonialism, industry.' },
 754: { theme: 'portal · the walls of Pompeii talk',
  intel: { archetypes: ['human_story', 'reveal', 'connection', 'portal'],
   entry_pull: { curiosity_gap: 4, familiarity: 3, novelty: 3, tension: 4, intrigue: 4 },
   spark: { surprise: 3, discovery: 4, human_pull: 5, perspective_shift: 3, closure_risk: 1 },
   portal: { connection: 4, rabbit_hole_depth: 4, resource_depth: 4, resource_density: 4, resource_diversity: 5, resource_resonance: 5, experiential: 5, next_step: 4 },
   rabbit_hole: { branches: ['history', 'people', 'place', 'archaeology', 'culture'], entities: ['Pompeii', 'Graffiti'] },
   diagnosis: 'keep' },
  note: 'Human pull 5: jokes, love notes and bar tabs from people history usually ignores. Pompeii itself is the experiential 5.' },
 755: { theme: 'deep · how the Nazca lines were made',
  intel: { archetypes: ['mystery', 'reveal', 'portal'],
   entry_pull: { curiosity_gap: 4, familiarity: 2, novelty: 4, tension: 3, intrigue: 4 },
   spark: { surprise: 3, discovery: 4, human_pull: 1, perspective_shift: 2, closure_risk: 1 },
   portal: { connection: 4, rabbit_hole_depth: 4, resource_depth: 4, resource_density: 3, resource_diversity: 4, resource_resonance: 4, experiential: 5, next_step: 4 },
   rabbit_hole: { branches: ['archaeology', 'place', 'culture', 'history'], entities: ['Nazca_lines', 'Nazca', 'Peru'] },
   diagnosis: 'keep' },
  note: 'The how is simple; the why is the live mystery. Rare case where the corpus gains a genuine mystery archetype.' },
 756: { theme: 'deep · purple from snails',
  intel: { archetypes: ['surprise', 'origin', 'connection', 'portal'],
   entry_pull: { curiosity_gap: 3, familiarity: 2, novelty: 4, tension: 3, intrigue: 3 },
   spark: { surprise: 4, discovery: 4, human_pull: 2, perspective_shift: 3, closure_risk: 2 },
   portal: { connection: 5, rabbit_hole_depth: 3, resource_depth: 4, resource_density: 3, resource_diversity: 4, resource_resonance: 4, experiential: 2, next_step: 3 },
   rabbit_hole: { branches: ['history', 'economics', 'culture', 'technology', 'place'], entities: ['Tyrian_purple', 'Murex', 'Tyre,_Lebanon', 'Phoenicia'] },
   diagnosis: 'keep' },
  note: 'Colour as trade, status and chemistry. Snail-to-imperial-purple is the surprise; the Phoenician network is the portal.' },
 757: { theme: 'curiosity · who actually wore armour',
  intel: { archetypes: ['contradiction', 'perspective_shift'],
   entry_pull: { curiosity_gap: 3, familiarity: 3, novelty: 2, tension: 3, intrigue: 3 },
   spark: { surprise: 3, discovery: 2, human_pull: 2, perspective_shift: 3, closure_risk: 3 },
   portal: { connection: 3, rabbit_hole_depth: 2, resource_depth: 3, resource_density: 4, resource_diversity: 3, resource_resonance: 3, experiential: 4, next_step: 2 },
   rabbit_hole: { branches: ['history', 'technology', 'culture', 'art'], entities: ['Armour', 'Plate_armour', 'Middle_Ages'] },
   diagnosis: 'keep' },
  note: 'The film-image is the false familiarity (3) being corrected. Met Arms and Armor is the resonant continuation, not the score driver.' },
 758: { theme: 'portal · Pompeii had fast food',
  intel: { archetypes: ['connection', 'reveal', 'human_story'],
   entry_pull: { curiosity_gap: 3, familiarity: 3, novelty: 3, tension: 3, intrigue: 3 },
   spark: { surprise: 3, discovery: 4, human_pull: 3, perspective_shift: 2, closure_risk: 2 },
   portal: { connection: 4, rabbit_hole_depth: 3, resource_depth: 3, resource_density: 3, resource_diversity: 4, resource_resonance: 4, experiential: 5, next_step: 3 },
   rabbit_hole: { branches: ['history', 'place', 'culture', 'archaeology', 'economics'], entities: ['Thermopolium', 'Pompeii'] },
   diagnosis: 'keep' },
  note: 'The modern analogy is the connection mechanic. Pairs with the graffiti question without duplicating it — same city, different door.' },
 759: { theme: 'deep · a king can be a woman',
  intel: { archetypes: ['perspective_shift', 'human_story', 'connection'],
   entry_pull: { curiosity_gap: 4, familiarity: 2, novelty: 4, tension: 4, intrigue: 4 },
   spark: { surprise: 4, discovery: 4, human_pull: 4, perspective_shift: 5, closure_risk: 1 },
   portal: { connection: 4, rabbit_hole_depth: 3, resource_depth: 4, resource_density: 4, resource_diversity: 4, resource_resonance: 5, experiential: 3, next_step: 4 },
   rabbit_hole: { branches: ['history', 'people', 'art', 'culture', 'politics'], entities: ['Hatshepsut', 'Deir_el-Bahri', 'Pharaoh'] },
   diagnosis: 'keep' },
  note: 'Perspective 5: the imagery says more about the office than about her. Diff 3 — the hardest entry in the package, no kids flag.' }
};

/* ---------- heuristic scorer (provenance "heuristic-v77") ----------
 * Every rule is declared here and in docs/CURIOSITY_ENGINE_V77.md. */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function heuristic(q) {
  const slug = slugOf(q) || '';
  const placed = !!PLACES[slug];
  const hooked = !!HOOKS[slug];
  const meta = META[slug] || {};
  const deeper = !!(q.deeper && q.deeper.length);
  const text = q.q || '';
  const fact = (q.fact || '') + ' ' + (q.deeper || []).join(' ');
  const recall = /^(what|which|who|how many|in what|in which|where|when)\b/i.test(text) && text.length < 75;
  const whyHow = /^(why|how)\b/i.test(text);
  const mysterySig = /still debated|remains debated|mystery|no one knows|unknown|still studied|puzzle/i.test(fact);
  const superlative = /\b(first|oldest|largest|longest|only|never|most)\b/i.test(fact);
  const humanSig = /woman|women|queen|king|slave|war|died|killed|love|betray|child|daughter|son|mother|father|escaped|survived/i.test(fact);
  const contraSig = /actually|contrary|despite|in fact|myth|not |no,|really/i.test(text + ' ' + fact);
  const originSig = /first|invent|found|began|origin|created|built|discovered/i.test(text);
  let crn = 0;
  try { crn = CRN ? CRN.findResourcesForQuestion(q, 5).length : 0; } catch (e) {}

  const base = q.diff === 1 ? { fam: 4, nov: 1 } : q.diff === 2 ? { fam: 3, nov: 2 } : { fam: 2, nov: 3 };
  const fam = clamp(base.fam + (q.kids ? 1 : 0) - (recall ? 0 : 0), 0, 5);
  const nov = base.nov;
  const gap = recall ? 1 : whyHow ? 3 : 2;
  const intrigue = clamp((recall ? 1 : 2) + (hooked ? 1 : 0) + (mysterySig ? 1 : 0), 0, 5);
  const tension = clamp(5 - Math.abs(fam - 3) - Math.abs(nov - 2) - (fam + nov > 7 ? 2 : 0) - (fam + nov < 3 ? 2 : 0), 1, 5);

  const surprise = recall ? 1 : clamp((q.diff === 1 ? 2 : 3) + (superlative ? 0 : 0) + (contraSig ? 1 : 0), 0, 5);
  const discovery = clamp((q.diff === 1 ? 1 : q.diff === 2 ? 2 : 3) + (q.region ? 1 : 0), 0, 5);
  const human_pull = (q.cat === 'History' || q.cat === 'Arts') ? (humanSig ? 4 : 2) : (humanSig ? 3 : 1);
  const perspective = clamp((q.diff === 3 ? 3 : 2) + (contraSig ? 1 : 0), 0, 5);
  const closure = mysterySig ? 1 : deeper ? 2 : recall ? 4 : 3;

  const connection = clamp(2 + (q.region ? 1 : 0) + (['Science', 'Tech', 'Geography'].indexOf(q.cat) !== -1 ? 1 : 0), 0, 5);
  const visitable = placed || meta.t === 'visit' || meta.t === 'go';
  const portal = {
    connection,
    rabbit_hole_depth: clamp(2 + (connection >= 4 ? 1 : 0) + (deeper ? 1 : 0) + (placed ? 1 : 0) + (mysterySig ? 1 : 0), 0, 5),
    resource_depth: placed ? 4 : 3,
    resource_density: clamp(2 + (crn > 0 ? 1 : 0) + (placed ? 1 : 0), 0, 5),
    resource_diversity: ['History', 'Arts', 'Geography'].indexOf(q.cat) !== -1 ? 4 : 3,
    // Every question already carries Read/Watch/Source continuations — that
    // is the app's architecture — so resonance starts at 3 and rises with
    // material that genuinely follows from THIS question.
    resource_resonance: clamp(3 + (deeper ? 1 : 0) + ((placed || hooked) ? 1 : 0), 0, 5),
    experiential: visitable ? 4 : 1,
    next_step: mysterySig ? 4 : deeper ? 3 : whyHow ? 3 : 2
  };

  const arch = [];
  if (recall) arch.push('anchor');
  if (surprise >= 4) arch.push('surprise');
  if (contraSig) arch.push('contradiction');
  if (human_pull >= 4) arch.push('human_story');
  if (mysterySig) arch.push('mystery');
  if (originSig && !recall) arch.push('origin');
  if (connection >= 4) arch.push('connection');
  if (perspective >= 4) arch.push('perspective_shift');
  if (discovery >= 4) arch.push('reveal');

  const intel = {
    archetypes: arch,
    entry_pull: { curiosity_gap: gap, familiarity: fam, novelty: nov, tension, intrigue },
    spark: { surprise, discovery, human_pull, perspective_shift: perspective, closure_risk: closure },
    portal,
    rabbit_hole: {
      branches: [...new Set([q.cat === 'History' ? 'history' : q.cat === 'Science' ? 'science' :
        q.cat === 'Tech' ? 'technology' : q.cat === 'Arts' ? 'art' :
        q.cat === 'Nature' ? 'science' : 'place'].concat(q.region ? ['place', 'culture'] : []))],
      entities: slug ? [slug] : []
    },
    diagnosis: 'keep',
    provenance: 'heuristic-v77'
  };
  intel.role = QI.deriveRole(intel);
  if (!intel.archetypes.length) intel.archetypes = [intel.role === 'trivia' || intel.role === 'anchor' ? 'anchor' : 'connection'];
  if (intel.archetypes.indexOf('portal') === -1 && (intel.role === 'portal' || intel.role === 'deep')) intel.archetypes.push('portal');
  intel.diagnosis = QI.diagnose(intel);
  return intel;
}

/* ---------- pack a full intelligence object into a corpus row ---------- */
function pack(intel) {
  const row = {
    a: intel.archetypes, r: intel.role,
    e: QI.DIMENSIONS.entry_pull.map(d => intel.entry_pull[d]),
    s: QI.DIMENSIONS.spark.map(d => intel.spark[d]),
    p: QI.DIMENSIONS.portal.map(d => intel.portal[d]),
    d: intel.diagnosis, v: intel.provenance === 'editor' ? 'e' : 'h'
  };
  if (intel.rabbit_hole.branches.length) row.b = intel.rabbit_hole.branches;
  if (intel.rabbit_hole.entities.length) row.n = intel.rabbit_hole.entities;
  return row;
}

/* ---------- build ---------- */
const OLD_CAL = (W.CURIO_QI_CALIBRATION || []);
const editorByIndex = {};
const editorEntries = [];

OLD_CAL.forEach(e => {
  const intel = mapV1(JSON.parse(JSON.stringify(e.intelligence)));
  intel.role = QI.deriveRole(intel);
  intel.diagnosis = 'keep';
  intel.provenance = 'editor';
  editorByIndex[e.bank_index] = { intel, note: e.note, theme: null };
});
Object.keys(EDITOR_NEW).forEach(k => {
  const i = +k, e = EDITOR_NEW[k];
  const intel = JSON.parse(JSON.stringify(e.intel));
  intel.role = QI.deriveRole(intel);
  intel.provenance = 'editor';
  editorByIndex[i] = { intel, note: e.note, theme: e.theme };
});

const rows = [], dist = { roles: {}, arch: {}, diag: {}, prov: { e: 0, h: 0 } };
BANK.forEach((q, i) => {
  const ed = editorByIndex[i];
  const intel = ed ? ed.intel : heuristic(q);
  rows.push(pack(intel));
  dist.roles[intel.role] = (dist.roles[intel.role] || 0) + 1;
  dist.diag[intel.diagnosis] = (dist.diag[intel.diagnosis] || 0) + 1;
  intel.archetypes.forEach(a => { dist.arch[a] = (dist.arch[a] || 0) + 1; });
  dist.prov[intel.provenance === 'editor' ? 'e' : 'h']++;
});

// every row must validate once decoded
const bad = [];
rows.forEach((r, i) => { const v = QI.validate(QI.decodeRow(r)); if (!v.ok) bad.push(i + ': ' + v.errors[0]); });
if (bad.length) { console.error('INVALID ROWS:\n' + bad.slice(0, 10).join('\n')); process.exit(1); }

console.log('rows:', rows.length, '· editor:', dist.prov.e, '· heuristic:', dist.prov.h);
console.log('roles:', JSON.stringify(dist.roles));
console.log('archetypes:', JSON.stringify(dist.arch));
console.log('diagnoses:', JSON.stringify(dist.diag));

if (CHECK) return;

/* corpus file */
const corpus = '// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.\n' +
'// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt\n' +
'//\n' +
'// QUESTION INTELLIGENCE CORPUS — GENERATED by tools/build_intelligence_corpus.js.\n' +
'// Do not hand-edit: editor scores live in src/intelligence.data.js, everything\n' +
'// else is heuristic-v77. One packed row per bank question, aligned by index\n' +
'// (EN/FR banks are index-aligned; decode with CURIO_QI.decodeRow).\n' +
'// Scores are editorial metadata, not measurements.\n' +
'window.CURIO_QI_CORPUS = { v: 2, rows: ' + JSON.stringify(rows) + ' };\n';
fs.writeFileSync(path.join(ROOT, 'src', 'intelligence.corpus.js'), corpus, 'utf8');

/* editor data file: full-fidelity, readable, with notes — the review surface */
let data = '// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.\n' +
'// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt\n' +
'//\n' +
'// QUESTION INTELLIGENCE — EDITOR SET (41 rows: calibration 30 + v77 package 11).\n' +
'// GENERATED by tools/build_intelligence_corpus.js from the hand-scored table\n' +
'// inside that tool plus the mapped V1 calibration scores. bank_index points at\n' +
'// the source row in src/questions.js; `note` is internal scoring rationale.\n' +
'// Scores are editorial metadata, not measurements. Docs: docs/CURIOSITY_ENGINE_V77.md\n' +
'window.CURIO_QI_CALIBRATION = [\n';
let n = 0;
Object.keys(editorByIndex).map(Number).sort((a, b) => a - b).forEach(i => {
  const q = BANK[i], ed = editorByIndex[i];
  n++;
  data += '  // ' + String(n).padStart(2, '0') + ' · ' + (ed.theme || ('calibration · bank #' + i)) + '\n';
  data += '  { id: ' + JSON.stringify(QI.qid(q)) + ', bank_index: ' + i + ',\n';
  ['cat', 'region', 'sub', 'diff', 'kids', 'q', 'options', 'answer', 'fact', 'src', 'deeper', 'img'].forEach(f => {
    if (q[f] !== undefined) data += '    ' + f + ': ' + JSON.stringify(q[f]) + ',\n';
  });
  data += '    intelligence: ' + JSON.stringify(ed.intel) + ',\n';
  data += '    note: ' + JSON.stringify(ed.note || '') + ' },\n';
});
data += '];\n';
fs.writeFileSync(path.join(ROOT, 'src', 'intelligence.data.js'), data, 'utf8');

console.log('wrote src/intelligence.corpus.js (' + (corpus.length / 1024).toFixed(1) + ' KB) and src/intelligence.data.js (' + n + ' editor rows)');
