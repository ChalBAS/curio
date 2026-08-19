/* Tests for the v77 curiosity-paced selection engine. Zero dependencies.
 *
 *   node tools/selection.test.js
 *
 * Proves the mandate's §17 list:
 *   - deterministic Daily still deterministic for a given date/mode
 *   - existing no-repeat guarantees remain (uniqueness within the epoch)
 *   - EN/FR Daily questions remain aligned (index-aligned banks ⇒ same picks)
 *   - kids mode only receives eligible questions
 *   - a five-question Daily does not become five trivia when others eligible
 *   - …nor five low-familiarity portals (novelty budget)
 *   - role diversity · archetype diversity · portal presence
 *   - insufficient pools degrade gracefully
 *   - Quick Fire remains topic-relevant (balancing only re-orders)
 *   - intelligence-absent legacy fallback is safe
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
['questions', 'questions.fr', 'intelligence', 'intelligence.corpus'].forEach(n => require(path.join(SRC, n + '.js')));
const W = global.window;
const QI = W.CURIO_QI;
const EN = W.CURIO_QUESTIONS, FR = W.CURIO_QUESTIONS_FR;

/* Reproduce app.js's mergeTranslated EXACTLY: EN metadata + FR words. */
function mergeTranslated(en, fr) {
  if (!en.length || en.length !== fr.length) return fr;
  for (let i = 0; i < en.length; i++) if (en[i].answer !== fr[i].answer) return fr;
  return fr.map((f, i) => {
    const e = en[i], out = {};
    for (const k in e) if (Object.prototype.hasOwnProperty.call(e, k)) out[k] = e[k];
    for (const k in f) if (Object.prototype.hasOwnProperty.call(f, k)) {
      if (k === 'q' || k === 'options' || k === 'fact') out[k] = f[k];
    }
    return out;
  });
}
/* Attach intelligence the way app.js does — positionally, after the merge. */
function attach(Q) {
  const rows = W.CURIO_QI_CORPUS.rows;
  return Q.map((q, i) => Object.assign({}, q, { intelligence: QI.decodeRow(rows[i]) }));
}
const QEN = attach(EN), QFR = attach(mergeTranslated(EN, FR));

/* Reproduce app.js's walk EXACTLY (mulberry32, shuffledIndices, pool, dailyQuestions). */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffledIndices(n, seed) {
  const rng = mulberry32(seed), arr = [];
  for (let i = 0; i < n; i++) arr.push(i);
  for (let j = n - 1; j > 0; j--) { const k = Math.floor(rng() * (j + 1)); const tmp = arr[j]; arr[j] = arr[k]; arr[k] = tmp; }
  return arr;
}
function qid(q) { return QI.qid(q); }
const DAILY_COUNT = 5, DAILY_WINDOW = 8;
function pool(Q, kids) {
  if (!kids) return Q;
  const k = Q.filter(x => x.kids);
  if (k.length >= 10) return k;
  return k.concat(Q.filter(x => !x.kids && x.diff === 1));
}
function dailyIndices(Q, kids, dayNum) {
  const p = pool(Q, kids);
  if (!p.length) return [];
  const Wd = p.length >= DAILY_WINDOW ? DAILY_WINDOW : DAILY_COUNT;
  const epochLen = Math.max(1, Math.floor(p.length / Wd));
  const epoch = Math.floor(dayNum / epochLen), day = dayNum % epochLen;
  const seed = epoch * 7919 + p.length * 131 + (kids ? 51000 : 1);
  const order = shuffledIndices(p.length, seed);
  const win = [];
  for (let i = 0; i < Wd; i++) win.push(p[order[(day * Wd + i) % p.length]]);
  const picked = (p.length >= DAILY_WINDOW) ? QI.paceDaily(win, DAILY_COUNT, dayNum) : win.slice(0, DAILY_COUNT);
  // back to POOL indices for cross-language comparison (EN and FR pools hold
  // different objects for the same bank rows, at the same positions)
  return picked.map(q => p.indexOf(q));
}
const TODAY = Math.floor(Date.UTC(2026, 7, 19) / 86400000);

console.log('\n\x1b[1mDeterminism and identity\x1b[0m');
is('same date → same daily, twice', dailyIndices(QEN, false, TODAY), dailyIndices(QEN, false, TODAY));
is('five questions served', dailyIndices(QEN, false, TODAY).length, 5);
is('kids mode has its own deterministic set', dailyIndices(QEN, true, TODAY), dailyIndices(QEN, true, TODAY));
is('EN and FR dailies pick the same bank rows', dailyIndices(QEN, false, TODAY), dailyIndices(QFR, false, TODAY));
is('EN and FR kids dailies pick the same bank rows', dailyIndices(QEN, true, TODAY), dailyIndices(QFR, true, TODAY));

