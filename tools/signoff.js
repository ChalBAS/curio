/* SIGN-OFF — reading the CEO's release verdict out of GitHub.
 *
 * Its own module because it is the one piece of the release toolchain whose
 * failure is silently dangerous in both directions: a false ACCEPTED ships a
 * build nobody approved, a false REJECTED hides one that was. Pure, no I/O,
 * tested by tools/releases.test.js.
 *
 * THE VERDICT CAN ARRIVE IN TWO SHAPES, and both must work:
 *
 *   a) a COMMENT on the release issue I open (tools/release_issue.js);
 *   b) the BODY of the report the acceptance suite posts, where the CEO edits
 *      the "### Sign-off" line in place before submitting. This is what actually
 *      happened on v65 → issue #46, and the first version of this module missed
 *      it completely: it read comments only, so a clear rejection registered as
 *      "still awaiting you".
 *
 * THE TRAP THAT FORCED THE COMMENT-ONLY RULE IN THE FIRST PLACE: the issue body
 * that tooling writes NECESSARILY contains the words "Accepted for production"
 * and "Rejected", because it is the sheet telling the CEO what to write. Reading
 * it naively reported v65 as REJECTED, quoting my own instructions back as his
 * decision.
 *
 * So the discriminator is not "body vs comment". It is authorship:
 *
 *   1. Tooling-written bodies carry MARKER and are never read for a verdict.
 *   2. Everything else — human bodies, all comments — is read.
 *   3. Verdict phrases inside code spans and fences never count, so every
 *      template writes its example verdicts in `backticks` and is inert.
 *   4. Only AUTHORISED logins can decide.
 *   5. The latest verdict wins, in both directions.
 *
 * Block quotes are deliberately NOT stripped: the suite's template puts the
 * sign-off line in one, and that is where the CEO wrote "Rejected".
 */
'use strict';

const ACCEPT = /accepted for production/i;
const REJECT = /\brejected\b/i;

// Any issue body containing this was written by our own tooling and is an
// instruction sheet, not a decision. Kept deliberately ugly and unlikely.
const MARKER = '<!-- qpio:instruction-sheet -->';

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
  .replace(/`[^`]*`/g, ' ');            // inline code

function classify(text) {
  const t = strip(text);
  // ACCEPT first: "accepted for production" is the specific phrase and
  // "rejected" the loose word, so a message carrying both is an acceptance
  // that mentions the alternative.
  return ACCEPT.test(t) ? 'ACCEPTED' : REJECT.test(t) ? 'REJECTED' : null;
}

/**
 * Every verdict across every issue raised for one version, oldest first.
 * @param {Array<{number:number,title:string,body:string,createdAt:string,author:object,comments:Array}>} issues
 */
function verdictsIn(issues) {
  const out = [];
  (issues || []).forEach(issue => {
    if (!issue) return;
    const bodyIsTooling = String(issue.body || '').includes(MARKER);
    if (!bodyIsTooling && issue.author && AUTHORISED.has(issue.author.login)) {
      const status = classify(issue.body);
      if (status) out.push({ status, at: issue.createdAt, who: issue.author.login, issue: issue.number, where: 'body' });
    }
    (issue.comments || []).forEach(c => {
      if (!c || !c.author || !AUTHORISED.has(c.author.login)) return;
      const status = classify(c.body);
      if (status) out.push({ status, at: c.createdAt, who: c.author.login, issue: issue.number, where: 'comment' });
    });
  });
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/** The live verdict for a version, or null if none yet. */
function verdictOf(issues) {
  const all = verdictsIn(issues);
  return all.length ? all[all.length - 1] : null;
}

module.exports = { verdictOf, verdictsIn, classify, strip, ACCEPT, REJECT, AUTHORISED, PROCESS_FROM, MARKER };
