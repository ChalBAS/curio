const fs = require('fs');
const path = require('path');

console.log('=== Running QPIO P1 Application Integration Test Suite ===\n');

let pass = true;
function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    pass = false;
  } else {
    console.log(`✓ PASS: ${message}`);
  }
}

// Mock browser environment for resources.js
global.window = {};

try {
  require('../src/resources.js');
  assert(Array.isArray(global.window.CURIO_RESOURCES), 'window.CURIO_RESOURCES initialized as an array');
  assert(global.window.CURIO_RESOURCES.length === 43, `window.CURIO_RESOURCES loaded ${global.window.CURIO_RESOURCES.length} pilot records (43 expected)`);
  assert(Boolean(global.window.CurioResourceNetwork), 'window.CurioResourceNetwork API available');
} catch (err) {
  assert(false, `Failed to load src/resources.js: ${err.message}`);
}

const CRN = global.window.CurioResourceNetwork;

// ---------------------------------------------------------------------------
// TEST A & B: Example A — Smithsonian Resource Match Demonstration
// ---------------------------------------------------------------------------
console.log('\n--- Test Example A: Smithsonian Match Demonstration ---');

const qSmithsonianMatch = {
  cat: "History",
  sub: "architecture",
  region: "Africa",
  q: "Which West African kingdom produced intricate cast bronze artwork and palace architecture?",
  fact: "Intricate cast plaques and metropolitan architecture recorded Edo kingdom history in metal.",
  src: "https://en.wikipedia.org/wiki/Benin_Bronzes"
};

const smithMatches = CRN.findResourcesForQuestion(qSmithsonianMatch, 3);
assert(smithMatches.length > 0, 'Matching returned non-empty resource array');
assert(smithMatches.some(r => r.source_id === 'src_smithsonian'), 'Example A correctly surfaced at least one Smithsonian resource');

const smithTop = smithMatches[0];
assert(Boolean(smithTop.title), `Surfaced resource title: '${smithTop.title.slice(0, 50)}...'`);
assert(smithTop.source_authority === 'tier1_primary_institutional', 'Resource carries Tier-1 primary institutional authority');

// ---------------------------------------------------------------------------
// TEST A & B: Example B — BnF Gallica Resource Match Demonstration
// ---------------------------------------------------------------------------
console.log('\n--- Test Example B: BnF Gallica Match Demonstration ---');

const qBnfMatch = {
  cat: "Geography",
  sub: "geographie_histoire",
  region: "Africa",
  q: "How were early French geographical discoveries in West Africa documented in historic maps and journals?",
  fact: "Historical geographical societies recorded West African river networks, coastal ports, and cartography in French archives.",
  src: "https://en.wikipedia.org/wiki/Geography_of_Africa"
};

const bnfMatches = CRN.findResourcesForQuestion(qBnfMatch, 3);
assert(bnfMatches.length > 0, 'Matching returned non-empty resource array for BnF candidate query');
assert(bnfMatches.some(r => r.source_id === 'src_bnf'), 'Example B correctly surfaced at least one BnF Gallica resource');

const bnfTop = bnfMatches.find(r => r.source_id === 'src_bnf') || bnfMatches[0];
assert(bnfTop.country === 'FR', 'BnF resource carries country code FR');
assert(bnfTop.language === 'fr', 'BnF resource carries French language code');

// ---------------------------------------------------------------------------
// TEST C: Example C — Intentional Non-Match / Restraint Demonstration
// ---------------------------------------------------------------------------
console.log('\n--- Test Example C: Intentional Non-Match / Restraint Demonstration ---');

const qNoMatch = {
  cat: "Tech",
  sub: "quantum_computing",
  q: "What is quantum entanglement and how does qubit superposition work in quantum processors?",
  fact: "Qubits exist in linear combinations of 0 and 1 states simultaneously until measured.",
  src: "https://en.wikipedia.org/wiki/Quantum_computing"
};

const noMatches = CRN.findResourcesForQuestion(qNoMatch, 3);
assert(noMatches.length === 0, 'Example C correctly returned 0 resources (restraint threshold enforced)');

// ---------------------------------------------------------------------------
// TEST D: Maximum Resource Count Enforced
// ---------------------------------------------------------------------------
console.log('\n--- Test D: Maximum Resource Count Enforced ---');

const qBroadMatch = {
  cat: "History",
  region: "Africa",
  sub: "african_history",
  q: "What were the major kingdoms, trade networks and civilizations across African history?",
  fact: "African civilizations developed extensive trade networks across the Sahara and Indian Ocean.",
  src: "https://en.wikipedia.org/wiki/History_of_Africa"
};

const max3Matches = CRN.findResourcesForQuestion(qBroadMatch, 3);
assert(max3Matches.length <= 3, `Returned ${max3Matches.length} items when max=3 requested (<= 3 enforced)`);

const max1Matches = CRN.findResourcesForQuestion(qBroadMatch, 1);
assert(max1Matches.length === 1, `Returned exactly 1 item when max=1 requested`);

// ---------------------------------------------------------------------------
// TEST E: Human-Readable Provenance Formatting
// ---------------------------------------------------------------------------
console.log('\n--- Test E: Human-Readable Provenance Formatting ---');

assert(CRN.getHumanSource('src_smithsonian') === 'Smithsonian Institution', 'Smithsonian human source name formatted correctly');
assert(CRN.getHumanSource('src_bnf') === 'Bibliothèque nationale de France — Gallica', 'BnF Gallica human source name formatted correctly');
assert(CRN.getHumanAuthority('tier1_primary_institutional') === 'Primary Institutional Source', 'Tier-1 authority formatted to human-readable string');
assert(CRN.getHumanType('book') === 'Book / Catalog', 'Type "book" formatted to human-readable string');
assert(CRN.getHumanType('digital_archive') === 'Digital Archive', 'Type "digital_archive" formatted to human-readable string');

// ---------------------------------------------------------------------------
// TEST F: External Source URLs Preserved
// ---------------------------------------------------------------------------
console.log('\n--- Test F: External Source URLs Preserved ---');

let allUrlsValid = true;
CRN.resources.forEach((r, idx) => {
  if (!r.source_url || (!r.source_url.startsWith('http://') && !r.source_url.startsWith('https://'))) {
    console.error(`✗ Resource #${idx} (${r.id}) has invalid source_url: ${r.source_url}`);
    allUrlsValid = false;
  }
});
assert(allUrlsValid, 'All pilot resources carry valid HTTP/HTTPS source_urls');

// ---------------------------------------------------------------------------
// TEST G: Tolerance for Missing Optional Fields
// ---------------------------------------------------------------------------
console.log('\n--- Test G: Missing Optional Field Tolerance ---');

const minimalQuestion = {
  cat: "History",
  sub: "african_history",
  q: "Tell me about West Africa."
};

const minimalResult = CRN.findResourcesForQuestion(minimalQuestion, 3);
assert(Array.isArray(minimalResult), 'findResourcesForQuestion succeeds on minimal question object');

if (!pass) {
  console.error('\n✗ Test Suite FAILED.');
  process.exit(1);
} else {
  console.log('\n✓ All QPIO P1 Application Integration tests PASSED successfully!');
}
