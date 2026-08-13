/* Tests for the release verdict reader. Zero dependencies — node runs it.
 *
 *   node tools/releases.test.js
 *
 * Every case here is a way the audit record could lie about whether a build was
 * authorised. Two of them are not hypothetical — they are the defects this file
 * was written after, one in each direction:
 *
 *   FALSE REJECT (fixed 2026-08-13a): the reader scanned the issue body that the
 *     tooling itself writes, which contains the words "Accepted for production —
 *     or Rejected", and reported v65 as rejected before anyone had looked at it.
 *   FALSE AWAIT (fixed 2026-08-13b): the fix for the above ignored bodies
 *     entirely — so when the CEO rejected v65 by editing the sign-off line in
 *     the acceptance report (#46), the record showed "still awaiting you".
 */
'use strict';
const { verdictOf, verdictsIn, classify, strip, MARKER, PROCESS_FROM } = require('./signoff');

let failed = 0;
function is(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log('  \x1b[32mPASS\x1b[0m  ' + name);
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        expected ${e}\n        actual   ${a}`); }
}

const CEO = { login: 'ChalBAS' };
const OTHER = { login: 'SomeoneElse' };
let n = 100;
const issue = (o = {}) => ({
  number: o.number || ++n,
  title: o.title || 'Release v65 — sign-off',
  body: o.body || '',
  author: o.author || CEO,
  createdAt: o.createdAt || '2026-08-13T10:00:00Z',
  comments: o.comments || []
});
const comment = (body, at, author) => ({ body, createdAt: at || '2026-08-13T10:00:00Z', author: author || CEO });
const st = issues => { const v = verdictOf(issues); return v ? v.status : null; };

/* The two real templates, verbatim in shape. */
const TOOLING_BODY = [
  MARKER,
  '**To ship this, reply with one sentence: `Accepted for production` — or `Rejected — <reason>`.**',
  '', '## What is in it', '- Human body: 20 questions'
].join('\n');

const SUITE_TEMPLATE_UNEDITED = [
  '## Acceptance run — v65', '', '**All 36 checks passed**', '',
  '### Sign-off',
  '_Write your verdict on the next line — either_ `Accepted for production` _or_ `Rejected — <reason>`.',
  '', '<!-- your verdict below this line -->', ''
].join('\n');

console.log('\n\x1b[1mThe two real regressions\x1b[0m');

is('tooling instruction sheet is never a verdict', st([issue({ body: TOOLING_BODY })]), null);
is('unedited suite template is never a verdict', st([issue({ body: SUITE_TEMPLATE_UNEDITED })]), null);

// The exact shape of issue #46: the CEO edited the sign-off line inside a block
// quote, in the BODY. This must read as a rejection.
const REAL_46 = [
  '## Acceptance run — v65', '', '**1 BLOCKING FAILURE** · 36 checks', '',
  '### Sign-off', '> _Replace this line with_ **Rejected**', '',
  'There is a bug in the navigation logic, the quiz restarts on return.'
].join('\n');
is('CEO verdict written into the suite report body (issue #46)', st([issue({ body: REAL_46 })]), 'REJECTED');

console.log('\n\x1b[1mVerdicts\x1b[0m');
is('plain acceptance in a comment', st([issue({ comments: [comment('Accepted for production')] })]), 'ACCEPTED');
is('acceptance with trailing text', st([issue({ comments: [comment('accepted for production - good on the phone')] })]), 'ACCEPTED');
is('rejection in a comment', st([issue({ comments: [comment('Rejected — French daily repeats')] })]), 'REJECTED');
is('acceptance written into a human-authored body', st([issue({ body: 'Accepted for production' })]), 'ACCEPTED');
is('no verdict yet', st([issue({ comments: [comment('will look tonight')] })]), null);
is('no issues at all', st([]), null);
is('undefined', st(undefined), null);

console.log('\n\x1b[1mAuthority\x1b[0m');
is('a stranger cannot accept', st([issue({ comments: [comment('Accepted for production', null, OTHER)] })]), null);
is('a stranger cannot reject', st([issue({ comments: [comment('Rejected — no', null, OTHER)] })]), null);
is('a stranger cannot open a rejecting report', st([issue({ author: OTHER, body: 'Rejected — nope' })]), null);
is('CEO still read when a stranger comments first',
   st([issue({ comments: [comment('looks fine', '2026-08-13T09:00:00Z', OTHER), comment('Accepted for production', '2026-08-13T10:00:00Z')] })]), 'ACCEPTED');

console.log('\n\x1b[1mOrder — the latest verdict is the live one\x1b[0m');
is('rejected then accepted',
   st([issue({ comments: [comment('Rejected — tab bar covers Next', '2026-08-13T09:00:00Z'),
                          comment('Accepted for production', '2026-08-13T11:00:00Z')] })]), 'ACCEPTED');
is('accepted then withdrawn',
   st([issue({ comments: [comment('Accepted for production', '2026-08-13T09:00:00Z'),
                          comment('Actually rejected — crashes on reopen', '2026-08-13T11:00:00Z')] })]), 'REJECTED');

// v65's real situation: two issues, the tooling ticket and the failed report.
console.log('\n\x1b[1mSeveral issues for one version — v65 as it actually is\x1b[0m');
const V65 = [
  issue({ number: 45, body: TOOLING_BODY, createdAt: '2026-08-12T22:00:00Z' }),
  issue({ number: 46, title: 'Release v65 — FAILED acceptance', body: REAL_46, createdAt: '2026-08-13T01:30:00Z' })
];
is('the rejection is found across both issues', st(V65), 'REJECTED');
is('and is attributed to the report, not the ticket', verdictOf(V65).issue, 46);
is('and knows it came from a body', verdictOf(V65).where, 'body');

is('a later acceptance on the tooling ticket supersedes the earlier rejection',
   st([...V65, issue({ number: 45, body: TOOLING_BODY, comments: [comment('Accepted for production', '2026-08-13T09:00:00Z')] })]),
   'ACCEPTED');

console.log('\n\x1b[1mQuoting — the natural phone reply\x1b[0m');
is('quoting the instruction then accepting',
   st([issue({ comments: [comment('> `Rejected — <reason>`\n\nAccepted for production')] })]), 'ACCEPTED');
is('a fenced example alone is not a verdict',
   st([issue({ comments: [comment('```\nAccepted for production\n```\nstill testing')] })]), null);
is('both phrases in one message reads as acceptance',
   st([issue({ comments: [comment('Accepted for production. Nothing rejected this time.')] })]), 'ACCEPTED');

console.log('\n\x1b[1mAttribution and helpers\x1b[0m');
const v = verdictOf([issue({ number: 77, comments: [comment('Accepted for production', '2026-08-13T12:34:00Z')] })]);
is('records who', v.who, 'ChalBAS');
is('records when', v.at, '2026-08-13T12:34:00Z');
is('records which issue', v.issue, 77);
is('records where', v.where, 'comment');
is('every verdict is kept, not just the last', verdictsIn(V65).length, 1);
is('strip removes inline code', strip('a `b` c').trim(), 'a   c');
is('block quotes survive stripping', classify('> **Rejected**'), 'REJECTED');
is('process starts at 65', PROCESS_FROM, 65);

console.log('');
if (failed) { console.log(`\x1b[31m\x1b[1m${failed} FAILED\x1b[0m`); process.exit(1); }
console.log('\x1b[32m\x1b[1mALL PASSED\x1b[0m — the audit record cannot be falsified by these routes.');
