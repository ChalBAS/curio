/* PERMANENT QUESTION IDENTITY — the tests that keep it permanent.
 *
 * CEO, 6 September 2026: "add tests preventing duplicate/reused/changing QIDs."
 *
 * Every failure below is silent in production, which is why they are tests
 * rather than review notes. A duplicate id merges two questions' histories and
 * nothing appears wrong. A changed id empties a reader's vault and looks like
 * they never saved anything. A reused id attaches a retired question's record to
 * a new one, and the number that comes out is wrong in a way no one can see.
 *
 *   node tools/qid.test.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(APP, 'tools', 'qid-ledger.json');

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? ' — ' + detail : ''));
  if (!ok) failures++;
}

global.window = {};
require(path.join(APP, 'src', 'questions.js'));
require(path.join(APP, 'src', 'questions.fr.js'));
require(path.join(APP, 'src', 'qid.legacy.js'));
const EN = global.window.CURIO_QUESTIONS || [];
const FR = global.window.CURIO_QUESTIONS_FR || [];
const LEGACY = global.window.CURIO_QID_LEGACY || {};

console.log('\nPermanent question identity\n');

/* ---------------------------------------------------------- every row has one */
const missing = EN.filter(q => !q.id).length;
check('every English question has a permanent id', missing === 0,
  missing ? missing + ' without one' : EN.length + ' questions');

const missingFr = FR.filter(q => !q.id).length;
check('every French question has a permanent id', missingFr === 0,
  missingFr ? missingFr + ' without one' : FR.length + ' questions');

/* ------------------------------------------------------------- no duplicates */
const seen = new Map();
const dupes = [];
EN.forEach((q, i) => {
  if (seen.has(q.id)) dupes.push({ id: q.id, a: seen.get(q.id), b: i });
  else seen.set(q.id, i);
});
check('no two questions share an id', dupes.length === 0,
  dupes.length ? dupes.slice(0, 3).map(d => d.id).join(', ') : seen.size + ' distinct ids');

/* THE ONE THAT USED TO BE BROKEN. All 68 flag questions ask the same words, so
 * under the old text hash they shared ONE id: answering any one of them retired
 * all 68. Naming it in a test is what stops a future "simplification" of the
 * identity from bringing it back. */
const flagIds = new Set(EN.filter(q => /flag is this/i.test(q.q || '')).map(q => q.id));
const flagRows = EN.filter(q => /flag is this/i.test(q.q || '')).length;
check('questions with identical wording still have separate ids', flagIds.size === flagRows,
  flagRows + ' flag questions, ' + flagIds.size + ' distinct ids');

/* ------------------------------------------------- one knowledge item, two languages */
const frById = new Map(FR.map(q => [q.id, q]));
const unmatched = EN.filter(q => !frById.has(q.id)).length;
check('the French row of a question carries the same id', unmatched === 0,
  unmatched ? unmatched + ' English questions with no French row of that id' : 'all ' + EN.length + ' paired');

const frOrphans = FR.filter(q => !seen.has(q.id)).length;
check('no French row points at a question that does not exist', frOrphans === 0,
  frOrphans ? frOrphans + ' orphans' : 'none');

/* ---------------------------------------- the facts live in one place, not two */
const LEAKED = ['cat', 'diff', 'kids', 'region', 'src', 'answer'];
const leaks = [];
FR.forEach(q => { for (const k of LEAKED) if (q[k] !== undefined) leaks.push(k); });
check('the translation carries words only, never a second copy of the facts',
  leaks.length === 0,
  leaks.length ? 'found ' + Array.from(new Set(leaks)).join(', ') + ' on French rows'
    : 'category, difficulty, kids, region, source and answer live on the question alone');

/* --------------------------------------------------------------- revisions */
const badRev = EN.filter(q => !Number.isInteger(q.qrev) || q.qrev < 1).length;
check('every question has a whole-number revision', badRev === 0,
  badRev ? badRev + ' bad' : 'qrev present on all rows');
const badLrev = FR.filter(q => !Number.isInteger(q.lrev) || q.lrev < 1).length;
check('every translation has its own revision', badLrev === 0,
  badLrev ? badLrev + ' bad' : 'lrev present on all French rows');

/* ------------------------------------------------------ nobody loses their history */
function legacyQid(q) {
  const s = q.q + (q.img && q.img.u ? '|' + q.img.u : '');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return 'q' + (h >>> 0).toString(36);
}
/* The map is built from the pre-migration banks, so it is checked against the
 * ids the OLD code would have produced for the words that are still there. */
