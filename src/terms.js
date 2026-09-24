/* QPIO TERMS — the reader's agreement, remembered on this device only.
 *
 * Founder, 24 Sep 2026: "Most app require the user to acknowledge of the term
 * and privacy rules. they can't use the app unless they agree. I need the app
 * to only work if the user acknowledges."
 *
 * WHAT IS AGREED TO: the terms of use AND the privacy notice, with one tick.
 * The founder's own words name both, and YouTube's rules for every app that
 * plays its videos say the same (YouTube API Services Developer Policies,
 * III.A.2: users must agree to a privacy policy before using the app).
 * Agreeing to the notice is not consent to any use of data: terms.html says so,
 * and the counting keeps its own off switch.
 *
 * This file holds only the mechanics: which version of the terms is current,
 * whether this device has agreed to it, and the one write that records the
 * agreement. The agreement screen itself is in app.js (TERMS:begin), because
 * every sentence a reader sees is a literal t() call there, where the French
 * check can see it. measure.js asks accepted() before it sends anything.
 *
 * WHAT IS KEPT, in full, under curio.terms:
 *   { "terms": "1", "termsDate": "2026-09-25", "privacy": "2026-09-25",
 *     "lang": "fr", "at": "2026-09-25" }
 * the version of the terms agreed to and the date of its wording, the date of
 * the privacy notice that was on offer, the language the reader read them in,
 * and the reader's own day - which is what terms.html ("Agreeing to these
 * terms") and privacy.html ("What stays on your device") tell them is kept. No
 * identifier, no time finer than the day, and nothing here is ever sent.
 *
 * CHANGING THE TERMS. tools/terms.test.js fails the build if any of this is
 * skipped.
 *   A small correction (a typo): change terms.html and its date, in both
 *   languages, and TERMS_DATE below. Nobody is asked again; the record says
 *   which wording each reader saw.
 *   A change that matters to readers - and naming the company that will run
 *   Qpio is one, because it changes who the agreement is with:
 *     1. keep the old page, word for word, as terms-v<old>.html (it stays at
 *        /terms/v<old> for good);
 *     2. raise TERMS_VERSION here and TERMS_CURRENT in worker/index.js, set
 *        the same value on both sections of terms.html (data-terms-version),
 *        and set TERMS_DATE;
 *     3. under "Earlier versions", in both languages, a line with a link to
 *        /terms/v<old> and the dates it applied;
 *     4. in app.js, the version's name in TERMS_NAMES and its two "what has
 *        changed" lines in TERMS_CHANGES.
 *   Every device that agreed to an earlier version then sees the agreement
 *   screen again, with those lines, before Qpio carries on.
 *   A change to the privacy notice: its date goes into PRIVACY_VERSION. If the
 *   change matters to readers, raise TERMS_VERSION as well, so they are asked.
 *
 * A BROWSER THAT KEEPS NOTHING. Where storage is blocked the agreement is
 * remembered for this page only, so the reader can use Qpio now and is asked
 * again next time. That is what the terms say will happen.
 */
(function () {
  "use strict";
  var TERMS_VERSION = "1";              // terms.html data-terms-version, EN and FR, must match
  var TERMS_DATE = "2026-09-25";        // the date terms.html prints for this wording, EN and FR
  var PRIVACY_VERSION = "2026-09-25";   // the "Last updated" date on privacy.html, EN and FR
  var KEY = "curio.terms";
  var session = null;                   // agreed during this page load (blocked storage)

  function canStore() { try { localStorage.setItem("curio.t", "1"); localStorage.removeItem("curio.t"); return true; } catch (e) { return false; } }

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      return v && typeof v === "object" && typeof v.terms === "string" ? v : null;
    } catch (e) { return null; }
  }

  // "new": never agreed on this device. "changed": agreed to another version.
  // "ok": agreed to this one.
  function state() {
    if (session === TERMS_VERSION) return "ok";
    var r = read();
    if (!r) return "new";
    return r.terms === TERMS_VERSION ? "ok" : "changed";
  }
  function accepted() { return state() === "ok"; }

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function today(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  // Returns the record, and whether it could be kept beyond this page.
  function accept() {
    var rec = { terms: TERMS_VERSION, termsDate: TERMS_DATE, privacy: PRIVACY_VERSION, lang: window.QLANG === "fr" ? "fr" : "en", at: today() };
    session = TERMS_VERSION;
    var kept = false;
    try { localStorage.setItem(KEY, JSON.stringify(rec)); kept = localStorage.getItem(KEY) !== null; } catch (e) {}
    return { record: rec, kept: kept };
  }

  window.QpioTerms = {
    VERSION: TERMS_VERSION, DATE: TERMS_DATE, PRIVACY_VERSION: PRIVACY_VERSION, KEY: KEY,
    read: read, state: state, accepted: accepted, accept: accept, canStore: canStore
  };
})();
