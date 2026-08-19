// P4 §17/§18 — QPIO matching quality + representation check at P4 scale.
// Runs the real production matcher (src/resources.js) against the real question bank.
const path = require('path');

console.log('=== QPIO P4 Matching Quality & Representation Check ===\n');

let pass = true;
function assert(c, m) {
  if (!c) { console.error(`✗ FAIL: ${m}`); pass = false; }
  else { console.log(`✓ PASS: ${m}`); }
}

global.window = {};
require(path.join(__dirname, '..', 'src', 'resources.js'));
require(path.join(__dirname, '..', 'src', 'questions.js'));

const CRN = global.window.CurioResourceNetwork;
const QUESTIONS = global.window.CURIO_QUESTIONS || [];

assert(resources_ok(), 'app contract loaded');
function resources_ok() {
  return Array.isArray(global.window.CURIO_RESOURCES) && global.window.CURIO_RESOURCES.length >= 1000;
}
console.log(`  resources in contract: ${global.window.CURIO_RESOURCES.length}`);
console.log(`  questions in bank: ${QUESTIONS.length}`);

// ---------------------------------------------------------------------------
// Matching quality across a representative sample (every 25th question)
// ---------------------------------------------------------------------------
const sample = QUESTIONS.filter((_, i) => i % 25 === 0);
let matched = 0;
let totalReturned = 0;
const resultSources = {};
const resultCountries = {};

for (const q of sample) {
  const matches = CRN.findResourcesForQuestion(q, 3);
  if (matches.length > 0) {
    matched++;
    totalReturned += matches.length;
    matches.forEach((r) => {
      resultSources[r.source_id] = (resultSources[r.source_id] || 0) + 1;
      resultCountries[r.country] = (resultCountries[r.country] || 0) + 1;
    });
  }
}

console.log(`\nSample size: ${sample.length} questions`);
console.log(`  with >=1 match: ${matched} (${((matched / sample.length) * 100).toFixed(0)}%)`);
console.log(`  restrained no-match: ${sample.length - matched}`);
console.log(`  avg resources per matched question: ${(totalReturned / Math.max(matched, 1)).toFixed(2)} (cap 3)`);

assert(matched > 0, 'matching produces results at P4 scale');
assert(matched < sample.length, 'restraint holds — not every question matches something');
assert(totalReturned <= matched * 3, 'density cap respected across sample');

// African-history questions should surface some non-Western or Africa-focused sources
const africaQs = QUESTIONS.filter((q) => q.region === 'Africa').slice(0, 40);
let africaHits = 0;
const africaSources = {};
for (const q of africaQs) {
  const matches = CRN.findResourcesForQuestion(q, 3);
  if (matches.length) {
    africaHits++;
    matches.forEach((r) => { africaSources[r.source_id] = (africaSources[r.source_id] || 0) + 1; });
  }
}
console.log(`\nAfrica-region questions sampled: ${africaQs.length}, with matches: ${africaHits}`);
console.log(`  source distribution on Africa questions: ${JSON.stringify(africaSources)}`);
assert(africaHits > 0, 'African-region questions surface resources');

console.log(`\nResult source spread (full sample): ${JSON.stringify(resultSources)}`);
console.log(`Result country spread (full sample): ${JSON.stringify(resultCountries)}`);

// ---------------------------------------------------------------------------
// Representation notes (printed, not asserted — analysis output for the report)
// ---------------------------------------------------------------------------
const poolByCountry = {};
global.window.CURIO_RESOURCES.forEach((r) => { poolByCountry[r.country] = (poolByCountry[r.country] || 0) + 1; });
console.log(`\nPool by country: ${JSON.stringify(poolByCountry)}`);
console.log('NOTE: concentration is reported to metrics.json; no quotas are applied.');

if (!pass) { console.error('\n✗ Matching quality check FAILED.'); process.exit(1); }
console.log('\n✓ Matching quality & representation check PASSED');
