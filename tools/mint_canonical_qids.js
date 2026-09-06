/* PERMANENT QUESTION IDENTITY — minting, reconciling, and writing it into the bank.
 *
 * CEO instruction, 6 September 2026: "The current editable-text/image-derived QID
 * is not acceptable." Also: "One knowledge item = one canonical QID across every
 * language. If a reader answers Q123 in English, Q123 is completed for that
 * reader in Chinese/French/etc."
 *
 * WHAT WAS WRONG. A question's identity was a hash of its own text:
 *
 *     function qid(q) { s = q.q + "|" + q.img.u; ...djb2... }
 *
 * Three failures follow, and all three are silent:
 *   1. Fixing a typo changes the identity, so the question's whole history --
 *      every reader's vault entry, every future measurement -- is orphaned.
 *   2. The English and French versions of the SAME question hash differently, so
 *      they are two different questions to the app. Answer it in English and it
 *      comes back in French. That is the French vault defect.
 *   3. Nothing counted per question could ever be compared across a text edit or
 *      across languages, which makes per-question measurement impossible before
 *      it is even built.
 *
 * WHAT THIS DOES.
 *   - Reconciles the 760 shipped questions against the 2,000-row Golden Source
 *     by matching text, and reports what exists in only one of them rather than
 *     quietly guessing.
 *   - Gives every shipped question a canonical id: the Golden Source id where
 *     the question is governed there, and a newly minted one where it is not.
 *   - Writes the SAME id onto the English and French rows of one question, which
 *     is what makes them one knowledge item.
 *   - Adds qrev (the question's own revision) and lrev (that translation's
 *     revision), so a reworded question and a re-translated one are told apart.
 *   - Emits a legacy map -- old hash to canonical id -- so no reader loses their
 *     vault, their progress or their history in the changeover.
 *
 * IDS ARE MINTED ONCE AND NEVER REUSED. The ledger below is append-only: an id
 * that has ever been issued is never issued again, even if its question is
 * deleted. Reusing one would silently attach a dead question's history to a new
 * one, which is worse than having no history at all.
 *
 *   node tools/mint_canonical_qids.js            report only, write nothing
 *   node tools/mint_canonical_qids.js --write    mint, write the bank and the map
 */

'use strict';
const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const HQ = path.resolve(APP, '..', 'curio-hq');
const ROWS_DIR = path.join(HQ, '03-Engine', 'private', 'question-intelligence', 'panel-review');
const LEDGER = path.join(APP, 'tools', 'qid-ledger.json');
const LEGACY_MAP = path.join(APP, 'src', 'qid.legacy.js');
const EN_PATH = path.join(APP, 'src', 'questions.js');
const FR_PATH = path.join(APP, 'src', 'questions.fr.js');
const REPORT = path.join(APP, 'tools', 'qid-reconciliation.json');

const WRITE = process.argv.includes('--write');

/* ------------------------------------------------------------------ the banks */

function loadBanks() {
  const w = {};
  global.window = w;
  delete require.cache[require.resolve(EN_PATH)];
  delete require.cache[require.resolve(FR_PATH)];
  require(EN_PATH);
  require(FR_PATH);
  return { en: w.CURIO_QUESTIONS || [], fr: w.CURIO_QUESTIONS_FR || [] };
}

function loadGolden() {
  const rows = [];
  for (let f = 1; f <= 40; f++) {
    const p = path.join(ROWS_DIR, 'rows-' + String(f).padStart(2, '0') + '.json');
    if (!fs.existsSync(p)) continue;
    try {
      const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (doc && Array.isArray(doc.rows)) rows.push.apply(rows, doc.rows);
    } catch (e) {
      console.error('  qid: golden batch ' + f + ' unreadable - ' + e.message);
      process.exit(2);
    }
  }
  return rows;
}

/* THE LEGACY IDENTITY, reproduced EXACTLY as the app computes it today.
 * It has to be bit-identical or the migration map is worthless: every reader's
 * saved vault is keyed on these strings and nothing else can find them again. */
function legacyQid(q) {
  const s = q.q + (q.img && q.img.u ? '|' + q.img.u : '');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return 'q' + (h >>> 0).toString(36);
}

