/* Tests for Question Intelligence V1. Zero dependencies — node runs it.
 *
 *   node tools/intelligence.test.js
 *
 * Covers the mandate's acceptance cases (§16):
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
 *   L  existing discovery / resource behaviour    → not broken
 * plus calibration-sample integrity: the echo stays verbatim against the live
 * bank, every entry validates, and the provisional tier interface behaves.
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

/* Load the app data files the way preflight does: a window shim, then require. */
global.window = {};
['questions', 'intelligence', 'intelligence.data', 'entities.meta', 'entities.img',
 'entities.fr', 'golinks', 'hooks', 'discovery', 'resources'].forEach(n => {
  require(path.join(SRC, n + '.js'));
});
const W = global.window;
const QI = W.CURIO_QI;
const BANK = W.CURIO_QUESTIONS || [];
const CAL = W.CURIO_QI_CALIBRATION || [];

/* A minimal valid intelligence object; tests clone and mutate it. */
function base() {
  return {
    archetypes: ['anchor'],
    curiosity: { curiosity_gap: 0, surprise: 0, familiarity_anchor: 5, human_pull: 0, connection: 0, discovery: 0, perspective_shift: 0 },
    tension: { familiarity: 5, novelty: 0, optimality: 1 },
    resource_depth: { depth: 0, density: 0, diversity: 0, resonance: 0, experiential: 0, next_step: 0 },
    closure: { risk: 5 },
    rabbit_hole: { depth: 0, branches: [], entities: [] }
  };
}
function broke(intel, path, value) {
  const c = JSON.parse(JSON.stringify(intel));
  const keys = path.split('.');
  let o = c;
  while (keys.length > 1) o = o[keys.shift()];
  o[keys[0]] = value;
  return c;
}

console.log('\n\x1b[1mA–J · the validator contract\x1b[0m');

// A — a legacy question with no intelligence is valid (backward compatibility)
is('A · question without intelligence is valid', QI.validateQuestion({ q: 'x', options: [1, 2, 3, 4], answer: 0 }).ok, true);
is('A · intelligence explicitly null is valid', QI.validateQuestion({ q: 'x', intelligence: null }).ok, true);

// B — fully enriched question is valid
is('B · fully enriched question is valid', QI.validateQuestion({ q: 'x', intelligence: base() }).ok, true);

// C / D — boundary scores are valid
is('C · every score 0 is valid', QI.validate(broke(broke(broke(broke(base(),
  'curiosity.curiosity_gap', 0), 'tension.familiarity', 0), 'closure.risk', 0), 'rabbit_hole.depth', 0)).ok, true);
is('D · every score 5 is valid', QI.validate((function () {
  let c = base();
  ['curiosity', 'tension', 'resource_depth', 'closure', 'rabbit_hole'].forEach(g =>
    QI.DIMENSIONS[g].forEach(d => { c[g][d] = 5; }));
  return c;
})()).ok, true);

// E / F / G — out-of-range and non-integer scores are rejected
is('E · score -1 rejected', QI.validate(broke(base(), 'curiosity.surprise', -1)).ok, false);
is('F · score 6 rejected', QI.validate(broke(base(), 'resource_depth.depth', 6)).ok, false);
is('G · score 2.5 rejected', QI.validate(broke(base(), 'tension.novelty', 2.5)).ok, false);
is('G · string score rejected', QI.validate(broke(base(), 'closure.risk', '5')).ok, false);
is('G · NaN score rejected', QI.validate(broke(base(), 'rabbit_hole.depth', NaN)).ok, false);

// H / I — archetypes
is('H · unknown archetype rejected', QI.validate(broke(base(), 'archetypes', ['portal', 'mind_blowing'])).ok, false);
is('I · multiple archetypes valid', QI.validate(broke(base(), 'archetypes', ['surprise', 'reveal', 'perspective_shift'])).ok, true);
is('I · empty archetypes rejected', QI.validate(broke(base(), 'archetypes', [])).ok, false);

// J — rabbit-hole arrays
is('J · empty branches and entities valid', QI.validate(broke(broke(base(), 'rabbit_hole.branches', []), 'rabbit_hole.entities', [])).ok, true);
is('J · entity with a space rejected (use slugs)', QI.validate(broke(base(), 'rabbit_hole.entities', ['Menelik II'])).ok, false);
is('J · slug entities valid', QI.validate(broke(base(), 'rabbit_hole.entities', ['Menelik_II', 'Battle_of_Adwa'])).ok, true);
is('J · non-string branch rejected', QI.validate(broke(base(), 'rabbit_hole.branches', [42])).ok, false);

console.log('\n\x1b[1mStrictness — half-finished enrichment must fail, not lie\x1b[0m');
is('missing group rejected', QI.validate((function () { const c = base(); delete c.tension; return c; })()).ok, false);
is('missing dimension rejected', QI.validate((function () { const c = base(); delete c.curiosity.surprise; return c; })()).ok, false);
is('typo dimension rejected (curousity)', QI.validate((function () { const c = base(); c.curousity = c.curiosity; delete c.curiosity; return c; })()).ok, false);
is('typo inside a group rejected', QI.validate((function () { const c = base(); c.closure.risq = 5; return c; })()).ok, false);
is('off-vocabulary branch warns, not fails', (function () {
  const r = QI.validate(broke(base(), 'rabbit_hole.branches', ['linguistics']));
  return r.ok && r.warnings.length === 1;
})(), true);

