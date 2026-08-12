/* RELEASE ISSUE — opens the one ticket the CEO replies to in order to ship.
 *
 * CEO, 2026-08-13: "how do i communicate with you that if we release the uat?"
 *
 * The answer is one sentence in one place. This creates that place, pre-filled,
 * so nothing has to be remembered or composed on a phone. Separate from
 * releases.js on purpose: that one only ever READS and reports, this one has a
 * side effect on GitHub, and mixing the two would make the audit generator
 * something you hesitate to run.
 *
 *   node tools/release_issue.js          open the ticket for whatever is on UAT
 *   node tools/release_issue.js --dry    print it instead
 *
 * Idempotent: if an issue already names this version it prints the link and
 * stops rather than opening a second one — two tickets for one release is how
 * an audit trail stops being one.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const REPO = 'ChalBAS/curio-hq';

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'releases.json'), 'utf8'));
const version = data.awaiting[0];
if (version === undefined) {
  console.log('nothing on UAT awaiting sign-off — run tools/releases.js first if that seems wrong');
  process.exit(0);
}
const rel = data.releases.find(r => r.version === version);
const live = data.releases.find(r => r.state === 'LIVE');

/* already open? */
if (!DRY) {
  const found = JSON.parse(cp.execFileSync('gh',
    ['issue', 'list', '--repo', REPO, '--label', 'release', '--state', 'all', '--limit', '100', '--json', 'number,title'],
    { encoding: 'utf8' }));
  const hit = found.find(i => new RegExp('\\bv' + version + '\\b').test(i.title));
  if (hit) {
    console.log(`already open: https://github.com/${REPO}/issues/${hit.number}`);
    process.exit(0);
  }
}

const delta = (live && live.questions !== null && rel.questions !== null)
  ? `${live.questions.toLocaleString()} → **${rel.questions.toLocaleString()}**`
  : (rel.questions === null ? 'unknown' : rel.questions.toLocaleString());

const body = [
  `**To ship this, reply with one sentence: \`Accepted for production\` — or \`Rejected — <reason>\`.**`,
  '',
  `Nothing reaches qpio.app until you do. Readers are on **v${live ? live.version : '?'}** right now.`,
  '',
  '## What is in it',
  '',
  ...rel.commits.map(c => `- ${c.subject}`),
  '',
  `Questions: ${delta}.`,
  '',
  '## Try it',
  '',
  '| | |',
  '|---|---|',
  '| The build | https://uat.qpio.app |',
  '| The scripted suite | https://uat.qpio.app/tests/uat.html — one button, ~70s |',
  '',
  'The suite covers 36 checks across both languages and two screen sizes: the daily five',
  'completes, Next is reachable without scrolling, pictures load with alt text, no question',
  'repeats across three rounds, no English left on a French screen, nothing thrown.',
  '',
  '## The three it cannot check — these are yours',
  '',
  '- [ ] Aeroplane mode mid-session: the app keeps working',
  '- [ ] Install to the home screen, close it fully, reopen: progress intact and the version is new',
  '- [ ] It feels right',
  '',
  '## Audit',
  '',
  `Every version, what changed, and who signed it: [RELEASES.md](https://github.com/ChalBAS/curio/blob/main/RELEASES.md)`,
  `· the same record on your phone at [hq.qpioapp.com](https://hq.qpioapp.com)`,
  '',
  '---',
  '',
  `*On "Accepted" I merge \`uat\` → \`main\`, deploy, and close this issue with the deployment`,
  `record. On "Rejected" the build stays on UAT and the reason becomes the next fix.*`
].join('\n');

if (DRY) { console.log(`TITLE: Release v${version} — sign-off\n\n${body}`); process.exit(0); }

const out = cp.execFileSync('gh',
  ['issue', 'create', '--repo', REPO, '--label', 'release',
   '--title', `Release v${version} — sign-off`, '--body', body],
  { encoding: 'utf8' }).trim();
console.log(out);