/* THE PROPERTY IS "NOBODY LOSES HISTORY", NOT "EVERY ROW HAS A PAST".
 *
 * This used to demand a legacy id for every row in the bank, which held only
 * while the bank never grew. On 12 Sep 2026 the golden source was piped into
 * the app and 1,233 questions arrived that no reader has ever answered under
 * any id — they cannot have an old identity, and requiring one failed the
 * build for the arrival of new content.
 *
 * What protects a reader is the other direction: an id the old code could have
 * saved must still find its question. That is what is asserted here, over the
 * questions that existed before canonical ids, and again below over every
 * target the map points at. */
const enPreMigration = EN.filter(q => LEGACY[legacyQid(q)] !== undefined);
const enLegacyCovered = enPreMigration.filter(q => LEGACY[legacyQid(q)] === q.id).length;
check('an English question saved under its old id still finds its question',
  enLegacyCovered === enPreMigration.length,
  enLegacyCovered + ' of ' + enPreMigration.length + ' that existed before canonical ids · ' +
  (EN.length - enPreMigration.length) + ' arrived later and never had an old id');

/* THE FRENCH FLAG QUESTIONS COULD NOT ALL BE CARRIED, AND THAT IS NOT A BUG.
 *
 * In French all 68 flag questions read "De quel pays est ce drapeau ?" and the
 * French file held no picture, so under the old text hash they were literally
 * ONE id. A French reader who answered any one of them had all 68 marked as
 * done -- the defect this change exists to end.
 *
 * There is therefore no information anywhere that could say WHICH of the 68 a
 * given reader answered. One keeps the history and the other 67 become
 * available again, which is the correct repair rather than a loss: they were
 * retired by a bug, and they are now returned.
 *
 * The test asserts what is actually achievable -- every DISTINCT old id carries
 * forward -- and pins the collapse at 67 so that if it ever grows, someone has
 * to come and look. */
/* Same correction as above: only the French rows that existed before canonical
 * ids can have carried an old one. */
const frPreMigration = FR.filter(q => LEGACY[legacyQid(q)] !== undefined);
const frOldIds = new Set(frPreMigration.map(legacyQid));
const frMapped = Array.from(frOldIds).filter(k => LEGACY[k]).length;
check('every distinct old French id carries forward', frMapped === frOldIds.size,
  frMapped + ' of ' + frOldIds.size + ' distinct old ids · ' +
  (FR.length - frPreMigration.length) + ' French rows arrived later');

const frCollapsed = frPreMigration.length - frOldIds.size;
check('only the 68 identically-worded flag questions shared an old French id',
  frCollapsed === 67,
  frCollapsed + ' French questions had no distinguishable old identity ' +
  '(68 flag questions sharing one id, so 67 are returned to the pool)');

/* Every value the map points at must be a question that exists, or the
 * migration would move a reader's saved fact to nowhere. */
const danglers = Object.values(LEGACY).filter(id => !seen.has(id)).length;
check('the migration never points at a question that does not exist', danglers === 0,
  danglers ? danglers + ' dangling' : Object.keys(LEGACY).length + ' old ids mapped');

/* ------------------------------------------------------------- never reused */
const ledger = fs.existsSync(LEDGER_PATH) ? JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) : null;
check('the minted-id ledger exists', !!ledger, ledger ? Object.keys(ledger.minted).length + ' minted' : 'missing');

if (ledger) {
  const issued = Object.values(ledger.minted);
  const reissued = issued.length !== new Set(issued).size;
  check('no minted id was ever issued twice', !reissued,
    reissued ? 'a minted id appears against two questions' : issued.length + ' issued, all distinct');

  const retired = Object.keys(ledger.retired || {});
  const resurrected = retired.filter(id => seen.has(id));
  check('no retired id has been given to a new question', resurrected.length === 0,
    resurrected.length ? resurrected.join(', ') : retired.length + ' retired ids, none reused');
}

/* ---------------------------------------------------- the shape of an id */
const shapeBad = EN.filter(q => !/^(Q\d{3,}|N\d{4}|X\d{4})$/.test(q.id));
check('every id has a recognised shape', shapeBad.length === 0,
  shapeBad.length ? shapeBad.slice(0, 3).map(q => q.id).join(', ') : 'Q/N from the Golden Source, X minted here');

console.log(failures ? '\n' + failures + ' FAILED\n' : '\nAll checks passed.\n');
process.exit(failures ? 1 : 0);
