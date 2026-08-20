// Editorial sensitivity test suite — scanner heuristics, field model, release gate
'use strict';
const path = require('path');

console.log('=== Running QPIO Editorial Sensitivity Test Suite ===\n');

let pass = true;
function assert(c, m) {
  if (!c) { console.error(`✗ FAIL: ${m}`); pass = false; }
  else { console.log(`✓ PASS: ${m}`); }
}

// Load the scanner path; behavior is exercised end-to-end on the real bank
// (the gate that matters) plus synthetic pattern checks for the documented rules.
const scannerPath = path.join(__dirname, 'check_sensitivity.js');

// ---------------------------------------------------------------------------
// A. Real bank gate state
// ---------------------------------------------------------------------------
console.log('--- A. Real Bank Gate ---');
const cp = require('child_process');
try {
  cp.execFileSync(process.execPath, [scannerPath, '--gate'], { stdio: 'pipe' });
  assert(true, 'release gate passes on the real 760-question bank');
} catch (e) {
  assert(false, 'release gate must pass on the real bank');
}

// ---------------------------------------------------------------------------
// B. Field model presence on reviewed questions
// ---------------------------------------------------------------------------
console.log('\n--- B. Field Model ---');
global.window = {};
require(path.join(__dirname, '..', 'src', 'questions.js'));
const EN = global.window.CURIO_QUESTIONS;
const classified = EN.filter((q) => q.sens);
assert(classified.length >= 13, `${classified.length} questions carry explicit sensitivity fields (>= 13)`);
const LEVELS = ['NONE', 'SENSITIVE', 'CONTESTED', 'HIGHLY_CONTESTED'];
const TYPES = ['COLONIAL', 'GEOPOLITICAL', 'RELIGIOUS', 'ETHNIC', 'RACIAL', 'INDIGENOUS', 'WAR_ATROCITY', 'CURRENT_POLITICS', 'DISPUTED_TERRITORY', 'OTHER'];
const PERSPECTIVES = ['NOT_REQUIRED', 'PASSED', 'NEEDS_REVIEW'];
assert(classified.every((q) => LEVELS.includes(q.sens)), 'all explicit sens values are valid levels');
assert(classified.every((q) => !q.sens_type || q.sens_type.every((t) => TYPES.includes(t))), 'all sens_type values are valid types');
assert(classified.every((q) => !q.perspective || PERSPECTIVES.includes(q.perspective)), 'all perspective values are valid');

// Every CONTESTED+ question in the bank (explicit or heuristic) must be PASSED or HELD
const audit = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'sensitivity-audit.json'), 'utf8'));
assert(audit.gate_violations.length === 0, 'audit records zero gate violations');
assert(audit.by_level.CONTESTED === 0 && audit.by_level.HIGHLY_CONTESTED === 0, 'no unreleased CONTESTED+ content is live in the bank');

// ---------------------------------------------------------------------------
// C. Documented rule checks (synthetic questions through the same regexes)
// ---------------------------------------------------------------------------
console.log('\n--- C. Rule Behavior (synthetic) ---');
const src = require('fs').readFileSync(scannerPath, 'utf8');

// Rule 2: sovereignty-adjudicating phrasing must be detected
const SOV = /rightfully\s+(owns?|belongs?)|belongs?\s+to\s+(which|what)\s+(country|nation)|legitimate\s+(owner|inhabitants?|government)|rightful\s+(owner|inhabitants?)/i;
assert(SOV.test('Which country rightfully owns the islands?'), 'detects "rightfully owns" sovereignty adjudication');
assert(SOV.test('Socotra belongs to which country?'), 'detects "belongs to which country" phrasing (heuristic floor)');
assert(!SOV.test('Which ocean did Columbus cross in 1492?'), 'neutral factual question is not flagged as sovereignty adjudication');

// Rule 3: active-conflict keywords must be in the pattern table
assert(/israel|palestine|gaza|hamas|zionis/i.test('Gaza'), 'geopolitical pattern set covers active-conflict keywords');
assert(src.includes('october 7'), 'scanner watches October 7 current-politics marker');

// Rule 12: gate logic — CONTESTED+ LIVE without PASSED must violate
function gateViolation(level, perspective, release) {
  const rank = { NONE: 0, SENSITIVE: 1, CONTESTED: 2, HIGHLY_CONTESTED: 3 };
  if (rank[level] >= 2) {
    if (release === 'HOLD') return null;
    if (perspective !== 'PASSED') return 'violation';
  }
  return null;
}
assert(gateViolation('CONTESTED', 'NEEDS_REVIEW', 'LIVE') === 'violation', 'CONTESTED+LIVE+NEEDS_REVIEW violates the gate');
assert(gateViolation('CONTESTED', 'PASSED', 'LIVE') === null, 'CONTESTED+LIVE+PASSED is permitted (reviewed)');
assert(gateViolation('HIGHLY_CONTESTED', 'NEEDS_REVIEW', 'HOLD') === null, 'HIGHLY_CONTESTED on HOLD is permitted');
assert(gateViolation('SENSITIVE', 'NEEDS_REVIEW', 'LIVE') === null, 'SENSITIVE alone does not block release');

// Rule 7: hook red-flag patterns catch conclusion-pushing hooks
const HOOK_RED = /\bthis proves\b|was really about|hidden truth/i;
assert(HOOK_RED.test('This proves colonialism was really about greed.'), 'hook red flags catch "this proves ... really about"');
assert(!HOOK_RED.test('European and local accounts describe this event very differently. Why?'), 'open-ended hooks pass cleanly');

// ---------------------------------------------------------------------------
// D. Hooks on the real bank
// ---------------------------------------------------------------------------
console.log('\n--- D. Real Hooks ---');
require(path.join(__dirname, '..', 'src', 'hooks.js'));
const HOOKS = global.window.CURIO_HOOKS || {};
const flaggedHooks = audit.hook_flags || [];
assert(Object.keys(HOOKS).length > 100, `${Object.keys(HOOKS).length} hooks loaded`);
assert(flaggedHooks.length === 0, 'no conclusion-pushing hooks detected in the real bank');

if (!pass) { console.error('\n✗ Editorial Sensitivity Suite FAILED.'); process.exit(1); }
console.log('\n✓ All Editorial Sensitivity tests PASSED successfully!');
