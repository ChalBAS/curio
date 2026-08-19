/* Tests for Question Intelligence — final three-stage model (v77).
 * Zero dependencies — node runs it.
 *
 *   node tools/intelligence.test.js
 *
 * Covers the mandate's acceptance cases for the FINAL model:
 *   A  legacy question with no intelligence       → valid
 *   B  fully enriched question                    → valid
 *   C  score = 0                                  → valid
 *   D  score = 5                                  → valid
 *   E  score < 0                                  → rejected
 *   F  score > 5                                  → rejected
 *   G  non-integer score                          → rejected
 *   H  unknown archetype                          → rejected
 *   I  multiple archetypes                        → valid
 *   J  empty rabbit-hole arrays                   → valid
 *   K  existing question bank loading             → unchanged
 * plus corpus integrity: every shipped row decodes and validates, editor rows
 * dominate their bank slots, and the editor echo stays verbatim vs the bank.
 */
'use strict';
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');

let failed = 0;
function is(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log('  \x1b[32mPASS\x1b[0m  ' + name);
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        expected ${e}\n        actual   ${a}`); }
}
function ok(name, cond, detail) { is(name, !!cond, true); if (!cond && detail) console.log('        ' + detail); }

global.window = {};
['questions', 'intelligence', 'intelligence.data', 'intelligence.corpus'].forEach(n => require(path.join(SRC, n + '.js')));
const W = global.window;
const QI = W.CURIO_QI;
const BANK = W.CURIO_QUESTIONS || [];
const CAL = W.CURIO_QI_CALIBRATION || [];
const CORPUS = (W.CURIO_QI_CORPUS || {}).rows || [];

function base() {
  return {
    archetypes: ['anchor'], role: 'anchor',
    entry_pull: { curiosity_gap: 0, familiarity: 5, novelty: 0, tension: 1, intrigue: 0 },
    spark: { surprise: 0, discovery: 0, human_pull: 0, perspective_shift: 0, closure_risk: 5 },
    portal: { connection: 0, rabbit_hole_depth: 0, resource_depth: 0, resource_density: 0, resource_diversity: 0, resource_resonance: 0, experiential: 0, next_step: 0 },
    rabbit_hole: { branches: [], entities: [] },
    diagnosis: 'keep', provenance: 'heuristic-v77'
  };
}
function broke(intel, pathStr, value) {
  const c = JSON.parse(JSON.stringify(intel));
  const keys = pathStr.split('.');
  let o = c;
  while (keys.length > 1) o = o[keys.shift()];
  o[keys[0]] = value;
  return c;
}

console.log('\n\x1b[1mA–J · the validator contract, final model\x1b[0m');
is('A · question without intelligence is valid', QI.validateQuestion({ q: 'x', options: [1, 2, 3, 4], answer: 0 }).ok, true);
is('A · intelligence explicitly null is valid', QI.validateQuestion({ q: 'x', intelligence: null }).ok, true);
is('B · fully enriched question is valid', QI.validateQuestion({ q: 'x', intelligence: base() }).ok, true);
is('C · every score 0 is valid', QI.validate(base()).ok, true);
is('D · every score 5 is valid', QI.validate((function () {
  const c = base();
  ['entry_pull', 'spark', 'portal'].forEach(g => QI.DIMENSIONS[g].forEach(d => { c[g][d] = 5; }));
  return c;
})()).ok, true);
is('E · score -1 rejected', QI.validate(broke(base(), 'spark.surprise', -1)).ok, false);
is('F · score 6 rejected', QI.validate(broke(base(), 'portal.resource_depth', 6)).ok, false);
is('G · score 2.5 rejected', QI.validate(broke(base(), 'entry_pull.tension', 2.5)).ok, false);
is('G · string score rejected', QI.validate(broke(base(), 'spark.closure_risk', '5')).ok, false);
is('H · unknown archetype rejected', QI.validate(broke(base(), 'archetypes', ['portal', 'mind_blowing'])).ok, false);
is('I · multiple archetypes valid', QI.validate(broke(base(), 'archetypes', ['surprise', 'reveal', 'perspective_shift'])).ok, true);
is('I · empty archetypes rejected', QI.validate(broke(base(), 'archetypes', [])).ok, false);
is('J · empty branches and entities valid', QI.validate(base()).ok, true);
is('J · entity with a space rejected (use slugs)', QI.validate(broke(base(), 'rabbit_hole.entities', ['Menelik II'])).ok, false);

console.log('\n\x1b[1mModel extras\x1b[0m');
is('unknown role rejected', QI.validate(broke(base(), 'role', 'amazing')).ok, false);
is('unknown diagnosis rejected', QI.validate(broke(base(), 'diagnosis', 'maybe')).ok, false);
is('missing stage rejected', QI.validate((function () { const c = base(); delete c.spark; return c; })()).ok, false);
is('typo dimension rejected', QI.validate((function () { const c = base(); c.spark.suprise = 5; return c; })()).ok, false);
is('off-vocabulary branch warns, not fails', (function () {
  const r = QI.validate(broke(base(), 'rabbit_hole.branches', ['linguistics']));
  return r.ok && r.warnings.length === 1;
})(), true);
is('neutral fallback is structurally complete', (function () {
  const n = QI.neutral();
  return n.role === 'curiosity' &&
    QI.DIMENSIONS.entry_pull.every(d => typeof n.entry_pull[d] === 'number') &&
    QI.DIMENSIONS.spark.every(d => typeof n.spark[d] === 'number') &&
    QI.DIMENSIONS.portal.every(d => typeof n.portal[d] === 'number');
})(), true);
is('neutral is the ABSENCE profile — validateQuestion still ok without intelligence',
  QI.validateQuestion({ q: 'x' }).ok, true);

console.log('\n\x1b[1mCodec — packed rows round-trip\x1b[0m');
const roundtrip = (function () {
  const full = base();
  full.rabbit_hole.branches = ['history', 'place'];
  full.rabbit_hole.entities = ['Menelik_II'];
  const row = { a: full.archetypes, r: full.role,
    e: QI.DIMENSIONS.entry_pull.map(d => full.entry_pull[d]),
    s: QI.DIMENSIONS.spark.map(d => full.spark[d]),
    p: QI.DIMENSIONS.portal.map(d => full.portal[d]),
    d: full.diagnosis, v: 'e', b: full.rabbit_hole.branches, n: full.rabbit_hole.entities };
  const dec = QI.decodeRow(row);
  return JSON.stringify(dec.entry_pull) === JSON.stringify(full.entry_pull) &&
         JSON.stringify(dec.spark) === JSON.stringify(full.spark) &&
         JSON.stringify(dec.portal) === JSON.stringify(full.portal) &&
         dec.rabbit_hole.entities[0] === 'Menelik_II' && dec.provenance === 'editor';
})();
is('decodeRow preserves all three stages + rabbit hole', roundtrip, true);
is('decodeRow(null) is null', QI.decodeRow(null), null);

console.log('\n\x1b[1mderiveRole + diagnose — declared heuristics\x1b[0m');
is('portal-grade + familiar → portal', QI.deriveRole((function () {
  const c = base(); QI.DIMENSIONS.portal.forEach(d => { c.portal[d] = 4; });
  c.portal.rabbit_hole_depth = 4; c.entry_pull.familiarity = 4; return c;
})()), 'portal');
is('portal-grade + unfamiliar → deep', QI.deriveRole((function () {
  const c = base(); QI.DIMENSIONS.portal.forEach(d => { c.portal[d] = 4; });
  c.portal.rabbit_hole_depth = 4; c.entry_pull.familiarity = 1; return c;
})()), 'deep');
is('flat recall → trivia', QI.deriveRole(base()), 'trivia');
is('LOW/HIGH/HIGH → enhance_question', QI.diagnose((function () {
  const c = base(); QI.DIMENSIONS.spark.forEach(d => { c.spark[d] = 4; }); QI.DIMENSIONS.portal.forEach(d => { c.portal[d] = 4; });
  QI.DIMENSIONS.entry_pull.forEach(d => { c.entry_pull[d] = 1; }); return c;
})()), 'enhance_question');
is('LOW/LOW/LOW → reframe', QI.diagnose((function () {
  const c = base(); ['entry_pull', 'spark', 'portal'].forEach(g => QI.DIMENSIONS[g].forEach(d => { c[g][d] = 1; })); return c;
})()), 'reframe');

console.log('\n\x1b[1mK · the existing bank, unchanged\x1b[0m');
is('bank still loads', BANK.length, 760);
ok('every legacy question validates as-is (intelligence optional)',
  BANK.every(q => QI.validateQuestion(q).ok),
  BANK.filter(q => !QI.validateQuestion(q).ok).length + ' invalid');
ok('bank rows untouched by the layer (no intelligence key leaked in)',
  BANK.every(q => q.intelligence === undefined));

console.log('\n\x1b[1mCorpus — one row per question, all valid\x1b[0m');
is('corpus rows align 1:1 with the bank', CORPUS.length, BANK.length);
const badRows = [];
CORPUS.forEach((r, i) => { const v = QI.validate(QI.decodeRow(r)); if (!v.ok) badRows.push(i); });
is('every corpus row decodes and validates', badRows, []);
const prov = { e: 0, h: 0 };
CORPUS.forEach(r => { prov[r.v === 'e' ? 'e' : 'h']++; });
is('editor rows are 41 (calibration 30 + package 11)', prov.e, 41);
console.log('  \x1b[90m     heuristic rows: ' + prov.h + '\x1b[0m');

console.log('\n\x1b[1mEditor set — integrity against the live bank\x1b[0m');
is('editor entries present', CAL.length, 41);
const ECHO_FIELDS = ['cat', 'region', 'sub', 'diff', 'kids', 'q', 'options', 'answer', 'fact', 'src', 'deeper', 'img'];
const mismatches = [];
CAL.forEach(e => {
  const live = BANK[e.bank_index];
  if (!live) { mismatches.push(e.bank_index + ': no such row'); return; }
  ECHO_FIELDS.forEach(f => {
    if (JSON.stringify(e[f]) !== JSON.stringify(live[f])) mismatches.push(e.bank_index + ':' + f);
  });
  if (e.id !== QI.qid(live)) mismatches.push(e.bank_index + ':qid');
});
is('editor echo is verbatim against the bank', mismatches, []);
is('every editor entry validates', CAL.map(e => QI.validateQuestion(e).ok), CAL.map(() => true));
// the corpus must carry the editor scores at editor positions, not heuristic ones
is('corpus carries editor scores at editor slots',
  CAL.map(e => {
    const row = CORPUS[e.bank_index];
    if (!row) return false;
    if (row.v !== 'e') return false;
    const dec = QI.decodeRow(row);
    return JSON.stringify(dec.entry_pull) === JSON.stringify(e.intelligence.entry_pull) &&
           JSON.stringify(dec.spark) === JSON.stringify(e.intelligence.spark) &&
           JSON.stringify(dec.portal) === JSON.stringify(e.intelligence.portal) &&
           dec.role === e.intelligence.role;
  }),
  CAL.map(() => true));

console.log('\n\x1b[1mRole vocabulary on the corpus\x1b[0m');
const roleDist = {};
CORPUS.forEach(r => { roleDist[r.r] = (roleDist[r.r] || 0) + 1; });
ok('all roles are known', Object.keys(roleDist).every(r => QI.ROLES.indexOf(r) !== -1));
console.log('  \x1b[90m     roles: ' + JSON.stringify(roleDist) + '\x1b[0m');

console.log('');
if (failed) { console.log(`\x1b[31m\x1b[1mQI TESTS FAILED\x1b[0m  ${failed} failing`); process.exit(1); }
console.log('\x1b[32m\x1b[1mQI TESTS PASSED\x1b[0m  final model, codec, corpus, editor set.');
