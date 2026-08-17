/**
 * SEAL — record that a version has actually been SERVED, so its content is now
 * frozen. Run immediately after a deploy, never before.
 *
 * WHY THE SPLIT. The fingerprint gate in preflight exists because on 2026-08-13
 * v67 was deployed twice with different content, and every service worker that
 * had precached the first one would have been frozen on it silently, forever.
 *
 * But the first version of that gate stamped on every preflight RUN, so fixing a
 * fault preflight itself had just reported burned the version number and
 * demanded another bump. That is worse than the bug: it teaches people to bump
 * blindly to make a red line go away, which is exactly the habit that caused the
 * original incident.
 *
 * The harm only exists once bytes have reached a reader. So: preflight records,
 * deploy seals, and a sealed version can never change again.
 *
 *   node tools/seal_version.js uat     after deploying to uat.qpio.app
 *   node tools/seal_version.js prod    after deploying to qpio.app
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FP = path.join(ROOT, 'tools', '.version-fingerprints.json');
const where = (process.argv[2] || '').toLowerCase();

if (!['uat', 'prod'].includes(where)) {
  console.error('usage: node tools/seal_version.js uat|prod');
  process.exit(1);
}

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const v = (html.match(/\?v=(\d+)/) || [])[1];
if (!v) { console.error('no version found in index.html'); process.exit(1); }

const seen = fs.existsSync(FP) ? JSON.parse(fs.readFileSync(FP, 'utf8')) : {};
const rec = seen[v];
if (!rec) { console.error(`v${v} has no fingerprint — run tools/preflight.js first`); process.exit(1); }

const stamp = typeof rec === 'object' ? rec.stamp : rec;
seen[v] = { stamp, sealed: true, servedTo: where, at: new Date().toISOString().slice(0, 10) };
fs.writeFileSync(FP, JSON.stringify(seen, null, 1) + '\n', 'utf8');

console.log(`  v${v} sealed — served to ${where}, content frozen at ${stamp}`);
console.log(`  any further change to this version's content will now fail preflight, which is the point.`);
