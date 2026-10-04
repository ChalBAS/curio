/* THE IDENTITY TOOL KNOWS EVERY GOVERNED ROW, INCLUDING THE ONES ADDED LATER.
 *
 * Found 4 Oct 2026: tools/mint_canonical_qids.js read panel batches 1-40 only, so
 * the 128 questions added beside the workbook on 29 Sep (curio-hq
 * inventory/added-rows.json, N2001-N2128, read by the panel as batches 41-43)
 * were invisible to it. The day one of them shipped it would have been minted an
 * X id - a second identity for a question that already has one.
 *
 * Needs the curio-hq checkout next to this one (the panel batches are private to
 * it); without it every check is skipped, saying so. Never runs the tool itself
 * and never writes.
 *
 *   node tools/mint_canonical_qids.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const HQ = path.resolve(APP, '..', 'curio-hq');
const ROWS_DIR = path.join(HQ, '03-Engine', 'private', 'question-intelligence', 'panel-review');
const ADDED = path.join(HQ, '03-Engine', 'question-intelligence', 'inventory', 'added-rows.json');
const REPORT = path.join(APP, 'tools', 'qid-reconciliation.json');

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? ' — ' + detail : ''));
  if (!ok) failures++;
}

console.log('\nThe identity tool reads every governed row\n');
if (!fs.existsSync(ROWS_DIR)) {
  console.log('  --  skipped: no curio-hq panel batches at ' + ROWS_DIR + '\n');
  process.exit(0);
}

const reportBefore = fs.existsSync(REPORT) ? fs.statSync(REPORT).mtimeMs : null;
const M = require('./mint_canonical_qids.js');
check('requiring the tool runs nothing and writes nothing',
  typeof M.loadGolden === 'function' && (fs.existsSync(REPORT) ? fs.statSync(REPORT).mtimeMs : null) === reportBefore);

const golden = M.loadGolden();
const ids = golden.map(g => g.qid);
check('one record per question', new Set(ids).size === ids.length, ids.length + ' records');

/* every batch the panel read, by name, is in */
const batchIds = [];
const workbookBatch = {};
for (let f = 1; f <= 99; f++) {
  const p = path.join(ROWS_DIR, 'rows-' + String(f).padStart(2, '0') + '.json');
  if (!fs.existsSync(p)) continue;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const r of doc.rows || []) if (r && r.qid) { batchIds.push(r.qid); if (doc.workbook) workbookBatch[r.qid] = r; }
}
const have = new Set(ids);
const missingBatch = batchIds.filter(id => !have.has(id));
check('every row of every panel batch is known (batches 41-43 included)', missingBatch.length === 0,
  missingBatch.length ? missingBatch.length + ' missing, first ' + missingBatch.slice(0, 5).join(', ') : batchIds.length + ' batch rows');

/* a workbook row comes out exactly as its batch has it - nothing already governed moved */
const byId = new Map(golden.map(g => [g.qid, g]));
const changed = Object.keys(workbookBatch).filter(id => JSON.stringify(byId.get(id)) !== JSON.stringify(workbookBatch[id]));
check('a workbook row is read exactly as before', changed.length === 0,
  changed.length ? changed.slice(0, 5).join(', ') : Object.keys(workbookBatch).length + ' workbook rows unchanged');

const added = fs.existsSync(ADDED) ? (JSON.parse(fs.readFileSync(ADDED, 'utf8')).rows || []).filter(a => a && a.qid) : [];
check('the added rows exist to be read', added.length > 0, added.length + ' rows in added-rows.json');
const missingAdded = added.filter(a => !have.has(a.qid)).map(a => a.qid);
check('every added row is known', missingAdded.length === 0, missingAdded.length ? missingAdded.slice(0, 5).join(', ') : 'all ' + added.length);
const n2 = new Set(added.filter(a => /^N\d{4}$/.test(a.qid) && +a.qid.slice(1) >= 2001 && +a.qid.slice(1) <= 2128).map(a => a.qid)).size;
check('N2001-N2128 are all among them', n2 === 128, n2 + ' of 128');

/* THE POINT: shipped as they are today, each added question keeps its own id */
const keyed = new Map();
for (const g of golden) { const k = M.goldenKey(g); if (!keyed.has(k)) keyed.set(k, g.qid); }
const wouldMint = added.filter(a => keyed.get(M.shippedKey({ q: a.q, options: a.options, answer: a.answerIndex })) !== a.qid
  && !workbookBatch[a.qid]);
check('an added question, once shipped, is matched to its own id instead of minted an X id', wouldMint.length === 0,
  wouldMint.length ? wouldMint.slice(0, 5).map(a => a.qid).join(', ') : added.length + ' matched');

console.log(failures ? '\n' + failures + ' FAILED\n' : '\nAll checks passed.\n');
process.exit(failures ? 1 : 0);
