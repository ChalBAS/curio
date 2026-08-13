/* RELEASES — the audit record of every version of the app, generated, never typed.
 *
 * CEO, 2026-08-13: "how do i communicate with you that if we release the uat?
 * and the release notes and version number? we need an audit tracker of the app
 * i can review."
 *
 * WHY GENERATED. 10-Roadmap/RELEASES.md was hand-written and rotted: it stops at
 * v1.5 (2026-07-14) while production is v64 — fifty-five releases unrecorded. A
 * log a human has to remember to update is a log that lies. This reads the only
 * record that cannot rot: git itself.
 *
 * THE VERSION NUMBER IS NOT TAKEN FROM THE COMMIT MESSAGE. Messages say "v63 —"
 * by convention and a convention can be mistyped. The version is read from
 * index.html AS IT WAS at each commit, which is the number the reader's browser
 * actually received. If a message and the file disagree, the file wins and the
 * disagreement is reported.
 *
 * Sign-off comes from GitHub issues labelled `release` in curio-hq: one issue
 * per version, the CEO's sentence in it is the authorisation. An unsigned
 * version that reached production is a process breach and is flagged as one.
 *
 *   node tools/releases.js            write RELEASES.md + releases.json
 *   node tools/releases.js --check    exit 1 if production is unsigned or drifted
 *
 * Outputs:
 *   RELEASES.md                       in-repo, git-diffable, phone-readable
 *   releases.json                     machine copy
 *   ../qpio-site/hq/releases.json     the HQ audit view reads this (behind Access)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');
const HQ_COPY = path.join(ROOT, '..', 'qpio-site', 'hq', 'releases.json');

// stdio piped, not inherited: `git show <sha>:path` writes a fatal to stderr for
// every commit predating that path, and the early history has plenty. The throw
// is the signal; the noise is not.
const git = (...a) => cp.execFileSync('git', a,
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const gitQuiet = (...a) => { try { return git(...a); } catch { return ''; } };

// Reading the CEO's verdict is pure logic and lives in its own tested module.
const { verdictOf, PROCESS_FROM } = require('./signoff');

/* ---------- 1. every commit, on both branches ---------- */
function commitsOn(ref) {
  const out = gitQuiet('log', '--first-parent', '--pretty=format:%H\x1f%ad\x1f%an\x1f%s', '--date=short', ref);
  if (!out) return [];
  return out.split('\n').map(l => {
    const [sha, date, author, subject] = l.split('\x1f');
    return { sha, date, author, subject };
  });
}

const mainCommits = commitsOn('main');
const uatCommits = commitsOn('uat');
const mainShas = new Set(mainCommits.map(c => c.sha));
// On uat but not yet merged to main: the queue awaiting sign-off.
const pending = uatCommits.filter(c => !mainShas.has(c.sha)).reverse();

/* ---------- 2. the version each commit actually shipped ---------- */
const verCache = new Map();
function versionAt(sha) {
  if (verCache.has(sha)) return verCache.get(sha);
  const html = gitQuiet('show', sha + ':index.html');
  const m = html.match(/\?v=(\d+)/);
  const v = m ? Number(m[1]) : null;
  verCache.set(sha, v);
  return v;
}
function questionsAt(sha) {
  const js = gitQuiet('show', sha + ':src/questions.js');
  if (!js) return null;
  return (js.match(/\banswer:\s*\d/g) || []).length;
}

/* ---------- 3. group consecutive commits into releases ---------- */
// A release is every commit that shipped under one version number. Ordered
// oldest-first so a version's own commits sit together.
function group(commits, branch) {
  const rows = commits.slice().reverse().map(c => ({ ...c, version: versionAt(c.sha), branch }));
  const out = [];
  rows.forEach(c => {
    const last = out[out.length - 1];
    if (last && last.version === c.version) last.commits.push(c);
    else out.push({ version: c.version, branch, commits: [c] });
  });
  return out;
}

const released = group(mainCommits, 'main');
const queued = pending.length ? group(pending.slice().reverse(), 'uat') : [];

