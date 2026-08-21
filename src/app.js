/* Curio — v1.8 (FEAT-027 mobile tabs). Vanilla JS, no build, state in localStorage.
   Modules: LS (storage) · Settings/Comfort · Stats (Brain Map) · Vault (SRS)
   · quiz engine · views · tab shell (mobile <900px).
   i18n: UI chrome goes through t() (src/i18n.js). Stored data values,
   localStorage keys, scoring and the daily seed are language-independent.
   Surfaces: tab content renders into #tabView (rebuilt on every tab
   activation — always-fresh counts); play surfaces (quizzes, results, city
   browse, onboarding, desktop comfort) render into the #playLayer overlay,
   which tab switches only HIDE (CSS class) — DOM, closures and timers
   survive until Quit/finish. Timers keep running while hidden on purpose
   (pausing would be a lookup-the-answer cheat vector). */
(function () {
  "use strict";

  // ---------- i18n (chrome strings via src/i18n.js; safe fallbacks) ----------
  var QLANG = window.QLANG || "en";
  var t = window.t || function (s) { return s; };
  // Template fill: t() first (dict keys contain {placeholders}), then replace.
  function tf(key, vars) {
    var s = t(key);
    if (vars) { Object.keys(vars).forEach(function (k) { s = s.replace("{" + k + "}", vars[k]); }); }
    return s;
  }

  // ---------- question banks (per-language; FR falls back to EN while empty) ----------
  //
  // ONE SOURCE OF TRUTH FOR EVERYTHING THAT IS NOT WORDS.
  //
  // questions.fr.js is a translation: same questions, same order, same correct
  // answer. Only q / options / fact differ. Everything else — the Wikipedia
  // source, the category, the sub-category, the region, the difficulty — is
  // language-independent, and keeping a second copy of it meant a second copy
  // to forget. It was forgotten three times over (found 2026-08-09):
  //
  //   · 40 French questions had NO src. A French reader got a discovery card
  //     with no title, no picture, no hook and no buttons — a blank box. The
  //     English half of this exact bug was fixed the day before and the fix
  //     was never mirrored.
  //   · `sub` was missing from all 262. Every Science-discipline and
  //     Geography sub-filter returned nothing at all in French — features the
  //     CEO had specifically asked for, silently dead in one language.
  //   · One question was Science in English and Tech in French.
  //
  // So the French bank no longer supplies that metadata: it is overlaid from
  // the English bank by index. The guard is the correct-answer index, which
  // must match at every position — if it ever does not, the banks are not
  // aligned, the merge is unsafe, and we use the French bank untouched.
  var Q_EN = window.CURIO_QUESTIONS || [];
  var Q_FR = window.CURIO_QUESTIONS_FR || [];

  function mergeTranslated(en, fr) {
    if (!en.length || en.length !== fr.length) return fr;
    for (var i = 0; i < en.length; i++) {
      if (en[i].answer !== fr[i].answer) return fr;   // not aligned — do not touch
    }
    return fr.map(function (f, i) {
      var e = en[i], out = {}, k;
      for (k in e) if (e.hasOwnProperty(k)) out[k] = e[k];       // all metadata
      for (k in f) if (f.hasOwnProperty(k)) {
        if (k === "q" || k === "options" || k === "fact") out[k] = f[k];   // the words
      }
      return out;
    });
  }

  var Q = (QLANG === "fr" && Q_FR.length) ? mergeTranslated(Q_EN, Q_FR) : Q_EN;

  // ---------- Question Intelligence (v77) ----------
  // One packed row per bank question, aligned by index — and the EN/FR banks
  // are index-aligned, so one corpus serves both languages. Additive: a
  // missing row leaves the question neutral rather than breaking anything.
  var QI = window.CURIO_QI || null;
  var QI_ROWS = (window.CURIO_QI_CORPUS && window.CURIO_QI_CORPUS.rows) || null;
  if (QI && QI_ROWS) Q.forEach(function (x, i) { var r = QI_ROWS[i]; if (r) x.intelligence = QI.decodeRow(r); });

  // ---------- UAT curiosity diagnostic (never normal UX) ----------
  // ?qidiag=1 turns it on for the session, ?qidiag=0 turns it off. It shows
  // WHY a daily was paced the way it was — role, archetypes and the three
  // stage means per question, plus the role/novelty sequences at round end.
  // English-only on purpose: a founder's tool, not a feature — and therefore
  // deliberately NOT routed through the i18n dictionary.
  var QI_DIAG = false;
  try {
    if (/[?&]qidiag=1/.test(location.search)) sessionStorage.setItem("curio.qidiag", "1");
    if (/[?&]qidiag=0/.test(location.search)) sessionStorage.removeItem("curio.qidiag");
    QI_DIAG = sessionStorage.getItem("curio.qidiag") === "1";
  } catch (e) {}
  function qiDiagChip(q) {
    if (!QI_DIAG || !QI || !q.intelligence) return "";
    var i = q.intelligence;
    var f = function (x) { return (Math.round(x * 10) / 10).toFixed(1); };
    return '<div class="qidiag">⚙ role ' + esc(i.role) +
      ' · ' + i.archetypes.map(esc).join("+") +
      ' · entry ' + f(QI.entryMean(i)) +
      ' · spark ' + f(QI.sparkMean(i)) +
      ' · portal ' + f(QI.portalMean(i)) + '</div>';
  }
  var CATS = ["History", "Science", "Geography", "Arts", "Tech", "Nature"];
  var CAT_EMOJI = { History: "🏛️", Science: "🔬", Geography: "🌍", Arts: "🎨", Tech: "💻", Nature: "🌿" };
  var DAILY_COUNT = 5;
  var QUICKFIRE_COUNT = 10;
  var VAULT_SESSION_MAX = 10;

  // ---------- storage ----------
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("curio." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("curio." + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- stable question ids ----------
  // Hashed from the question text — plus the picture, but ONLY when there is
  // one. All 68 flag questions ask "Which country's flag is this?", so on text
  // alone they share a single id: one vault entry, one "mastered" flag, and 67
  // questions the reader could never be shown again after answering any one of
  // them.
  //
  // The `q.img &&` guard is not tidiness. Every existing question's id must not
  // change, or every existing reader's vault is orphaned and pruneVault() wipes
  // the facts they have been saving. Text-only questions hash exactly as they
  // did before; only picture questions get the extra component.
  function qid(q) {
    var s = q.q + (q.img && q.img.u ? "|" + q.img.u : "");
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "q" + (h >>> 0).toString(36);
  }
  var BY_ID = {};
  Q.forEach(function (q) { BY_ID[qid(q)] = q; });
  // Ids across ALL loaded banks — pruning must never wipe the other
  // language's vault entries when the user switches languages.
  var KNOWN_IDS = {};
  Q_EN.forEach(function (q) { KNOWN_IDS[qid(q)] = true; });
  Q_FR.forEach(function (q) { KNOWN_IDS[qid(q)] = true; });

  // ---------- date helpers (local day) ----------
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function todayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function addDaysKey(days) { return todayKey(new Date(Date.now() + days * 86400000)); }
  function dayNumber(d) { d = d || new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000); }

  // Deterministic PRNG so everyone gets the same daily set.
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffledIndices(n, seed) {
    var rng = mulberry32(seed), arr = [];
    for (var i = 0; i < n; i++) arr.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(rng() * (j + 1)); var tmp = arr[j]; arr[j] = arr[k]; arr[k] = tmp; }
    return arr;
  }

  // ---------- settings / comfort ----------
  var DEFAULT_SETTINGS = {
    timer: "normal",      // normal (15s) | relaxed (30s) | off
    dyslexia: false,
    anchors: false,
    textSize: "normal",   // normal | large | xl
    motion: "normal",     // normal | reduced
    contrast: "normal",   // normal | high
    readAloud: false,
    ageMode: "all"        // all | kids
  };
  var settings = Object.assign({}, DEFAULT_SETTINGS, LS.get("settings", {}));
  function saveSettings() { LS.set("settings", settings); applySettings(); }
  function applySettings() {
    var root = document.documentElement;
    root.classList.toggle("dyslexia", settings.dyslexia);
    root.classList.toggle("fs-large", settings.textSize === "large");
    root.classList.toggle("fs-xl", settings.textSize === "xl");
    root.classList.toggle("rmotion", settings.motion === "reduced");
    root.classList.toggle("hcontrast", settings.contrast === "high");
  }
  function timerSecs() {
    if (settings.timer === "off") return null;
    return settings.timer === "relaxed" ? 30 : 15;
  }

  // ---------- read aloud ----------
  function canSpeak() { return settings.readAloud && "speechSynthesis" in window; }
  function speak(text) {
    if (!canSpeak()) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = QLANG === "fr" ? "fr-FR" : "en-US"; u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function hushed() { try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) {} }

  // ---------- question pools (age mode) ----------
  function pool() {
    if (settings.ageMode !== "kids") return Q;
    var kids = Q.filter(function (x) { return x.kids; });
    if (kids.length >= QUICKFIRE_COUNT) return kids;
    // Fallback while the kids bank is small: pad with easy questions.
    var easy = Q.filter(function (x) { return !x.kids && x.diff === 1; });
    return kids.concat(easy);
  }
  // THE DAILY WALK. The old daily reshuffled the whole bank every day with the
  // day as the seed — five random cards daily, which can lawfully deal you the
  // same card two days running. CEO 2026-08-10: a daily question must not
  // repeat within a year.
  //
  // So the daily no longer draws — it WALKS. One deterministic shuffle of the
  // entire bank per epoch (identical on every device: the seed is the epoch
  // number and the bank size, nothing local), and each day takes the next five
  // cards off that deck. Within an epoch a repeat is impossible, not unlikely.
  // An epoch ends only when the whole bank has been dealt: at 472 questions
  // that is 94 days of guaranteed-unique dailies, and every batch of new
  // questions extends it — the year-long guarantee arrives with the 1,825th
  // question, which the content plan reaches on the road to 10,000.
  // (When the bank grows the deck re-cuts; that boundary is the one place a
  // near-term repeat is theoretically possible, noted and accepted.)
  //
  // CURIOSITY PACING (v77): the walk now deals EIGHT cards a day and the
  // pacer serves five — broadly one accessible foothold, one curiosity, one
  // stronger surprise or contradiction, one discovery and one strong portal,
  // in that psychological order where the window allows it. Uniqueness is
  // untouched: windows are disjoint slices of the same deterministic deck,
  // so a repeat inside an epoch remains impossible, and paceDaily is a pure
  // function of (window, day) — identical on every device, like the walk.
  var DAILY_WINDOW = 8;
  function dailyQuestions() {
    var p = pool();
    if (!p.length) return [];
    var W = p.length >= DAILY_WINDOW ? DAILY_WINDOW : DAILY_COUNT;
    var epochLen = Math.max(1, Math.floor(p.length / W));  // days per full deck
    var d = dayNumber();
    var epoch = Math.floor(d / epochLen), day = d % epochLen;
    var seed = epoch * 7919 + p.length * 131 + (settings.ageMode === "kids" ? 51000 : 1);
    var order = shuffledIndices(p.length, seed);
    var win = [];
    for (var i = 0; i < W; i++) win.push(p[order[(day * W + i) % p.length]]);
    // RELEASE CONTROL (2026-08-21): a CEO-approved replacement for a specific
    // date is served instead of the pacer's default — drawn ONLY from this
    // day's own window, so the walk's no-repeat guarantee is untouched.
    // resolve() returns null on any mismatch (kids pool, re-cut deck, stale
    // index) and the walk proceeds exactly as before.
    var OV = window.CURIO_DAILY_OVERRIDES;
    if (OV && OV.resolve && settings.ageMode !== "kids") {
      var ovKey = new Date(d * 86400000).toISOString().slice(0, 10);
      var ovFive = OV.resolve(ovKey, win, function (c) { return p.indexOf(c) + 1; }, DAILY_COUNT);
      if (ovFive) return ovFive;
    }
    if (window.CURIO_QI && window.CURIO_QI.paceDaily && p.length >= DAILY_WINDOW)
      return window.CURIO_QI.paceDaily(win, DAILY_COUNT, d);
    return win.slice(0, DAILY_COUNT);
  }
  // NO REPEATS. "Play again" used to reshuffle the whole pool, so a 91-question
  // topic could deal you the same flag twice in two rounds — and a quick-fire
  // could deal a question the daily challenge was about to ask. The CEO,
  // 2026-08-10: "redundancy is a reputation killer."
  //
  // THE NO-REPEAT CONTRACT (CEO, 2026-08-10): a question served anywhere —
  // daily or quick-fire — must not reappear for FOURTEEN DAYS, unless the
  // Vault brings it back on purpose (revision is the Vault's whole job).
  //
  // The first version of this was a ring of the last 120 ids. A ring has no
  // clock: a heavy player pushes a question out of the window in a couple of
  // days and it can lawfully return — which is exactly the repeat that reads
  // as carelessness. So the ledger is DATED: {i: id, d: dayNumber}, excluded
  // while (today − d) < 14, pruned after 30 days. The whole bank is ~6KB of
  // ids, so there is no size pressure and no cap to slide out of.
  //
  // If a topic is too small to fill a round with unseen questions, the OLDEST
  // seen come back first — never a short round, never a same-round repeat.
  // 30 days, not 14 — CEO 2026-08-10: "the probability of repeating questions
  // within 1 month must be 0, to be conservative". And it is a probability of
  // ZERO, not "low": when a topic has no unseen questions left this month, the
  // round is short or the topic is declared cleared — we never quietly refill
  // with something the player just saw.
  var QF_EXCLUDE_DAYS = 30, QF_PRUNE_DAYS = 45;
  function seenLedger() {
    var v = LS.get("qseen2", null);
    if (v) return v;
    // Migrate the v60 ring: no dates existed, so stamp them "yesterday" —
    // safely inside the exclusion window without pretending precision.
    var old = LS.get("qfseen", []);
    return old.map(function (id) { return { i: id, d: dayNumber() - 1 }; });
  }
  function markSeen(qs) {
    var today = dayNumber();
    var led = seenLedger().filter(function (e) { return today - e.d < QF_PRUNE_DAYS; });
    var by = {};
    led.forEach(function (e, idx) { by[e.i] = idx; });
    qs.forEach(function (q) {
      var id = qid(q);
      if (by[id] !== undefined) led[by[id]].d = today;
      else { by[id] = led.length; led.push({ i: id, d: today }); }
    });
    LS.set("qseen2", led);
  }
  function quickfireQuestions(cat, sub) {
    var p = pool().filter(function (x) { return cat === "All" || x.cat === cat; });
    // One second-level filter, two underlying fields: History slices by region,
    // Science and Geography by subject. Same control, same code path.
    if (sub && sub !== "All") p = p.filter(function (x) { return x.region === sub || x.sub === sub; });

    // Today's daily five are excluded outright — even if 14 days somehow lapsed.
    var daily = {};
    dailyQuestions().forEach(function (q) { daily[qid(q)] = true; });
    p = p.filter(function (x) { return !daily[qid(x)]; });

    var today = dayNumber(), lastSeen = {};
    seenLedger().forEach(function (e) { lastSeen[e.i] = e.d; });
    var fresh = p.filter(function (x) {
      var d = lastSeen[qid(x)];
      return d === undefined || today - d >= QF_EXCLUDE_DAYS;
    });

    // ONLY unseen questions are served. A round can be shorter than ten; a
    // topic with nothing unseen left this month returns [] and the caller
    // says so honestly. That is what makes the repeat probability zero
    // rather than merely small.
    for (var i = fresh.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)); var tmp = fresh[i]; fresh[i] = fresh[k]; fresh[k] = tmp; }
    // Light curiosity balancing (v77): topic relevance was fixed by the
    // filter above and is never traded against a curiosity quota — the pacer
    // only re-orders the random walk to avoid long flat-recall or long
    // obscure runs, and a thin topic still deals a full round.
    var out = (window.CURIO_QI && window.CURIO_QI.balanceQuickfire)
      ? window.CURIO_QI.balanceQuickfire(fresh, Math.min(QUICKFIRE_COUNT, fresh.length))
      : fresh.slice(0, Math.min(QUICKFIRE_COUNT, fresh.length));
    markSeen(out);
    return out;
  }
  // Regions present among History questions (for the region sub-filter), in a stable order.
  function historyRegions() {
    var order = ["Africa", "Americas", "Asia", "Europe", "MiddleEast", "Global"];
    var have = {};
    Q.forEach(function (x) { if (x.cat === "History" && x.region) have[x.region] = true; });
    return order.filter(function (r) { return have[r]; });
  }

  // The second-level filter for a category. History has had one since v1;
  // Science and Geography got theirs on 2026-08-08 (CEO: split Science by
  // discipline, and "we need a special category for countries and the flags
  // and capitals — people who like to travel will love these categories").
  // Built from the bank, so a subject with no questions never shows a chip.
  var SUB_ORDER = {
    Science: ["Life Sciences", "Chemistry", "Physics", "Earth & Space", "Mathematics", "Social Sciences"],
    Geography: ["Countries & Flags", "Landscapes", "Cities & Places"]
  };
  var SUB_EMOJI = {
    "Life Sciences": "🧬", "Chemistry": "⚗️", "Physics": "⚛️", "Earth & Space": "🪐",
    "Mathematics": "🔢", "Social Sciences": "👥",
    "Countries & Flags": "🚩", "Landscapes": "🏔️", "Cities & Places": "🏙️"
  };
  function subsFor(cat) {
    if (cat === "History") return historyRegions();
    var order = SUB_ORDER[cat];
    if (!order) return [];
    var have = {};
    Q.forEach(function (x) { if (x.cat === cat && x.sub) have[x.sub] = true; });
    return order.filter(function (s) { return have[s]; });
  }
  function subLabel(cat, v) {
    if (cat === "History") {
      return (v === "Africa" ? "🌍" : v === "Americas" ? "🌎" : v === "Asia" ? "🌏" :
              v === "Europe" ? "🏰" : v === "MiddleEast" ? "🕌" : "🗺️") + " " + t(REGION_LABEL[v] || v);
    }
    return (SUB_EMOJI[v] || "✨") + " " + t(v);
  }

  // For each question, shuffle the option display order deterministically per session.
  function withShuffledOptions(q, seed) {
    var order = shuffledIndices(q.options.length, seed);
    var opts = order.map(function (i) { return q.options[i]; });
    var ans = order.indexOf(q.answer);
    // This rebuilds the question rather than copying it, so any field not named
    // here is silently dropped on the way to the screen — which is how the flag
    // pictures vanished the first time they shipped. Keep it exhaustive.
    return { id: qid(q), q: q.q, cat: q.cat, region: q.region, sub: q.sub, theme: q.theme,
             diff: q.diff, fact: q.fact, src: q.src, deeper: q.deeper, img: q.img,
             intelligence: q.intelligence,
             options: opts, answer: ans };
  }
  var REGION_LABEL = { Africa: "Africa", Americas: "Americas", Asia: "Asia", Europe: "Europe", MiddleEast: "Middle East", Global: "Global" };
  function srcLink(url) {
    if (!url) return "";
    // Visible, tappable chip on its own line — the CEO missed the old 12.5px inline link
    // while testing (issue #8). If the founder misses it, users will. VAL-06 made visible.
    return '<a class="srclink" href="' + esc(url) + '" target="_blank" rel="noopener">' + t("📖 Check the source ↗") + '</a>';
  }

  // ---------- QPIO Cultural Resource Network (P1 UI Integration) ----------
  function renderQuestionResourcesHtml(q) {
    if (!window.CurioResourceNetwork || !window.CurioResourceNetwork.findResourcesForQuestion) return "";
    var matches = window.CurioResourceNetwork.findResourcesForQuestion(q, 3);
    if (!matches || !matches.length) return ""; // Restraint: hide section when no relevant matches exist

    var html = '<div class="crn-section">' +
      '<div class="crn-header">' +
        '<span class="crn-icon" aria-hidden="true">🏛️</span>' +
        '<span class="crn-title">' + t("Go Further — Cultural Resources") + '</span>' +
        '<span class="crn-badge">' + t("Verified") + '</span>' +
      '</div>' +
      '<div class="crn-list">';

    for (var i = 0; i < matches.length; i++) {
      var r = matches[i];
      var srcName = window.CurioResourceNetwork.getHumanSource(r.source_id);
      var typeName = window.CurioResourceNetwork.getHumanType(r.type);
      var authName = window.CurioResourceNetwork.getHumanAuthority(r.source_authority);
      var urgency = (r.end_date && window.CurioResourceNetwork.getFactualUrgencyString)
        ? window.CurioResourceNetwork.getFactualUrgencyString(r.end_date)
        : null;

      html += '<a class="crn-card" href="' + srcLink0(r.source_url) + '" target="_blank" rel="noopener">' +
        '<div class="crn-card-type">' + esc(typeName) + ' · ' + esc(srcName) +
          (urgency ? ' <span class="crn-urgency">⏱️ ' + esc(urgency) + '</span>' : '') +
        '</div>' +
        '<div class="crn-card-title">' + esc(r.title) + '</div>' +
        (r.description ? '<div class="crn-card-desc">' + esc(r.description) + '</div>' : '') +
        '<div class="crn-card-footer">' +
          '<span class="crn-provenance">✓ ' + esc(authName) +
            (r.publication_date ? ' (' + esc(r.publication_date) + ')' : '') +
            (r.city ? ' · ' + esc(r.city) : '') +
          '</span>' +
          '<span class="crn-ext">' + t("Explore ↗") + '</span>' +
        '</div>' +
      '</a>';
    }

    html += '</div></div>';
    return html;
  }

  // ---------- stats (Brain Map) ----------
  function getStats() {
    var s = LS.get("stats", null);
    if (!s) { s = { cats: {}, mastered: 0 }; CATS.forEach(function (c) { s.cats[c] = { s: 0, c: 0 }; }); }
    CATS.forEach(function (c) { if (!s.cats[c]) s.cats[c] = { s: 0, c: 0 }; });
    return s;
  }
  function recordAnswer(cat, correct) {
    var s = getStats();
    if (s.cats[cat]) { s.cats[cat].s++; if (correct) s.cats[cat].c++; }
    LS.set("stats", s);
  }
  function levelFor(st) {
    if (!st.s) return { name: "Unexplored", icon: "·" };
    var acc = st.c / st.s;
    if (acc >= 0.85 && st.s >= 15) return { name: "Sage", icon: "🧙" };
    if (acc >= 0.70 && st.s >= 8) return { name: "Scholar", icon: "🎓" };
    if (acc >= 0.55) return { name: "Apprentice", icon: "📖" };
    return { name: "Explorer", icon: "🧭" };
  }

  // ---------- Memory Vault (spaced repetition) ----------
  // Ladder of intervals in days; survive the last rung and the fact is Mastered.
  var LADDER = [1, 3, 7, 16, 35];
  function getVault() { return LS.get("vault", {}); }
  function setVault(v) { LS.set("vault", v); }
  function pruneVault() { // drop orphans (question text changed/removed in EVERY bank)
    var v = getVault(), changed = false;
    Object.keys(v).forEach(function (id) { if (!KNOWN_IDS[id]) { delete v[id]; changed = true; } });
    if (changed) setVault(v);
  }
  function vaultMiss(id) { // wrong anywhere -> (re)enter the ladder at rung 0
    var v = getVault();
    var item = v[id] || { rung: 0, wrong: 0 };
    item.rung = 0; item.wrong = (item.wrong || 0) + 1; item.due = addDaysKey(LADDER[0]);
    v[id] = item; setVault(v);
  }
  function vaultHit(id) { // correct in a vault review -> climb; past the top = mastered
    var v = getVault(); var item = v[id];
    if (!item) return;
    item.rung = (item.rung || 0) + 1;
    if (item.rung >= LADDER.length) {
      delete v[id];
      var s = getStats(); s.mastered = (s.mastered || 0) + 1; LS.set("stats", s);
    } else {
      item.due = addDaysKey(LADDER[item.rung]);
      v[id] = item;
    }
    setVault(v);
  }
  function vaultDue() {
    var v = getVault(), tk = todayKey(), out = [];
    Object.keys(v).forEach(function (id) {
      if (v[id].due <= tk && BY_ID[id]) out.push(BY_ID[id]);
    });
    return out;
  }
  // Count only the active language's entries (ids hash the question text, so
  // each language keeps its own ladder; the other language's entries stay put).
  function vaultCount() { return Object.keys(getVault()).filter(function (id) { return BY_ID[id]; }).length; }

  // ---------- DOM ----------
  var app = document.getElementById("app");
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  // Focus anchors (FEAT-025): bold word-initial fragments as eye fixation points.
  // Independent implementation on our own parameters; applied to reading passages
  // only when the user opts in (Comfort). Operates on RAW text, escapes per token.
  function anchorize(raw) {
    return String(raw).replace(/([A-Za-zÀ-ɏ’']+)|([^A-Za-zÀ-ɏ’']+)/g, function (m, word, rest) {
      if (rest !== undefined) return esc(rest);
      var letters = word.replace(/[’']/g, "");
      // stepped ladder (not a fixed ratio): 1 for <=3, 2 for 4-5, 3 for 6-8, 4 for 9+
      var L = letters.length;
      var n = L <= 3 ? 1 : L <= 5 ? 2 : L <= 8 ? 3 : 4;
      return "<b>" + esc(word.slice(0, n)) + "</b>" + esc(word.slice(n));
    });
  }
  function fmt(s2) { return settings.anchors ? anchorize(s2) : esc(s2); }

  // ---------- FEAT-027: surfaces & tab shell ----------
  // render(node) = play surface: goes to the overlay, shown above tab content.
  function render(node) {
    hushed();
    playLayer.innerHTML = "";
    playLayer.appendChild(node);
    // A live question gets the whole screen: the masthead shrinks to a strip so
    // the card fits above the tab bar on a 640px-tall phone without scrolling
    // (CEO, 2026-08-11). Every other view restores it. The logo is decoration
    // during a quiz; Quit and the progress bar are the navigation that matters.
    // The test is `.quizhead .progress`, not `.quizhead`. `.quizhead` alone is
    // NOT quiz-only — the city pack pages build one too (cityHomeView,
    // cityPackView) — so the old test compacted the masthead and HID THE
    // INSTALL BUTTON on every city page. Measured on a live page, 2026-08-13,
    // not inferred. Only a running question has a progress bar in its header.
    document.body.classList.toggle("quiz-live",
      !node.classList.contains("result") && !!node.querySelector(".quizhead .progress"));
    // A result card means the quiz is over. Keeping playActive true here left a
    // "▶ Resume" pill offering to reopen a finished quiz (CEO first-run review,
    // 2026-08-06). Every result view — daily, vault, city, quick-fire, truthlab
    // — renders `.card.result`.
    playActive = !node.classList.contains("result");
    showPlay();
  }

  var TAB_IDS = ["home", "games", "stats", "settings"];
  var mqDesk = window.matchMedia("(min-width: 900px)");
  function isDesktop() { return mqDesk.matches; }
  var tabView, playLayer, tabBar, resumeBar;
  var playActive = false;   // a play surface exists in #playLayer
  var playShown = false;    // …and is currently visible

  function buildShell() {
    tabView = document.createElement("div");
    tabView.id = "tabView";
    playLayer = document.createElement("div");
    playLayer.id = "playLayer";
    playLayer.className = "hidden";
    app.appendChild(tabView);
    app.appendChild(playLayer);

    // Home icon reuses the header mark URL so its ?v= matches index.html and
    // the SW cache already holds it (offline-safe, no version drift here).
    var markSrc = "brand/qpio-mark-96.png";
    var headMark = document.querySelector(".logo img.mark");
    if (headMark) markSrc = headMark.getAttribute("src");
    tabBar = el(
      '<nav class="tabbar" aria-label="' + t("Main navigation") + '">' +
        '<button class="tabbtn" data-tab="home"><img class="ticon" src="' + markSrc + '" alt=""><span>' + t("Home") + '</span></button>' +
        '<button class="tabbtn" data-tab="games"><span class="ticon" aria-hidden="true">🎯</span><span>' + t("Train") + '</span></button>' +
        '<button class="tabbtn" data-tab="stats"><span class="ticon" aria-hidden="true">📊</span><span>' + t("Stats") + '</span></button>' +
        '<button class="tabbtn" data-tab="settings"><span class="ticon" aria-hidden="true">⚙️</span><span>' + t("Settings") + '</span></button>' +
      '</nav>'
    );
    tabBar.querySelectorAll(".tabbtn").forEach(function (b) {
      b.addEventListener("click", function () { tabTap(b.getAttribute("data-tab")); });
    });
    document.body.appendChild(tabBar);

    resumeBar = el('<button class="resumebar hidden">' + t("▶ Resume") + '</button>');
    resumeBar.addEventListener("click", showPlay);
    document.body.appendChild(resumeBar);

    // UAT badge (CEO, 2026-08-13: "it would be good to add uat in the Qpio app
    // UAT testing so i can distinguish vs the live version"). Driven by the
    // HOSTNAME, never by a build flag — a flag can be shipped to production by
    // mistake, a hostname cannot. Readers on qpio.app can never see this.
    if (/^uat\./i.test(location.hostname) || location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      var ver = "";
      var vs = document.querySelector('script[src*="app.js"]');
      if (vs) { var m = /[?&]v=(\d+)/.exec(vs.getAttribute("src") || ""); if (m) ver = " v" + m[1]; }
      document.body.classList.add("is-uat");
      document.body.appendChild(el('<div class="uatflag" role="status">' +
        (location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "LOCAL" : "UAT") +
        esc(ver) + '</div>'));
    }
  }

  function currentTab() {
    var h = (location.hash || "").replace(/^#/, "");
    return TAB_IDS.indexOf(h) !== -1 ? h : "home";
  }
  function renderTab(tab) {
    var node;
    if (tab === "games") node = gamesTabView();
    else if (tab === "stats") node = statsTabView();
    else if (tab === "settings") node = settingsTabView();
    else node = homeTabView();
    tabView.innerHTML = "";
    tabView.appendChild(node);
    if (!playShown) { hushed(); window.scrollTo(0, 0); }
  }
  function route() {
    // #daily is a COMMAND, not a tab: the notification tap must land inside
    // today's challenge whether the app was closed (boot handles it) or open
    // in a background tab (hashchange lands here without a reload).
    if ((location.hash || "").replace(/^#/, "") === "daily") {
      startDaily();
      return;
    }
    var tab = currentTab();
    tabBar.querySelectorAll(".tabbtn").forEach(function (b) {
      if (b.getAttribute("data-tab") === tab) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    renderTab(tab);   // activation re-render: due counts, badges, stats always fresh
  }
  function tabTap(id) {
    if (playShown) hidePlay();   // hide, never destroy, a running play surface
    if (currentTab() === id) route();
    else location.hash = id;     // hashchange → route(); browser history for free
  }
  function showPlay() {
    playShown = true;
    playLayer.classList.remove("hidden");
    tabView.classList.add("hidden");
    resumeBar.classList.add("hidden");
    window.scrollTo(0, 0);
  }
  function hidePlay() {
    playShown = false;
    playLayer.classList.add("hidden");
    tabView.classList.remove("hidden");
    if (playActive) resumeBar.classList.remove("hidden");
    hushed();
  }
  function closePlay() {          // Quit / finish: the only paths that destroy a quiz
    playActive = false; playShown = false;
    playLayer.innerHTML = "";
    playLayer.classList.add("hidden");
    tabView.classList.remove("hidden");
    resumeBar.classList.add("hidden");
  }
  function goHome() {
    closePlay();
    if (currentTab() === "home") route();
    else location.hash = "home";
  }
  function openSettings() {
    tabTap("settings");   // one layout everywhere (CEO 2026-08-02): gear = the Settings tab
  }
  function onViewportChange() {
    // Crossing to desktop with a tabbed-away quiz would strand it (no resume
    // UI there) — surface it again before re-rendering.
    route();
  }

  // ---------- streak ----------
  function getStreak() { return LS.get("streak", { count: 0, best: 0, last: null }); }
  function bumpStreak() {
    var s = getStreak(), tk = todayKey();
    if (s.last === tk) return s;
    var yk = todayKey(new Date(Date.now() - 86400000));
    s.count = (s.last === yk) ? s.count + 1 : 1;
    s.best = Math.max(s.best || 0, s.count);
    s.last = tk;
    LS.set("streak", s);
    return s;
  }

  // ---------- recall matching (typo-tolerant) ----------
  function normText(s) {
    return String(s).toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents
      .replace(/^(the|a|an)\s+/, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  }
  function editDistance(a, b) {
    var m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 99;
    var row = [];
    for (var j = 0; j <= n; j++) row[j] = j;
    for (var i = 1; i <= m; i++) {
      var prev = row[0]; row[0] = i;
      for (var k = 1; k <= n; k++) {
        var tmp = row[k];
        row[k] = Math.min(row[k] + 1, row[k - 1] + 1, prev + (a[i - 1] === b[k - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return row[n];
  }
  function recallMatches(typed, correctOption) {
    var t = normText(typed), c = normText(correctOption);
    if (!t || t.length < 2) return false;
    if (t === c) return true;
    if (c.length >= 5 && editDistance(t, c) <= 2) return true;
    // multi-word answers: typing the distinctive word is enough ("curie" for "Marie Curie")
    var words = c.split(" ").filter(function (w) { return w.length >= 4; });
    return words.length > 1 && words.indexOf(t) !== -1;
  }

  // ---------- share ----------
  function shareOrCopy(text, msgEl) {
    if (navigator.share) {
      navigator.share({ text: text }).then(function () {
        if (msgEl) msgEl.textContent = t("Shared! 🎉");
      }).catch(function () { /* user cancelled */ });
      return;
    }
    copy(text, msgEl);
  }
  function copy(text, msgEl) {
    function ok() { if (msgEl) msgEl.textContent = t("Copied to clipboard! 📋 Paste it anywhere."); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { if (msgEl) msgEl.textContent = text; }
      document.body.removeChild(ta);
    }
  }

  // ---------- home card builders (FEAT-027: shared by desktop flow and mobile tabs) ----------
  function heroCard() {
    var s = getStreak();
    var daily = LS.get(dailyKey(), null);
    // Three states, not two. A round left open mid-way must not be offered as
    // "Play daily challenge" — the button would start nothing and resume
    // instead, which is a button that lies about what it does. CEO,
    // 2026-08-13: "once the quiz starts on a device the daily challenge button
    // needs to stop functioning until the reset."
    var prog = daily ? null : dailyProgress();
    var label = daily ? t("Review today's ✓")
              : prog  ? tf("▶ Resume — question {n} of {total}", { n: prog.idx + 1, total: DAILY_COUNT })
                      : t("Play daily challenge");
    var node = el(
      '<div class="card hero">' +
        '<span class="pill free">' + t("Free to play") + '</span>' +
        (settings.ageMode === "kids" ? '<span class="pill kids">' + t("Kids mode") + '</span>' : '') +
        '<h1>' + t("Feed your brain today.") + '</h1>' +
        '<p>' + (prog
          ? t("You left today’s challenge part-finished. Pick it up where you stopped — it waits until tomorrow’s five arrive.")
          : t("Five questions. Same for everyone, everywhere. Every answer teaches you something worth knowing. Keep the streak alive.")) + '</p>' +
        '<div class="btnrow">' +
          '<button class="btn' + (prog ? " resume" : "") + '" id="startDaily">' + label + '</button>' +
          (s.count > 0 ? '<span class="streakchip">' + (s.count === 1 ? t("🔥 1 day") : tf("🔥 {n} days", { n: s.count })) + '</span>' : '') +
        '</div>' +
      '</div>'
    );
    node.querySelector("#startDaily").addEventListener("click", startDaily);
    return node;
  }

  function vaultCard() { // due → Review card · none due but vault alive → quiet card · empty → null
    var due = vaultDue();
    if (due.length > 0) {
      var node = el(
        '<div class="card vaultcard">' +
          '<div class="vaultrow"><div><h3>' + t("🗝️ Memory Vault") + '</h3>' +
          '<p>' + (due.length === 1
            ? t("1 fact ready to strengthen. Beat them 5 times over 2 months and they’re yours for good.")
            : tf("{n} facts ready to strengthen. Beat them 5 times over 2 months and they’re yours for good.", { n: due.length })) + '</p></div>' +
          '<button class="btn" id="startVault">' + t("Review") + '</button></div>' +
        '</div>'
      );
      node.querySelector("#startVault").addEventListener("click", startVaultSession);
      return node;
    }
    if (vaultCount() > 0) {
      var v = getVault();
      var next = Object.keys(v).filter(function (id) { return BY_ID[id]; }).map(function (k) { return v[k].due; }).sort()[0];
      return el(
        '<div class="card vaultcard quiet">' +
          '<h3>' + t("🗝️ Memory Vault") + '</h3>' +
          '<p>' + tf("All {n} facts strengthened for now. Next review: {date}. Facts mastered for good: {m} 🏅",
            { n: vaultCount(), date: esc(next), m: (getStats().mastered || 0) }) + '</p>' +
        '</div>'
      );
    }
    return null;
  }

  function modeCardQuick(pickerNode) {
    var node = el(
      '<div class="card mode" id="modeQuick">' +
        '<div class="emoji">⚡</div><h3>' + t("Quick-Fire") + '</h3>' +
        '<p>' + (timerSecs()
          ? tf("Ten questions, {s}s each. Run out and the answer is revealed — you still choose when to move on.", { s: timerSecs() })
          : t("Ten questions, no timer. Chase your high score.")) + '</p>' +
      '</div>'
    );
    node.addEventListener("click", function () {
      pickerNode.scrollIntoView({ behavior: settings.motion === "reduced" ? "auto" : "smooth", block: "center" });
    });
    return node;
  }

  function modeCardDaily() {
    var daily = LS.get(dailyKey(), null);
    var prog = daily ? null : dailyProgress();
    var node = el(
      '<div class="card mode' + (prog ? " resuming" : "") + '" id="modeDaily">' +
        '<div class="emoji">' + (prog ? "▶" : "📅") + '</div><h3>' + (prog ? t("Resume today's challenge") : t("Daily Challenge")) + '</h3>' +
        '<p>' + (daily ? '<span class="done-badge">' + tf("Done today — {score}/{total}. Come back tomorrow.", { score: daily.score, total: DAILY_COUNT }) + '</span>'
               : prog  ? tf("Part-finished — question {n} of {total}. Your answers are kept until tomorrow.", { n: prog.idx + 1, total: DAILY_COUNT })
                       : t("Today's five. Shareable score. The daily ritual.")) + '</p>' +
      '</div>'
    );
    node.addEventListener("click", startDaily);
    return node;
  }

  function modeCardTruth() {
    if (truthPool().length < 4) return null;
    var node = el(
      '<div class="card mode" id="modeTruth">' +
        '<div class="emoji">🔎</div><h3>' + t("Fact or Fake?") + '</h3>' +
        '<p>' + t("Real facts hide among convincing fakes. Spot the tricks — every verdict comes with a source.") + '</p>' +
      '</div>'
    );
    node.addEventListener("click", startTruthLab);
    return node;
  }

  // A browsable collection with a search box, not a clipped row of six.
  // CEO, 2026-08-09: "there will be more than 10 cities in the future... at
  // some point people need to be able to type the name of the city... but when
  // we have 200 cities we'll need the user to search."
  // So: a grid that never cuts a card in half, and a filter that earns its
  // place the moment the list outgrows the screen.
  function modeCardTravel() {
    var packs = cityPacks();
    if (!packs.length) return null;
    var node = el(
      '<div class="card" id="modeTravel">' +
        '<div class="section-title" style="margin-top:0">🧳 ' + t("Before you travel") + '</div>' +
        '<p class="mini" style="margin:0 0 10px">' +
          t("Cities told from their own history. Learn the place, the food, and a few words before you go.") +
        '</p>' +
        '<input class="citysearch" id="citySearch" type="search" autocomplete="off" ' +
          'placeholder="' + esc(t("Search a city or country")) + '" aria-label="' + esc(t("Search a city or country")) + '">' +
        '<div class="dgrid" id="cityPeek"></div>' +
        '<p class="mini citynone hidden" id="cityNone">' + t("No city matches that yet.") + '</p>' +
      '</div>'
    );
    var row = node.querySelector("#cityPeek");
    var IM = window.CURIO_IMAGES || {};
    packs.forEach(function (p) {
      // Reuse the city's own question source for a photograph where we have one.
      var slug = null;
      (p.questions || []).some(function (q) {
        var s = window.CURIO_GO && window.CURIO_GO.entityOf(q);
        if (s && IM[s]) { slug = s; return true; }
        return false;
      });
      var img = slug ? IM[slug] : null;
      var c = el(
        '<div class="dcard dcard-sm">' +
          '<div class="dcard-art">' +
            (img ? '<img src="' + esc(img.u) + '" alt="" loading="lazy" decoding="async">' : '') +
            '<span class="dcard-wash" aria-hidden="true"></span>' +
          '</div>' +
          '<div class="dcard-body">' +
            '<h5 class="dcard-title">' + (p.emoji || "📍") + ' ' + esc(p.city) + '</h5>' +
            (p.blurb ? '<p class="dcard-hook">' + esc(p.blurb) + '</p>' : '') +
          '</div>' +
        '</div>'
      );
      c.setAttribute("role", "link");
      c.setAttribute("tabindex", "0");
      c.setAttribute("aria-label", p.city);
      var open = function () { render(cityPackView(p)); };
      c.addEventListener("click", open);
      c.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
      c.setAttribute("data-hay", normText(p.city + " " + (p.country || "")));
      row.appendChild(c);
    });

    var box = node.querySelector("#citySearch");
    var none = node.querySelector("#cityNone");
    box.addEventListener("input", function () {
      var v = normText(box.value.trim());
      var shown = 0;
      [].slice.call(row.children).forEach(function (c) {
        var hit = !v || (c.getAttribute("data-hay") || "").indexOf(v) !== -1;
        c.classList.toggle("hidden", !hit);
        if (hit) shown++;
      });
      none.classList.toggle("hidden", shown > 0);
    });
    return node;
  }

  function quickfirePicker() { // category picker feeding quick-fire
    var picker = el('<div class="card"><div class="section-title" style="margin-top:0">' + t("Quick-Fire topic") + '</div><div class="cats"></div><div class="regionrow hidden"><div class="mini" style="margin:2px 0 6px">' + t("History by region — every part of the world, on its own terms:") + '</div><div class="cats regioncats"></div></div><div class="btnrow"><button class="btn block" id="startQuick">' + t("Start Quick-Fire ⚡") + '</button></div></div>');
    var cats = picker.querySelector(".cats");
    var regionRow = picker.querySelector(".regionrow");
    var regionCats = picker.querySelector(".regioncats");
    var hint = picker.querySelector(".regionrow .mini");
    var chosen = LS.get("lastCat", "All");
    var chosenSub = "All";

    // The second row is rebuilt for whichever category is selected: regions
    // under History, disciplines under Science, and Countries & Flags under
    // Geography. One control, three meanings, no third row to decide about.
    function buildSubRow() {
      var subs = subsFor(chosen);
      regionRow.classList.toggle("hidden", subs.length === 0);
      if (!subs.length) { chosenSub = "All"; return; }
      hint.textContent =
        chosen === "History" ? t("History by region — every part of the world, on its own terms:") :
        chosen === "Science" ? t("Pick a science:") :
                               t("Pick what you like to explore:");
      regionCats.innerHTML = "";
      regionCats.classList.add("ptiles");
      chosenSub = "All";
      ["All"].concat(subs).forEach(function (v) {
        var label = v === "All"
          ? (chosen === "History" ? t("🌍 All regions") : t("✨ All"))
          : subLabel(chosen, v);
        var b = pickTile(v, label, v === chosenSub);
        b.addEventListener("click", function () {
          chosenSub = v;
          regionCats.querySelectorAll(".ptile").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
        });
        regionCats.appendChild(b);
      });
    }

    cats.classList.add("ptiles");
    ["All"].concat(CATS).forEach(function (c) {
      var b = pickTile(c, (CAT_EMOJI[c] || "✨") + " " + t(c), c === chosen);
      b.addEventListener("click", function () {
        chosen = c; LS.set("lastCat", c);
        cats.querySelectorAll(".ptile").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        buildSubRow();
      });
      cats.appendChild(b);
    });
    buildSubRow();
    picker.querySelector("#startQuick").addEventListener("click", function () { startQuickfire(chosen, chosenSub); });
    return picker;
  }

  function statsCard() { // streak stats (the 4 big numbers)
    var s = getStreak();
    return el(
      '<div class="card">' +
        '<div class="section-title" style="margin-top:0">' + t("Your stats") + '</div>' +
        '<div class="row" style="margin-top:6px">' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + s.count + '</div><div class="mini">' + t("current streak") + '</div></div>' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + (s.best || 0) + '</div><div class="mini">' + t("best streak") + '</div></div>' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + LS.get("hiscore", 0) + '</div><div class="mini">' + t("quick-fire best") + '</div></div>' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + (getStats().mastered || 0) + '</div><div class="mini">' + t("facts mastered") + '</div></div>' +
        '</div>' +
      '</div>'
    );
  }

  function footerEl() {
    var node = el(
      // "We never sell ad space or your data" removed (CEO, 2026-08-08). The
      // Charter promise stands unchanged; stating it in the footer defended
      // against an accusation nobody had made, and third-party destinations
      // now sit one screen away — a claim that invites a lawyer to parse it.
      '<div class="footer">' + t("Qpio — knowledge is free, forever.") + '<br>' +
      t("I am curious to become wise. 🧠") + ' · <a href="#" id="openComfort2">' + t("Comfort & settings") + '</a></div>'
    );
    node.querySelector("#openComfort2").addEventListener("click", function (e) { e.preventDefault(); openSettings(); });
    return node;
  }

  // ---------- compositions ----------
  function homeView() { // desktop ≥900px: the v20 single-column flow, order unchanged
    var wrap = el('<div class="grid"></div>');
    wrap.appendChild(heroCard());
    var vc = vaultCard(); if (vc) wrap.appendChild(vc);
    var picker = quickfirePicker();
    var modes = el('<div class="row"></div>');
    modes.appendChild(modeCardQuick(picker));
    modes.appendChild(modeCardDaily());
    var mt = modeCardTruth(); if (mt) modes.appendChild(mt);
    var mtr = modeCardTravel(); if (mtr) modes.appendChild(mtr);
    wrap.appendChild(modes);
    wrap.appendChild(picker);
    wrap.appendChild(brainMapCard());
    wrap.appendChild(leaderboardCard());
    wrap.appendChild(statsCard());
    wrap.appendChild(footerEl());
    return wrap;
  }

  function homeTabView() { // Home: today's quiz first, then one thing to be curious about
    var wrap = el('<div class="grid"></div>');
    wrap.appendChild(heroCard());
    var vc = vaultCard(); if (vc) wrap.appendChild(vc);
    // "One thing to be curious about" moved OFF Home (CEO, 2026-08-09): a
    // discovery card that leads to paid resources should not greet someone on
    // the front page — it reads as being sold to before you have asked
    // anything. It now lives behind Surprise me on the review screen, where
    // the reader has already shown curiosity.
    var mtr = modeCardTravel(); if (mtr) wrap.appendChild(mtr);
    wrap.appendChild(footerEl());
    return wrap;
  }

  // ONE thing to be curious about. Not "Explore History" — a specific thing
  // with a specific reason, so the reader knows whether they want it before
  // they tap (CEO, 2026-08-08). Changes daily rather than on every render, so
  // Home does not shuffle under the reader between visits.
  function oneCuriosityCard() {
    var D = window.CURIO_DISCOVERY;
    if (!D) return null;
    var pool = D.all().filter(function (x) { return x.image && x.hook; });
    if (!pool.length) return null;
    var pick = pool[Math.floor(mulberry32(dayNumber() + 7717)() * pool.length)];

    var card = el('<div class="card"><div class="section-title" style="margin-top:0">' +
      t("One thing to be curious about") + '</div></div>');
    card.appendChild(discoveryCardEl(pick, "lg"));
    return card;
  }

  // Brain Gym stays hidden until the exercises exist. "Coming soon" on a
  // three-card tab reads as an unfinished app to a first-time user - Kimi
  // called it vaporware in the 2026-08-04 council review; CEO agreed
  // 2026-08-07. Flip this to true the day it ships; nothing else changes.
  var FEAT_BRAIN_GYM = false;

  // Illustrations for the Train tab (CEO, 2026-08-09): a real photograph
  // behind each mode, so the tab reads as a product rather than a settings
  // page. Slugs come from the bank's own Commons set - no new assets.
  var MODE_ART = { truth: "Ten_percent_of_the_brain_myth", quick: "Great_Wall_of_China" };

  // Every category and sub-category gets a face. Pills carried an emoji and a
  // word; a picture says what is inside before you commit to it, which is the
  // same window-shopping rule the shelves follow (CEO, 2026-08-09).
  var PICK_ART = {
    History: "Rosetta_Stone", Science: "DNA", Geography: "Mount_Everest",
    Arts: "Mona_Lisa", Tech: "ENIAC", Nature: "Blue_whale",
    // sciences
    "Life Sciences": "Mitochondrion", "Chemistry": "Diamond", "Physics": "Atomic_nucleus",
    "Earth & Space": "Saturn", "Mathematics": "Pi", "Social Sciences": "Athenian_democracy",
    // travel slices
    "Countries & Flags": "Flag_of_Nepal", "Landscapes": "Angel_Falls", "Cities & Places": "Tokyo",
    // history regions
    Africa: "Great_Zimbabwe", Americas: "Machu_Picchu", Asia: "Terracotta_Army",
    Europe: "Eiffel_Tower", MiddleEast: "Petra", Global: "Silk_Road"
  };
  function pickArt(key) {
    var im = (window.CURIO_IMAGES || {})[PICK_ART[key]];
    return im ? im.u : null;
  }
  // One selectable tile. Same role and keyboard behaviour a chip had.
  function pickTile(key, label, pressed) {
    var u = pickArt(key);
    var b = el(
      '<button class="ptile' + (u ? " has-art" : "") + '" aria-pressed="' + (pressed ? "true" : "false") + '">' +
        (u ? '<img class="ptile-art" src="' + esc(u) + '" alt="" loading="lazy" decoding="async">' : '') +
        '<span class="ptile-wash" aria-hidden="true"></span>' +
        '<span class="ptile-label">' + label + '</span>' +
      '</button>'
    );
    return b;
  }
  function dressMode(node, key) {
    var im = (window.CURIO_IMAGES || {})[MODE_ART[key]];
    if (!im || !node) return node;
    node.classList.add("has-art");
    node.insertBefore(el('<span class="mode-wash" aria-hidden="true"></span>'), node.firstChild);
    node.insertBefore(el('<img class="mode-art" src="' + esc(im.u) + '" alt="" loading="lazy" decoding="async">'), node.firstChild);
    return node;
  }

  function gamesTabView() { // v23 Games: games only, no Home repeats - Fact-or-Fake · Quick-Fire · Brain Gym (coming)
    var wrap = el('<div class="grid"></div>');
    var mt = modeCardTruth(); if (mt) wrap.appendChild(dressMode(mt, "truth"));
    wrap.appendChild(quickfirePicker());
    if (FEAT_BRAIN_GYM) wrap.appendChild(el('<div class="card"><div class="emoji">\ud83e\udde0</div><h3 style="margin:8px 0 4px">' + t("Brain Gym") + '</h3><p class="mini" style="margin:0">' + t("Puzzles, not questions. Nothing to know in advance. Some are fun. Some are genuinely hard. You will get better at them with time — everyone does. What that changes anywhere else is for you to find out.") + '</p></div>'));
    return wrap;
  }

  function statsTabView() { // mobile Stats: brain map · leaderboard · big numbers
    var wrap = el('<div class="grid"></div>');
    // Day one, this tab was six rows of "Unexplored" and four zeros — the
    // emptiest screen in the app, one tap from the quiz. Kimi flagged it in the
    // 2026-08-04 council review; the CEO called it on 2026-08-06. Teach instead.
    if (!statsTouched()) { wrap.appendChild(statsEmptyCard()); return wrap; }
    wrap.appendChild(brainMapCard());
    wrap.appendChild(leaderboardCard());
    wrap.appendChild(statsCard());
    return wrap;
  }

  function statsTouched() { // has this device answered anything at all?
    var st = getStats(), n = 0;
    CATS.forEach(function (c) { n += (st.cats[c] && st.cats[c].s) || 0; });
    return n > 0 || LS.get("leaderboard", []).length > 0;
  }

  function statsEmptyCard() {
    var node = el(
      '<div class="card">' +
        '<div class="emoji">🧠</div>' +
        '<h3 style="margin:8px 0 6px">' + t("Nothing here yet — and that is the point.") + '</h3>' +
        '<p class="mini" style="margin:0 0 14px">' + t("This page is your record, not a scoreboard. It fills itself in as you play.") + '</p>' +
        '<div class="bm-row"><span class="bm-cat">🧭 ' + t("Your Brain Map") + '</span>' +
          '<span class="bm-lv">' + t("which of the six domains you know best") + '</span></div>' +
        '<div class="bm-row"><span class="bm-cat">🗝️ ' + t("Facts owned") + '</span>' +
          '<span class="bm-lv">' + t("beat a fact 5 times over 2 months and it is yours") + '</span></div>' +
        '<div class="bm-row"><span class="bm-cat">🔥 ' + t("Streak") + '</span>' +
          '<span class="bm-lv">' + t("shown, never nagged about") + '</span></div>' +
        '<div class="btnrow" style="margin-top:14px">' +
          '<button class="btn" id="statsPlay">' + t("Play daily challenge") + '</button>' +
        '</div>' +
        '<p class="mini" style="margin:12px 0 0;opacity:.7">' + t("One round is enough to fill it.") + '</p>' +
      '</div>'
    );
    node.querySelector("#statsPlay").addEventListener("click", startDaily);
    return node;
  }

  // ---------- daily nudge ----------
  // CEO, 2026-08-09: "we do not want them to be only reminded of the quiz of
  // the day, but being hooked by a question they may or may not know the
  // answer of." So the notification carries the real first question — the gap,
  // not the chore. "Qpio" plus a nag is a reminder; a question you cannot
  // answer is a reason to open the app.
  //
  // No push server, and there will not be one: this is a local notification
  // scheduled by the page while it is open, which is what a static app can
  // honestly do. Android and desktop honour it; iOS Safari does not support
  // web notifications outside an installed PWA, so the card says so rather
  // than pretending.
  function notifySupported() {
    return typeof Notification !== "undefined" && "serviceWorker" in navigator;
  }
  function notifyState() {
    if (!notifySupported()) return "unsupported";
    return Notification.permission;   // default | granted | denied
  }
  // WAKING A PHONE WITHOUT A SERVER.
  //
  // A page cannot wake itself, and Qpio has no server to push from — so the
  // 60-second timer below only ever fires while the app is open, which is not
  // what anyone means by a daily notification. Periodic Background Sync is the
  // one mechanism that closes that gap with no backend: Chrome on Android wakes
  // an INSTALLED PWA's service worker on its own schedule (roughly daily, the
  // browser decides, and it will not do it at all for a site the reader does
  // not actually use). Unsupported everywhere else, including every iPhone.
  //
  // The service worker has no access to the question bank or to localStorage,
  // so the page leaves it a week of questions in the Cache API — one entry per
  // date, marked done when that day is played. See sw.js "periodicsync".
  var NUDGE_CACHE = "qpio-nudge";
  var NUDGE_URL = "./nudge-queue.json";

  function dailyFirstFor(offset) {
    var p = pool();
    if (!p.length) return null;
    var d = new Date(Date.now() + offset * 86400000);
    var seed = dayNumber(d) + (settings.ageMode === "kids" ? 51000 : 1);
    var order = shuffledIndices(p.length, seed);
    return p[order[0]] || null;
  }

  function primeNudge() {
    if (!("caches" in window)) return;
    var queue = {};
    for (var i = 0; i < 7; i++) {
      var key = addDaysKey(i);
      var q = dailyFirstFor(i);
      if (!q) continue;
      queue[key] = {
        q: q.q,
        done: !!LS.get("daily." + key + (settings.ageMode === "kids" ? ".kids" : ""), null)
      };
    }
    try {
      caches.open(NUDGE_CACHE).then(function (c) {
        c.put(NUDGE_URL, new Response(JSON.stringify({
          v: 2,
          on: !!LS.get("nudge", false),
          // The reader's chosen delivery hour. The phone wakes the worker on
          // its own schedule, so this is "from HH:00", not "at HH:00" — the
          // Settings copy says so honestly.
          hour: LS.get("nudgeHour", 8),
          days: queue
        }), { headers: { "Content-Type": "application/json" } }));
      });
    } catch (e) {}
  }

  function registerPeriodicNudge() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then(function (reg) {
      if (!reg.periodicSync) return;   // not Chrome/Android, or not installed
      // The permission is granted by the browser on engagement, not by a
      // prompt; a refusal here is normal and must stay silent.
      navigator.permissions.query({ name: "periodic-background-sync" })
        .then(function (p) {
          if (p.state !== "granted") return;
          reg.periodicSync.register("qpio-daily", { minInterval: 12 * 60 * 60 * 1000 }).catch(function () {});
        })
        .catch(function () {});
    }).catch(function () {});
  }

  function scheduleDailyNudge() {
    primeNudge();
    if (notifyState() !== "granted" || !LS.get("nudge", false)) return;
    registerPeriodicNudge();
    var q = dailyQuestions()[0];
    if (!q) return;
    // The in-app fallback, for every platform Periodic Background Sync does not
    // reach: a nudge once the app has been open and unplayed for a minute.
    if (LS.get(dailyKey(), null)) return;             // already played today
    if (LS.get("nudgeSent." + todayKey(), false)) return;
    setTimeout(function () {
      if (LS.get(dailyKey(), null)) return;
      try {
        navigator.serviceWorker.ready.then(function (reg) {
          reg.showNotification("Qpio", {
            body: q.q,                                 // the question itself
            tag: "qpio-daily-" + todayKey(),
            badge: "icons/favicon-32.png",
            icon: "brand/icons/qpio-icon-192.png",
            data: { url: "./#home" }
          });
          LS.set("nudgeSent." + todayKey(), true);
        });
      } catch (e) {}
    }, 60000);
  }
  function nudgeCard() {
    var state = notifyState();
    var on = LS.get("nudge", false) && state === "granted";
    var hour = LS.get("nudgeHour", 8);
    var hourOpts = "";
    for (var h = 5; h <= 22; h++) {
      hourOpts += '<option value="' + h + '"' + (h === hour ? ' selected' : '') + '>' +
        (h < 10 ? "0" : "") + h + ':00</option>';
    }
    var node = el(
      '<div class="card">' +
        '<div class="section-title" style="margin-top:0">🔔 ' + t("A question a day") + '</div>' +
        '<p class="mini" style="margin:0 0 12px">' +
          (state === "unsupported"
            ? t("Your browser cannot show notifications. On iPhone, add Qpio to your home screen first.")
            // Says exactly what it does on the reader's own device. Qpio has no
            // server, so on Android the phone itself wakes the app once a day
            // — and everywhere else the question can only arrive while Qpio is
            // open. Promising more than that would be a lie we could not fix.
            : t("Get today's actual question as a notification — the question itself, and tapping it opens Qpio straight into the daily challenge. On Android, install Qpio to your home screen and your phone delivers it on its own. Turn it off any time.")) +
        '</p>' +
        (state === "unsupported" ? '' :
          '<div class="btnrow" style="align-items:center;flex-wrap:wrap">' +
            '<button class="btn' + (on ? " ghost" : "") + '" id="nudgeBtn">' + (on ? t("Turn off") : t("Turn on")) + '</button>' +
            (on ? '<label class="mini" style="display:inline-flex;align-items:center;gap:6px">' + t("from") +
              ' <select class="cselect" id="nudgeHour" style="width:auto;min-height:38px;margin:0">' + hourOpts + '</select></label>' : '') +
            (on ? '<button class="btn ghost" id="nudgeTest">' + t("Send a test now") + '</button>' : '') +
          '</div>') +
        '<div class="mini" id="nudgeStatus" style="margin-top:10px"></div>' +
        '<div class="mini" id="nudgeMsg" style="margin-top:4px"></div>' +
      '</div>'
    );
    var btn = node.querySelector("#nudgeBtn");
    var msg = node.querySelector("#nudgeMsg");
    if (state === "denied") msg.textContent = t("Notifications are blocked for this site in your browser settings.");

    // The status line answers "why is it not working?" without a support desk:
    // each prerequisite is checked on THIS device and reported in one line.
    var st = node.querySelector("#nudgeStatus");
    if (st && state !== "unsupported") {
      var bits = [];
      bits.push((state === "granted" ? "✅ " : "⚠️ ") + t("Permission") + ": " + t(state));
      var standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
      bits.push((standalone ? "✅ " : "⚠️ ") + t("Installed as an app") + ": " + (standalone ? t("yes") : t("no — needed for automatic delivery")));
      var sent = LS.get("nudgeSent." + todayKey(), false);
      if (on) bits.push(sent ? "✅ " + t("Sent today") : "⏳ " + tf("Waiting — delivers from {h}:00 once your phone wakes the app", { h: (hour < 10 ? "0" : "") + hour }));
      st.innerHTML = bits.join(" · ");
      if (on && "serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(function (reg) {
          if (!reg.periodicSync) { st.innerHTML += " · ⚠️ " + t("This browser cannot wake Qpio on its own (needs Chrome on Android); the question arrives when you open Qpio."); return; }
          reg.periodicSync.getTags().then(function (tags) {
            st.innerHTML += tags.indexOf("qpio-daily") !== -1
              ? " · ✅ " + t("Automatic delivery armed")
              : " · ⚠️ " + t("Automatic delivery not armed yet — open Qpio a few times so the phone trusts it, then toggle off and on.");
          }).catch(function () {});
        }).catch(function () {});
      }
    }

    var hourSel = node.querySelector("#nudgeHour");
    if (hourSel) hourSel.addEventListener("change", function () {
      LS.set("nudgeHour", parseInt(hourSel.value, 10) || 8);
      primeNudge();
      renderTab("settings");
    });
    var testBtn = node.querySelector("#nudgeTest");
    if (testBtn) testBtn.addEventListener("click", function () {
      // End-to-end proof on the reader's own device: same payload, same tap
      // behaviour as the real daily delivery, fired immediately.
      var q = dailyQuestions()[0];
      navigator.serviceWorker.ready.then(function (reg) {
        reg.showNotification("Qpio", {
          body: q ? q.q : t("A question a day"),
          tag: "qpio-test",
          icon: "brand/icons/qpio-icon-192.png",
          badge: "icons/favicon-32.png",
          data: { url: "./#daily" }
        });
        msg.textContent = t("Test sent — check your notification shade. Tapping it opens today's challenge.");
      }).catch(function () { msg.textContent = t("Could not reach the service worker — reload once and try again."); });
    });
    if (btn) btn.addEventListener("click", function () {
      if (on) {
        LS.set("nudge", false);
        primeNudge();   // the service worker reads `on` from the queue, so off means off
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then(function (reg) {
            if (reg.periodicSync) reg.periodicSync.unregister("qpio-daily").catch(function () {});
          }).catch(function () {});
        }
        renderTab("settings");
        return;
      }
      Notification.requestPermission().then(function (p) {
        if (p === "granted") { LS.set("nudge", true); scheduleDailyNudge(); }
        renderTab("settings");
      });
    });
    return node;
  }

  // WHO YOU REPRESENT.
  //
  // Three uses, in the order they arrive: Read has to send a reader somewhere
  // that can actually serve them (Bookshop.org ships US and UK only, so
  // everyone else was being sent to a checkout that would refuse them); Visit
  // should later prefer the nearest exhibition over the most famous one; and
  // country leaderboards need a country. The CEO's frame is the CrossFit
  // Games — you compete for a country you choose to represent, which is why
  // the question is "represent", not "where are you".
  //
  // A native <select> on purpose: 200 options with a phone's own search, its
  // own scroll and its own accessibility, for no code and no bytes. Nothing
  // custom could beat it and several things could break it.
  //
  // No IP lookup, no Geolocation permission, no transmission — see country.js.
  function countryCard() {
    var C = window.CURIO_COUNTRY;
    if (!C) return el('<div class="hidden"></div>');
    var cur = C.get();
    var node = el(
      '<div class="card">' +
        '<div class="section-title" style="margin-top:0">' +
          ((cur && C.flagOf(cur)) || "🌍") + ' ' + t("The country you represent") + '</div>' +
        '<p class="mini" style="margin:0 0 12px">' +
          t("Used to send you to a bookshop or library that can actually reach you, and to place you on your country's board when contests start. It is kept on this device, and counted only as a country — never as a person.") +
        '</p>' +
        '<select class="cselect" id="ccSel" aria-label="' + esc(t("The country you represent")) + '">' +
          '<option value="">' + t("Prefer not to say") + '</option>' +
        '</select>' +
      '</div>'
    );
    var sel = node.querySelector("#ccSel");
    C.list().forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.code;
      o.textContent = c.label;
      if (c.code === cur) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () {
      C.set(sel.value || null);
      renderTab("settings");   // the flag in the title follows the choice
    });
    return node;
  }

  function settingsTabView() { // mobile Settings: comfort content, no back header
    var wrap = el('<div class="grid"></div>');
    wrap.appendChild(nudgeCard());
    wrap.appendChild(countryCard());
    wrap.appendChild(backupCard());
    wrap.appendChild(comfortView(true));
    return wrap;
  }

  // Your progress lives on this device, and nowhere else. That is the honest
  // consequence of having no accounts — and it means a reinstall, a cleared
  // cache, or a different address loses everything (CEO, 2026-08-09: "when I
  // re-install will I lose my record?"). Until accounts exist, this is the
  // answer: copy a code out, paste it back in. Cookie Clicker's pattern, which
  // has worked for a decade.
  var BACKUP_KEYS = ["curio.vault", "curio.stats", "curio.streak", "curio.settings", "curio.onboarded"];
  function backupCard() {
    var node = el(
      '<div class="card">' +
        '<div class="section-title" style="margin-top:0">🗝️ ' + t("Your progress") + '</div>' +
        '<p class="mini" style="margin:0 0 12px">' +
          t("Your progress is currently stored on this device. Copy your backup code before you reinstall or change phone — nothing else can bring it back.") +
        '</p>' +
        '<div class="btnrow">' +
          '<button class="btn" id="bkCopy">' + t("Copy backup code") + '</button>' +
          '<button class="btn ghost" id="bkRestore">' + t("Restore from a code") + '</button>' +
        '</div>' +
        '<div class="mini" id="bkMsg" style="margin-top:10px"></div>' +
      '</div>'
    );
    var msg = node.querySelector("#bkMsg");

    node.querySelector("#bkCopy").addEventListener("click", function () {
      var bag = { v: 1, at: todayKey(), d: {} };
      BACKUP_KEYS.forEach(function (k) {
        try { var v = localStorage.getItem(k); if (v !== null) bag.d[k] = v; } catch (e) {}
      });
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf("curio.daily.") === 0) bag.d[k] = localStorage.getItem(k);
        }
      } catch (e) {}
      // base64 so a stray line break in a chat app cannot corrupt it
      var code = "QPIO1:" + btoa(unescape(encodeURIComponent(JSON.stringify(bag))));
      shareOrCopy(code, msg);
    });

    node.querySelector("#bkRestore").addEventListener("click", function () {
      var input = window.prompt(t("Paste your backup code:"));
      if (!input) return;
      try {
        var raw = input.trim().replace(/^QPIO1:/, "");
        var bag = JSON.parse(decodeURIComponent(escape(atob(raw))));
        if (!bag || !bag.d) throw new Error("shape");
        var n = 0;
        Object.keys(bag.d).forEach(function (k) {
          if (k.indexOf("curio.") === 0) { localStorage.setItem(k, bag.d[k]); n++; }
        });
        msg.textContent = tf("Restored {n} items. Reopening…", { n: n });
        setTimeout(function () { location.reload(); }, 900);
      } catch (e) {
        msg.textContent = t("That code could not be read. Check you copied all of it.");
      }
    });
    return node;
  }

  function brainMapCard() {
    var st = getStats();
    var card = el('<div class="card"><div class="section-title" style="margin-top:0">' + t("🧠 Your Brain Map") + '</div><div class="mini" style="margin-bottom:10px">' + t("Accuracy by domain — earn Sage in all six.") + '</div></div>');
    CATS.forEach(function (c) {
      var d = st.cats[c], pct = d.s ? Math.round(100 * d.c / d.s) : 0, lv = levelFor(d);
      card.appendChild(el(
        '<div class="bm-row">' +
          '<span class="bm-cat">' + (CAT_EMOJI[c] || "") + " " + t(c) + '</span>' +
          '<span class="bm-bar" role="img" aria-label="' + t(c) + ': ' + (d.s ? tf("{pct}% of {n}", { pct: pct, n: d.s }) : t("unexplored")) + '"><i style="width:' + pct + '%"></i></span>' +
          '<span class="bm-lv">' + lv.icon + " " + t(lv.name) + '</span>' +
        '</div>'
      ));
    });
    return card;
  }

  function leaderboardCard() {
    var board = LS.get("leaderboard", []);
    var card = el('<div class="card"><div class="section-title" style="margin-top:0">' + t("🏆 Quick-Fire leaderboard (this device)") + '</div></div>');
    if (!board.length) {
      card.appendChild(el('<div class="empty">' + t("No scores yet. Play Quick-Fire to claim the top spot.") + '</div>'));
    } else {
      var ul = el('<ul class="lb"></ul>');
      board.slice(0, 8).forEach(function (row, i) {
        ul.appendChild(el('<li><span class="rank">' + (i + 1) + '</span><span class="who">' + esc(row.name) + '</span><span class="pts">' + row.pts + '</span></li>'));
      });
      card.appendChild(ul);
    }
    return card;
  }

  // ---------- comfort panel ----------
  function segRow(title, hint, options, current, onPick) {
    var row = el('<div class="cf-group"><div class="cf-title">' + title + '</div>' + (hint ? '<div class="mini" style="margin:2px 0 8px">' + hint + '</div>' : '') + '<div class="cats"></div></div>');
    var box = row.querySelector(".cats");
    options.forEach(function (o) {
      var b = el('<button class="chip" aria-pressed="' + (o.value === current ? "true" : "false") + '">' + o.label + '</button>');
      b.addEventListener("click", function () {
        box.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        onPick(o.value);
      });
      box.appendChild(b);
    });
    return row;
  }

  function comfortView(inTab) { // inTab (mobile Settings tab): no "← Home" row — it's a tab now
    var node = el('<div class="card"></div>');
    if (inTab) {
      node.appendChild(el('<h2 style="margin:0 0 6px">' + t("Comfort & settings") + '</h2>'));
    } else {
      node.appendChild(el('<div class="quizhead" style="margin-bottom:6px"><button class="btn ghost" id="back" style="padding:8px 12px;font-size:13px">' + t("← Home") + '</button><h2 style="margin:0 auto">' + t("Comfort & settings") + '</h2><span style="width:64px"></span></div>'));
    }
    node.appendChild(el('<p class="mini" style="margin:0 0 14px">' + t("Knowledge is for everyone. Tune Qpio to the way <b>you</b> read, hear and think — nothing here is ever paywalled.") + '</p>'));

    // The copy now says what the clock actually DOES. It has never skipped you
    // on to the next question and the CEO expected it to (2026-08-13); his
    // ruling was to keep the behaviour and stop the copy implying otherwise.
    node.appendChild(segRow(t("⏱️ Quick-Fire timer"), t("Quick-Fire only — the Daily Challenge is never timed. If the clock runs out the answer is revealed and the question counts as missed; you always move on in your own time. Turn it off if it gets in the way — scoring adapts fairly."), [
      { label: t("Normal (15s)"), value: "normal" }, { label: t("Relaxed (30s)"), value: "relaxed" }, { label: t("Off"), value: "off" }
    ], settings.timer, function (v) { settings.timer = v; saveSettings(); }));

    // Editable afterwards, as asked. One name per device: the board keeps a
    // single row per player, so renaming moves your row rather than adding one.
    var nameRow = el('<div class="cf-group"><div class="cf-title">' + t("🏷️ Your name on the leaderboard") + '</div>' +
      '<div class="mini" style="margin:2px 0 8px">' + t("Shown only on this device. Leave it blank and the board simply says “You”.") + '</div>' +
      '<input class="cselect" id="setName" type="text" maxlength="16" autocomplete="off" style="max-width:280px" ' +
      'value="' + esc(LS.get("playerName", "")) + '" placeholder="' + esc(t("You")) + '"></div>');
    nameRow.querySelector("#setName").addEventListener("change", function () {
      var was = playerName(), now = (this.value || "").trim().slice(0, 16);
      LS.set("playerName", now);
      // Carry the existing row across rather than orphaning it under the old name.
      var board = LS.get("leaderboard", []).map(function (r) { return r.name === was ? { name: playerName(), pts: r.pts, date: r.date } : r; });
      LS.set("leaderboard", board);
    });
    node.appendChild(nameRow);

    node.appendChild(segRow(t("🔤 Dyslexia-friendly reading"), t("Wider spacing, taller lines, a rounder font."), [
      { label: t("Off"), value: false }, { label: t("On"), value: true }
    ], settings.dyslexia, function (v) { settings.dyslexia = v; saveSettings(); }));

    node.appendChild(segRow(t("🎯 Focus anchors (bold word starts)"), t("Bolds the first letters of each word as anchor points for the eye. Some readers find it helps them focus; research hasn't confirmed a benefit. Try it — keep it only if it helps you."), [
      { label: t("Off"), value: false }, { label: t("On"), value: true }
    ], settings.anchors, function (v) { settings.anchors = v; saveSettings(); }));

    node.appendChild(segRow(t("🔍 Text size"), null, [
      { label: t("Normal"), value: "normal" }, { label: t("Large"), value: "large" }, { label: t("Extra large"), value: "xl" }
    ], settings.textSize, function (v) { settings.textSize = v; saveSettings(); }));

    node.appendChild(segRow(t("🔊 Read questions aloud"), t("Qpio speaks each question, its options, and the depth fact. Uses your device's built-in voice — free, even offline."), [
      { label: t("Off"), value: false }, { label: t("On"), value: true }
    ], settings.readAloud, function (v) {
      settings.readAloud = v; saveSettings();
      if (v) speak(t("Read aloud is on. Every question will be spoken."));
    }));

    node.appendChild(segRow(t("🎬 Motion"), t("Reduced turns off animations and transitions."), [
      { label: t("Full"), value: "normal" }, { label: t("Reduced"), value: "reduced" }
    ], settings.motion, function (v) { settings.motion = v; saveSettings(); }));

    node.appendChild(segRow(t("🌓 Contrast"), null, [
      { label: t("Normal"), value: "normal" }, { label: t("High"), value: "high" }
    ], settings.contrast, function (v) { settings.contrast = v; saveSettings(); }));

    // "No account, no tracking — ever" was not true and the CEO ruled it out
    // (D-064, 2026-08-14): registration is voluntary and offered, and the app
    // does need to see how its readers get on. The honest version keeps the
    // part that IS true and load-bearing — kids get no account interface at
    // all, which is what makes Kids mode COPPA-clean by construction.
    node.appendChild(segRow(t("👶 Age mode"), t("Kids mode uses kid-friendly questions only (ages ~8–12). No account is offered in Kids mode, and nothing personal is ever collected."), [
      { label: t("Everyone"), value: "all" }, { label: t("Kids (8–12)"), value: "kids" }
    ], settings.ageMode, function (v) { settings.ageMode = v; saveSettings(); }));

    // Language picker (D-035). Preference is a raw string (read by i18n.js
    // before JSON-based LS exists), so it bypasses the LS helper on purpose.
    var langPref = "auto";
    try { langPref = localStorage.getItem("curio.lang") || "auto"; } catch (e) {}
    if (langPref !== "en" && langPref !== "fr") langPref = "auto";
    node.appendChild(segRow("🌐 Language / Langue", t("Auto follows your device language. Changing this reloads the app."), [
      { label: "Auto", value: "auto" }, { label: "English", value: "en" }, { label: "Français", value: "fr" }
    ], langPref, function (v) {
      try { localStorage.setItem("curio.lang", v); } catch (e) {}
      location.reload();
    }));

    node.appendChild(el('<div class="mini" style="margin-top:18px"><a href="#" id="replayIntro">' + t("Replay the intro") + '</a> · <a href="#" id="wipe" style="color:var(--bad)">' + t("Reset all my data on this device") + '</a></div>'));
    node.querySelector("#replayIntro").addEventListener("click", function (e) { e.preventDefault(); onboardingView(0); });

    var back = node.querySelector("#back");
    if (back) back.addEventListener("click", goHome);
    node.querySelector("#wipe").addEventListener("click", function (e) {
      e.preventDefault();
      if (confirm(t("Erase streaks, scores, vault and settings on this device?"))) {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf("curio.") === 0) localStorage.removeItem(k); });
        settings = Object.assign({}, DEFAULT_SETTINGS);
        applySettings(); goHome();
      }
    });
    return node;
  }

  // ---------- image preload (issue #1) ----------
  // "The refreshing speed for the images in the app is a bit slow" (CEO,
  // 2026-08-17). The fix is to spend time the reader was already spending:
  // pictures a screen is GOING to show are fetched silently while the reader
  // is still on the screen before it. The machine lives in src/preload.js so
  // it can be unit-tested in Node; this section owns only the wiring.
  var _warmer = null;
  function imageWarmer() {
    // null when preload.js failed to load — every caller guards, and the app
    // then simply behaves exactly as it did before the fix.
    if (!_warmer && window.CURIO_PRELOAD) _warmer = window.CURIO_PRELOAD.create();
    return _warmer;
  }

  // The exact pictures today's results screen will render: the five topic
  // photographs on the shelf, plus the photograph on each Keep-exploring
  // door. Both are deterministic for the day (dailyQuestions() is seeded,
  // discovery shelves are a pure function of the deck), which is what makes
  // preloading them "feasible" — the surprise-me card is random and is
  // deliberately not here.
  function dailyResultImageUrls() {
    var urls = [];
    var GOL = window.CURIO_GO, IM = window.CURIO_IMAGES || {};
    if (!GOL) return urls;
    var dq = dailyQuestions();
    dq.forEach(function (q) {
      var pic = IM[GOL.entityOf(q)];
      if (pic && pic.u) urls.push(pic.u);
    });
    var D = window.CURIO_DISCOVERY;
    if (D) {
      var seen = dq.map(function (q) { return { id: GOL.entityOf(q) }; });
      D.shelves(seen, 8).forEach(function (S) {
        var art = S.items[0] && S.items[0].image;
        if (art) urls.push(art);
      });
    }
    return urls;
  }

  function warmDailyResults() {
    // Aeroplane mode is an acceptance criterion: offline, these fetches can
    // only fail — skip them and let the shelf degrade to its category tiles.
    if (navigator.onLine === false) return;
    var W = imageWarmer();
    if (W) W.start(dailyResultImageUrls());
  }

  // The moment between the last answer and the results (issue #1, the CEO's
  // sand-timer proposal, 2026-08-17 — adopted as the capped FALLBACK, not the
  // plan). In the common case the silent preload has already finished and the
  // results render instantly, complete. Only when fetches are still in flight
  // does the reader see the ⏳ transition — capped, then render regardless,
  // images arriving progressively. An uncapped wait would hang the results.
  var RESULTS_GATE_CAP_MS = 1200;
  function resultsGate(showResults) {
    var W = _warmer;
    // Straight through when there is nothing to wait for: no preloader,
    // everything settled, or offline — where images may NEVER arrive and a
    // gated results screen would break the offline promise outright.
    if (!W || W.idle() || navigator.onLine === false) { showResults(); return; }
    var gate = el(
      '<div class="card result gate">' +
        '<div class="gate-timer" aria-hidden="true">⏳</div>' +
        '<div class="sub" role="status">' + t("Gathering your discoveries…") + '</div>' +
      '</div>');
    // render() replaces the answered question card at once — the previous
    // question's picture is never left on screen looking frozen.
    render(gate);
    W.whenSettled(RESULTS_GATE_CAP_MS, function () {
      // The reader may have tabbed away during the wait; yanking them back
      // to a screen they left is worse than standing down. The finished
      // record is already saved — Play shows these results on next entry.
      if (!gate.parentNode || !playShown) return;
      showResults();
    });
  }

  // ---------- quiz engine ----------
  // cfg: { questions:[...], timed:bool, vault:bool, resumeKey:string, onDone(result) }
  //
  // resumeKey turns a round into something that survives the device (CEO,
  // 2026-08-13: "if the user starts the quiz and stops in the middle or
  // receiving a call or the device restarts… they can pick up where they left
  // off at any time during the day"). Without it the round lives only in this
  // closure and dies with the page.
  function runQuiz(cfg) {
    // A checkpoint is only trusted if it describes THIS deck. A content release
    // mid-day changes the bank size, which reseeds dailyQuestions() and deals a
    // different five — and the saved marks would then describe questions the
    // reader never saw. Comparing ids is what makes that impossible.
    var deckIds = cfg.questions.map(qid).join(",");
    var saved = cfg.resumeKey ? LS.get(cfg.resumeKey, null) : null;
    if (saved && (saved.ids !== deckIds || !Array.isArray(saved.marks) ||
                  typeof saved.idx !== "number" || saved.idx < 1 ||
                  saved.idx >= cfg.questions.length || saved.marks.length !== saved.idx)) {
      saved = null;                                   // stale or malformed — start clean
      LS.set(cfg.resumeKey, null);
    }
    var idx = saved ? saved.idx : 0,
        score = saved ? saved.score : 0,
        correctCount = saved ? saved.correct : 0,
        marks = saved ? saved.marks.slice() : [],
        answered = false, timer = null, timeLeft = 0,
        warmed = false;   // issue #1: the round's results warm-up runs once
    var seedBase = dayNumber() * 100;
    var secs = cfg.timed ? timerSecs() : null;

    function checkpoint() {
      if (!cfg.resumeKey) return;
      LS.set(cfg.resumeKey, { idx: idx, score: score, correct: correctCount,
                              marks: marks, ids: deckIds, at: todayKey() });
    }

    var node = el('<div class="card"></div>');
    render(node);
    show();

    function show() {
      answered = false;
      node._qShownAt = Date.now();   // stopwatch for the ⚡ speed chip
      if (node._fit) { window.removeEventListener("resize", node._fit); node._fit = null; }
      node.classList.remove("answered-view");
      node.classList.remove("cramped");
      node.style.maxHeight = "";
      var raw = cfg.questions[idx];
      var q = withShuffledOptions(raw, seedBase + idx * 7 + (cfg.timed ? 1 : 0));
      // Issue #1: the results screen's images are knowable before the last
      // answer, so they are fetched SILENTLY while the reader is still on
      // questions 4–5 — spending time they were already spending instead of
      // making them wait at the end. cfg.warm is the round's own knowledge of
      // what its results will show; the engine only knows when the moment is.
      // idx-based, not answer-based, so a resumed round landing on question 5
      // still warms.
      if (cfg.warm && !warmed && idx >= cfg.questions.length - 2) {
        warmed = true;
        try { cfg.warm(); } catch (e) {}
      }
      node.innerHTML = "";
      node.appendChild(el(
        '<div class="quizhead">' +
          '<button class="btn ghost" id="quit" style="padding:8px 12px;font-size:13px">' + t("← Quit") + '</button>' +
          '<div class="progress"><i style="width:' + Math.round((idx) / cfg.questions.length * 100) + '%"></i></div>' +
          '<div class="qmeta">' + (idx + 1) + '/' + cfg.questions.length + (secs ? ' · <span class="timer" id="timer">' + secs + 's</span>' : '') + '</div>' +
        '</div>' + qiDiagChip(q)
      ));
      var catLabel = q.theme || q.cat || "";
      var catEmoji = CAT_EMOJI[q.cat] || cfg.emoji || "";
      var regionBit = q.region && REGION_LABEL[q.region] ? ' · ' + t(REGION_LABEL[q.region]) : "";
      // A question can carry its own picture. Needed the moment "Countries &
      // Flags" became a real section: "the quiz needs to show a flag and the
      // user finds the country" (CEO, 2026-08-09) — which is impossible to ask
      // in words without giving the answer away. The picture sits ABOVE the
      // question text, because it IS the question.
      //
      // Flag emoji cannot do this job: Windows ships no flag glyphs at all, so
      // a third of readers would see two letters where the flag should be —
      // and those two letters are the answer. Hence real images.
      var artHtml = "";
      if (q.img && q.img.u) {
        // The alt text is not a label, it is the question restated for someone
        // who cannot see it — so it has to be in the reader's language like
        // everything else they read. It shipped in English first and that made
        // it useless to exactly the French readers it exists for.
        var alt = (QLANG === "fr" && q.img.alt_fr) || q.img.alt || "";
        // Issue #1: the slot never sits blank and never shows a broken glyph.
        // A sand-timer holds the space while the picture resolves (so the
        // card barely moves when it lands), and stays — still, not spinning —
        // if the fetch fails. Each show() rebuilds this DOM from scratch,
        // which is the structural guarantee that the PREVIOUS question's
        // picture can never linger into this one.
        artHtml =
          '<div class="qart' + (q.img.fit === "contain" ? " is-contain" : "") + ' is-loading">' +
            '<span class="qart-wait" aria-hidden="true">⏳</span>' +
            '<img src="' + esc(q.img.u) + '" alt="' + esc(alt) + '" decoding="async">' +
          '</div>' +
          (q.img.by ? '<div class="qart-credit">' +
            (q.img.p ? '<a href="' + srcLink0(q.img.p) + '" target="_blank" rel="noopener">' : '') +
            esc(q.img.by) + (q.img.lic ? ' · ' + esc(q.img.lic) : '') +
            (q.img.p ? '</a>' : '') + '</div>' : '');
      }
      var body = el(
        '<div>' +
          // No Easy/Medium/Hard on screen (CEO, 2026-08-10): the label judges
          // the player, not the question — what is easy is whatever you happen
          // to know. `diff` stays internal (kids-mode fallback uses it). The
          // fair metric is speed, shown after each answer below.
          '<span class="qcat">' + catEmoji + " " + esc(t(catLabel)) + regionBit + (cfg.vault ? ' · 🗝️ ' + t("Vault") : '') + '</span>' +
          artHtml +
          '<div class="qtext">' + fmt(q.q) + (canSpeak() ? ' <button class="speakbtn" id="speakBtn" aria-label="' + t("Read this question aloud") + '">🔊</button>' : '') + '</div>' +
          '<div class="opts"></div>' +
        '</div>'
      );
      var opts = body.querySelector(".opts");
      q.options.forEach(function (o, i) {
        var b = el('<button class="opt"><span class="key">' + "ABCD"[i] + '</span><span>' + esc(o) + '</span></button>');
        b.addEventListener("click", function () { choose(i, q, opts, timeLeft); });
        opts.appendChild(b);
      });
      node.appendChild(body);

      // The sand-timer's exit (issue #1). A cache hit — the preloaded common
      // case — settles synchronously here, so the timer never even flashes.
      var qa = body.querySelector(".qart");
      if (qa) {
        var qim = qa.querySelector("img");
        var qaDone = function () { qa.classList.remove("is-loading"); };
        var qaFail = function () {
          qa.classList.remove("is-loading");
          qa.classList.add("is-failed");          // quiet placeholder, no broken glyph
        };
        // complete=true means the fetch already SETTLED (memory cache) — and a
        // settled image fires no further events, so deciding from the flags
        // here is the only correct path. naturalWidth tells success from
        // failure: a cached failure must not leave the timer spinning forever.
        if (qim.complete) { if (qim.naturalWidth) qaDone(); else qaFail(); }
        else {
          qim.addEventListener("load", qaDone, { once: true });
          qim.addEventListener("error", qaFail, { once: true });
        }
      }

      // Explain it back: on repeat vault visits, recall from memory before seeing options.
      var vItem = cfg.vault ? getVault()[q.id] : null;
      if (vItem && (vItem.rung || 0) >= 1) {
        opts.classList.add("hidden");
        var recall = el(
          '<div class="recall">' +
            '<div class="mini" style="margin-bottom:8px">' + t("🧠 You’ve seen this one. Strengthen it: recall the answer from memory first (+25).") + '</div>' +
            '<div class="recallrow">' +
              '<input class="recallinput" id="recallIn" type="text" autocomplete="off" placeholder="' + t("Type your answer…") + '" aria-label="' + t("Type your answer from memory") + '">' +
              '<button class="btn" id="recallGo">' + t("Check") + '</button>' +
            '</div>' +
            '<div class="btnrow"><button class="btn ghost" id="recallSkip">' + t("Show the options instead") + '</button></div>' +
          '</div>'
        );
        node.appendChild(recall);
        function revealOpts() { recall.remove(); opts.classList.remove("hidden"); }
        recall.querySelector("#recallSkip").addEventListener("click", revealOpts);
        recall.querySelector("#recallGo").addEventListener("click", function () {
          var typed = recall.querySelector("#recallIn").value;
          if (recallMatches(typed, q.options[q.answer])) {
            revealOpts();
            choose(q.answer, q, opts, timeLeft, true);
          } else {
            revealOpts(); // no penalty — pick from the options as usual
          }
        });
        recall.querySelector("#recallIn").addEventListener("keydown", function (e) {
          if (e.key === "Enter") recall.querySelector("#recallGo").click();
        });
      }
      node.querySelector("#quit").addEventListener("click", function () { stopTimer(); goHome(); });

      function speakQuestion() {
        speak(q.q + ". " + q.options.map(function (o, i) { return "Option " + "ABCD"[i] + ": " + o; }).join(". "));
      }
      var sb = node.querySelector("#speakBtn");
      if (sb) sb.addEventListener("click", function (e) { e.stopPropagation(); speakQuestion(); });
      if (canSpeak()) speakQuestion();

      if (secs) {
        timeLeft = secs;
        var tEl = node.querySelector("#timer");
        stopTimer();
        timer = setInterval(function () {
          timeLeft--;
          if (tEl) { tEl.textContent = timeLeft + "s"; if (timeLeft <= 5) tEl.classList.add("low"); }
          if (timeLeft <= 0) { stopTimer(); choose(-1, q, opts, 0); }
        }, 1000);
      }
    }

    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

    function choose(i, q, opts, tLeft, recalled) {
      if (answered) return;
      answered = true; stopTimer();
      // Issue #1: the reader is about to spend seconds READING the fact —
      // the network is idle at exactly the moment the next question's picture
      // is knowable. Warm it now and the next card paints from cache. The
      // warmer dedupes, so rapid Next-Next-Next never refetches anything.
      if (idx + 1 < cfg.questions.length && navigator.onLine !== false) {
        var nq = cfg.questions[idx + 1];
        if (nq.img && nq.img.u) {
          var W = imageWarmer();
          if (W) W.start([nq.img.u]);
        }
      }
      var correct = i === q.answer;
      if (correct) {
        correctCount++;
        // Speed bonus only when timed, capped so Relaxed mode can't out-score Normal.
        var bonus = secs ? Math.min(Math.max(0, tLeft), 15) * 10 : 0;
        score += 100 + bonus + (q.diff - 1) * 25 + (recalled ? 25 : 0);
      }
      marks.push(correct);
      if (!cfg.noStats) {
        recordAnswer(q.cat, correct);
        if (cfg.vault) { if (correct) vaultHit(q.id); else vaultMiss(q.id); }
        else if (!correct) vaultMiss(q.id);
      }

      // Once the answer is known, the options you did not pick carry no
      // information — they were only ever there to be chosen between. They
      // collapse away so the fact, and where it leads, own the screen
      // (CEO, 2026-08-08). The correct one always stays; a wrong pick stays
      // too, because seeing what you chose is the whole point of being wrong.
      var buttons = opts.querySelectorAll(".opt");
      buttons.forEach(function (b, bi) {
        b.disabled = true;
        if (bi === q.answer) { b.classList.add("correct"); b.querySelector(".key").textContent = "✓"; }
        else if (bi === i) { b.classList.add("wrong"); b.querySelector(".key").textContent = "✗"; }
        else { b.classList.add("spent"); }
      });
      opts.classList.add("answered");

      // Charter VAL-13: the verdict must never arrive alone. "Correct!" is
      // scorekeeping and it closes the gap the surprise needs; the surprise is
      // the product. So the tick goes to a small mark beside the answer, and
      // the sentence that leads is the one worth reading — for the reader who
      // got it right just as much as the one who did not.
      var verdict = correct ? t("Correct") : (i === -1 ? t("Time") : t("Not quite"));
      var head = verdict + ". ";   // spoken only — the screen leads with the fact
      var hasDeeper = q.deeper && q.deeper.length > 0;
      // The one destination worth offering at the moment of peak curiosity.
      // Never sold, never ordered by money — Charter VAL-12 / D-061.
      var lead = null;
      if (window.CURIO_GO) {
        var dests = window.CURIO_GO.goFor(q);
        for (var di = 0; di < dests.length; di++) {
          if (dests[di].kind !== "source") { lead = dests[di]; break; }
        }
      }
      var leadLabel = !lead ? "" :
        lead.kind === "see"   ? tf("See it at {where}", { where: esc(lead.title) }) :
        lead.kind === "visit" ? tf("Visit {where}",     { where: esc(lead.title) }) :
                                tf("Read about {name}", { name: esc(lead.title) });

      // Speed, not difficulty (CEO, 2026-08-10): "how fast you answer" is
      // factual and non-judgemental — the same number for the professor and
      // the beginner. Peer percentiles need a backend; until then the number
      // stands alone and the speed bonus already prices it into the score.
      // Measured by stopwatch, not by the countdown — the countdown ticks in
      // whole seconds, and a chip that says "0s" reads as a bug.
      var elapsed = (correct && i !== -1 && node._qShownAt)
        ? Math.max(0.1, (Date.now() - node._qShownAt) / 1000).toFixed(1) : null;
      var fact = el('<div class="answerblock">' +
        '<div class="fact">' +
        '<span class="verdict ' + (correct ? "ok" : "no") + '">' +
          '<span aria-hidden="true">' + (correct ? "✓" : "✗") + '</span> ' + verdict +
          (elapsed !== null ? ' <span class="speedchip">⚡ ' + elapsed + 's</span>' : '') +
        '</span>' +
        // ORDER, fixed 2026-08-11 (CEO): read the fact, check the source, see
        // where it leads — and Next LAST, at the bottom. Next used to sit above
        // the go-further link, so the one thing the whole product exists for
        // was below the button that skips past it.
        fmt(q.fact) + srcLink(q.src) + renderQuestionResourcesHtml(q) +
        '<div class="deeperbox"></div>' +
        '</div>' +
        // Outside the fact box on purpose. The fact is the only part whose
        // length we cannot control — a long one on a small phone has to be
        // allowed to scroll inside its own box. The destination and Next sit
        // BELOW it as pinned siblings, so they are always on screen whatever
        // the fact does. That is what makes "no scrolling" a guarantee rather
        // than a hope (CEO, 2026-08-11).
        '<div class="answerfoot">' +
        (lead ? '<a class="gf-link gf-inline" href="' + doorHref(lead.kind, "lead", lead.url) + '" target="_blank" rel="noopener">' +
                  '<span class="gf-ico" aria-hidden="true">' + lead.icon + '</span>' +
                  '<span class="gf-text">' + leadLabel +
                    (lead.sub ? '<span class="gf-sub">' + esc(lead.sub) + '</span>' : '') +
                  '</span><span class="gf-go" aria-hidden="true">↗</span></a>' : '') +
        '<div class="btnrow">' +
          (hasDeeper ? '<button class="btn ghost" id="deeper">' + t("🕳️ Go deeper") + '</button>' : '') +
          '<button class="btn" id="next">' + (idx + 1 < cfg.questions.length ? t("Next →") : t("See results →")) + '</button>' +
        '</div>' +
        '</div>');
      // NO SCROLLING (CEO, 2026-08-11): "everything should fit vertically on
      // the screen". The picture has done its job the moment the answer is in —
      // a flag you have already identified does not need 250px. Shrinking it
      // is what buys the fact, the source, the destination and Next their room.
      node.classList.add("answered-view");
      node.appendChild(fact);
      requestAnimationFrame(function () { fact.querySelector(".fact").classList.add("show"); });

      // The card's ceiling is measured, not guessed. A CSS calc() cannot know
      // where the card starts on the page (the masthead and the quiz header
      // vary), and getting it wrong by 40px is what pushed Next under the tab
      // bar. So: fill exactly from the card's own top to just above the tab
      // bar, and let the fact box absorb whatever is left over.
      var fitCard = function () {
        node.style.maxHeight = "";
        var bar = document.querySelector(".tabbar");
        var floor = bar && getComputedStyle(bar).display !== "none"
          ? bar.getBoundingClientRect().top : window.innerHeight;
        var top = node.getBoundingClientRect().top + window.scrollY;
        var room = Math.round(floor + window.scrollY - top - 10);
        if (room > 220) node.style.maxHeight = room + "px";   // never squeeze past readable

        // THE CAP IS NOT A GUARANTEE, and v73 failed acceptance proving it
        // (2026-08-17, #57: "1 of 5 questions hid Next behind the tab bar").
        // max-height only helps while the card's FLEXIBLE part — the fact —
        // still has something to give. On a 320x568 phone, a five-line
        // question plus four options plus the footer exceeded the cap all by
        // themselves with the fact already at zero, and the column simply
        // overflowed past the cap. So: measure the thing the acceptance test
        // measures — Next itself — and escalate until it is above the bar.
        var nx = node.querySelector("#next");
        if (!nx) return;
        var over = function () { return nx.getBoundingClientRect().bottom - floor; };
        // Stage 2: compress the already-answered question and options harder.
        if (over() > 0) node.classList.add("cramped");
        // Stage 3: content can always be longer than any screen is tall —
        // scroll the spent question text off the top rather than let Next
        // sink under the bar. The reader has answered; the fact, the
        // destination and Next are what the moment is for.
        var o = over();
        if (o > 0) window.scrollBy(0, o);
      };
      // Measure more than once: the first call can land before the picture has
      // laid out, and a card measured against the wrong height is exactly the
      // bug this is here to prevent. Re-fit on the next frame, once images
      // finish, and whenever the viewport changes.
      fitCard();
      requestAnimationFrame(fitCard);
      setTimeout(fitCard, 60);
      setTimeout(fitCard, 250);
      [].slice.call(node.querySelectorAll("img")).forEach(function (im) {
        if (!im.complete) im.addEventListener("load", fitCard, { once: true });
      });
      node._fit = fitCard;
      window.addEventListener("resize", fitCard);
      // The feedback lands below four option cards, so on a phone the answer,
      // the source and Next were all below the fold — the user had to hunt for
      // them (CEO, 2026-08-07). Bring the card into view.
      // setTimeout, not requestAnimationFrame: rAF does not fire when the page
      // is not compositing (backgrounded tab, hidden window), which is exactly
      // when someone returns to a half-finished quiz.
      // The answered card is now built to fit, so scrolling is a fallback, not
      // the plan: only scroll if the fact genuinely still runs off the screen
      // (a very long fact on a very short phone). Scrolling on every answer was
      // itself the complaint.
      setTimeout(function () {
        var r = fact.getBoundingClientRect();
        if (r.bottom <= window.innerHeight - 4) return;         // already fits — leave the page alone
        try {
          fact.scrollIntoView({ behavior: settings.motion === "reduced" ? "auto" : "smooth", block: "end" });
        } catch (e) { fact.scrollIntoView(false); }
        setTimeout(function () {
          var r2 = fact.getBoundingClientRect();
          if (r2.bottom > window.innerHeight + 1) { try { fact.scrollIntoView({ behavior: "auto", block: "end" }); } catch (e2) { fact.scrollIntoView(false); } }
        }, 400);
      }, 0);
      speak(head + q.fact);
      if (hasDeeper) {
        var dIdx = 0, dBox = fact.querySelector(".deeperbox"), dBtn = fact.querySelector("#deeper");
        dBtn.addEventListener("click", function () {
          if (dIdx >= q.deeper.length) return;
          var d = el('<div class="fact-deeper">🕳️ ' + fmt(q.deeper[dIdx]) + '</div>');
          dBox.appendChild(d);
          requestAnimationFrame(function () { d.classList.add("show"); });
          speak(q.deeper[dIdx]);
          dIdx++;
          if (dIdx >= q.deeper.length) { dBtn.disabled = true; dBtn.textContent = t("🕳️ Bottom reached"); }
        });
      }
      fact.querySelector("#next").addEventListener("click", function () {
        idx++;
        // Written BEFORE the next question renders, so a crash or a call taken
        // between the two lands on a checkpoint that is already correct.
        // Checkpointing here rather than at answer time means a reader who
        // quits between answering and tapping Next replays that one question —
        // no score is lost and no half-answered state has to be rebuilt.
        checkpoint();
        if (idx < cfg.questions.length) show();
        else cfg.onDone({ score: score, correct: correctCount, total: cfg.questions.length, marks: marks });
      });
    }
  }

  // ---------- daily ----------
  function dailyKey() { return "daily." + todayKey() + (settings.ageMode === "kids" ? ".kids" : ""); }
  // A SEPARATE key, and deliberately not prefixed "daily." — the backup export
  // scans for "curio.daily." and a half-finished round is not something anyone
  // wants restored onto another device. Date-stamped, which is what delivers
  // the CEO's "reset happens on the next day release" for nothing: tomorrow's
  // key simply does not exist yet.
  function dailyProgKey() { return "dailyProg." + todayKey() + (settings.ageMode === "kids" ? ".kids" : ""); }
  function dailyProgress() {
    var p = LS.get(dailyProgKey(), null);
    return (p && typeof p.idx === "number" && p.idx > 0 && p.idx < DAILY_COUNT) ? p : null;
  }
  // Yesterday's unfinished round is dead weight. Collect first, then remove:
  // removing while iterating localStorage by index re-indexes it and skips keys.
  function pruneDailyProgress() {
    var keep = "curio." + dailyProgKey(), doomed = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf("curio.dailyProg.") === 0 && k !== keep) doomed.push(k);
    }
    doomed.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
  }

  function startDaily() {
    pruneDailyProgress();
    var existing = LS.get(dailyKey(), null);
    if (existing) { return dailyResultView(existing, true); }
    var dq = dailyQuestions();
    // The daily five enter the same 14-day ledger quick-fire reads — a
    // question answered in this morning's daily must not turn up in this
    // afternoon's quick-fire wearing a different hat.
    markSeen(dq);
    // Gate 5 served-round denominator: at most one request per device-day,
    // and a NO-OP today — the kill switch in src/doors.js is off pending
    // founder ruling R1. Failure of any kind degrades to v80 exactly.
    if (window.QPIO_DOORS) window.QPIO_DOORS.roundStart();
    runQuiz({
      questions: dq,
      timed: false,
      // Every entry point routes through here — hero button, Train card, the
      // #daily notification link, a cold boot, the Stats Play button and the
      // end of onboarding — so resuming by default is one change, not six.
      resumeKey: dailyProgKey(),
      // Issue #1: fetch the results screen's pictures while the reader is
      // still on questions 4–5, so the shelf appears instantly and complete.
      warm: warmDailyResults,
      onDone: function (r) {
        var s = bumpStreak();
        var rec = { score: r.correct, total: r.total, marks: r.marks, streak: s.count, date: todayKey() };
        LS.set(dailyKey(), rec);
        LS.set(dailyProgKey(), null);   // finished: the completed record owns the day now
        primeNudge();          // today is done — the service worker must not nudge about it
        // Issue #1: the capped ⏳ transition — only when fetches are still in
        // flight, never offline. The record is saved above FIRST, so nothing
        // is lost whatever happens during the wait.
        resultsGate(function () { dailyResultView(rec, false); });
      }
    });
  }

  function dailyResultView(rec, already) {
    var emoji = rec.marks.map(function (m) { return m ? "🟩" : "🟥"; }).join("");
    var s = getStreak();
    var missed = rec.marks.filter(function (m) { return !m; }).length;
    // The score is the receipt, not the point. It gets one compact band so the
    // shelf below it starts near the top of the screen (CEO, 2026-08-08:
    // "a shelf you have to scroll to is a shelf in the stockroom").
    var pct = rec.total ? Math.round(100 * rec.score / rec.total) : 0;
    var marks = rec.marks.map(function (m) {
      return '<span class="rs-mark ' + (m ? "ok" : "no") + '" aria-hidden="true">' + (m ? "✓" : "✗") + '</span>';
    }).join("");
    var node = el(
      '<div class="card result rs">' +
        '<div class="rs-top">' +
          '<div class="rs-ring" style="--pct:' + pct + '" role="img" aria-label="' +
            tf("{score} out of {total}", { score: rec.score, total: rec.total }) + '">' +
            '<div class="rs-ring-in"><b>' + rec.score + '/' + rec.total + '</b>' +
            '<span>' + (already ? t("Today") : praise(rec.score, rec.total)) + '</span></div>' +
          '</div>' +
          // Share sits beside the marks, not at the end of the row. As a
          // sibling of .rs-meta it wrapped to a second line on a 375px screen
          // and cost the band 43px — measured, not guessed.
          '<div class="rs-meta">' +
            '<h2>' + t("Today's challenge") + '</h2>' +
            '<div class="rs-streak">' + (s.count === 1 ? t("🔥 1-day streak") : tf("🔥 {n}-day streak", { n: s.count })) +
              (s.count === s.best && s.best > 1 ? t(" — your best ever!") : "") + '</div>' +
            '<div class="rs-row">' +
              '<div class="rs-marks">' + marks + '</div>' +
              '<button class="btn ghost rs-share" id="share" aria-label="' + t("Share result") + '">' +
                '<span aria-hidden="true">⤴ </span>' + t("Share") + '</button>' +
            '</div>' +
            '<div class="rs-date">Qpio Daily · ' + rec.date +
              (!already && missed ? ' · ' + (missed === 1
                ? t("🗝️ 1 fact saved")
                : tf("🗝️ {n} facts saved", { n: missed })) : '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="mini" id="msg"></div>' +
      '</div>'
    );
    render(node);
    node.querySelector("#share").addEventListener("click", function () {
      var text = "Qpio Daily " + rec.date + "\n" + emoji + " " + rec.score + "/" + rec.total +
        "\n🔥 " + (s.count === 1 ? t("1-day streak") : tf("{n}-day streak", { n: s.count })) +
        "\nhttps://qpio.app — " + t("free, forever.");
      shareOrCopy(text, node.querySelector("#msg"));
    });
    // The daily set is deterministic for the day, so the questions can be
    // re-derived here and matched to rec.marks by position. Only for today's
    // record — an older one would pair marks with the wrong questions.
    if (rec.date === todayKey()) {
      var gf = shelfCard(dailyQuestions(), rec.marks);
      if (gf) node.parentNode.appendChild(gf);
      // UAT curiosity diagnostic: why the daily was paced the way it was.
      if (QI_DIAG && QI) {
        var dqs = dailyQuestions();
        var roles = dqs.map(function (q) { return q.intelligence ? q.intelligence.role : "?"; });
        var novs = dqs.map(function (q) { return q.intelligence ? String(q.intelligence.entry_pull.novelty) : "?"; });
        node.parentNode.appendChild(el('<div class="qidiag qidiag-round">⚙ roles: ' + esc(roles.join(" → ")) + '<br>⚙ novelty: ' + esc(novs.join(" ")) + '</div>'));
      }
    }
    // No Home button at the foot: it now sits in the header beside the logo,
    // where it is reachable without scrolling past everything (CEO,
    // 2026-08-09), and it is also a permanent tab.
  }

  // ---------- the shelf ----------
  // The reason the app exists. Someone has just been wrong about something —
  // the strongest moment of curiosity there is — and until now we showed them
  // a score and stopped.
  //
  // Designed by the CEO, 2026-08-08. The list became a shelf, and the thing
  // that made it work was one line nobody else wrote: not the topic's NAME,
  // but the reason to care. "Bolivian Navy" is a label. "Why does a landlocked
  // country have a navy?" is a hook. A label needs reading; a hook pulls.
  //
  // Three rules, all his:
  //   · one visual element = one obvious action; tap anywhere on the card
  //   · only show the ways that actually exist — never empty functionality
  //   · the shelf is what you already got curious about; "surprise me" is a
  //     different psychological state and belongs on Home, not here
  //
  // Nothing here is ever sold. See src/golinks.js and Charter VAL-12 (D-061).
  var CAT_ART = {
    History: "🏛️", Science: "🔬", Geography: "🌍", Arts: "🎨", Tech: "💻", Nature: "🌿"
  };

  function shelfCard(questions, marks) {
    if (!window.CURIO_GO || !questions || !questions.length) return null;

    // Every question answered gets a card. Previously a question with no
    // source produced nothing, so a round of five showed four — which reads as
    // a bug, not as a data gap (CEO, 2026-08-09). All 262 are now sourced, and
    // this guard means a future unsourced question degrades to a card with a
    // fact rather than vanishing.
    var wrong = [], right = [];
    questions.forEach(function (q, i) {
      var dest = window.CURIO_GO.goFor(q) || [];
      (marks && marks[i] === false ? wrong : right).push({ q: q, dest: dest });
    });
    if (!wrong.length && !right.length) return null;

    var card = el('<div class="card shelf"></div>');
    card.appendChild(el(
      '<div class="shelf-head">' +
        '<h3>' + t("Topics you might want to know more about") + '</h3>' +
        '<p>' + t("Curiosity doesn’t stop here.") + '</p>' +
      '</div>'
    ));

    // `pos` is the card's 1-based shelf position — the Gate 5 slot (s1..s5)
    // a routed door tap reports. Position > 5 falls back to plain links: the
    // instrument's slot key covers the daily round of five, nothing more.
    function topic(item, missed, pos) {
      var q = item.q;
      var slotName = "s" + pos;
      var name = window.CURIO_GO.titleOf(window.CURIO_GO.entityOf(q));
      var art = CAT_ART[q.cat] || "✨";
      // Beat two. The written hook opens the gap; the depth fact closes it, so
      // it is only the fallback (Charter VAL-13).
      var slugH = window.CURIO_GO.entityOf(q);
      var written = slugH && (window.CURIO_HOOKS || {})[slugH];
      var hook = (written && (window.QLANG === "fr" ? written.fr : written.en)) || q.fact || "";

      // A real photograph of the real thing, from Wikimedia Commons, credited
      // and linked back. Falls back to the category tile when there is no
      // image or the device is offline — the shelf never breaks, it just gets
      // quieter. Visual learners are a large share of any audience and
      // "accessibility is fundamental" is Charter value 5 (CEO, 2026-08-08).
      var pic = (window.CURIO_IMAGES || {})[window.CURIO_GO.entityOf(q)];
      var artHtml = pic
        ? '<a class="topic-art has-pic" href="' + srcLink0(pic.p) + '" target="_blank" rel="noopener" ' +
            'title="' + esc(tf("Photo: {by} · {lic}", { by: pic.by || "Wikimedia Commons", lic: pic.lic || "" })) + '">' +
            '<img src="' + esc(pic.u) + '" alt="" loading="lazy" decoding="async">' +
            '<span class="topic-fallback" aria-hidden="true">' + art + '</span>' +
          '</a>'
        : '<div class="topic-art" aria-hidden="true"><span class="topic-emoji">' + art + '</span></div>';

      // THE CARD, rebuilt 2026-08-09 from the CEO's phone. Three defects, one
      // cause: the old card was one horizontal row — thumbnail, then a column
      // holding badge, name, hook and three buttons side by side. On a 356px
      // screen that column is ~250px wide, so the buttons ran past the card
      // edge and the hook was clamped to two lines and cut mid-sentence. A hook
      // you cannot finish reading cannot pull anyone anywhere.
      //
      // Now: picture and words on top, actions on their own full-width row
      // underneath. The correct/missed word is gone — a ✓ or ✗ on the corner of
      // the photograph says the same thing in no space at all and needs no
      // translation. That returned a whole line to the name and the hook, which
      // is why they now sit higher and the hook runs in full.
      var node = el(
        '<div class="topic' + (missed ? " is-missed" : "") + '">' +
          '<div class="topic-top">' +
            artHtml +
            '<div class="topic-body">' +
              '<h4 class="topic-name">' + esc(name) + '</h4>' +
              (hook ? '<p class="topic-hook">' + fmt(hook) + '</p>' : '') +
            '</div>' +
          '</div>' +
          '<div class="topic-ways"></div>' +
        '</div>'
      );

      // The verdict, as a mark on the picture. Screen readers still get the
      // word — the mark is decorative, the label carries the meaning.
      var artNode = node.querySelector(".topic-art");
      if (artNode) {
        artNode.appendChild(el(
          '<span class="topic-mark" role="img" aria-label="' +
            esc(missed ? t("Missed") : t("Correct")) + '">' +
            (missed ? "✗" : "✓") + '</span>'
        ));
      }

      // Four slots, same four, same order, every card. A slot with no
      // destination is drawn greyed and is not a link at all — not a link that
      // does nothing, an element that was never a link. See golinks.js goFor().
      var ways = node.querySelector(".topic-ways");
      item.dest.forEach(function (d) {
        var label = t(d.label);
        var inner = '<span class="way-ico" aria-hidden="true">' + d.icon + '</span>' +
                    '<span class="way-txt">' + label + '</span>';
        var a;
        if (d.on) {
          a = el('<a class="way" href="' + doorHref(d.kind, slotName, d.url) + '" target="_blank" rel="noopener"' +
                 (d.title ? ' title="' + esc(d.title + (d.sub ? " · " + d.sub : "")) + '"' : '') +
                 '>' + inner + '</a>');
          // The card is tappable as a whole; a way must not fire it twice.
          a.addEventListener("click", function (e) { e.stopPropagation(); });
        } else {
          a = el('<span class="way is-off" aria-disabled="true" title="' +
                 esc(t("Nothing here yet")) + '">' + inner + '</span>');
          a.addEventListener("click", function (e) { e.stopPropagation(); });
        }
        ways.appendChild(a);
      });

      // The image links to its Commons file page, which carries the full
      // licence and author. Attribution is a condition, not a courtesy — so it
      // must not be swallowed by the card's own tap.
      var picLink = node.querySelector("a.topic-art");
      if (picLink) picLink.addEventListener("click", function (e) { e.stopPropagation(); });

      // Tap anywhere → the best destination for this topic. Keyboard users tab
      // straight to the individual ways, so the card needs no tabindex of its
      // own — no duplicate stop, no invented widget role.
      var primary = window.CURIO_GO.primaryOf(item.dest);
      if (primary) {
        node.addEventListener("click", function () {
          // Raw URL, not the attribute-escaped one — window.open is not HTML.
          var D = window.QPIO_DOORS;
          var via = D && D.href ? D.href(primary.kind, slotName, primary.url) : null;
          window.open(via || srcLink0(primary.url), "_blank", "noopener");
        });
      }
      return node;
    }

    var shelfPos = 0;
    wrong.forEach(function (it) { shelfPos++; card.appendChild(topic(it, true, shelfPos)); });
    right.forEach(function (it) { shelfPos++; card.appendChild(topic(it, false, shelfPos)); });

    // Keep exploring — the same curiosity followed sideways. Bolivia the
    // country rather than its navy; the mathematicians behind prime numbers
    // rather than the definition. Built from today's topics, so never filler.
    // Keep exploring — real things on shelves, not category doors. The window,
    // not the shop sign.
    var D = window.CURIO_DISCOVERY;
    if (D) {
      var seen = wrong.concat(right).map(function (it) {
        return window.CURIO_GO.entityOf(it.q);
      });
      var racks = D.shelves(seen.map(function (id) { return { id: id }; }), 8);
      if (racks.length) card.appendChild(keepExploringEl(racks, seen));
    }
    return card;
  }

  // ---------- keep exploring ----------
  // Six shelves of actual things. A shelf shows what is on it; a category
  // button asks you to guess. Horizontal within a shelf, vertical between —
  // so one flick browses a subject and one scroll changes appetite.
  // Six doors, not six shelves. The CEO, 2026-08-09: "scrolling is more
  // decision-making intensive than clicking — there is an idea of jumping to
  // the target; scrolling is running through uninteresting info before getting
  // to where I want." So the review page shows the doors; the shelf lives
  // behind the door, where it has a whole screen and does not push the result
  // off the page.
  function keepExploringEl(racks, seenIds) {
    var wrap = el(
      '<div class="keep">' +
        '<div class="keep-head">' +
          '<div><h3>' + t("Keep exploring") + '</h3>' +
          '<p>' + t("Follow your curiosity anywhere.") + '</p></div>' +
          '<button class="surprise" id="surpriseBtn">' +
            '<span aria-hidden="true">✨</span> ' + t("Surprise me") + '</button>' +
        '</div>' +
        '<div class="surprise-slot" id="surpriseSlot"></div>' +
        '<div class="doors"></div>' +
      '</div>'
    );

    var doors = wrap.querySelector(".doors");
    racks.forEach(function (S) {
      // The door wears the first item's photograph — a real thing behind it,
      // visible before you commit.
      var art = (S.items[0] && S.items[0].image) || null;
      var d = el(
        '<button class="door' + (art ? " has-art" : "") + '">' +
          (art ? '<img class="door-art" src="' + esc(art) + '" alt="" loading="lazy" decoding="async">' : '') +
          '<span class="door-wash" aria-hidden="true"></span>' +
          '<span class="door-body">' +
            '<span class="door-ico" aria-hidden="true">' + S.icon + '</span>' +
            '<span class="door-label">' + t(S.label) + '</span>' +
            '<span class="door-count">' + tf("{n} to explore", { n: S.items.length }) + '</span>' +
          '</span>' +
        '</button>'
      );
      d.addEventListener("click", function () {
        // Back from a lane returns to this result screen, so the reader can
        // open another door without replaying the round.
        render(laneView(S, function () { startDaily(); }));
      });
      doors.appendChild(d);
    });

    // Surprise me: one thing, in place, immediately. No menu, no new screen.
    var slot = wrap.querySelector("#surpriseSlot");
    wrap.querySelector("#surpriseBtn").addEventListener("click", function () {
      var already = seenIds.slice();
      [].slice.call(wrap.querySelectorAll(".dcard")).forEach(function (c) {
        already.push(c.getAttribute("data-id"));
      });
      var pick = window.CURIO_DISCOVERY.surpriseOne(already.map(function (id) { return { id: id }; }));
      if (!pick) return;
      slot.innerHTML = "";
      var card = discoveryCardEl(pick, "lg");
      card.classList.add("is-surprise");
      slot.appendChild(card);
      slot.scrollIntoView({ behavior: settings.motion === "reduced" ? "auto" : "smooth", block: "nearest" });
    });
    return wrap;
  }

  // Behind a door: the whole screen, a back button, and the shelf laid out
  // where it has room to breathe. Back returns to the RESULT, not Home — a
  // reader who opened Visit will often want Read next, and sending them home
  // makes them replay the round to get there. Home lives in the header
  // (CEO, 2026-08-09).
  function laneView(S, back) {
    var wrap = el('<div class="grid"></div>');
    var head = el(
      '<div class="card">' +
        '<div class="btnrow" style="margin:0 0 10px"><button class="btn ghost" id="laneBack">' +
          '<span aria-hidden="true">←</span> ' + t("Back") + '</button></div>' +
        '<div class="section-title" style="margin-top:0">' + S.icon + ' ' + t(S.label) + '</div>' +
        '<p class="mini" style="margin:0">' + tf("{n} to explore", { n: S.items.length }) + '</p>' +
      '</div>'
    );
    head.querySelector("#laneBack").addEventListener("click", function () {
      if (typeof back === "function") back(); else goHome();
    });
    wrap.appendChild(head);

    var grid = el('<div class="card"><div class="dgrid"></div></div>');
    var g = grid.querySelector(".dgrid");
    S.items.forEach(function (it) { g.appendChild(discoveryCardEl(it, "sm")); });
    wrap.appendChild(grid);
    return wrap;
  }

  // One discovery card. The whole card is the tap — no Read/Explore/More trio
  // all going to the same place (CEO, 2026-08-08). Extra ways appear only when
  // they are genuinely different destinations.
  function discoveryCardEl(it, size) {
    var node = el(
      '<div class="dcard dcard-' + (size || "sm") + '" data-id="' + esc(it.id) + '">' +
        '<div class="dcard-art">' +
          (it.image ? '<img src="' + esc(it.image) + '" alt="" loading="lazy" decoding="async">' : '') +
          '<span class="dcard-wash" aria-hidden="true"></span>' +
        '</div>' +
        '<div class="dcard-body">' +
          '<h5 class="dcard-title">' + esc(it.title) + '</h5>' +
          (it.hook ? '<p class="dcard-hook">' + fmt(it.hook) + '</p>' : '') +
        '</div>' +
      '</div>'
    );
    if (it.credit) {
      node.querySelector(".dcard-art").setAttribute("title",
        tf("Photo: {by} · {lic}", { by: it.credit, lic: it.creditLic || "" }));
    }
    if (it.url) {
      node.setAttribute("role", "link");
      node.setAttribute("tabindex", "0");
      node.setAttribute("aria-label", it.title + (it.hook ? ". " + it.hook : ""));
      var open = function () { window.open(srcLink0(it.url), "_blank", "noopener"); };
      node.addEventListener("click", open);
      node.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    }
    return node;
  }

  // Same scheme check srcLink() applies, for a bare URL.
  function srcLink0(u) {
    if (!/^https?:\/\//i.test(u || "")) return "#";
    return esc(u);
  }

  // Gate 5 door instrument: a door tap routes via /go/<class>/<slot> when the
  // instrument is live. It is OFF today — src/doors.js holds the kill switch,
  // defaulted off pending founder ruling R1 — and in that state this returns
  // the plain destination and the app behaves exactly as v80. The `source`
  // slot is never routed (VAL-12 / NN-3): doors.js refuses it and the plain
  // Wikipedia link is used.
  function doorHref(kind, slot, url) {
    var D = window.QPIO_DOORS;
    var via = D && D.href ? D.href(kind, slot, url) : null;
    return via ? esc(via) : srcLink0(url);
  }

  // ---------- vault session ----------
  function startVaultSession() {
    var due = vaultDue();
    if (!due.length) { goHome(); return; }
    // shuffle, cap the session
    for (var i = due.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)); var tmp = due[i]; due[i] = due[k]; due[k] = tmp; }
    var qs = due.slice(0, VAULT_SESSION_MAX);
    runQuiz({
      questions: qs,
      timed: false,
      vault: true,
      onDone: function (r) {
        var node = el(
          '<div class="card result">' +
            '<div class="scorebig">' + r.correct + '/' + r.total + '</div>' +
            '<h2>' + (r.correct === r.total ? t("Vault cleared. 🗝️") : t("Strengthening in progress.")) + '</h2>' +
            '<div class="sub">' + tf("{a} climbed the ladder · {b} reset to tomorrow", { a: r.correct, b: (r.total - r.correct) }) + '</div>' +
            '<div class="mini">' + tf("Facts mastered for good so far: {n} 🏅", { n: (getStats().mastered || 0) }) + '</div>' +
            '<div class="btnrow" style="justify-content:center">' +
              (vaultDue().length ? '<button class="btn" id="more">' + t("Review more") + '</button>' : '') +
            '</div>' +
          '</div>'
        );
        render(node);
        var more = node.querySelector("#more");
        if (more) more.addEventListener("click", startVaultSession);
      }
    });
  }

  // ---------- City packs ("Before you travel") ----------
  // Same overlay contract as the question banks: citypacks.fr.js carries only
  // words, aligned by index, and everything structural comes from the English
  // file. Counts are the guard here (there is no answer index on a blurb) —
  // any mismatch and the packs stay English rather than half-translated.
  var _packsMerged = null;
  function cityPacks() {
    if (_packsMerged) return _packsMerged;
    var en = window.CURIO_CITYPACKS || [];
    var fr = window.CURIO_CITYPACKS_FR || [];
    if (QLANG !== "fr" || fr.length !== en.length) return (_packsMerged = en);
    _packsMerged = en.map(function (e, i) {
      var f = fr[i];
      if (!f || !f.questions || f.questions.length !== e.questions.length ||
          !f.phrases || f.phrases.length !== e.phrases.length) return e;
      var out = {}, k;
      for (k in e) if (e.hasOwnProperty(k)) out[k] = e[k];
      out.city = f.city || e.city;
      out.country = f.country || e.country;
      out.blurb = f.blurb || e.blurb;
      out.questions = e.questions.map(function (q, qi) {
        var t = f.questions[qi], o = {};
        for (k in q) if (q.hasOwnProperty(k)) o[k] = q[k];
        o.q = t.q; o.options = t.options; o.fact = t.fact;
        return o;
      });
      // phrase/pron stay local-language from EN; only meaning and the
      // respelling a French reader sounds out come from FR.
      out.phrases = e.phrases.map(function (ph, pi) {
        var t = f.phrases[pi];
        return { phrase: ph.phrase, meaning: t.meaning, pron: t.pron };
      });
      out.tips = (f.tips && f.tips.length === e.tips.length) ? f.tips : e.tips;
      return out;
    });
    return _packsMerged;
  }

  // One card per city pack, appended into container. Shared by the overlay
  // city browser (cityHomeView) and the mobile Games tab (FEAT-027) — same
  // builder, zero logic duplication.
  function cityCards(container) {
    cityPacks().forEach(function (p) {
      var card = el(
        '<div class="card mode citycard">' +
          '<div class="cityrow"><span class="cityemoji">' + (p.emoji || "🌍") + '</span>' +
          '<div><h3>' + esc(p.city) + '</h3><div class="mini">' + esc(p.country) + ' · ' + (REGION_LABEL[p.region] ? t(REGION_LABEL[p.region]) : esc(p.region)) + '</div></div></div>' +
          '<p>' + esc(p.blurb) + '</p>' +
        '</div>'
      );
      card.addEventListener("click", function () { render(cityPackView(p)); });
      container.appendChild(card);
    });
  }

  function cityHomeView() {
    var wrap = el('<div class="grid"></div>');
    wrap.appendChild(el('<div class="quizhead" style="margin-bottom:2px"><button class="btn ghost" id="back" style="padding:8px 12px;font-size:13px">' + t("← Home") + '</button><h2 style="margin:0 auto">🧳 ' + t("Before you travel") + '</h2><span style="width:64px"></span></div>'));
    wrap.appendChild(el('<p class="mini" style="margin:0 0 8px">' + t("Learn a place before you land — its real story (not just the tourist version), its food, and a few words of the local language. Free and offline.") + '</p>'));
    cityCards(wrap);
    wrap.querySelector("#back").addEventListener("click", goHome);
    return wrap;
  }

  // Returns the node; the CALLER renders it — same contract as laneView and
  // every other view here. It used to call render() itself and return nothing,
  // so the one call site that wrapped it — the city cards on Home — was doing
  // render(undefined) and wiping the page to blank. The card looked dead
  // ("not linked to anything", CEO 2026-08-09); it was worse than dead.
  function cityPackView(pack) {
    var node = el('<div class="grid"></div>');
    node.appendChild(el('<div class="quizhead" style="margin-bottom:2px"><button class="btn ghost" id="back" style="padding:8px 12px;font-size:13px">' + t("← Cities") + '</button><h2 style="margin:0 auto">' + (pack.emoji || "🌍") + ' ' + esc(pack.city) + '</h2><span style="width:64px"></span></div>'));

    var play = el('<div class="card"><p style="margin:0 0 12px">' + esc(pack.blurb) + '</p><button class="btn block" id="playCity">' + tf("▶ Play the {city} quiz ({n})", { city: esc(pack.city), n: pack.questions.length }) + '</button></div>');
    node.appendChild(play);

    // Key phrases
    if (pack.phrases && pack.phrases.length) {
      var pcard = el('<div class="card"><div class="section-title" style="margin-top:0">🗣️ ' + t("Key phrases") + ' · ' + esc(pack.lang || "") + '</div></div>');
      pack.phrases.forEach(function (ph) {
        var row = el(
          '<div class="phrase">' +
            '<div class="phrase-main"><b>' + esc(ph.phrase) + '</b>' + (canSpeak() ? ' <button class="speakbtn phrase-speak" aria-label="' + t("Say it") + '">🔊</button>' : '') + '</div>' +
            '<div class="mini">' + esc(ph.meaning) + ' · <i>' + esc(ph.pron) + '</i></div>' +
          '</div>'
        );
        var sp = row.querySelector(".phrase-speak");
        if (sp) sp.addEventListener("click", function () { speakLang(ph.phrase, pack.lang); });
        pcard.appendChild(row);
      });
      node.appendChild(pcard);
    }

    // Know before you go
    if (pack.tips && pack.tips.length) {
      var tcard = el('<div class="card"><div class="section-title" style="margin-top:0">' + t("🧭 Know before you go") + '</div></div>');
      var ul = el('<ul class="tips"></ul>');
      pack.tips.forEach(function (t) { ul.appendChild(el('<li>' + esc(t) + '</li>')); });
      tcard.appendChild(ul);
      node.appendChild(tcard);
    }

    node.querySelector("#back").addEventListener("click", function () { render(cityHomeView()); });
    play.querySelector("#playCity").addEventListener("click", function () {
      runQuiz({
        questions: pack.questions,
        timed: false,
        noStats: true,
        emoji: pack.emoji,
        onDone: function (r) {
          var res = el(
            '<div class="card result">' +
              '<div class="scorebig">' + r.correct + '/' + r.total + '</div>' +
              '<h2>' + praise(r.correct, r.total) + '</h2>' +
              '<div class="sub">' + esc(pack.city) + ' · ' + t("ready for your trip 🧳") + '</div>' +
              '<div class="btnrow" style="justify-content:center">' +
                '<button class="btn" id="again">' + t("Play again") + '</button>' +
                '<button class="btn ghost" id="pack">' + tf("Back to {city}", { city: esc(pack.city) }) + '</button>' +
              '</div>' +
            '</div>'
          );
          render(res);
          res.querySelector("#again").addEventListener("click", function () { play.querySelector("#playCity").click(); });
          res.querySelector("#pack").addEventListener("click", function () { render(cityPackView(pack)); });
        }
      });
    });
    return node;
  }

  // Speak a phrase in its own language when the browser has a matching voice.
  var LANG_CODE = { Italian: "it-IT", Japanese: "ja-JP", "Egyptian Arabic": "ar-EG", Arabic: "ar", Spanish: "es-ES", Turkish: "tr-TR" };
  function speakLang(text, lang) {
    if (!canSpeak()) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = LANG_CODE[lang] || "en-US"; u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---------- Fact or Fake? (media literacy) ----------
  var TRUTH_ROUND = 8;
  function truthPool() {
    var en = window.CURIO_STATEMENTS || [];
    var fr = window.CURIO_STATEMENTS_FR || [];
    var all = (QLANG === "fr" && fr.length) ? fr : en;
    return settings.ageMode === "kids" ? all.filter(function (s) { return s.kids; }) : all;
  }
  function startTruthLab() {
    var pool = truthPool().slice();
    if (pool.length < 4) { goHome(); return; }
    for (var i = pool.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)); var tmp = pool[i]; pool[i] = pool[k]; pool[k] = tmp; }
    var sts = pool.slice(0, Math.min(TRUTH_ROUND, pool.length));
    var idx = 0, score = 0, correctCount = 0, answered = false;
    var node = el('<div class="card"></div>');
    render(node);
    show();

    function show() {
      answered = false;
      var st = sts[idx];
      node.innerHTML = "";
      node.appendChild(el(
        '<div class="quizhead">' +
          '<button class="btn ghost" id="quit" style="padding:8px 12px;font-size:13px">' + t("← Quit") + '</button>' +
          '<div class="progress"><i style="width:' + Math.round(idx / sts.length * 100) + '%"></i></div>' +
          '<div class="qmeta">' + (idx + 1) + '/' + sts.length + '</div>' +
        '</div>'
      ));
      node.appendChild(el(
        '<div>' +
          '<span class="qcat">🔎 ' + t("Fact or Fake?") + ' · ' + (CAT_EMOJI[st.cat] || "") + " " + esc(t(st.cat)) + '</span>' +
          '<div class="qtext">“' + fmt(st.s) + '”' + (canSpeak() ? ' <button class="speakbtn" id="speakBtn" aria-label="' + t("Read aloud") + '">🔊</button>' : '') + '</div>' +
          '<div class="truthbtns">' +
            '<button class="opt truthopt" id="btnFact"><span class="key">✅</span><span>' + t("Fact — this is real") + '</span></button>' +
            '<button class="opt truthopt" id="btnFake"><span class="key">🚫</span><span>' + t("Fake — don’t fall for it") + '</span></button>' +
          '</div>' +
        '</div>'
      ));
      node.querySelector("#quit").addEventListener("click", goHome);
      var sb = node.querySelector("#speakBtn");
      if (sb) sb.addEventListener("click", function () { speak(st.s); });
      if (canSpeak()) speak(st.s);
      node.querySelector("#btnFact").addEventListener("click", function () { pick(true, st); });
      node.querySelector("#btnFake").addEventListener("click", function () { pick(false, st); });
    }

    function pick(saidTrue, st) {
      if (answered) return;
      answered = true;
      var correct = saidTrue === st.truth;
      if (correct) { correctCount++; score += 100; }
      recordAnswer(st.cat, correct);
      var fBtn = node.querySelector("#btnFact"), kBtn = node.querySelector("#btnFake");
      fBtn.disabled = kBtn.disabled = true;
      (st.truth ? fBtn : kBtn).classList.add("correct");
      if (!correct) (saidTrue ? fBtn : kBtn).classList.add("wrong");
      // The explain text itself opens with "Real."/"Fake.", so the head just
      // carries the reaction + emoji to avoid doubling the verdict word.
      var head = (correct ? t("Nice catch! ") : t("Gotcha — ")) + (st.truth ? "✅ " : "🚫 ");
      var fact = el('<div class="fact"><b>' + head + '</b>' + fmt(st.explain) + srcLink(st.src) +
        '<div class="btnrow"><button class="btn" id="next">' + (idx + 1 < sts.length ? t("Next →") : t("See results →")) + '</button></div></div>');
      node.appendChild(fact);
      requestAnimationFrame(function () { fact.classList.add("show"); });
      speak(head + st.explain);
      fact.querySelector("#next").addEventListener("click", function () {
        idx++;
        if (idx < sts.length) show(); else done();
      });
    }

    function done() {
      var hi = LS.get("truthhi", 0);
      var isHi = score > hi;
      if (isHi) LS.set("truthhi", score);
      var res = el(
        '<div class="card result">' +
          '<div class="scorebig">' + correctCount + '/' + sts.length + '</div>' +
          '<h2>' + (isHi && score > 0 ? t("🏆 New best!") : truthPraise(correctCount, sts.length)) + '</h2>' +
          '<div class="sub">' + t("Every claim you just checked had a source. Real life should be so kind — so ask for one.") + '</div>' +
          '<div class="btnrow" style="justify-content:center">' +
            '<button class="btn" id="again">' + t("Play again") + '</button>' +
            // Every other results screen offers a way home beside the redo;
            // this one stranded the reader on the tab bar (CEO, 2026-08-17:
            // "we need a return home button next to button to redo a test").
            '<button class="btn ghost" id="tlHome">🏠 ' + t("Home") + '</button>' +
          '</div>' +
        '</div>'
      );
      render(res);
      res.querySelector("#again").addEventListener("click", startTruthLab);
      res.querySelector("#tlHome").addEventListener("click", goHome);
    }
  }
  function truthPraise(c, t_) {
    var r = c / t_;
    if (r === 1) return t("Unfoolable. 🔎");
    if (r >= 0.75) return t("Sharp eye for nonsense.");
    if (r >= 0.5) return t("The fakes are sneaky — that’s the point.");
    return t("Now you know the tricks. They only work once.");
  }

  // ---------- quickfire ----------
  function startQuickfire(cat, region) {
    var qs = quickfireQuestions(cat, region);
    if (!qs.length) {
      // Cleared, not broken. The player who has seen every question in a topic
      // this month is the app's best player — tell them that, tell them when
      // it restocks, and point them somewhere fresh. Never repeat instead.
      var node = el(
        '<div class="card result">' +
          '<div class="scorebig">🏅</div>' +
          '<h2>' + t("You’ve cleared this topic — for now.") + '</h2>' +
          '<div class="sub">' + t("You’ve answered every question here in the last month. New questions arrive every week, and missed ones return through the Vault.") + '</div>' +
          '<div class="btnrow" style="justify-content:center">' +
            '<button class="btn" id="clearedOther">' + t("Try another topic") + '</button>' +
            '<button class="btn ghost" id="clearedHome">🏠 ' + t("Home") + '</button>' +
          '</div>' +
        '</div>'
      );
      render(node);
      node.querySelector("#clearedOther").addEventListener("click", function () { renderTab("train"); });
      node.querySelector("#clearedHome").addEventListener("click", goHome);
      return;
    }
    var label = t(cat) + (region && region !== "All" ? " · " + t(REGION_LABEL[region] || region) : "");
    runQuiz({
      questions: qs,
      timed: true,
      onDone: function (r) { quickResultView(r, label, cat, region); }
    });
  }

  function quickResultView(r, label, cat, region) {
    var hi = LS.get("hiscore", 0);
    var isHi = r.score > hi;
    if (isHi) LS.set("hiscore", r.score);
    var node = el(
      '<div class="card result">' +
        '<div class="scorebig">' + r.score + '</div>' +
        '<h2>' + (isHi ? t("🏆 New high score!") : praise(r.correct, r.total)) + '</h2>' +
        '<div class="sub">' + tf("{c}/{t} correct", { c: r.correct, t: r.total }) + ' · ' + esc(label) + '</div>' +
        // How the number was reached, next to the number. A score nobody can
        // explain is a score nobody trusts (CEO, 2026-08-13: "We need to
        // explain how the points are calculated in the dashboard to the user").
        '<details class="howscore"><summary>' + t("How these points are worked out") + '</summary>' +
          '<ul>' +
            '<li>' + t("<b>100</b> for every right answer.") + '</li>' +
            '<li>' + t("<b>up to +150</b> for speed — 10 points for each second still on the clock, capped at 15 seconds, so Relaxed can never out-score Normal.") + '</li>' +
            '<li>' + t("<b>+25 or +50</b> when the question is a harder one.") + '</li>' +
            '<li>' + t("<b>+25</b> when you recall a Vault answer from memory before seeing the options.") + '</li>' +
            '<li>' + t("A wrong answer scores nothing — it never takes points away.") + '</li>' +
          '</ul></details>' +
        '<div class="btnrow" style="justify-content:center">' +
          '<button class="btn ghost" id="again">' + t("Play again") + '</button>' +
          '<button class="btn ghost" id="qrHome">🏠 ' + t("Home") + '</button>' +
        '</div>' +
        '<div class="mini" id="msg"></div>' +
      '</div>'
    );
    render(node);
    node.querySelector("#qrHome").addEventListener("click", goHome);
    node.querySelector("#again").addEventListener("click", function () { startQuickfire(cat, region); });

    // Saved automatically, and only ever ONE row per player (CEO, 2026-08-13:
    // "each time it asked me to save to the leader board, which lead to
    // duplicate name on the board... the saving to dashboard should be
    // automatic as soon as there is a Name saved").
    // The old flow prompted after every round and PUSHED a new row each time,
    // so two runs by the same person produced two entries with the same name —
    // a board that rewards playing twice rather than playing well.
    var saved = recordScore(r.score);
    var msg = node.querySelector("#msg");
    if (saved.best) msg.textContent = tf("Saved as your best — {pts} points. ⭐", { pts: saved.pts });
    else msg.textContent = tf("Your best is still {pts} points.", { pts: saved.pts });
  }

  // One device, one player, one row. A device is a person here: the daily five
  // are the same for everyone, so a shared device cannot produce a fair second
  // player anyway. Laptops with several genuine users are tracked separately —
  // see the roadmap issue on multiple instances.
  function recordScore(pts) {
    var name = playerName();
    var board = LS.get("leaderboard", []).filter(function (row) { return row.name !== name; });
    var mine = LS.get("leaderboard", []).filter(function (row) { return row.name === name; })[0];
    var best = !mine || pts > mine.pts;
    board.push({ name: name, pts: best ? pts : mine.pts, date: best ? todayKey() : mine.date });
    board.sort(function (a, b) { return b.pts - a.pts; });
    LS.set("leaderboard", board.slice(0, 20));
    return { best: best, pts: best ? pts : mine.pts };
  }
  function playerName() {
    var n = (LS.get("playerName", "") || "").trim();
    return n || t("You");
  }

  function praise(c, t_) {
    var r = c / t_;
    if (r === 1) return t("Flawless. Certified sage. 🧠");
    if (r >= 0.8) return t("Sharp. Very sharp.");
    if (r >= 0.6) return t("Solid work.");
    if (r >= 0.4) return t("Room to grow — you learned something.");
    return t("Everyone starts somewhere. Now you know more.");
  }

  // ---------- onboarding (FEAT-011 / US-008): 3 cards, skippable, once ----------
  function onboardingView(step) {
    step = step || 0;
    var slides = [
      { emoji: "🧭", title: t("Knowledge should be free."),
        text: t("Qpio (say: cue-pee-oh) is free to use. There are no paywalls. Qpio doesn't interrupt your learning with ads. When you want to go further, you may find links to relevant books, museums, exhibitions and other resources.") },
      // 🗓️ replaced 📅 — the calendar emoji renders with "17 JUL" printed on
      // it on Android and Windows (it is the Unicode sample date), so the
      // screen appeared to name a date nobody could explain (CEO, 2026-08-09).
      { emoji: "🗓️", title: t("Five questions."),
        text: t("The same five for everyone, everywhere. Every answer teaches you something worth knowing. Questions you miss can come back later so you have another chance to learn them.") },
      // Asked here rather than buried in Settings, because it changes where
      // "Read" sends someone from their very first round — and because the
      // country you represent is part of what Qpio is, not a preference.
      // Skippable in one tap; everything works without it.
      { emoji: "🌍", title: t("Which country do you represent?"),
        // The English said only "it decides which bookshop we send you to" while
        // the French already promised the leaderboard AND that the value never
        // leaves the device — two languages telling a reader different things
        // about their own data, one of them untrue. Both now say the same, and
        // it is the sentence that survives Charter §8: counted as a country,
        // never as a person.
        text: t("It decides which bookshop or library we send you to, and it is how you will appear on your country's board when contests start. It is counted as a country, never as a person — no name is ever attached to it."),
        pick: "country" },
      { emoji: "⚙️", title: t("Made for the way you learn."),
        text: t("Turn timers off, switch on dyslexia-friendly text, read-aloud or high contrast — all free, all in Settings. There is a Kids mode too, which never asks for anything at all. Your progress is currently stored on this device.") }
    ];
    var s = slides[step];
    var dots = slides.map(function (_, i) {
      return '<span class="onb-dot' + (i === step ? " on" : "") + '"></span>';
    }).join("");
    var last = step === slides.length - 1;
    var node = el(
      '<div class="card onb">' +
        '<div class="onb-emoji">' + s.emoji + '</div>' +
        '<h1 class="onb-title">' + s.title + '</h1>' +
        '<p class="onb-text">' + s.text + '</p>' +
        (s.pick === "country" ? '<select class="cselect" id="onbCC" aria-label="' +
          esc(t("The country you represent")) + '"></select>' +
          // Asked once, here, so no round ever has to interrupt itself to ask
          // (CEO, 2026-08-13: "we can even ask for the name at the initial set
          // up, modify the existing one in the settings later"). Optional —
          // leaving it blank simply shows "You" on the board.
          '<input class="cselect" id="onbName" type="text" maxlength="16" autocomplete="off" ' +
            'placeholder="' + esc(t("Your name on the board (optional)")) + '" ' +
            'aria-label="' + esc(t("Your name on the leaderboard")) + '" ' +
            'value="' + esc(LS.get("playerName", "")) + '">' : '') +
        '<div class="onb-dots">' + dots + '</div>' +
        '<div class="btnrow" style="justify-content:center">' +
          // Back from screen two onwards: three screens with no way to reread
          // the one before is a dead end (CEO, 2026-08-09).
          (step > 0 ? '<button class="btn ghost" id="onbBack">' + t("← Back") + '</button>' : '') +
          '<button class="btn" id="onbNext">' + (last ? t("Play today's challenge ▶") : t("Next →")) + '</button>' +
          (last ? '' : '<button class="btn ghost" id="onbSkip">' + t("Skip") + '</button>') +
        '</div>' +
      '</div>'
    );
    // The browser's own locale gives a decent first guess ("fr-CH" → 🇨🇭), so
    // most readers confirm rather than hunt through 200 entries. It is only
    // ever pre-selected, never stored without the reader leaving it there —
    // and no lookup, no permission prompt, no network call is involved.
    var cc = node.querySelector("#onbCC");
    if (cc && window.CURIO_COUNTRY) {
      var C = window.CURIO_COUNTRY;
      var pre = C.get() || C.guess();
      cc.appendChild(el('<option value="">' + t("Prefer not to say") + '</option>'));
      C.list().forEach(function (c) {
        var o = document.createElement("option");
        o.value = c.code;
        o.textContent = c.label;
        if (c.code === pre) o.selected = true;
        cc.appendChild(o);
      });
      cc.addEventListener("change", function () { C.set(cc.value || null); });
      if (pre) C.set(pre);   // the pre-selection is what the screen shows, so it is what we honour
    }

    // Persist as it is typed, NOT at finish(). Each onboarding step renders a
    // fresh node, so by the time finish() runs on the last slide the field from
    // the country slide is long gone and the name was silently discarded —
    // measured on a real first run before this line existed.
    var nmField = node.querySelector("#onbName");
    if (nmField) {
      var saveName = function () { LS.set("playerName", (nmField.value || "").trim().slice(0, 16)); };
      nmField.addEventListener("input", saveName);
      nmField.addEventListener("change", saveName);
    }

    render(node);
    function finish(toDaily) {
      var nm = node.querySelector("#onbName");
      if (nm) LS.set("playerName", (nm.value || "").trim().slice(0, 16));
      LS.set("onboarded", true);
      tabBar.classList.remove("hidden");   // first run: bar was hidden until onboarded
      if (toDaily) startDaily(); else goHome();
    }
    node.querySelector("#onbNext").addEventListener("click", function () {
      if (nmField) LS.set("playerName", (nmField.value || "").trim().slice(0, 16));
      if (last) finish(true); else onboardingView(step + 1);
    });
    var bk = node.querySelector("#onbBack");
    if (bk) bk.addEventListener("click", function () { onboardingView(step - 1); });
    var sk = node.querySelector("#onbSkip");
    if (sk) sk.addEventListener("click", function () { finish(false); });
  }

  // ---------- boot ----------
  applySettings();
  pruneVault();
  buildShell();
  var homeBtn = document.getElementById("homeBtn");
  if (homeBtn) homeBtn.addEventListener("click", goHome);
  scheduleDailyNudge();
  window.addEventListener("hashchange", route);
  if (mqDesk.addEventListener) mqDesk.addEventListener("change", onViewportChange);
  else if (mqDesk.addListener) mqDesk.addListener(onViewportChange); // older Safari/WebViews
  var bootHash = (location.hash || "").replace(/^#/, "");
  route();   // tab content always rendered underneath any overlay
  if (!LS.get("onboarded", false)) {
    tabBar.classList.add("hidden");   // no tab bar until onboarded (spec §4)
    onboardingView(0);                // renders in the overlay; final button starts the daily
  } else if (bootHash === "daily") {
    startDaily();                     // deep entry (Charter M1): straight into today's first question
  }
})();
