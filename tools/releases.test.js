/* Tests for the release verdict reader. Zero dependencies — node runs it.
 *
 *   node tools/releases.test.js
 *
 * Every case here is a way the audit record could lie. Case 1 is not
 * hypothetical: it is the bug this suite was written after, which reported v65
 * as REJECTED by reading the tooling's own instruction sheet.
 */
'use strict';
const { verdictOf, strip, PROCESS_FROM } = require('./signoff');

let failed = 0;
function is(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log('  \x1b[32mPASS\x1b[0m  ' + name); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        expected ${e}\n        actual   ${a}`); }
}
const ceo = (body, at) => ({ author: { login: 'ChalBAS' }, body, createdAt: at || '2026-08-13T10:00:00Z' });
const other = (body, at) => ({ author: { login: 'SomeoneElse' }, body, createdAt: at || '2026-08-13T10:00:00Z' });
const st = c => { const v = verdictOf(c); return v ? v.status : null; };

console.log('\n\x1b[1mVerdict reading\x1b[0m');

// 1. THE REGRESSION. The issue body the tooling writes contains both phrases.
//    It must never be passed in — and if it is, quoting must neutralise it.
const INSTRUCTION = 'To ship this, reply with one sentence: `Accepted for production` — or `Rejected — <reason>`.';
is('instruction sheet quoted back is not a verdict', st([ceo(INSTRUCTION)]), null);

// 2. The real verdicts.
is('plain acceptance', st([ceo('Accepted for production')]), 'ACCEPTED');
is('acceptance, sentence case with trailing text', st([ceo('accepted for production - looks good on the phone')]), 'ACCEPTED');
is('plain rejection', st([ceo('Rejected — the French daily repeats a question')]), 'REJECTED');
is('rejection, lower case', st([ceo('rejected, pictures do not load on 4G')]), 'REJECTED');

// 3. No verdict yet.
is('unrelated comment', st([ceo('will look at this tonight')]), null);
is('no comments at all', st([]), null);
is('undefined comments', st(undefined), null);

// 4. Authority. Only the CEO can ship.
is('someone else cannot accept', st([other('Accepted for production')]), null);
is('someone else cannot reject', st([other('Rejected — no')]), null);
is('CEO verdict still read when others comment first',
   st([other('looks fine to me'), ceo('Accepted for production')]), 'ACCEPTED');

// 5. Order. The latest verdict is the live one, in both directions.
is('rejected then accepted reads accepted',
   st([ceo('Rejected — the tab bar covers Next', '2026-08-13T09:00:00Z'),
       ceo('Accepted for production', '2026-08-13T11:00:00Z')]), 'ACCEPTED');
is('accepted then withdrawn reads rejected',
   st([ceo('Accepted for production', '2026-08-13T09:00:00Z'),
       ceo('Actually rejected — it crashes on reopen', '2026-08-13T11:00:00Z')]), 'REJECTED');

// 6. Both phrases in one message: acceptance is the specific one and wins.
is('acceptance mentioning the alternative',
   st([ceo('Accepted for production. Nothing rejected this time.')]), 'ACCEPTED');

// 7. Quoting, the natural phone reply.
is('block-quoted instruction plus a real acceptance',
   st([ceo('> Rejected — <reason>\n\nAccepted for production')]), 'ACCEPTED');
is('fenced instruction alone is not a verdict',
   st([ceo('```\nAccepted for production\n```\nstill testing')]), null);

// 8. Attribution is recorded, not just the verdict.
const v = verdictOf([ceo('Accepted for production', '2026-08-13T12:34:00Z')]);
is('records who', v.who, 'ChalBAS');
is('records when', v.at, '2026-08-13T12:34:00Z');

console.log('\n\x1b[1mHelpers\x1b[0m');
is('strip removes inline code', strip('a `b` c').trim(), 'a   c');
is('strip removes quotes', strip('> quoted\nreal').trim(), 'real');
is('process starts at 65', PROCESS_FROM, 65);

console.log('');
if (failed) { console.log(`\x1b[31m\x1b[1m${failed} FAILED\x1b[0m`); process.exit(1); }
console.log('\x1b[32m\x1b[1mALL PASSED\x1b[0m — the audit record cannot be falsified by these routes.');
