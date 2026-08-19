// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.
// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt
//
// QUESTION INTELLIGENCE — the final three-stage model (v77).
//
// The curiosity journey is ENTRY PULL → ANSWER → SPARK → PORTAL → RESOURCE →
// RABBIT HOLE, and the model mirrors it:
//
//   entry_pull  — the QUESTION before the answer is known
//   spark       — the ANSWER + FACT
//   portal      — where the curiosity can go
//
// Scores are integers 0–5 and EDITORIAL METADATA, not scientific
// measurements. Archetype ≠ quality; role ≠ an A-to-E ladder (an anchor is
// not bad — pacing needs anchors). closure_risk is the only NEGATIVE metric:
// 0 = curiosity stays open, 5 = the loop is effectively closed.
//
// This file also carries the two selection functions, paceDaily and
// balanceQuickfire. They are PURE — no DOM, no storage, no clock — so the
// whole selection engine is testable in Node, and identical on every device
// for the same inputs. app.js wires them to the bank; nothing else may.
//
// Data: src/intelligence.corpus.js ships one packed row per bank question,
// aligned by bank index (EN/FR banks are index-aligned, so one row serves
// both languages). decodeRow unpacks it. src/intelligence.data.js holds the
// editor-scored calibration/reference set with rationale, for review.