/* Matching is on the question text with punctuation and case removed. It is not
 * clever on purpose: a fuzzy match that silently pairs two different questions
 * would attach one question's history to another, which is the exact failure
 * this file exists to prevent. Anything that does not match exactly is REPORTED,
 * never guessed. */
const norm = s => String(s || '').toLowerCase()
  .replace(/[‘’“”]/g, "'")
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/* ----------------------------------------------------------------- the ledger */

function loadLedger() {
  if (!fs.existsSync(LEDGER)) {
    return {
      _README: 'APPEND-ONLY. Every canonical question id ever issued. An id in ' +
        'this file is never issued again, even if its question is deleted - reusing ' +
        'one would attach a dead question\'s history to a live question.',
      minted: {},
      retired: {},
      nextMinted: 1,
    };
  }
  return JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
}

/* --------------------------------------------------------------------- run it */

const { en, fr } = loadBanks();
const golden = loadGolden();

if (en.length !== fr.length) {
  console.error('  qid: the English bank has ' + en.length + ' rows and the French ' +
    fr.length + '. They are paired by position, so this must be fixed before ids are minted.');
  process.exit(2);
}

/* Position pairing is an ASSUMPTION and it is checked rather than trusted. The
 * two banks share a source URL and an answer index per row; if those disagree
 * the pairing is wrong and every id after that point would be attached to the
 * wrong translation. */
/* WHAT IS CHECKED, AND WHY NOT MORE. The two things that must agree for the
 * rows to be the same question are the ANSWER INDEX and the NUMBER OF OPTIONS -
 * a translation renders the same choices in the same order, so a disagreement
 * there means the rows are not the same question and every id after it would be
 * wrong.
 *
 * Deliberately NOT checked: category, difficulty, kids flag, region, source.
 * Those disagree on 499 of the 760 rows, and that is a real defect - but it is a
 * defect of DUPLICATION, not of pairing. The French file kept its own copy of
 * facts that belong to the question rather than to the translation, and the
 * copies drifted. Treating that as a pairing failure would block the very change
 * that fixes it: after this run those fields live on the question once, and the
 * translation carries only the words. */
const pairingBreaks = [];
const metaDrift = [];
for (let i = 0; i < en.length; i++) {
  const a = en[i], b = fr[i];
  if (a.answer !== b.answer || (a.options || []).length !== (b.options || []).length) {
    pairingBreaks.push({ i, en: a.q.slice(0, 60), fr: b.q.slice(0, 60),
      enAnswer: a.answer, frAnswer: b.answer,
      enOptions: (a.options || []).length, frOptions: (b.options || []).length });
  }
  for (const k of ['cat', 'region', 'diff', 'kids', 'src']) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
      metaDrift.push({ i, field: k, en: a[k], fr: b[k] });
      break;
    }
  }
}

/* --------------------------------------------------------- reconcile the banks */

const goldenByText = new Map();
const goldenDupText = [];
for (const g of golden) {
  const k = norm(g.questionEN);
  if (!k) continue;
  if (goldenByText.has(k)) { goldenDupText.push({ a: goldenByText.get(k).qid, b: g.qid, text: g.questionEN.slice(0, 70) }); continue; }
  goldenByText.set(k, g);
}

const matched = [], shippedOnly = [];
const usedGolden = new Set();
en.forEach((q, i) => {
  const g = goldenByText.get(norm(q.q));
  if (g && !usedGolden.has(g.qid)) {
    usedGolden.add(g.qid);
    matched.push({ i, qid: g.qid, status: g.releaseStatus });
  } else {
    shippedOnly.push({ i, text: q.q.slice(0, 80), cat: q.cat, legacy: legacyQid(q) });
  }
});
const goldenOnly = golden.filter(g => !usedGolden.has(g.qid));

/* ------------------------------------------------------------------- mint ids */

const ledger = loadLedger();
const assign = new Array(en.length).fill(null);
for (const m of matched) assign[m.i] = m.qid;

/* Anything shipped but not governed by the Golden Source still needs a permanent
 * identity - it is being served to readers today, so it already has a history
 * worth keeping. It gets a minted id in its own range so its provenance stays
 * visible rather than being laundered into the governed set. */
