/* PREFLIGHT — the gate every release must pass before it can be promoted.
 *
 * CEO, 2026-08-11: "we need a UAT version I can test before we push to the
 * customer… strict criteria and release methodology. Nothing worse than
 * breaking customer trust with an unstable app."
 *
 * One command, one answer. Green means the build is structurally sound and may
 * go to UAT. It does NOT mean the build is good — that is what UAT is for, and
 * a human decides it. This catches the class of mistake that has actually bitten
 * us: a version bumped in one file and not the other, a French bank that drifted
 * out of alignment, a question citing a dead link, a syntax error in a data file
 * that only shows up as a blank screen on a phone.
 *
 *   node tools/preflight.js           fast gates (seconds, no network)
 *   node tools/preflight.js --full    adds source verification (minutes, network)
 *
 * Exit code 0 = pass. Non-zero = do not promote.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const FULL = process.argv.includes('--full');

let failures = 0, warnings = 0;
const L = [];
function pass(name, detail) { L.push(`  \x1b[32mPASS\x1b[0m  ${name}${detail ? '  — ' + detail : ''}`); }
function fail(name, detail) { failures++; L.push(`  \x1b[31mFAIL\x1b[0m  ${name}${detail ? '  — ' + detail : ''}`); }
function warn(name, detail) { warnings++; L.push(`  \x1b[33mWARN\x1b[0m  ${name}${detail ? '  — ' + detail : ''}`); }
function head(s) { L.push(''); L.push(`\x1b[1m${s}\x1b[0m`); }

const read = p => fs.readFileSync(p, 'utf8');

/* ---------- 1. every script parses ---------- */
head('1 · Syntax');
const jsFiles = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).map(f => path.join(SRC, f));
jsFiles.push(path.join(ROOT, 'sw.js'));
let synOk = 0;
// execFileSync, not execSync: no shell, so a path with a space or a shell
// metacharacter in it is an argument rather than a command.
jsFiles.forEach(f => {
  try { cp.execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); synOk++; }
  catch (e) { fail('parse ' + path.basename(f), String(e.stderr || e).split('\n')[1] || ''); }
});
if (synOk === jsFiles.length) pass('all scripts parse', synOk + ' files');

/* ---------- 2. the release recipe: versions must agree ---------- */
head('2 · Version consistency (the stale-asset class of bug)');
const html = read(path.join(ROOT, 'index.html'));
const sw = read(path.join(ROOT, 'sw.js'));
const htmlV = [...new Set([...html.matchAll(/\?v=(\d+)/g)].map(m => m[1]))];
const swV = [...new Set([...sw.matchAll(/\?v=(\d+)/g)].map(m => m[1]))];
const cacheM = sw.match(/const CACHE\s*=\s*"qpio-v(\d+)"/);
if (htmlV.length !== 1) fail('index.html mixes asset versions', htmlV.join(', '));
else pass('index.html on one version', 'v' + htmlV[0]);
if (swV.length !== 1) fail('sw.js mixes asset versions', swV.join(', '));
else pass('sw.js on one version', 'v' + swV[0]);
if (!cacheM) fail('sw.js CACHE name not found');
else if (htmlV[0] && (cacheM[1] !== htmlV[0] || swV[0] !== htmlV[0]))
  fail('CACHE name does not match assets', `cache v${cacheM[1]} vs assets v${htmlV[0]}`);
else pass('cache name matches assets', 'qpio-v' + (cacheM && cacheM[1]));

/* A version number must identify ONE content set. On 2026-08-13 v67 was
 * deployed twice — 719 questions, then 749 — without a bump. The edge served
 * the new file, but every service worker that had already precached
 * questions.js?v=67 kept the old one and would never ask again: a reader in
 * that window would have been frozen at 719 silently, forever.
 *
 * The checks above could not see it. They verify index.html, sw.js and the
 * cache name AGREE, and they did. What was missing is memory of what was last
 * shipped under that number. This records a fingerprint of the content each
 * version carries and refuses a version whose content has moved since. */
const FP = path.join(ROOT, 'tools', '.version-fingerprints.json');
try {
  const crypto = require('crypto');
  const v = htmlV[0];
  const stamp = crypto.createHash('sha256').update(
    ['src/questions.js', 'src/questions.fr.js', 'src/app.js', 'src/styles.css', 'src/i18n.js']
      .map(f => fs.existsSync(path.join(ROOT, f)) ? read(path.join(ROOT, f)) : '').join('\x1f')
  ).digest('hex').slice(0, 16);
  const seen = fs.existsSync(FP) ? JSON.parse(read(FP)) : {};
  if (seen[v] && seen[v] !== stamp) {
    fail('version already used for different content',
      `v${v} was previously built from ${seen[v]}, now ${stamp} — bump the version or a cached reader never gets this build`);
  } else {
    pass('version fingerprint', `v${v} → ${stamp}${seen[v] ? ' (unchanged)' : ' (new)'}`);
    seen[v] = stamp;
    fs.writeFileSync(FP, JSON.stringify(seen, null, 1) + '\n', 'utf8');
  }
} catch (e) { warn('version fingerprint', e.message); }

/* every script/style index.html loads must be precached by the worker */
const htmlAssets = [...html.matchAll(/(?:src|href)="(src\/[^"?]+)\?v=/g)].map(m => m[1]);
const missing = htmlAssets.filter(a => !sw.includes('./' + a + '?v='));
if (missing.length) fail('assets loaded but not precached in sw.js', missing.join(', '));
else pass('every loaded asset is precached', htmlAssets.length + ' files');