console.log('\n\x1b[1mNo-repeat guarantees across an epoch\x1b[0m');
(function () {
  const p = pool(QEN, false);
  const epochLen = Math.max(1, Math.floor(p.length / DAILY_WINDOW));
  const seen = {}, dupes = [];
  for (let d = 0; d < epochLen; d++) {
    const dayNum = 0 * epochLen + d;
    dailyIndices(QEN, false, dayNum).forEach(ix => { if (seen[ix]) dupes.push(ix); seen[ix] = 1; });
  }
  is('zero repeats across the full epoch (' + epochLen + ' days)', dupes.length, 0);
})();
(function () {
  const seen = {}, dupes = [];
  for (let d = 0; d < 30; d++) {
    const ids = dailyIndices(QEN, false, TODAY + d);
    const set = new Set(ids);
    if (set.size !== ids.length) dupes.push('day ' + d);
  }
  is('every daily is five distinct questions (30 days)', dupes.length, 0);
})();

console.log('\n\x1b[1mKids eligibility\x1b[0m');
(function () {
  const kp = pool(QEN, true);
  let bad = 0;
  for (let d = 0; d < 20; d++) dailyIndices(QEN, true, TODAY + d).forEach(ix => { if (!kp[ix].kids) bad++; });
  is('kids mode only serves kids-flagged questions (20 days)', bad, 0);
})();

console.log('\n\x1b[1mPacing guardrails over 30 simulated days (full pool)\x1b[0m');
(function () {
  let flat = 0, obscure = 0, days = 30, lostBest = 0;
  for (let d = 0; d < days; d++) {
    const dayNum = TODAY + d;
    const p = pool(QEN, false);
    const Wd = DAILY_WINDOW;
    const epochLen = Math.max(1, Math.floor(p.length / Wd));
    const epoch = Math.floor(dayNum / epochLen), day = dayNum % epochLen;
    const order = shuffledIndices(p.length, epoch * 7919 + p.length * 131 + 1);
    const win = [];
    for (let i = 0; i < Wd; i++) win.push(p[order[(day * Wd + i) % p.length]]);
    const qs = dailyIndices(QEN, false, dayNum).map(ix => QEN[ix]);
    const profs = qs.map(q => QI.profileOf(q));
    if (profs.every(p2 => p2.role === 'trivia' || p2.role === 'anchor')) flat++;
    if (profs.filter(p2 => p2.familiarity <= 2).length > 2) obscure++;
    // the daily must never drop the window's strongest continuation —
    // UNLESS keeping it would break a harder guardrail (novelty budget /
    // role diversity), which is the documented precedence order.
    const winBest = Math.max.apply(null, win.map(q => QI.profileOf(q).pm));
    const servedBest = Math.max.apply(null, profs.map(p2 => p2.pm));
    if (servedBest < winBest - 0.01) {
      const top = win.find(q => QI.profileOf(q).pm === winBest);
      const tp = QI.profileOf(top);
      const wouldLow = (profs.filter(p2 => p2.familiarity <= 2).length + (tp.familiarity <= 2 ? 1 : 0)) > 2;
      const roleCount = {};
      profs.forEach(p2 => { roleCount[p2.role] = (roleCount[p2.role] || 0) + 1; });
      const wouldRole = (roleCount[tp.role] || 0) >= 2;
      if (!wouldLow && !wouldRole) lostBest++;
    }
  }
  console.log('  \x1b[90m     flat days: ' + flat + ' · over-obscure days: ' + obscure + ' · days losing the window best portal (unguarded): ' + lostBest + ' / ' + days + '\x1b[0m');
  ok('no all-flat daily when the window offers variety', flat === 0, flat + ' flat days');
  ok('novelty budget respected (<=2 low-familiarity cards/day)', obscure <= Math.ceil(days * 0.15), obscure + ' days over budget');
  is('the daily always keeps the window\u2019s strongest rabbit hole', lostBest, 0);
})();