/* ---------- 4. sign-off, from the release issues ---------- */
let issues = [];
try {
  issues = JSON.parse(cp.execFileSync('gh',
    ['issue', 'list', '--repo', 'ChalBAS/curio-hq', '--label', 'release', '--state', 'all',
     '--limit', '200', '--json', 'number,title,state,createdAt,closedAt,body,comments,author'],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
} catch {
  issues = null;                       // gh unavailable — say so rather than imply "none"
}

function signoffFor(version) {
  if (version === null || version < PROCESS_FROM) return { status: 'PRE-PROCESS' };
  if (!issues) return { status: 'UNKNOWN', note: 'GitHub unreachable when this was generated' };
  // ALL issues for this version, not the first found. v65 has two: the sign-off
  // ticket the tooling opened (#45) and the failed acceptance report the suite
  // posted (#46). Taking only one of them is how a real rejection goes unseen.
  const hits = issues.filter(i => new RegExp('\\bv' + version + '\\b').test(i.title));
  if (!hits.length) return { status: 'NO ISSUE' };
  const v = verdictOf(hits);
  return v ? v : { status: 'AWAITING', issue: hits[hits.length - 1].number, issues: hits.map(h => h.number) };
}

/* ---------- 5. what is actually being served right now ---------- */
async function liveVersion(url) {
  try {
    const r = await fetch(url + '/index.html', { headers: { 'cache-control': 'no-cache' } });
    const m = (await r.text()).match(/\?v=(\d+)/);
    return m ? Number(m[1]) : null;
  } catch { return null; }
}

(async () => {
  const [prodLive, uatLive] = await Promise.all([
    liveVersion('https://qpio.app'), liveVersion('https://uat.qpio.app')
  ]);

  const headVersion = released.length ? released[released.length - 1].version : null;

  const releases = [];
  [...released, ...queued].forEach(r => {
    const first = r.commits[0], last = r.commits[r.commits.length - 1];
    const signoff = signoffFor(r.version);
    let state;
    if (r.branch === 'uat') state = 'ON UAT';
    else if (r.version === prodLive) state = 'LIVE';
    else if (headVersion !== null && r.version === headVersion && r.version !== prodLive) state = 'MERGED, NOT DEPLOYED';
    else state = 'SUPERSEDED';
    releases.push({
      version: r.version,
      state,
      branch: r.branch,
      from: first.date,
      to: last.date,
      questions: questionsAt(last.sha),
      signoff,
      // The message convention is a claim; versionAt() is the fact. Report a clash.
      messageClash: r.commits.filter(c => {
        const m = /\bv(\d+)\b/.exec(c.subject);
        return m && Number(m[1]) !== r.version;
      }).map(c => c.sha.slice(0, 7)),
      commits: r.commits.map(c => ({ sha: c.sha.slice(0, 7), date: c.date, subject: c.subject }))
    });
  });
  releases.reverse();                                   // newest first, for reading

  /* A breach is a version that reached READERS without a recorded yes, on or
     after the day the process started. Pre-process versions are not breaches. */
  const breaches = releases
    .filter(r => (r.state === 'LIVE' || r.state === 'SUPERSEDED') &&
                 r.version !== null && r.version >= PROCESS_FROM &&
                 r.signoff.status !== 'ACCEPTED')
    .map(r => ({ version: r.version, status: r.signoff.status }));

  const data = {
    generated: new Date().toISOString().slice(0, 10),
    live: { production: prodLive, uat: uatLive, main: headVersion },
    drift: prodLive !== headVersion
      ? `main is v${headVersion} but production serves v${prodLive}`
      : null,
    // "On UAT" and "waiting for a decision" are different states and conflating
    // them told the CEO v65 was awaiting him for hours after he had rejected it.
    awaiting: releases.filter(r => r.state === 'ON UAT' &&
      (r.signoff.status === 'AWAITING' || r.signoff.status === 'NO ISSUE')).map(r => r.version),
    rejected: releases.filter(r => r.state === 'ON UAT' && r.signoff.status === 'REJECTED')
      .map(r => ({ version: r.version, issue: r.signoff.issue, at: r.signoff.at })),
    breaches,
    releases
  };

  fs.writeFileSync(path.join(ROOT, 'releases.json'), JSON.stringify(data, null, 1), 'utf8');
  // The HQ audit view is a separate repo and reads this file; it is served behind
  // Cloudflare Access. Written here so one command keeps both in step — a second
  // manual step is how the old hand-written log rotted.
  try { fs.writeFileSync(HQ_COPY, JSON.stringify(data), 'utf8'); } catch { /* repo absent */ }

  /* ---------- 6. the human record ---------- */
  const L = [];
  const A = s => L.push(s);
  A('# RELEASES — the audit record');
  A('');
  A('*Generated by `node tools/releases.js`. **Do not hand-edit** — the previous log was');
  A('hand-maintained and rotted fifty-five versions out of date. Every line here is read from');
  A('git and from the live sites; the version is taken from `index.html` as it was at each');
  A('commit, not from the commit message.*');
  A('');
  A('| | |');
  A('|---|---|');
  A(`| Live to readers | **${prodLive === null ? 'unreachable' : 'v' + prodLive}** at qpio.app |`);
  A(`| On UAT | **${uatLive === null ? 'unreachable' : 'v' + uatLive}** at uat.qpio.app |`);
  A(`| Tip of \`main\` | v${headVersion} |`);
  A(`| Generated | ${data.generated} |`);
  A('');
  if (data.drift) A(`> ⚠️ **Drift:** ${data.drift}.`), A('');
  if (data.awaiting.length) {
    A(`> ⏳ **Awaiting your sign-off:** v${data.awaiting.join(', v')}. Write **Accepted for production**`);
    A('> — or **Rejected — <reason>** — in that version\'s release issue.');
    A('');
  }
  data.rejected.forEach(r => {
    A(`> 🔴 **v${r.version} was rejected** on ${String(r.at).slice(0, 10)} ` +
      `([#${r.issue}](https://github.com/ChalBAS/curio-hq/issues/${r.issue})). It stays on UAT until the`);
    A('> reported defects are fixed and a new build is put up for sign-off.');
    A('');
  });
  if (breaches.length) {
    A('> 🔴 **Reached readers without a recorded sign-off:** ' +
      breaches.map(b => `v${b.version} (${b.status})`).join(', ') + '.');
    A('> This is a process breach and is recorded rather than hidden.');
    A('');
  }
  A(`*Sign-off begins at v${PROCESS_FROM}. Everything before it shipped under the founder-only`);
  A('regime with no second party to sign, and is marked **pre-process** — unsigned by design,');
  A('not by omission.*');
  A('');
  A('---');
  A('');
  releases.forEach(r => {
    const badge = { 'LIVE': '🟢 live', 'ON UAT': '⏳ on UAT', 'MERGED, NOT DEPLOYED': '⚠️ merged, not deployed', 'SUPERSEDED': '· shipped' }[r.state];
    const so = r.signoff.status === 'ACCEPTED' ? `accepted, [#${r.signoff.issue}](https://github.com/ChalBAS/curio-hq/issues/${r.signoff.issue})`
             : r.signoff.status === 'REJECTED' ? `**rejected**, [#${r.signoff.issue}](https://github.com/ChalBAS/curio-hq/issues/${r.signoff.issue})`
             : r.signoff.status === 'AWAITING' ? `awaiting you, [#${r.signoff.issue}](https://github.com/ChalBAS/curio-hq/issues/${r.signoff.issue})`
             : r.signoff.status === 'NO ISSUE' ? '**no release issue**'
             : r.signoff.status === 'PRE-PROCESS' ? 'pre-process'
             : 'unknown';
    A(`## ${r.version === null ? 'unversioned (pre-v2)' : 'v' + r.version} — ${badge}`);
    A('');
    A(`${r.from === r.to ? r.from : r.from + ' → ' + r.to} · ${r.questions === null ? '?' : r.questions.toLocaleString()} questions · sign-off: ${so}`);
    A('');
    r.commits.forEach(c => A(`- \`${c.sha}\` ${c.subject}`));
    if (r.messageClash.length) A(`- ⚠️ commit message names a different version: ${r.messageClash.join(', ')}`);
    A('');
  });
  fs.writeFileSync(path.join(ROOT, 'RELEASES.md'), L.join('\n') + '\n', 'utf8');

  console.log(`releases: ${releases.length} versions · production v${prodLive} · uat v${uatLive} · main v${headVersion}`);
  if (data.drift) console.log('DRIFT: ' + data.drift);
  if (data.awaiting.length) console.log('awaiting sign-off: v' + data.awaiting.join(', v'));
  if (breaches.length) console.log('unsigned in production: ' + breaches.map(b => 'v' + b.version).join(', '));
  console.log('wrote RELEASES.md, releases.json' + (fs.existsSync(HQ_COPY) ? ', ../qpio-site/hq/releases.json' : ''));

  if (CHECK) {
    const bad = data.drift || breaches.some(b => b.version === prodLive);
    if (bad) { console.error('CHECK FAILED'); process.exit(1); }
    console.log('CHECK PASSED — production is signed and deployed');
  }
})();