/* ---------- 3. the banks ---------- */
head('3 · Content integrity');
global.window = {};
['questions', 'questions.fr', 'truthlab', 'truthlab.fr', 'citypacks', 'citypacks.fr',
 'entities.img', 'entities.fr', 'entities.meta', 'hooks', 'golinks', 'country'].forEach(n => {
  const p = path.join(SRC, n + '.js');
  if (fs.existsSync(p)) { try { require(p); } catch (e) { fail('load ' + n + '.js', e.message); } }
});
const EN = global.window.CURIO_QUESTIONS || [];
const FR = global.window.CURIO_QUESTIONS_FR || [];
if (!EN.length) fail('English bank empty');
else pass('English bank loaded', EN.length + ' questions');

if (EN.length !== FR.length) fail('bank lengths differ', `EN ${EN.length} vs FR ${FR.length}`);
else {
  const drift = EN.filter((q, i) => FR[i] && q.answer !== FR[i].answer).length;
  if (drift) fail('EN/FR answer index drift — app.js will refuse the merge and serve French unmerged', drift + ' rows');
  else pass('EN/FR aligned', 'answer index matches on all ' + EN.length);
}

/* structural faults that reach the screen */
const bad = { opts: 0, ans: 0, src: 0, empty: 0, img: 0 };
EN.forEach(q => {
  if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options).size !== 4) bad.opts++;
  if (![0, 1, 2, 3].includes(q.answer)) bad.ans++;
  if (!/^https:\/\/en\.wikipedia\.org\/wiki\/\S+$/.test(q.src || '')) bad.src++;
  if (!String(q.q || '').trim() || !String(q.fact || '').trim()) bad.empty++;
  if (q.img && !q.img.alt) bad.img++;
});
Object.entries(bad).forEach(([k, n]) => { if (n) fail('malformed questions: ' + k, n + ' rows'); });
if (!Object.values(bad).some(Boolean)) pass('question structure clean', 'options, answer, source, text, alt');

/* duplicate identity — the flag-collision class of bug */
const ids = {}; let dupes = 0;
EN.forEach(q => { const k = (q.q || '').trim().toLowerCase() + ((q.img && q.img.u) ? '|' + q.img.u : '');
  if (ids[k]) dupes++; ids[k] = 1; });
if (dupes) fail('duplicate questions (same text and picture)', dupes);
else pass('no duplicate questions', Object.keys(ids).length + ' distinct');

/* entity coverage — a card with no picture or hook still works, but we watch it */
const IM = global.window.CURIO_IMAGES || {}, HK = global.window.CURIO_HOOKS || {}, FRT = global.window.CURIO_FR_ENTITIES || {};
const slugs = [...new Set(EN.map(q => { const m = /\/wiki\/([^"#?]+)/.exec(q.src || ''); return m ? decodeURIComponent(m[1]) : null; }).filter(Boolean))];
const noImg = slugs.filter(s => !IM[s]).length, noHook = slugs.filter(s => !HK[s]).length, noFr = slugs.filter(s => !FRT[s]).length;
pass('entities', `${slugs.length} · ${slugs.length - noImg} with image · ${slugs.length - noFr} with French title · ${slugs.length - noHook} with a written hook`);
if (noImg / slugs.length > 0.25) warn('over a quarter of entities have no image', noImg + ' of ' + slugs.length);

/* ---------- 4. translations ---------- */
head('4 · Translations');
try {
  const out = cp.execFileSync('py', [path.join(ROOT, 'tools', 'check_i18n.py'), '--strict'], { cwd: ROOT, stdio: 'pipe' }).toString();
  const m = out.match(/FR: (\d+)\/(\d+) translated \(([\d.]+)%\)/);
  pass('French UI complete', m ? `${m[1]}/${m[2]}` : 'strict gate passed');
} catch (e) {
  const out = String(e.stdout || '') + String(e.stderr || '');
  const miss = (out.match(/(\d+) missing/) || [])[1];
  fail('untranslated UI strings', (miss || '?') + ' missing — see py tools/check_i18n.py');
}

/* ---------- 4b. the sign-off reader ---------- */
head('4b · Release audit');
try {
  cp.execFileSync(process.execPath, [path.join(ROOT, 'tools', 'releases.test.js')], { stdio: 'pipe' });
  pass('sign-off verdict reader', '21 cases — an audit record that cannot be falsified is part of the gate');
} catch (e) {
  fail('sign-off verdict reader', 'tools/releases.test.js failed — run it to see which case');
}

/* ---------- 5. sources (network, --full only) ---------- */
head('5 · Sources' + (FULL ? '' : '  (skipped — run with --full)'));
if (FULL) {
  try {
    cp.execFileSync('py', [path.join(ROOT, 'tools', 'check_sources.py')], { cwd: ROOT, stdio: 'pipe' });
    pass('every source resolves to a real Wikipedia article');
  } catch (e) {
    const out = String(e.stdout || '');
    fail('dead, redirected or disambiguation sources', (out.match(/FAIL: (\d+) fatal/) || [])[1] + ' fatal');
  }
} else {
  L.push('  \x1b[90mSKIP\x1b[0m  source verification — required before promoting to production');
}

/* ---------- verdict ---------- */
console.log(L.join('\n'));
console.log('');
const v = cacheM ? 'v' + cacheM[1] : '(unknown version)';
if (failures) {
  console.log(`\x1b[31m\x1b[1mPREFLIGHT FAILED\x1b[0m  ${failures} blocking${warnings ? ', ' + warnings + ' warning' : ''} — ${v} must NOT be promoted.`);
  process.exit(1);
}
console.log(`\x1b[32m\x1b[1mPREFLIGHT PASSED\x1b[0m  ${v} is structurally sound${warnings ? ' (' + warnings + ' warning)' : ''}.`);
console.log(FULL ? 'Ready for UAT. A human still has to play it.' : 'Ready for UAT. Run --full before promoting to production.');
