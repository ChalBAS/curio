// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.
// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt
//
// QUESTION INTELLIGENCE V1 — the semantic model, the validator, and the
// (provisional) tier interface for QPIO's curiosity layer.
//
// What this is: editorial metadata about what a question DOES to a curious
// reader — how much it opens curiosity, how far it stretches, where it can
// lead. It is the infrastructure the future question-selection engine will
// read. It is NOT a monetisation score: nothing here measures purchase
// pressure, and the free answer is never weakened to create demand.
//
// What this is NOT: scientifically validated measurement. Every score is an
// editorial judgement against the rubric in docs/QUESTION_INTELLIGENCE_V1.md.
//
// Where the data lives in V1: src/intelligence.data.js holds the calibration
// sample — question-shaped entries carrying an `intelligence` object, keyed
// by the app's own question id (qid, below) so they join to the live bank
// without touching it. A later phase decides whether mass enrichment inlines
// `intelligence` into the banks or keeps the sidecar; the validator treats
// both shapes identically (any object with an optional `intelligence` key).
//
// This file ships nothing to the running app yet: index.html does not load
// it. It is consumed by tools/intelligence.test.js and tools/preflight.js,
// and by reviewers reading the calibration sample. Wiring it into the app is
// a selection-engine task, deliberately out of scope for V1.