console.log('\n\x1b[1mK · the existing bank, unchanged\x1b[0m');
is('bank still loads', BANK.length, 749);
ok('every legacy question validates as-is (intelligence optional)',
  BANK.every(q => QI.validateQuestion(q).ok),
  BANK.filter(q => !QI.validateQuestion(q).ok).length + ' invalid');
ok('bank rows untouched by the layer (no intelligence key leaked in)',
  BANK.every(q => q.intelligence === undefined));
is('qid matches the app algorithm on a known question', QI.qid(BANK[0]), 'q1ree1ha');

console.log('\n\x1b[1mL · discovery and resources, not broken\x1b[0m');
const DISCO = W.CURIO_DISCOVERY, GO = W.CURIO_GO, CRN = W.CurioResourceNetwork;
ok('discovery catalogue builds over the full bank', DISCO && DISCO.all().length > 700, DISCO ? DISCO.all().length + ' items' : 'no CURIO_DISCOVERY');
const mono = BANK.filter(q => /Mona_Lisa/.test(q.src || ''))[0];
ok('entity extraction still works (Mona Lisa)', mono && GO.entityOf(mono), 'Mona_Lisa');
ok('goFor still returns the four fixed slots', (function () {
  const d = GO.goFor(mono); return d.length === 4 && d.every(x => 'on' in x && 'url' in x);
})(), true);
ok('shelves still build with >= 3 items each', (function () {
  const s = DISCO.shelves([], 4); return s.length >= 3 && s.every(x => x.items.length >= 3);
})(), true);
ok('resource network loads (fixture records present)', CRN && W.CURIO_RESOURCES.length === 20, W.CURIO_RESOURCES ? W.CURIO_RESOURCES.length + ' records' : 'missing');
ok('resource matcher still scores against a question', (function () {
  const hits = CRN.findResourcesForQuestion(BANK.filter(q => /Benin_Bronzes/.test(q.src || ''))[0], 3);
  return Array.isArray(hits);
})(), true);

console.log('\n\x1b[1mCalibration sample — integrity against the live bank\x1b[0m');
is('sample size is 30', CAL.length, 30);
const ECHO_FIELDS = ['cat', 'region', 'country', 'sub', 'diff', 'kids', 'q', 'options', 'answer', 'fact', 'src', 'deeper', 'img'];
const mismatches = [];
CAL.forEach(e => {
  const live = BANK[e.bank_index];
  if (!live) { mismatches.push(e.bank_index + ': no such row'); return; }
  ECHO_FIELDS.forEach(f => {
    if (JSON.stringify(e[f]) !== JSON.stringify(live[f])) mismatches.push(e.bank_index + ':' + f);
  });
  if (e.id !== QI.qid(live)) mismatches.push(e.bank_index + ':qid');
});
is('echo is verbatim against the bank (all fields, all rows)', mismatches, []);
is('every calibration entry validates', CAL.map(e => QI.validateQuestion(e).ok), CAL.map(() => true));
is('sample covers all six categories', [...new Set(CAL.map(e => e.cat))].sort(), ['Arts', 'Geography', 'History', 'Nature', 'Science', 'Tech']);
ok('sample has both deeper and non-deeper questions',
  CAL.some(e => e.deeper && e.deeper.length) && CAL.some(e => !e.deeper));
ok('sample has both kids and non-kids questions', CAL.some(e => e.kids) && CAL.some(e => !e.kids));
ok('sample spans all three difficulties', [1, 2, 3].every(d => CAL.some(e => e.diff === d)));

console.log('\n\x1b[1mTiers — the provisional interface\x1b[0m');
const tiers = CAL.map(e => QI.deriveTier(e.intelligence));
ok('every entry derives a labelled tier', tiers.every(t => ['A', 'B', 'C', 'D', 'E'].indexOf(t.tier) !== -1));
ok('every derivation is flagged provisional', tiers.every(t => t.provisional === true));
const dist = {};
tiers.forEach(t => { dist[t.tier] = (dist[t.tier] || 0) + 1; });
console.log('  \x1b[90m     tier distribution (provisional): ' +
  ['A', 'B', 'C', 'D', 'E'].map(k => k + '=' + (dist[k] || 0)).join(' ') + '\x1b[0m');
// sanity anchors the review can hold the interface to: the trivia floor and
// the two clearest portals must not swap places
is('photosynthesis lands on the trivia floor (E)', QI.deriveTier(CAL.filter(e => /photosynthesis/i.test(e.q))[0].intelligence).tier, 'E');
is('Benin Bronzes lands portal-grade (A)', QI.deriveTier(CAL.filter(e => /Benin Bronzes/.test(e.q))[0].intelligence).tier, 'A');

console.log('');
if (failed) { console.log(`\x1b[31m\x1b[1mQI TESTS FAILED\x1b[0m  ${failed} failing`); process.exit(1); }
console.log('\x1b[32m\x1b[1mQI TESTS PASSED\x1b[0m  validator, bank, discovery, resources, calibration.');