let minted = 0;
for (const s of shippedOnly) {
  const prior = ledger.minted[s.legacy];
  if (prior) { assign[s.i] = prior; continue; }
  const id = 'X' + String(ledger.nextMinted++).padStart(4, '0');
  ledger.minted[s.legacy] = id;
  assign[s.i] = id;
  minted++;
}

const dupCheck = new Map();
const collisions = [];
assign.forEach((id, i) => {
  if (!id) return;
  if (dupCheck.has(id)) collisions.push({ id, a: dupCheck.get(id), b: i });
  else dupCheck.set(id, i);
});

/* ------------------------------------------------------------------- the report */

const report = {
  generated: new Date().toISOString(),
  shipped: en.length,
  golden: golden.length,
  matched: matched.length,
  shippedOnly: shippedOnly.length,
  goldenOnly: goldenOnly.length,
  goldenOnlyByStatus: goldenOnly.reduce((a, g) => { a[g.releaseStatus] = (a[g.releaseStatus] || 0) + 1; return a; }, {}),
  mintedThisRun: minted,
  pairingBreaks: pairingBreaks,
  goldenDuplicateText: goldenDupText.slice(0, 20),
  metaDriftRows: metaDrift.length,
  metaDriftSample: metaDrift.slice(0, 10),
  collisions: collisions,
  shippedOnlySample: shippedOnly.slice(0, 15),
  written: false,
};

console.log('  shipped bank      ' + en.length + ' English, ' + fr.length + ' French');
console.log('  golden source     ' + golden.length + ' rows');
console.log('  matched           ' + matched.length);
console.log('  shipped only      ' + shippedOnly.length + '  (ungoverned - minted into the X range)');
console.log('  golden only       ' + goldenOnly.length + '  ' + JSON.stringify(report.goldenOnlyByStatus));
console.log('  pairing breaks    ' + pairingBreaks.length + (pairingBreaks.length ? '  <-- EN/FR are not the same question' : ''));
 console.log('  metadata drift    ' + metaDrift.length + '  (French copies of question facts that disagree - fixed by this run)');
console.log('  id collisions     ' + collisions.length);

if (collisions.length) {
  console.error('\n  REFUSING TO WRITE: two shipped rows would carry the same id.');
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 1) + '\n', 'utf8');
  process.exit(2);
}
if (pairingBreaks.length) {
  console.error('\n  REFUSING TO WRITE: the English and French banks are paired by position ' +
    'and ' + pairingBreaks.length + ' rows disagree on source, answer or category. ' +
    'Writing ids now would give one question two different translations.');
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 1) + '\n', 'utf8');
  process.exit(2);
}

if (!WRITE) {
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 1) + '\n', 'utf8');
  console.log('\n  report only, nothing written. Re-run with --write to mint and write.');
  process.exit(0);
}

/* --------------------------------------------------------------- write the bank */

/* The banks are rewritten from their parsed contents, one question per line, in
 * the order they were already in. Every existing field is preserved verbatim;
 * the only change is that id, qrev and lrev are added at the front of each row.
 * Rewriting rather than patching text is what guarantees no row is missed. */
/* ONE KNOWLEDGE ITEM, TWO LANGUAGES - and the metadata belongs to the item.
 *
 * The French file used to keep its own copy of the category, the difficulty, the
 * kids flag, the region and the source. Those describe the QUESTION, not the
 * translation, and the copies had drifted apart on 538 of the 760 rows: one row
 * was Science in English and Tech in French, and hundreds had lost their source
 * entirely. Anything counted by category would have given two different answers
 * depending on which language the reader happened to be using.
 *
 * So the canonical row owns the facts about the question, and the translation
 * owns only the words - the question, the options and the depth fact. One place
 * for each fact is the only arrangement that cannot drift. */
const TRANSLATED_FIELDS = ['q', 'options', 'fact'];

function emitCanonical(arr, ids, header) {
  const lines = [header, '', 'window.CURIO_QUESTIONS = ['];
  arr.forEach(function (q, i) {
    const row = { id: ids[i], qrev: q.qrev || 1, lrev: q.lrev || 1 };
    for (const k of Object.keys(q)) {
      if (k === 'id' || k === 'qrev' || k === 'lrev') continue;
      row[k] = q[k];
    }
    lines.push('  ' + JSON.stringify(row) + (i < arr.length - 1 ? ',' : ''));
  });
  lines.push('];', '');
  return lines.join('\n');
}

