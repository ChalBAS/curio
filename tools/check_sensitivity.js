// ============================================================================
// QPIO — EDITORIAL SENSITIVITY SCANNER & RELEASE GATE
//
// Implements the QPIO Editorial & Political-Sensitivity Rules as an executable
// check over the question bank. Deterministic heuristics only — this tool
// classifies, flags and gates; it never rewrites content.
//
// Question field model (all optional, additive; explicit values ALWAYS win
// over heuristics):
//   sens        : "NONE" | "SENSITIVE" | "CONTESTED" | "HIGHLY_CONTESTED"
//   sens_type   : array of "COLONIAL" | "GEOPOLITICAL" | "RELIGIOUS" | "ETHNIC"
//               | "RACIAL" | "INDIGENOUS" | "WAR_ATROCITY" | "CURRENT_POLITICS"
//               | "DISPUTED_TERRITORY" | "OTHER"
//   perspective : "NOT_REQUIRED" | "PASSED" | "NEEDS_REVIEW"
//   release     : "LIVE" | "HOLD"   (default LIVE when absent)
//
// Release gate (Rule 12):
//   effective sens CONTESTED / HIGHLY_CONTESTED
//     → perspective MUST be "PASSED" AND release MUST NOT be "HOLD"…
//     …otherwise the question must carry release:"HOLD".
//   Any sovereignty-adjudicating phrasing in the question text
//     → automatic HIGHLY_CONTESTED (heuristic floor), gate applies.
//
// Usage:
//   node tools/check_sensitivity.js           full report + audit file
//   node tools/check_sensitivity.js --gate    exit 1 on any gate violation
// ============================================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const AUDIT_PATH = path.join(ROOT, 'tools', 'sensitivity-audit.json');
const GATE = process.argv.includes('--gate');

const LEVELS = ['NONE', 'SENSITIVE', 'CONTESTED', 'HIGHLY_CONTESTED'];
const TYPES = ['COLONIAL', 'GEOPOLITICAL', 'RELIGIOUS', 'ETHNIC', 'RACIAL',
  'INDIGENOUS', 'WAR_ATROCITY', 'CURRENT_POLITICS', 'DISPUTED_TERRITORY', 'OTHER'];
const PERSPECTIVES = ['NOT_REQUIRED', 'PASSED', 'NEEDS_REVIEW'];
const RELEASES = ['LIVE', 'HOLD'];

// ---------------------------------------------------------------------------
// Heuristic pattern sets (EN + FR). Order: strongest classification first.
// ---------------------------------------------------------------------------
const SOVEREIGNTY_PHRASES = [
  /rightfully\s+(owns?|belongs?)/i, /belongs?\s+to\s+(which|what)\s+(country|nation)/i,
  /legitimate\s+(owner|inhabitants?|government)/i, /rightful\s+(owner|inhabitants?)/i,
  /who\s+(should|ought\s+to)\s+(rule|control|govern)/i, /à qui (appartient|revient) (légitimement|de droit)/i
];