(function () {
  "use strict";

  // ---------- archetypes ----------
  // What kind of curiosity move a question makes. A question may have several.
  // Definitions live in docs/QUESTION_INTELLIGENCE_V1.md §5.
  var ARCHETYPES = [
    "anchor",            // familiar, accessible entry point
    "surprise",          // answer materially differs from likely expectation
    "reveal",            // introduces something the user may not have known existed
    "contradiction",     // challenges a common assumption or misconception
    "human_story",       // human experience/person/conflict drives the curiosity
    "mystery",           // creates a meaningful unresolved puzzle
    "origin",            // how or why something came into existence
    "connection",        // links subjects users may not naturally associate
    "perspective_shift", // changes the frame the subject is understood through
    "counterfactual",    // explores "what if?" / alternative outcomes
    "portal"             // unusually strong gateway into a larger ecosystem
  ];

  // ---------- score dimensions ----------
  // Every numerical dimension is an integer 0–5. Definitions: doc §4–§8.
  var DIMENSIONS = {
    curiosity: [
      "curiosity_gap",     // 0 none .. 5 "I need to understand this"
      "surprise",          // 0 expected .. 5 strongly challenges expectation
      "familiarity_anchor",// 0 unrecognisable .. 5 highly recognisable start
      "human_pull",        // ambition, conflict, injustice, ingenuity… 0 absent .. 5 exceptional
      "connection",        // 0 isolated fact .. 5 many cross-domain pathways
      "discovery",         // 0 already familiar .. 5 "I didn't know this existed"
      "perspective_shift"  // 0 adds a fact .. 5 exposes a substantially different frame
    ],
    tension: [
      "familiarity",       // recognisability of the starting point
      "novelty",           // how far beyond expected knowledge it reaches
      "optimality"         // the rubber band: "I know enough to care, not enough to be satisfied"
    ],
    resource_depth: [
      "depth",             // can the subject sustain meaningful further exploration
      "density",           // are substantial reputable resources available
      "diversity",         // books / docs / podcasts / museums / courses / places…
      "resonance",         // do resources follow from THIS question (not the topic in general)
      "experiential",      // can curiosity become a visit / sight / sound / trip
      "next_step"          // does the answer naturally create another question
    ],
    closure: [
      "risk"               // NEGATIVE: 0 curiosity left alive .. 5 loop closed completely
    ],
    rabbit_hole: [
      "depth"              // 0 none .. 5 exceptionally rich multi-domain rabbit hole
    ]
  };

  // Advisory vocabulary for rabbit_hole.branches. NOT enforced — a subject
  // that needs another word should use another word (the validator warns
  // instead of rejecting, so the vocabulary can grow deliberately).
  var SUGGESTED_BRANCHES = [
    "history", "politics", "science", "technology", "art", "literature",
    "religion", "philosophy", "economics", "people", "place", "architecture",
    "archaeology", "music", "environment", "culture"
  ];

  // ---------- identity ----------
  // The app's own question id, copied character-for-character from app.js so a
  // calibration entry joins to the live bank with no parallel ID system. If
  // app.js ever changes qid(), this must change with it — the test suite
  // fails loudly when they drift apart, which is the point.
  function qid(q) {
    var s = q.q + (q.img && q.img.u ? "|" + q.img.u : "");
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "q" + (h >>> 0).toString(36);
  }

  // ---------- validation ----------
  var GROUPS = Object.keys(DIMENSIONS); // curiosity, tension, resource_depth, closure, rabbit_hole
  var TOP_KEYS = GROUPS.concat(["archetypes"]);

  function isScore(v) { return typeof v === "number" && isFinite(v) && Math.floor(v) === v && v >= 0 && v <= 5; }

  // Validate one `intelligence` object. Returns { ok, errors, warnings }.
  // Strict on purpose: enrichment that is present must be complete and
  // well-formed, or downstream consumers read half-scores as signal. Unknown
  // keys are errors (a typo like `curousity` must fail, not silently score 0).
  function validate(intel) {
    var errors = [], warnings = [];
    if (intel === null || typeof intel !== "object" || Array.isArray(intel)) {
      return { ok: false, errors: ["intelligence must be an object"], warnings: warnings };
    }
    Object.keys(intel).forEach(function (k) {
      if (TOP_KEYS.indexOf(k) === -1) errors.push("unknown key: " + k);
    });
    TOP_KEYS.forEach(function (k) {
      if (intel[k] === undefined) errors.push("missing group: " + k);
    });
    if (errors.length) return { ok: false, errors: errors, warnings: warnings };

    // archetypes — every enriched question makes at least one move
    if (!Array.isArray(intel.archetypes) || !intel.archetypes.length) {
      errors.push("archetypes must be a non-empty array");
    } else {
      intel.archetypes.forEach(function (a) {
        if (ARCHETYPES.indexOf(a) === -1) errors.push("unknown archetype: " + a);
      });
    }

    // score groups — all dimensions present, each an integer 0–5
    GROUPS.forEach(function (g) {
      var grp = intel[g];
      if (grp === null || typeof grp !== "object" || Array.isArray(grp)) {
        errors.push(g + " must be an object"); return;
      }
      Object.keys(grp).forEach(function (k) {
        if (DIMENSIONS[g].indexOf(k) === -1 && !(g === "rabbit_hole" && (k === "branches" || k === "entities")))
          errors.push(g + ": unknown key: " + k);
      });
      DIMENSIONS[g].forEach(function (d) {
        if (!isScore(grp[d])) errors.push(g + "." + d + " must be an integer 0-5");
      });
    });

    // rabbit-hole arrays — may be empty, must be clean when present
    var rh = intel.rabbit_hole;
    if (rh && typeof rh === "object" && !Array.isArray(rh)) {
      ["branches", "entities"].forEach(function (k) {
        if (rh[k] === undefined) { errors.push("rabbit_hole." + k + " is required (may be empty)"); return; }
        if (!Array.isArray(rh[k])) { errors.push("rabbit_hole." + k + " must be an array"); return; }
        rh[k].forEach(function (x) {
          if (typeof x !== "string" || !x.trim()) errors.push("rabbit_hole." + k + " entries must be non-empty strings");
          else if (/\s/.test(x) && k === "entities") errors.push("rabbit_hole.entities must be slug-form (Menelik_II, not Menelik II): " + x);
        });
      });
      (rh.branches || []).forEach(function (b) {
        if (typeof b === "string" && SUGGESTED_BRANCHES.indexOf(b) === -1)
          warnings.push("rabbit_hole.branches: '" + b + "' is outside the suggested vocabulary");
      });
    }
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  // Validate a whole question. `intelligence` is OPTIONAL: a question without
  // it is valid — that is the backward-compatibility contract, not a loophole.
  function validateQuestion(q) {
    if (!q || typeof q !== "object") return { ok: false, errors: ["not a question object"], warnings: [] };
    if (q.intelligence === undefined || q.intelligence === null) return { ok: true, errors: [], warnings: [] };
    return validate(q.intelligence);
  }

  // ---------- quality tiers (PROVISIONAL — calibration pending) ----------
  // The five tiers are a product classification, not a formula anyone has
  // validated. The thresholds below are placeholders, chosen so the
  // calibration sample produces sensible-looking labels to react to. They
  // have NOT been tuned, and must not be treated as empirical. The human
  // review of docs/QI_CALIBRATION_V1.md decides whether they survive.
  var TIERS = { A: "portal", B: "discovery", C: "curiosity", D: "anchor", E: "trivia" };
  var TIER_RULES = { A_MIN_CURIOSITY: 4, A_MIN_DEPTH: 4, B_MIN_MEAN: 3, B_MIN_HOLE: 3, E_MAX_MEAN: 2.5, E_MAX_HOLE: 1, E_MIN_CLOSURE: 4, D_MIN_FAMILIARITY: 4, D_MAX_NOVELTY: 2, D_MAX_MEAN: 3 };

  function mean(ns) { return ns.reduce(function (a, b) { return a + b; }, 0) / ns.length; }
  function curiosityMean(i) { return mean(DIMENSIONS.curiosity.map(function (d) { return i.curiosity[d]; })); }
  function depthMean(i) { return mean(DIMENSIONS.resource_depth.map(function (d) { return i.resource_depth[d]; })); }

  // Returns { tier, provisional: true, basis }. Never call this on an
  // unvalidated object — run validate() first.
  function deriveTier(intel) {
    var R = TIER_RULES, cm = curiosityMean(intel), dm = depthMean(intel), rule = "C";
    if (cm >= R.A_MIN_CURIOSITY && dm >= R.A_MIN_DEPTH) rule = "A";
    else if ((intel.curiosity.surprise >= 4 || intel.curiosity.discovery >= 4) &&
             intel.rabbit_hole.depth >= R.B_MIN_HOLE && cm >= R.B_MIN_MEAN) rule = "B";
    else if (cm < R.E_MAX_MEAN && intel.rabbit_hole.depth <= R.E_MAX_HOLE && intel.closure.risk >= R.E_MIN_CLOSURE) rule = "E";
    else if (intel.tension.familiarity >= R.D_MIN_FAMILIARITY && intel.tension.novelty <= R.D_MAX_NOVELTY && cm < R.D_MAX_MEAN) rule = "D";
    return { tier: rule, label: TIERS[rule], provisional: true, basis: { curiosity_mean: +cm.toFixed(2), depth_mean: +dm.toFixed(2) } };
  }

  window.CURIO_QI = {
    ARCHETYPES: ARCHETYPES,
    DIMENSIONS: DIMENSIONS,
    SUGGESTED_BRANCHES: SUGGESTED_BRANCHES,
    TIERS: TIERS,
    TIER_RULES: TIER_RULES,
    qid: qid,
    validate: validate,
    validateQuestion: validateQuestion,
    deriveTier: deriveTier
  };
})();