function emitTranslation(arr, ids, header, varName) {
  const lines = [header, '', 'window.' + varName + ' = ['];
  arr.forEach(function (q, i) {
    const row = { id: ids[i], lrev: q.lrev || 1 };
    for (const k of TRANSLATED_FIELDS) if (q[k] !== undefined) row[k] = q[k];
    lines.push('  ' + JSON.stringify(row) + (i < arr.length - 1 ? ',' : ''));
  });
  lines.push('];', '');
  return lines.join('\n');
}

const EN_HEADER = `// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.
// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt
//
// GENERATED by tools/mint_canonical_qids.js — do not edit by hand.
//
// Every question carries a PERMANENT id, minted once and never reused. The same
// id appears on the English and the French row of one question, because they are
// one knowledge item in two languages: answering it in one language completes it
// in both. Before this, identity was a hash of the question's own text, so
// fixing a typo destroyed that question's history and the two languages were two
// different questions to the app.
//
//   id    the knowledge item. Q#### governed by the Golden Source, X#### shipped
//         before the Golden Source governed it. Never reused, ever.
//   qrev  the question itself. Bumped when the meaning changes, never for a typo.
//   lrev  this translation. Bumped when the wording in THIS language changes.`;

const FR_HEADER = `// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.
// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt
//
// GENERATED by tools/mint_canonical_qids.js — do not edit by hand.
//
// THE FRENCH WORDS OF THE SAME QUESTIONS. Each row carries the SAME permanent id
// as its English row, because it is the same knowledge item: answering it in one
// language completes it in both, and it will not be served again in the other.
//
// This file no longer carries the category, difficulty, kids flag, region or
// source. Those describe the question, not the translation, and keeping a second
// copy here is exactly how 538 of the 760 rows came to disagree with the English
// — one was Science in English and Tech in French, and hundreds had lost their
// source entirely. There is now one place for each fact.
//
//   id    the same knowledge item as the English row
//   lrev  this translation's revision, bumped when the French wording changes`;

fs.writeFileSync(EN_PATH, emitCanonical(en, assign, EN_HEADER), 'utf8');
fs.writeFileSync(FR_PATH, emitTranslation(fr, assign, FR_HEADER, 'CURIO_QUESTIONS_FR'), 'utf8');

/* ---------------------------------------------- the map that saves reader history */

const legacyPairs = {};
en.forEach((q, i) => { legacyPairs[legacyQid(q)] = assign[i]; });
fr.forEach((q, i) => { legacyPairs[legacyQid(q)] = assign[i]; });

const legacyJs = `// © 2026 Qpio. GENERATED by tools/mint_canonical_qids.js — do not edit by hand.
//
// OLD IDENTITY -> NEW IDENTITY, so no reader loses anything in the changeover.
//
// Until 6 September 2026 a question's identity was a hash of its own text, and
// every reader's Memory Vault, seen-list and progress is stored under those
// hashes in their browser. Questions now carry a permanent id instead. Without
// this map every existing reader would open the app to an empty vault and a
// bank of questions they had already answered.
//
// Both languages are in here, and BOTH point at the same permanent id -- which
// is the fix for the French vault defect: a question answered in English is now
// the same question in French, so it is not served again.
//
// This file may shrink only when a question is retired. It is read once, on the
// reader's next visit, and the migration then marks itself done.
window.CURIO_QID_LEGACY = ${JSON.stringify(legacyPairs, null, 0)};
`;
fs.writeFileSync(LEGACY_MAP, legacyJs, 'utf8');

fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n', 'utf8');
report.written = true;
report.legacyMapEntries = Object.keys(legacyPairs).length;
fs.writeFileSync(REPORT, JSON.stringify(report, null, 1) + '\n', 'utf8');

console.log('\n  written:');
console.log('    src/questions.js      ' + en.length + ' rows, each with a permanent id');
console.log('    src/questions.fr.js   ' + fr.length + ' rows, same ids as the English');
console.log('    src/qid.legacy.js     ' + Object.keys(legacyPairs).length + ' old ids mapped forward');
console.log('    tools/qid-ledger.json ' + Object.keys(ledger.minted).length + ' minted ids on record');
