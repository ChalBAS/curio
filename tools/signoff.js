/* SIGN-OFF — reading the CEO's release verdict out of a GitHub issue thread.
 *
 * Its own module because it is the one piece of the release toolchain whose
 * failure is silently dangerous in both directions: a false ACCEPTED ships a
 * build nobody approved, a false REJECTED hides one that was. Pure, no I/O,
 * tested by tools/releases.test.js.
 *
 * TWO RULES, both learned the hard way on 2026-08-13:
 *
 * 1. A verdict comes ONLY from a COMMENT, never from the issue body. The body is
 *    the instruction sheet the tooling writes, and it necessarily contains the
 *    words "Accepted for production — or Rejected — <reason>". The first version
 *    of this code read the body and duly reported v65 as REJECTED, quoting my
 *    own instructions back as the CEO's decision.
 *
 * 2. Quoted text never counts. Code spans, fenced blocks and block quotes are
 *    stripped before matching, so replying by quoting the instruction — the most
 *    natural thing to do on a phone — cannot be misread as a verdict.
 */
'use strict';

const ACCEPT = /accepted for production/i;
const REJECT = /\brejected\b/i;

// Only these logins may authorise a release. Without this any account with
// comment access could ship, and the audit record would call it a valid
// sign-off. The CEO's GitHub login, verified 2026-08-13.
const AUTHORISED = new Set(['ChalBAS']);

// Sign-off began at v65. Earlier versions shipped under the founder-only regime
// with no second party to sign, so they are unsigned BY DESIGN and are recorded
// as PRE-PROCESS. Calling them breaches would bury the one that would matter in
// forty-five that do not.
const PROCESS_FROM = 65;

const strip = s => String(s || '')
  .replace(/```[\s\S]*?```/g, ' ')      // fenced blocks
  .replace(/`[^`]*`/g, ' ')             // inline code
  .replace(/^\s*>.*$/gm, ' ');          // block quotes

/** @returns {{status:'ACCEPTED'|'REJECTED', at:string, who:string}|null} */
function verdictOf(comments) {
  const verdicts = (comments || [])
    .filter(c => c && c.author && AUTHORISED.has(c.author.login))
    .map(c => {
      const text = strip(c.body);
      // ACCEPT first: "accepted for production" is the specific phrase and
      // "rejected" the loose word, so a message containing both is an
      // acceptance that mentions the alternative.
      const status = ACCEPT.test(text) ? 'ACCEPTED' : REJECT.test(text) ? 'REJECTED' : null;
      return status && { status, at: c.createdAt, who: c.author.login };
    })
    .filter(Boolean);
  // Latest verdict wins either way: rejected, fixed, then accepted in one thread
  // must read as accepted — and an acceptance later withdrawn must read as
  // rejected.
  return verdicts.length ? verdicts[verdicts.length - 1] : null;
}

module.exports = { verdictOf, strip, ACCEPT, REJECT, AUTHORISED, PROCESS_FROM };