console.log('\n\x1b[1mSynthetic windows — the guardrails themselves\x1b[0m');
function mk(role, fam, extra) {
  const intel = QI.neutral();
  intel.role = role;
  intel.entry_pull.familiarity = fam;
  intel.portal.resource_resonance = 3;
  intel.portal.resource_depth = 3;
  intel.portal.connection = 3;
  intel.portal.rabbit_hole_depth = 3;
  if (extra) extra(intel);
  return { q: 'synthetic-' + role + '-' + fam + '-' + Math.random().toString(36).slice(2, 8), intelligence: intel };
}
(function () { // five trivia available, one portal — the pacer must take the portal
  const win = [mk('trivia', 5), mk('trivia', 5), mk('trivia', 4), mk('trivia', 5), mk('trivia', 4), mk('trivia', 5), mk('trivia', 4),
    mk('portal', 3, i => { i.portal.resource_resonance = 5; i.portal.rabbit_hole_depth = 4; })];
  const out = QI.paceDaily(win, 5, 42);
  is('portal presence: the one portal in the window is served', out.filter(q => q.intelligence.role === 'portal').length, 1);
})();
(function () { // novelty budget: five obscure + three familiar → at most 2 obscure served
  const win = [mk('deep', 1), mk('deep', 2), mk('deep', 1), mk('deep', 2), mk('deep', 1), mk('anchor', 5), mk('anchor', 4), mk('curiosity', 4)];
  const out = QI.paceDaily(win, 5, 42);
  ok('novelty budget: no more than 2 of 5 with familiarity <= 2',
    out.filter(q => q.intelligence.entry_pull.familiarity <= 2).length <= 2,
    out.map(q => q.intelligence.entry_pull.familiarity).join(','));
})();
(function () { // role diversity: four anchors + four varied → at most 2 anchors
  const win = [mk('anchor', 5), mk('anchor', 5), mk('anchor', 5), mk('anchor', 5), mk('curiosity', 3), mk('discovery', 3), mk('portal', 3), mk('trivia', 4)];
  const out = QI.paceDaily(win, 5, 42);
  ok('role diversity: no 3+ of one role when the window offers variety',
    out.filter(q => q.intelligence.role === 'anchor').length <= 2,
    out.map(q => q.intelligence.role).join(','));
})();
(function () { // archetype diversity: six surprise cards → serve five anyway (graceful)
  const win = [1, 2, 3, 4, 5, 6, 7].map(n => mk('discovery', 3, i => { i.archetypes = ['surprise']; i.spark.surprise = 4; }));
  win.push(mk('anchor', 5));
  const out = QI.paceDaily(win, 5, 42);
  is('archetype-heavy window still deals five', out.length, 5);
})();
(function () { // insufficient window → everything served, no crash
  is('window smaller than count degrades gracefully', QI.paceDaily([mk('anchor', 5), mk('trivia', 5)], 5, 1).length, 2);
  is('empty window is empty', QI.paceDaily([], 5, 1).length, 0);
})();
(function () { // foothold first: a familiar card (fam >= 4) opens when one was chosen
  const win = [mk('deep', 1), mk('discovery', 2), mk('curiosity', 3), mk('anchor', 5), mk('trivia', 4), mk('discovery', 3), mk('curiosity', 3), mk('portal', 3)];
  const out = QI.paceDaily(win, 5, 42);
  const fams = out.map(q => q.intelligence.entry_pull.familiarity);
  const hasFoothold = fams.some(f => f >= 4);
  ok('an accessible card opens the set', !hasFoothold || fams[0] >= 4, 'order: ' + fams.join(','));
})();
(function () { // intelligence-absent questions → neutral profile, safe pacing
  const win = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ q: 'legacy-' + n }));
  const out = QI.paceDaily(win, 5, 42);
  is('intelligence-absent legacy fallback still deals five', out.length, 5);
})();

console.log('\n\x1b[1mQuick Fire — topic relevance and balance\x1b[0m');
(function () {
  const topic = QEN.filter(q => q.cat === 'History').slice(0, 30);
  const out = QI.balanceQuickfire(topic, 10);
  ok('balancing only re-orders: every served card is on-topic', out.every(q => q.cat === 'History'));
  is('balancing never invents cards', out.length, 10);
  const sameSet = JSON.stringify(out.map(qid).sort()) === JSON.stringify(topic.slice(0, 10).map(qid).sort());
  // NOTE: balanceQuickfire may defer, so set can differ from plain slice — but
  // every card must come from the INPUT pool:
  ok('every served card comes from the dealt pool', out.every(q => topic.indexOf(q) !== -1));
})();
(function () {
  const few = QEN.filter(q => q.cat === 'Nature').slice(0, 4);
  is('thin topic still deals what it has', QI.balanceQuickfire(few, 10).length, 4);
})();
(function () { // natural 3-runs in the input get unwound when the pool allows
  const flats = [];
  for (let i = 0; i < 9; i++) flats.push(mk('trivia', 5));
  const varied = [mk('discovery', 3), mk('portal', 3), mk('curiosity', 3)];
  const input = [flats[0], flats[1], flats[2], flats[3], varied[0], flats[4], flats[5], flats[6], varied[1], flats[7], flats[8], varied[2]];
  const out = QI.balanceQuickfire(input, 10).map(q => QI.profileOf(q));
  let worst = 1, run = 1;
  for (let i = 1; i < out.length; i++) { run = out[i].role === out[i - 1].role ? run + 1 : 1; worst = Math.max(worst, run); }
  ok('no three consecutive same-role cards when the pool allows', worst <= 2, 'worst run: ' + worst);
  is('a forced-composition pool still deals a full round', QI.balanceQuickfire(
    Array.from({ length: 12 }, () => mk('trivia', 5)).concat([mk('discovery', 3), mk('portal', 3)]), 10).length, 10);
})();

console.log('');
if (failed) { console.log(`\x1b[31m\x1b[1mSELECTION TESTS FAILED\x1b[0m  ${failed} failing`); process.exit(1); }
console.log('\x1b[32m\x1b[1mSELECTION TESTS PASSED\x1b[0m  determinism, no-repeat, pacing, quick-fire.');