(function () {
  "use strict";

  // ---------- vocabularies ----------
  var ARCHETYPES = [
    "anchor", "surprise", "reveal", "contradiction", "human_story",
    "mystery", "origin", "connection", "perspective_shift", "counterfactual",
    "portal"
  ];
  // Session functions, not a quality ladder. Low familiarity is not bad; it
  // means the framing needs a stronger bridge.
  var ROLES = ["anchor", "curiosity", "discovery", "portal", "deep", "trivia"];
  var DIAGNOSES = ["keep", "enhance_question", "enhance_spark", "enrich_portal", "reframe", "replace", "review"];

  var DIMENSIONS = {
    entry_pull: ["curiosity_gap", "familiarity", "novelty", "tension", "intrigue"],
    spark: ["surprise", "discovery", "human_pull", "perspective_shift", "closure_risk"],
    portal: ["connection", "rabbit_hole_depth", "resource_depth", "resource_density",
             "resource_diversity", "resource_resonance", "experiential", "next_step"]
  };

  var SUGGESTED_BRANCHES = [
    "history", "politics", "science", "technology", "art", "literature",
    "religion", "philosophy", "economics", "people", "place", "architecture",
    "archaeology", "music", "environment", "culture"
  ];

  // ---------- identity ----------
  // The app's own question id, copied character-for-character from app.js. If
  // app.js ever changes qid(), this must change with it.
  function qid(q) {
    var s = q.q + (q.img && q.img.u ? "|" + q.img.u : "");
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "q" + (h >>> 0).toString(36);
  }

  // ---------- packed-row codec ----------
  // Row: { a:[archetypes], r:role, e:[5], s:[5], p:[8], d:diagnosis, v:"e"|"h",
  //        b:[branches], n:[entities] }  (b/n omitted when empty)
  function decodeRow(row) {
    if (!row) return null;
    var E = DIMENSIONS.entry_pull, S = DIMENSIONS.spark, P = DIMENSIONS.portal;
    var intel = {
      archetypes: row.a || [],
      role: row.r,
      entry_pull: {}, spark: {}, portal: {},
      rabbit_hole: { branches: row.b || [], entities: row.n || [] },
      diagnosis: row.d || "review",
      provenance: row.v === "e" ? "editor" : "heuristic-v77"
    };
    E.forEach(function (d, i) { intel.entry_pull[d] = row.e[i]; });
    S.forEach(function (d, i) { intel.spark[d] = row.s[i]; });
    P.forEach(function (d, i) { intel.portal[d] = row.p[i]; });
    return intel;
  }

  // ---------- the intelligence-absent fallback ----------
  // A question with no intelligence must still be selectable: a neutral,
  // middle-of-the-road profile that neither helps nor hinders pacing.
  function neutral() {
    return {
      archetypes: [], role: "curiosity",
      entry_pull: { curiosity_gap: 2, familiarity: 3, novelty: 2, tension: 2, intrigue: 2 },
      spark: { surprise: 2, discovery: 2, human_pull: 2, perspective_shift: 2, closure_risk: 3 },
      portal: { connection: 2, rabbit_hole_depth: 2, resource_depth: 2, resource_density: 2,
                resource_diversity: 2, resource_resonance: 2, experiential: 2, next_step: 2 },
      rabbit_hole: { branches: [], entities: [] },
      diagnosis: "review", provenance: "fallback"
    };
  }

  // ---------- validation ----------
  function isScore(v) { return typeof v === "number" && isFinite(v) && Math.floor(v) === v && v >= 0 && v <= 5; }

  function validate(intel) {
    var errors = [], warnings = [];
    if (intel === null || typeof intel !== "object" || Array.isArray(intel))
      return { ok: false, errors: ["intelligence must be an object"], warnings: warnings };

    ["archetypes", "role", "entry_pull", "spark", "portal", "rabbit_hole", "diagnosis"].forEach(function (k) {
      if (intel[k] === undefined) errors.push("missing key: " + k);
    });
    if (errors.length) return { ok: false, errors: errors, warnings: warnings };

    if (!Array.isArray(intel.archetypes) || !intel.archetypes.length) errors.push("archetypes must be a non-empty array");
    else intel.archetypes.forEach(function (a) { if (ARCHETYPES.indexOf(a) === -1) errors.push("unknown archetype: " + a); });
    if (ROLES.indexOf(intel.role) === -1) errors.push("unknown role: " + intel.role);
    if (DIAGNOSES.indexOf(intel.diagnosis) === -1) errors.push("unknown diagnosis: " + intel.diagnosis);

    ["entry_pull", "spark", "portal"].forEach(function (g) {
      var grp = intel[g];
      if (grp === null || typeof grp !== "object" || Array.isArray(grp)) { errors.push(g + " must be an object"); return; }
      Object.keys(grp).forEach(function (k) { if (DIMENSIONS[g].indexOf(k) === -1) errors.push(g + ": unknown key: " + k); });
      DIMENSIONS[g].forEach(function (d) { if (!isScore(grp[d])) errors.push(g + "." + d + " must be an integer 0-5"); });
    });

    var rh = intel.rabbit_hole;
    if (rh === null || typeof rh !== "object" || Array.isArray(rh)) errors.push("rabbit_hole must be an object");
    else ["branches", "entities"].forEach(function (k) {
      if (!Array.isArray(rh[k])) { errors.push("rabbit_hole." + k + " must be an array (may be empty)"); return; }
      rh[k].forEach(function (x) {
        if (typeof x !== "string" || !x.trim()) errors.push("rabbit_hole." + k + " entries must be non-empty strings");
        else if (k === "entities" && /\s/.test(x)) errors.push("rabbit_hole.entities must be slug-form: " + x);
      });
    });
    if (rh && Array.isArray(rh.branches)) rh.branches.forEach(function (b) {
      if (typeof b === "string" && SUGGESTED_BRANCHES.indexOf(b) === -1)
        warnings.push("rabbit_hole.branches: '" + b + "' is outside the suggested vocabulary");
    });
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  function validateQuestion(q) {
    if (!q || typeof q !== "object") return { ok: false, errors: ["not a question object"], warnings: [] };
    if (q.intelligence === undefined || q.intelligence === null) return { ok: true, errors: [], warnings: [] };
    return validate(q.intelligence);
  }

  // ---------- means ----------
  function meanOf(grp, dims) {
    var t = 0;
    for (var i = 0; i < dims.length; i++) t += grp[dims[i]];
    return t / dims.length;
  }
  function entryMean(i) { return meanOf(i.entry_pull, DIMENSIONS.entry_pull); }
  function sparkMean(i) { return meanOf(i.spark, DIMENSIONS.spark); }
  function portalMean(i) { return meanOf(i.portal, DIMENSIONS.portal); }

  // ---------- role derivation (heuristic) ----------
  // Roles are session functions. The rules are declared, ordered, and dull on
  // purpose — a reviewer must be able to see exactly why a label landed.
  function deriveRole(intel) {
    var em = entryMean(intel), sm = sparkMean(intel), pm = portalMean(intel);
    var s = intel.spark, e = intel.entry_pull, p = intel.portal;
    if (pm >= 3.5 && p.rabbit_hole_depth >= 3 && e.familiarity <= 2) return "deep";
    if (pm >= 3.5 && p.rabbit_hole_depth >= 3) return "portal";
    if ((s.discovery >= 4 || s.surprise >= 4) && pm >= 3) return "discovery";
    if (em < 2.5 && s.closure_risk >= 4) return "trivia";
    if (e.familiarity >= 4 && sm < 3) return "anchor";
    return "curiosity";
  }

  // ---------- editorial diagnosis ----------
  // The mandate's interpretation grid, with declared thresholds. LOW < 2.5,
  // HIGH >= 3.5. This is an editorial triage aid, not fake precision — the
  // boundary cases are exactly the ones a human should re-read.
  function diagnose(intel) {
    var em = entryMean(intel), sm = sparkMean(intel), pm = portalMean(intel);
    var LOW = 2.5, HIGH = 3.5;
    if (em < LOW && sm >= HIGH && pm >= HIGH) return "enhance_question";
    if (em >= HIGH && sm < LOW && pm >= HIGH) return "enhance_spark";
    if (em >= HIGH && sm >= HIGH && pm < LOW) return "enrich_portal";
    if (em < LOW && sm < LOW && pm < LOW) return "reframe";
    return "keep";
  }

  // ---------- selection: shared profile ----------
  function profileOf(q) {
    var intel = (q && q.intelligence) || neutral();
    return {
      q: q, intel: intel,
      role: intel.role || deriveRole(intel),
      em: entryMean(intel), sm: sparkMean(intel), pm: portalMean(intel),
      familiarity: intel.entry_pull.familiarity, novelty: intel.entry_pull.novelty,
      closure: intel.spark.closure_risk,
      archetypes: intel.archetypes
    };
  }

  // Deterministic 32-bit hash of a string — for stable tie-breaks.
  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h >>> 0;
  }

  // ---------- selection: paceDaily ----------
  // Choose `count` questions from a dealt window, for psychological pacing:
  //
  //   1 accessible foothold · 1 curiosity · 1 stronger surprise/contradiction
  //   · 1 discovery · 1 strong portal
  //
  // That is a TARGET COMPOSITION, not a fixed order and never a hard filter —
  // a window that cannot fill a slot still deals five cards (graceful
  // degradation). Guardrails from the mandate:
  //   NOVELTY BUDGET — no more than 2 of 5 with familiarity <= 2
  //   ROLE DIVERSITY — no role on 3+ of 5
  //   ARCHETYPE DIVERSITY — no single mechanic on 3+ of 5
  //   PORTAL PRESENCE — prefer at least one pm >= 3.5 card
  //   FLAT GUARD — never five closure_risk >= 4 cards
  // Every subset of the window is scored (C(8,5)=56 evaluations — cheap and
  // exact), ties break by a deterministic hash so every device agrees.
  function paceDaily(window, count, salt) {
    if (!window || !window.length) return [];
    count = count || 5;
    if (window.length <= count) return window.slice();
    salt = salt || 0;

    var profs = window.map(profileOf);
    profs.forEach(function (p, i) { p.widx = i; });  // language-independent tie-break identity
    var n = profs.length, best = null, bestScore = -Infinity, bestHash = 0;

    // Slot fits for the target composition.
    function slotFit(p, slot) {
      switch (slot) {
        case 0: return p.familiarity >= 4 ? 1 : 0;                                   // foothold
        case 1: return (p.intel.spark.surprise >= 4 || p.archetypes.indexOf("contradiction") !== -1) ? 1 : 0; // spark
        case 2: return (p.role === "curiosity" || p.role === "anchor") ? 1 : 0;      // curiosity
        case 3: return (p.intel.spark.discovery >= 4 || p.role === "discovery") ? 1 : 0; // discovery
        case 4: return (p.pm >= 3.5 || p.role === "portal" || p.role === "deep") ? 1 : 0;  // portal
      }
      return 0;
    }

    function subsets(start, k, acc, cb) {
      if (k === 0) return cb(acc);
      for (var i = start; i <= n - k; i++) subsets(i + 1, k - 1, acc.concat(i), cb);
    }

    subsets(0, count, [], function (idxs) {
      var cards = idxs.map(function (i) { return profs[i]; });
      var score = 0, i, j;

      // slot coverage: how much of the target composition the set can fill
      var covered = 0;
      for (i = 0; i < 5; i++) if (cards.some(function (c) { return slotFit(c, i); })) covered++;
      score += covered * 12;

      // NOVELTY BUDGET — a daily composed mostly of the obscure is a broken
      // rubber band. Dominant penalty: any satisfiable alternative wins.
      var lowFam = cards.filter(function (c) { return c.familiarity <= 2; }).length;
      if (lowFam > 2) score -= (lowFam - 2) * 25;
      // a foothold to start from
      if (cards.some(function (c) { return c.familiarity >= 4; })) score += 6;

      // ROLE DIVERSITY
      var byRole = {};
      cards.forEach(function (c) { byRole[c.role] = (byRole[c.role] || 0) + 1; });
      for (var r in byRole) if (byRole[r] > 2) score -= (byRole[r] - 2) * 25;

      // ARCHETYPE DIVERSITY
      var byArch = {};
      cards.forEach(function (c) { c.archetypes.forEach(function (a) { byArch[a] = (byArch[a] || 0) + 1; }); });
      for (var a in byArch) if (byArch[a] > 2) score -= (byArch[a] - 2) * 10;

      // PORTAL PRESENCE — the set keeps the window's strongest continuation.
      // Scaled by the best portal mean in the set, not binary: portal-grade
      // cards (pm >= 3.5) are ~10% of the bank, so the pacer's real contract
      // is "never drop the window's best rabbit hole" — the daily always
      // ends on its strongest available continuation.
      var maxPm = 0;
      cards.forEach(function (c) { if (c.pm > maxPm) maxPm = c.pm; });
      score += maxPm * 2;

      // FLAT GUARD
      if (cards.every(function (c) { return c.closure >= 4; })) score -= 15;
      // ...and its twin: five maximum-stretch cards is exhausting, not rich
      var highStretch = cards.filter(function (c) { return c.em >= 4; }).length;
      if (highStretch > 3) score -= (highStretch - 3) * 6;

      // mild preference for depth where the window offers it (NOT intensity
      // maximisation — this only breaks otherwise-equal sets)
      var pSum = 0;
      cards.forEach(function (c) { pSum += c.pm; });
      score += pSum;

      // deterministic tie-break: hash of the index tuple + salt
      var h = hashStr(idxs.join(",") + "|" + salt);
      if (score > bestScore || (score === bestScore && h > bestHash)) {
        bestScore = score; bestHash = h; best = cards;
      }
    });

    // PORTAL KEEP (mandate: "at least one strong rabbit-hole opportunity
    // where the eligible pool allows it"). The window's strongest
    // continuation is served unless swapping it in would break a harder
    // guardrail — novelty budget or role diversity outrank portal preference.
    var topCard = null;
    profs.forEach(function (p) { if (!topCard || p.pm > topCard.pm) topCard = p; });
    if (topCard && best.indexOf(topCard) === -1) {
      // victims tried weakest-first; the first swap that respects the harder
      // guardrails wins. Only an unsatisfiable conflict yields the card.
      var victims = best.slice().sort(function (a, b) { return a.pm - b.pm; });
      for (var v = 0; v < victims.length; v++) {
        var trial = best.filter(function (c) { return c !== victims[v]; }).concat(topCard);
        var tLow = trial.filter(function (c) { return c.familiarity <= 2; }).length;
        var tRoles = {}, roleBad = false;
        trial.forEach(function (c) { tRoles[c.role] = (tRoles[c.role] || 0) + 1; });
        Object.keys(tRoles).forEach(function (r) { if (tRoles[r] > 2) roleBad = true; });
        if (tLow <= 2 && !roleBad) { best = trial; break; }
      }
    }

    // ORDER the chosen five along the pacing curve: foothold first, strongest
    // portal last. For each slot, take the remaining card with the best slot
    // fit; ties break on fallback desirability, then on a deterministic hash
    // of the card's position in the dealt window — never on question text,
    // so English and French pick identically.
    var remaining = best.slice(), ordered = [];
    for (var slot = 0; slot < 5 && remaining.length; slot++) {
      var pick = 0;
      for (var k = 1; k < remaining.length; k++) {
        var cFit = slotFit(remaining[k], slot), pFit = slotFit(remaining[pick], slot);
        if (cFit !== pFit) { if (cFit > pFit) pick = k; continue; }
        var cFb = remaining[k].sm + remaining[k].pm, pFb = remaining[pick].sm + remaining[pick].pm;
        if (cFb !== pFb) { if (cFb > pFb) pick = k; continue; }
        var cH = hashStr(remaining[k].widx + "|" + slot + "|" + salt);
        var pH = hashStr(remaining[pick].widx + "|" + slot + "|" + salt);
        if (cH > pH) pick = k;
      }
      ordered.push(remaining[pick].q);
      remaining.splice(pick, 1);
    }
    return ordered.concat(remaining.map(function (p) { return p.q; })).slice(0, count);
  }

  // ---------- selection: balanceQuickfire ----------
  // Lighter than paceDaily, and topic relevance is sacred: the input pool is
  // already filtered by the caller, and NOTHING outside it can be introduced.
  // We only re-order the random walk to avoid long flat or long obscure runs.
  // A candidate that would make a third consecutive same-role card — or a
  // third consecutive familiarity <= 2 card — is deferred; deferred cards
  // fill the tail in original order, so a thin topic still deals a full
  // round and the no-repeat ledger sees exactly the cards served.
  function balanceQuickfire(candidates, count) {
    if (!candidates || candidates.length <= count) return (candidates || []).slice();
    var out = [], deferred = [];
    for (var i = 0; i < candidates.length && out.length < count; i++) {
      var p = profileOf(candidates[i]);
      var n = out.length;
      if (n >= 2) {
        var a = profileOf(out[n - 1]), b = profileOf(out[n - 2]);
        if (a.role === p.role && b.role === p.role) { deferred.push(candidates[i]); continue; }
        if (a.familiarity <= 2 && b.familiarity <= 2 && p.familiarity <= 2) { deferred.push(candidates[i]); continue; }
      }
      out.push(candidates[i]);
    }
    for (var d = 0; d < deferred.length && out.length < count; d++) out.push(deferred[d]);
    // Finishing pass: quick-fire has no serve-order contract, so a 3-run
    // (same role, or three obscure cards) is unwound by swapping the third
    // card with the nearest later card that breaks the run. A pool that
    // arithmetically cannot satisfy the bound keeps its cards — fullness and
    // the no-repeat ledger beat pacing, always.
    for (var k = 2; k < out.length; k++) {
      var r0 = profileOf(out[k - 2]), r1 = profileOf(out[k - 1]), r2 = profileOf(out[k]);
      var roleRun = r0.role === r1.role && r1.role === r2.role;
      var famRun = r0.familiarity <= 2 && r1.familiarity <= 2 && r2.familiarity <= 2;
      if (!roleRun && !famRun) continue;
      for (var j = k + 1; j < out.length; j++) {
        var pj = profileOf(out[j]);
        if ((roleRun && pj.role !== r2.role) || (famRun && pj.familiarity > 2)) {
          var tmp = out[k]; out[k] = out[j]; out[j] = tmp;
          break;
        }
      }
    }
    return out;
  }

  window.CURIO_QI = {
    ARCHETYPES: ARCHETYPES, ROLES: ROLES, DIAGNOSES: DIAGNOSES,
    DIMENSIONS: DIMENSIONS, SUGGESTED_BRANCHES: SUGGESTED_BRANCHES,
    qid: qid, decodeRow: decodeRow, neutral: neutral,
    validate: validate, validateQuestion: validateQuestion,
    entryMean: entryMean, sparkMean: sparkMean, portalMean: portalMean,
    deriveRole: deriveRole, diagnose: diagnose, profileOf: profileOf,
    paceDaily: paceDaily, balanceQuickfire: balanceQuickfire
  };
})();
