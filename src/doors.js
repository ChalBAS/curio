// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.
// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt
//
// GATE 5 DOOR INSTRUMENT — client half.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  KILL SWITCH — DEFAULTED OFF, AWAITING FOUNDER RULING R1.               │
// │                                                                         │
// │  R1 (open since Gate 4): is a labelled, editorially chosen, NON-PAID    │
// │  door a "monetisation surface" banned under REQ-001 / MODULE-01 §4?     │
// │  Until the founder rules, this client sends NOTHING: no /doors/ fetch,  │
// │  no /go/ routing, no request of any kind. With the switch off every     │
// │  door link is the plain destination URL and the app is exactly v80.     │
// │                                                                         │
// │  Flipping SEND_ENABLED to true is the FOUNDER'S act, taken only after   │
// │  R1 lands and the pre-registration of GATE-5-DOOR-INSTRUMENT.md §2.10   │
// │  is committed. No agent flips it. (Server-side kill switch: remove the  │
// │  two run_worker_first entries in wrangler.jsonc and deploy.)            │
// └─────────────────────────────────────────────────────────────────────────┘
//
// What this measures when ON — and all it can ever measure: one door-set
// request per device-day (the served-round DENOMINATOR, ruled 2026-08-20) and
// door taps routed through /go/<class>/<slot> (the NUMERATOR). Aggregated
// at the edge by ISO week; no identifier, no cookie, no raw lines, nothing
// finer than (week, event, class, slot, lang, geo, mode). The `mode` column
// ('all' | 'kids') is in the counter key from day one — the key is
// irreversible and Kids-mode share is a live parameter (GATE-5-CLOSURE.md).
//
// HARD REQUIREMENT (spec §2.6): the instrument must never be able to break
// the app. Every failure path here degrades to current v80 behaviour exactly.
// This app has been taken down once by an edge configuration; a measurement
// counter is not permitted to be the second cause.
//
// Charter VAL-12 / D-061 is untouched by any of this: the instrument routes
// taps, it never places, orders or weights a destination — and the `source`
// slot (the evidence link) is never routed through /go/ at all.
(function () {
  "use strict";

  // ── THE KILL SWITCH ── OFF pending founder ruling R1. See banner above.
  var SEND_ENABLED = false;

  var STORE_KEY = "qpio.doorset";

  function lang() { return window.QLANG === "fr" ? "fr" : "en"; }
  function mode() {
    try {
      var s = JSON.parse(localStorage.getItem("curio.settings") || "{}");
      return s.ageMode === "kids" ? "kids" : "all";
    } catch (e) { return "all"; }
  }
  function todayUTC() { return new Date().toISOString().slice(0, 10); }

  // One fetch per device-day (spec §2.6). The date is recorded BEFORE the
  // fetch resolves so a failure is never retried for that date — offline, 404
  // or timeout all fall back to the local golinks.js computation, nothing is
  // counted, and no error is ever shown. Offline rounds are a stated scope
  // limit of the ruled metric, not a bug.
  function roundStart() {
    if (!SEND_ENABLED) return;                          // R1 pending — send nothing
    try {
      var d = todayUTC();
      var rec = null;
      try { rec = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) {}
      if (rec && rec.date === d) return;                // already served today
      try { localStorage.setItem(STORE_KEY, JSON.stringify({ date: d })); } catch (e) {}
      fetch("/doors/" + d + ".json?lang=" + lang() + "&mode=" + mode(), { cache: "no-store" })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (payload) {
          if (!payload) return;
          try { localStorage.setItem(STORE_KEY, JSON.stringify({ date: d, payload: payload })); } catch (e) {}
        })
        .catch(function () { /* rule 3: degrade silently, count nothing */ });
    } catch (e) { /* the instrument never breaks the app */ }
  }

  // The /go/ href for one door tap — or null, in which case the caller uses
  // the plain destination URL (v80 behaviour). Null whenever: the switch is
  // off; the class is not a door class (`source` is the evidence link, never
  // routed — VAL-12 / NN-3); the slot is outside lead|s1..s5; or the URL is
  // not absolute https. The destination is percent-encoded ONCE so the edge
  // can reproduce it byte-for-byte in the 302 Location.
  function href(kind, slot, url) {
    if (!SEND_ENABLED) return null;
    if (kind !== "read" && kind !== "visit" && kind !== "watch") return null;
    if (slot !== "lead" && !/^s[1-5]$/.test(String(slot))) return null;
    if (!/^https:\/\//.test(url || "")) return null;
    return "/go/" + kind + "/" + slot +
      "?u=" + encodeURIComponent(url) +
      "&lang=" + lang() + "&mode=" + mode();
  }

  window.QPIO_DOORS = { roundStart: roundStart, href: href, enabled: SEND_ENABLED };
})();