const PATTERNS = [
  { type: 'GEOPOLITICAL', level: 'CONTESTED', re: /\b(israel|israël|palestine|palestinian|gaza|hamas|zionis|west bank|cisjordanie)\b/i },
  { type: 'DISPUTED_TERRITORY', level: 'CONTESTED', re: /\b(taiwan|taïwan|tibet|kashmir|cachemire|crimea|crimée|falkland|malvinas|kosovo|northern cyprus|chypre du nord|western sahara|sahara occidental|nagorno)/i },
  { type: 'WAR_ATROCITY', level: 'SENSITIVE', re: /\b(genocides?|génocides?|holocaust|shoah|massacres?|ethnic cleansing|nettoyage ethnique|death camps?|concentration camps?)\b/i },
  { type: 'COLONIAL', level: 'SENSITIVE', re: /\b(colonial|colonie|colonisation|colonised|colonized|scramble for africa|partage de l'afrique|slave trade|traite négrière|slavery|esclavage|transatlantic)\b/i },
  { type: 'INDIGENOUS', level: 'SENSITIVE', re: /\b(indigenous|indigène|autochtone|first nations|premières nations|aboriginal|native american|amérindien)\b/i },
  { type: 'RELIGIOUS', level: 'SENSITIVE', re: /\b(jihad|crusade|croisade|religious war|guerre de religion|inquisition)\b/i },
  { type: 'RACIAL', level: 'SENSITIVE', re: /\b(apartheid|segregation|ségrégation|racial)\b/i },
  { type: 'CURRENT_POLITICS', level: 'CONTESTED', re: /\b(october 7|7 octobre)\b/i }
];

// Conclusion-pushing hook patterns (Rule 7)
const HOOK_RED_FLAGS = [
  /\bthis proves\b/i, /\bproves? (that )?(colonialism|imperialism|capitalism|communism)\b/i,
  /\bhidden truth\b/i, /\bwhat they (don'?t want|hid)\b/i, /\bthe real reason (they|we)\b/i,
  /\bwas really about\b/i
];

function levelRank(l) { return LEVELS.indexOf(l); }

function classify(q) {
  // Explicit fields always win.
  const explicit = q.sens && LEVELS.includes(q.sens);
  const haystack = `${q.q || ''} ${q.fact || ''} ${(q.deeper || []).join(' ')} ${q.src || ''}`;

  let heuristicLevel = 'NONE';
  const types = new Set();
  for (const p of PATTERNS) {
    if (p.re.test(haystack)) {
      types.add(p.type);
      if (levelRank(p.level) > levelRank(heuristicLevel)) heuristicLevel = p.level;
    }
  }

  const sovereigntyAdjudicating = SOVEREIGNTY_PHRASES.some((re) => re.test(String(q.q || '')));
  if (sovereigntyAdjudicating) {
    heuristicLevel = 'HIGHLY_CONTESTED';
    types.add('DISPUTED_TERRITORY');
  }

  const level = explicit ? q.sens : heuristicLevel;
  const sensType = Array.isArray(q.sens_type) && q.sens_type.every((t) => TYPES.includes(t))
    ? q.sens_type : Array.from(types);
  const perspective = q.perspective && PERSPECTIVES.includes(q.perspective)
    ? q.perspective
    : (levelRank(level) >= levelRank('SENSITIVE') ? 'NEEDS_REVIEW' : 'NOT_REQUIRED');
  const release = q.release && RELEASES.includes(q.release) ? q.release : 'LIVE';

  return { level, sensType, perspective, release, sovereigntyAdjudicating, explicit: Boolean(explicit) };
}

function gateViolation(c) {
  // Rule 12: CONTESTED / HIGHLY_CONTESTED may not be LIVE without a passed review.
  if (levelRank(c.level) >= levelRank('CONTESTED')) {
    if (c.release === 'HOLD') return null;
    if (c.perspective !== 'PASSED') return `${c.level} question is LIVE without Perspective_Check=PASSED`;
  }
  return null;
}

function main() {
  global.window = {};
  require(path.join(SRC, 'questions.js'));
  const hooksPath = path.join(SRC, 'hooks.js');
  if (fs.existsSync(hooksPath)) require(hooksPath);
  const EN = global.window.CURIO_QUESTIONS || [];
  const HOOKS = global.window.CURIO_HOOKS || {};

  let violations = 0;
  let flagged = 0;
  const audit = { generated_at: new Date().toISOString(), totals: { questions: EN.length }, by_level: {}, by_type: {}, flagged: [], hook_flags: [], gate_violations: [] };
  LEVELS.forEach((l) => { audit.by_level[l] = 0; });
  TYPES.forEach((t) => { audit.by_type[t] = 0; });

  EN.forEach((q, i) => {
    const c = classify(q);
    audit.by_level[c.level]++;
    c.sensType.forEach((t) => { audit.by_type[t]++; });

    if (levelRank(c.level) >= levelRank('SENSITIVE')) {
      flagged++;
      audit.flagged.push({
        index: i, q: String(q.q || '').slice(0, 90), src: q.src,
        sens: c.level, sens_type: c.sensType, perspective: c.perspective,
        release: c.release, explicit: c.explicit,
        sovereignty_adjudicating: c.sovereigntyAdjudicating
      });
    }

    const v = gateViolation(c);
    if (v) {
      violations++;
      audit.gate_violations.push({ index: i, q: String(q.q || '').slice(0, 90), violation: v });
    }
  });

  // Hook lint (Rule 7) — informational warnings, not gate failures
  Object.entries(HOOKS).forEach(([slug, h]) => {
    const text = `${(h && h.en) || ''} ${(h && h.fr) || ''}`;
    HOOK_RED_FLAGS.forEach((re) => {
      if (re.test(text)) audit.hook_flags.push({ slug, pattern: String(re), en: (h.en || '').slice(0, 100) });
    });
  });

  fs.writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2), 'utf8');

  console.log('=== QPIO Editorial Sensitivity Scan ===\n');
  console.log(`Questions scanned: ${EN.length}`);
  console.log(`Levels: ${LEVELS.map((l) => `${l}=${audit.by_level[l]}`).join('  ')}`);
  const usedTypes = TYPES.filter((t) => audit.by_type[t] > 0);
  console.log(`Types: ${usedTypes.length ? usedTypes.map((t) => `${t}=${audit.by_type[t]}`).join('  ') : 'none'}`);
  console.log(`Flagged (SENSITIVE+): ${flagged}`);
  console.log(`Hook red flags (informational): ${audit.hook_flags.length}`);
  audit.hook_flags.slice(0, 10).forEach((f) => console.log(`  ! hook "${f.slug}": ${f.en}`));

  if (audit.flagged.length) {
    console.log('\nFlagged questions:');
    audit.flagged.forEach((f) =>
      console.log(`  [${f.sens}${f.explicit ? '*' : ''}] ${f.perspective}/${f.release}  #${f.index} ${f.q}`));
  }

  if (violations) {
    console.log(`\n✗ GATE VIOLATIONS: ${violations}`);
    audit.gate_violations.forEach((v) => console.log(`  ✗ #${v.index} ${v.violation} — ${v.q}`));
  } else {
    console.log('\n✓ Release gate: no violations');
  }
  console.log(`\nAudit written: ${AUDIT_PATH}`);

  if (GATE && violations) process.exit(1);
}

main();
