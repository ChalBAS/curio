/**
 * BUMP — move the app to the next version, in the two places that matter.
 *
 * A release is `?v=N` in index.html and the same N in sw.js, including the cache
 * name. Miss one and the service worker serves last release's files against this
 * release's shell, which presents as "the fix did not work" and wastes an
 * acceptance round finding out why.
 *
 * Doing it by hand across 36 occurrences is how that happens, so it is a script.
 * It refuses to run if the two files disagree about the current version, because
 * that disagreement is itself the bug this exists to prevent.
 *
 *   node tools/bump.js          → next version
 *   node tools/bump.js 75       → a specific one
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IDX = path.join(ROOT, 'index.html');
const SW = path.join(ROOT, 'sw.js');

const idx = fs.readFileSync(IDX, 'utf8');
const sw = fs.readFileSync(SW, 'utf8');

const cur = (s) => {
  const all = [...new Set((s.match(/\?v=(\d+)/g) || []).map((m) => +m.slice(3)))];
  return all.length === 1 ? all[0] : all;
};
const a = cur(idx), b = cur(sw);
const cacheV = +(sw.match(/qpio-v(\d+)/) || [])[1];

if (Array.isArray(a)) { console.error(`index.html carries several versions: ${a.join(', ')}`); process.exit(1); }
if (Array.isArray(b)) { console.error(`sw.js carries several versions: ${b.join(', ')}`); process.exit(1); }
if (a !== b || a !== cacheV) {
  console.error(`refusing to bump — the files already disagree: index.html v${a}, sw.js v${b}, cache qpio-v${cacheV}`);
  process.exit(1);
}

const next = process.argv[2] ? +process.argv[2] : a + 1;
if (!(next > a)) { console.error(`v${next} is not ahead of v${a}`); process.exit(1); }

const n1 = (idx.match(/\?v=\d+/g) || []).length;
const n2 = (sw.match(/\?v=\d+/g) || []).length;

fs.writeFileSync(IDX, idx.replace(/\?v=\d+/g, `?v=${next}`));
fs.writeFileSync(SW, sw.replace(/\?v=\d+/g, `?v=${next}`).replace(/qpio-v\d+/g, `qpio-v${next}`));

console.log(`  v${a} → v${next}`);
console.log(`  index.html: ${n1} references · sw.js: ${n2} references + the cache name`);
