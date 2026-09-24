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

  // WHERE A READER WRITES ABOUT THEIR DATA. Empty on the test site only: the
  // Privacy screen then says there is no address yet, and no mailto appears
  // anywhere. Production requires a working address here AND the same address
  // on privacy.html (tools/privacy.test.js checks they match).
  var PRIVACY_CONTACT = "";

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

  // ONE QUESTION, ITS FACTS ONCE, ITS WORDS PER LANGUAGE.
  //
  // The canonical row owns what is true of the question -- its category, its
  // difficulty, whether it suits children, its region, its source, its answer.
  // The translation owns only the words. Before 6 Sep 2026 the French file kept
  // its own copy of the facts too, and the copies had drifted apart on 538 of
  // the 760 rows: one question was Science in English and Tech in French, and
  // hundreds had lost their source entirely. Anything counted by category gave
  // a different answer depending on the reader's language.
  //
  // Rows are joined on the PERMANENT ID, not on their position in the file. A
  // translation that arrives out of order, short, or missing a question now
  // falls back to the English for that one row instead of silently pairing a
  // question with someone else's words -- the failure that would be invisible
  // and unrecoverable.
  function mergeTranslated(en, fr) {
    if (!en.length || !fr.length) return en;
    var byId = {}, i;
    for (i = 0; i < fr.length; i++) if (fr[i] && fr[i].id) byId[fr[i].id] = fr[i];
    return en.map(function (e) {
      var f = e.id ? byId[e.id] : null;
      if (!f) return e;                       // no translation: serve the English
      var out = {}, k;
      for (k in e) if (e.hasOwnProperty(k)) out[k] = e[k];              // the facts
      if (f.q !== undefined) out.q = f.q;                               // the words
      if (f.options !== undefined) out.options = f.options;
      if (f.fact !== undefined) out.fact = f.fact;
      if (f.lrev !== undefined) out.lrev = f.lrev;   // which rendering was served
      out.lang = "fr";
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
  // WIPING: set by "Delete everything on this device" (Privacy screen) and by
  // another tab's delete. From then on LS.set writes nothing, so a Quick-Fire
  // timer or the 60-second nudge that fires after the wipe cannot put the
  // reader's old state back before the page restarts.
  var WIPING = false;
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("curio." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { if (WIPING) return; try { localStorage.setItem("curio." + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- permanent question identity ----------
  // CEO, 6 Sep 2026: "The current editable-text/image-derived QID is not
  // acceptable." It was a hash of the question's own words, and three things
  // broke silently because of it.
  //
  //   * Fixing a typo changed the identity, so that question's whole history --
  //     every reader's saved fact, every future count -- was orphaned.
  //   * The English and French versions of one question hashed differently, so
  //     the app thought they were two questions. Answer it in English and it
  //     came back in French. That was the French vault defect.
  //   * All 68 flag questions ask the same words, so on text alone they shared
  //     ONE id: answering any one of them retired all 68.
  //
  // Every question now carries a permanent id, minted once and never reused,
  // and the SAME id is on the English and the French row because they are one
  // knowledge item. The hash survives only as a fallback for a bank that has
  // not been re-minted yet, and as the key the migration below reads from.
  function legacyQid(q) {
    var s = q.q + (q.img && q.img.u ? "|" + q.img.u : "");
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "q" + (h >>> 0).toString(36);
  }
  function qid(q) { return (q && q.id) || legacyQid(q); }

  // THE READER KEEPS EVERYTHING. Their saved facts, the questions they have
  // already seen and their progress are stored in their own browser under the
  // OLD ids. Without this they would open the app to an empty vault and a bank
  // of questions they had already answered. It runs once, marks itself done,
  // and is harmless if it somehow runs twice.
  /* 3, from 7 Sep 2026. Migration 2 gave 67 flag questions freshly minted X-ids
     because the workbook match compared question text alone, and 68 flag
     questions share the text "Which country's flag is this?". They are now
     paired to their real workbook ids, and the legacy map carries X -> Q so a
     test reader who already migrated does not lose the 67 a second time. */
  var QID_MIGRATION = 3;
  function migrateQids() {
    try {
      if (LS.get("qidmig", 0) >= QID_MIGRATION) return;
      var map = window.CURIO_QID_LEGACY || {};
      var moved = 0;

      var vault = LS.get("vault", null);
      if (vault) {
        var nv = {};
        Object.keys(vault).forEach(function (old) {
          var to = map[old] || old;
          // Two old ids can map to one new one -- the 68 flag questions shared
          // a single id. Keep the entry that is further along the ladder rather
          // than whichever happened to be read last.
          if (!nv[to] || (vault[old] && vault[old].rung > nv[to].rung)) nv[to] = vault[old];
          if (to !== old) moved++;
        });
        LS.set("vault", nv);
      }

      var seen = LS.get("qseen2", null);
      if (seen && seen.length) {
        var byId = {};
        seen.forEach(function (e) {
          var to = map[e.i] || e.i;
          // Keep the most recent sighting, so nothing the reader saw yesterday
          // reappears today because an older row won.
          if (!byId[to] || e.d > byId[to].d) byId[to] = { i: to, d: e.d };
        });
        LS.set("qseen2", Object.keys(byId).map(function (k) { return byId[k]; }));
      }

      var ring = LS.get("qfseen", null);
      if (ring && ring.length) {
        LS.set("qfseen", ring.map(function (id) { return map[id] || id; }));
      }

      LS.set("qidmig", QID_MIGRATION);
      if (window.console && moved) console.info("Qpio: carried " + moved + " saved items to permanent question ids.");
    } catch (e) { /* a failed migration must never stop the app loading */ }
  }
  migrateQids();

  var BY_ID = {};
  Q.forEach(function (q) { BY_ID[qid(q)] = q; });
  // Ids across ALL loaded banks. Since the two languages now share one id per
  // question this is the same set in both, which is the point: switching
  // language no longer changes what the reader has already answered.
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
  // A deliberate tap-to-hear-it button is not the read-aloud feature: it never
  // speaks unasked, so it does not wait on the Comfort setting — only on the
  // browser actually having speech. (v81 review, CEO: "add a button to say the
  // word in the language out loud" — the button existed but was hidden whenever
  // read-aloud was off, which is why he never saw it.)
  function canTapSpeak() { return "speechSynthesis" in window; }
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
  /* THE GOLDEN SOURCE DECIDES WHAT IS DEALT (CEO, 24 Sep 2026: "Please ensure the
     daily question are using the golden source, make no mistake"). A question is
     dealt - in the daily five and in quick fire, both of which draw from pool() -
     only if its bank row carries golden: 1. curio-hq/tools/publish_to_app.js sets
     that flag on exactly the questions the inventory says qualify today: a real
     question, complete in English and in French, not sent back, and not a contested
     one he has not ruled on. An audit on 24 Sep found 32 shipped questions that
     could be dealt without qualifying - 12 the inventory had never heard of, 20
     failing one of its checks - the first of them due the next morning. A row that
     has shipped keeps its id, so a reader's history and vault still find it, but
     without the flag it is never dealt again. A bank with no flag at all is a build
     error the tests refuse; the fallback below only keeps the daily from going blank
     if one ever slipped through, and says so in the console. */
  var GQ = Q.filter(function (x) { return x.golden === 1; });
  if (!GQ.length) { GQ = Q; try { console.error("Qpio: no question carries the golden flag - dealing the whole bank"); } catch (e) {} }
  function pool() {
    if (settings.ageMode !== "kids") return GQ;
    var kids = GQ.filter(function (x) { return x.kids; });
    if (kids.length >= QUICKFIRE_COUNT) return kids;
    // Fallback while the kids bank is small: pad with easy questions.
    var easy = GQ.filter(function (x) { return !x.kids && x.diff === 1; });
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
  function dailyQuestions(dn) {
    var p = pool();
    if (!p.length) return [];
    var W = p.length >= DAILY_WINDOW ? DAILY_WINDOW : DAILY_COUNT;
    var epochLen = Math.max(1, Math.floor(p.length / W));  // days per full deck
    /* dn: a day number other than today's - the notification asks for the coming
       days' first question, and it must be the one the daily will actually serve */
    var d = dn === undefined ? dayNumber() : dn;
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
    // BOTH SETS (9 Sep 2026): the children's five can be replaced too, under
    // its own key, resolved against the kids window — never the adult one.
    if (OV && OV.resolve) {
      var ovKey = new Date(d * 86400000).toISOString().slice(0, 10);
      var ovFive = OV.resolve(ovKey, win, function (c) { return p.indexOf(c) + 1; }, DAILY_COUNT, settings.ageMode === "kids" ? "kids" : "adult");
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

  // EVERY QUESTION CARRIES A PICTURE. CEO, 21 Sep 2026: "I have questions in
  // the daily quiz that don't have pictures — that can NEVER happen." The
  // pipeline clears a picture for every question, but for most of the bank the
  // picture is the SUBJECT's, in the registry (entities.img.js), and the card
  // only ever drew the picture written on the row — so 928 questions were shown
  // bare. The subject's picture is that question's picture: same licence, same
  // credit, same file page, described by the subject's name.
  function subjectPicture(q) {
    var GO = window.CURIO_GO, IM = window.CURIO_IMAGES || {};
    var slug = GO && GO.entityOf ? GO.entityOf(q) : null;
    var im = slug ? IM[slug] : null;
    if (!im || !im.u) return undefined;
    var name = (GO.titleOf ? GO.titleOf(slug) : slug.replace(/_/g, " "));
    return { u: im.u, by: im.by, lic: im.lic, p: im.p, gen: im.gen === true || undefined,
             alt: im.alt || name, alt_fr: im.alt_fr || (QLANG === "fr" ? name : undefined), subject: slug };
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
             diff: q.diff, fact: q.fact, src: q.src, deeper: q.deeper, img: (q.img && q.img.u) ? q.img : subjectPicture(q),
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

  /* ---------- a video, played inside Qpio (22 Sep 2026) ----------
     CEO: "we need to block browsing further, because we don't want youtube suggesting
     inappropriate video on the back of the video we suggested."
     A Watch door used to open youtube.com in a new tab: the whole site, its suggestions,
     its autoplay. It now plays ONE video here, in YouTube's privacy-enhanced player, and
       - rel=0: when a video ends YouTube may suggest only the same channel's videos;
       - the player is REMOVED the moment the video ends, before its end screen can offer
         anything, and our own "Watch again / Back to Qpio" takes its place;
       - no fullscreen (fs=0, and the frame is not allowed it) and no picture-in-picture,
         so the video cannot leave this sheet;
       - the referrer is the origin only (YouTube will not play without one: error 153).
     WHAT YOUTUBE'S OWN RULES DO NOT LET US REMOVE: the title, the logo and "More videos"
     inside the player stay clickable and open youtube.com. Disabling them breaks YouTube's
     developer policy (III.I, "must not remove, obscure, alter, or disable any links that
     appear in YouTube players"), which could get the app's videos blocked. That trade is
     the founder's decision, recorded in curio-hq/11-Backlog/BACKLOG.md.
     The player is driven through YouTube's message channel, NOT by loading YouTube's
     script into this page: their code runs in their frame, never in ours. */
  var YT_ORIGIN = "https://www.youtube-nocookie.com";
  function openVideo(door) {
    if (!door || !door.video || !/^[A-Za-z0-9_-]{11}$/.test(door.video)) return;
    /* the Gate 5 door instrument still counts the tap, when it is switched on */
    var D = window.QPIO_DOORS, via = D && D.href ? D.href("watch", door.slot || "lead", "https://www.youtube.com/watch?v=" + door.video) : null;
    if (via) { try { fetch(via, { mode: "no-cors", redirect: "manual", keepalive: true }); } catch (e0) {} }
    var src = YT_ORIGIN + "/embed/" + door.video + "?rel=0&fs=0&playsinline=1&iv_load_policy=3&modestbranding=1&enablejsapi=1&origin=" + encodeURIComponent(location.origin);
    var prevFocus = document.activeElement;
    var sheet = el('<div class="vsheet" role="dialog" aria-modal="true" aria-label="' + esc(t("Video")) + '">' +
      '<div class="vbox">' +
        '<div class="vhead"><span class="vtitle">' + esc(door.title || "") + '</span>' +
          '<button type="button" class="btn ghost vclose" aria-label="' + esc(t("Close the video")) + '">\u2715</button></div>' +
        '<div class="vframe"><iframe title="' + esc(door.title || t("Video")) + '" src="' + esc(src) + '" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media"></iframe></div>' +
        '<p class="mini vnote">' + esc(door.chosen ? t("Chosen for this question. It plays here, inside Qpio.") : t("It plays here, inside Qpio.")) + '</p>' +
      '</div></div>');
    var frame = sheet.querySelector("iframe"), heard = false, knocks = 0, knocker = null;
    function post(o) { try { frame.contentWindow.postMessage(JSON.stringify(o), YT_ORIGIN); } catch (e1) {} }
    function stop() { window.removeEventListener("message", onMsg); if (knocker) { clearInterval(knocker); knocker = null; } }
    function close() {
      stop(); document.removeEventListener("keydown", onKey);
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);   /* removing the frame stops the video */
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (e2) {} }
    }
    /* the end: the player goes, and nothing YouTube would have suggested is ever drawn */
    function ended() {
      stop();
      var box = sheet.querySelector(".vframe");
      box.innerHTML = '<div class="vdone"><p>' + esc(t("That was the video.")) + '</p><div class="btnrow" style="justify-content:center">' +
        '<button type="button" class="btn" data-a="again">' + esc(t("Watch again")) + '</button>' +
        '<button type="button" class="btn ghost" data-a="back">' + esc(t("Back to Qpio")) + '</button></div></div>';
      box.querySelector('[data-a="again"]').addEventListener("click", function () { close(); openVideo(door); });
      box.querySelector('[data-a="back"]').addEventListener("click", close);
      box.querySelector('[data-a="back"]').focus();
    }
    function onMsg(e) {
      if (e.origin !== YT_ORIGIN || e.source !== frame.contentWindow) return;   /* only this player may speak */
      var m; try { m = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch (x) { return; }
      if (!m || typeof m !== "object") return;
      if (!heard) { heard = true; if (knocker) { clearInterval(knocker); knocker = null; } post({ event: "command", func: "addEventListener", args: ["onStateChange"] }); }
      var state = m.event === "onStateChange" ? m.info : (m.event === "infoDelivery" && m.info ? m.info.playerState : undefined);
      if (state === 0) ended();
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    /* knock until the player answers, as YouTube's own script does */
    frame.addEventListener("load", function () {
      post({ event: "listening", id: "qpio-video", channel: "widget" });
      knocker = setInterval(function () { if (heard || ++knocks > 20) { clearInterval(knocker); knocker = null; return; } post({ event: "listening", id: "qpio-video", channel: "widget" }); }, 250);
    });
    window.addEventListener("message", onMsg);
    document.addEventListener("keydown", onKey);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
    sheet.querySelector(".vclose").addEventListener("click", close);
    document.body.appendChild(sheet);
    sheet.querySelector(".vclose").focus();
  }
  /* ONE handler for every video door on every screen, caught before any card below it
     can open anything else: a tap on a video never leaves Qpio */
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-video]") : null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    openVideo({ video: b.getAttribute("data-video"), title: b.getAttribute("data-title") || "", chosen: b.getAttribute("data-chosen") === "1", slot: b.getAttribute("data-slot") || "lead" });
  }, true);

  // ---------- QPIO Cultural Resource Network (P1 UI Integration) ----------
  function renderQuestionResourcesHtml(q) {
    /* HIDDEN, 22 Sep 2026. This box chose its three "Verified" items by category, region
       and keyword - never by the question - so the Great Pyramid showed a Tetepeku figure,
       the Rosetta Stone an essay on African women's history, the nearest star a V&A
       sculpture: 2,562 cards on 861 questions, none of them in the golden source. The CEO,
       the same day: "Why are we still see the wrong information." It returns when the
       inventory carries resources per question, the way it carries the book and the place. */
    return "";
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
    // A STORED SHAPE IS NOT A PROMISE. This read the saved object and trusted
    // it to carry a cats map. Anything that leaves a partial write behind - a
    // full disk, a quota refusal, a tab killed mid-save, an older build - then
    // threw at start-up, and the reader got a blank screen with no way back
    // except clearing their browser, which also destroys everything they saved.
    if (s && (typeof s !== "object" || !s.cats || typeof s.cats !== "object")) {
      s = { cats: {}, mastered: (s && s.mastered) || 0 };
    }
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
  // A SUB-PAGE lives inside a tab: it renders into #tabView like the tab
  // itself, and the tab bar keeps its parent highlighted. It never goes
  // through render(), which would destroy a paused quiz.
  var SUBPAGES = { privacy: "settings" };
  // How the Privacy screen was opened, so Back returns the reader to exactly
  // where they were: history.back() when the app itself opened it, Settings
  // after a deep link. pvReturn is the id of the row or link to focus again.
  var pvOpenedInApp = false, pvOpener = null, pvReturn = null;
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

  function rawHash() { return (location.hash || "").replace(/^#/, ""); }
  function currentTab() { var h = rawHash(); return (TAB_IDS.indexOf(h) !== -1 || SUBPAGES[h]) ? h : "home"; }
  function renderTab(tab) {
    var node;
    if (tab === "games") node = gamesTabView();
    else if (tab === "stats") node = statsTabView();
    else if (tab === "settings") node = settingsTabView();
    else if (tab === "privacy") node = privacyView();
    else node = homeTabView();
    tabView.innerHTML = "";
    tabView.appendChild(node);
    if (!playShown) { hushed(); window.scrollTo(0, 0); }
    // Keeping the reader's place: the Privacy screen takes focus on its title;
    // coming back from it, focus returns to the row or link that opened it.
    if (tab === "privacy") {
      var pvT = document.getElementById("pvTitle");
      if (pvT) pvT.focus();
    } else if (pvReturn) {
      var back = document.getElementById(pvReturn);
      pvReturn = null;
      if (back) { back.focus(); back.scrollIntoView({ block: "center" }); }
    }
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
    var lit = SUBPAGES[tab] || tab;   // a sub-page lights its parent tab
    tabBar.querySelectorAll(".tabbtn").forEach(function (b) {
      if (b.getAttribute("data-tab") === lit) b.setAttribute("aria-current", "page");
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
          : t("Five questions. Same for everyone, everywhere. Every answer teaches you something worth knowing.")) + '</p>' +
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
    var peekImgs = [];
    packs.forEach(function (p) {
      // The pack's own picture (chosen for the city, licence-checked, carried
      // with the app — see curio-hq/tools/bundle_flags.js). Before 21 Sep 2026
      // a card borrowed the photograph of whichever question subject the
      // registry happened to hold, and the eight newest packs had none — so
      // their cards were blank (CEO, 21 Sep 2026).
      var img = p.pic && p.pic.u ? p.pic : null;
      if (!img) {
        var slug = null;
        (p.questions || []).some(function (q) {
          var s = window.CURIO_GO && window.CURIO_GO.entityOf(q);
          if (s && IM[s]) { slug = s; return true; }
          return false;
        });
        img = slug ? IM[slug] : null;
      }
      if (img) peekImgs.push(picURL(img.u));
      var c = el(
        '<div class="dcard dcard-sm">' +
          '<div class="dcard-art">' +
            (img ? '<img src="' + esc(picURL(img.u)) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') +
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
    // issue #1: this grid was the slow one ("too slow on the before you travel
    // section", v81 review). Fetch its photographs the moment Home renders —
    // while the reader is still at the top of the screen — so the scroll down
    // lands on warm images. The preloader never double-fetches a URL.
    if (navigator.onLine !== false) {
      var WP = imageWarmer();
      if (WP) WP.start(peekImgs);
    }
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
      t("I am curious to become wise. 🧠") + ' · <a href="#" id="openComfort2">' + t("Comfort & settings") + '</a>' +
      // A privacy page nobody can find is not transparency. One link, on every
      // screen that carries the footer, to the in-app Privacy screen - where the
      // reader sees what is kept, saves or deletes it, and turns the counting off.
      ' · <a href="#privacy" id="openPrivacy2">' + t("Privacy & your data") + '</a></div>'
    );
    node.querySelector("#openComfort2").addEventListener("click", function (e) { e.preventDefault(); openSettings(); });
    // The default navigation proceeds (hash change -> route()); these only
    // record that the app opened the screen, and from where.
    node.querySelector("#openPrivacy2").addEventListener("click", function () { pvOpenedInApp = true; pvOpener = "openPrivacy2"; });
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
  /* ON. CEO, 8 Sep 2026: "I has asked you to find the material, and build that
     section there is no dependency and nothing at this stage the should prevent
     you from performing the task."
     The exercises are in src/braingym.js — five families generated from a seed
     and two written by hand — and every generated answer is solved again
     independently by curio-hq/tools/test_braingym.js before this ships. */
  var FEAT_BRAIN_GYM = !!window.CURIO_GYM;

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
  // THE FLAGS TRAVEL WITH THE APP. CEO, 21 Sep 2026: "when off line the flags
  // don't appear, the flags should be pre-loaded in the app." A picture record
  // keeps its Wikimedia Commons address — that is where its licence and credit
  // are checked, and where the credit line links — but a flag is DRAWN from the
  // copy the app carries (img/flags/, listed in src/flags.js, pre-loaded by the
  // worker on install), so it is there with no network at all. A picture not in
  // the map is served exactly as before.
  function picURL(u) {
    var F = window.CURIO_FLAGS;
    if (!u || !F) return u;
    var m = /\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/.exec(u);
    if (!m) return u;
    var local = null;
    try { local = F["File:" + decodeURIComponent(m[1])]; } catch (e) { local = null; }
    return local || u;
  }
  function pickArt(key) {
    var im = (window.CURIO_IMAGES || {})[PICK_ART[key]];
    return im ? picURL(im.u) : null;
  }
  // One selectable tile. Same role and keyboard behaviour a chip had.
  function pickTile(key, label, pressed) {
    var u = pickArt(key);
    var b = el(
      '<button class="ptile' + (u ? " has-art" : "") + '" aria-pressed="' + (pressed ? "true" : "false") + '">' +
        (u ? '<img class="ptile-art" src="' + esc(u) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') +
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
    node.insertBefore(el('<img class="mode-art" src="' + esc(picURL(im.u)) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'), node.firstChild);
    return node;
  }

  function gamesTabView() { // v23 Games: games only, no Home repeats - Fact-or-Fake · Quick-Fire · Brain Gym (coming)
    var wrap = el('<div class="grid"></div>');
    var mt = modeCardTruth(); if (mt) wrap.appendChild(dressMode(mt, "truth"));
    wrap.appendChild(quickfirePicker());
    if (FEAT_BRAIN_GYM) wrap.appendChild(brainGymCard());
    return wrap;
  }

  /* ==================== BRAIN GYM ====================
   *
   * CEO, 2026-08-11: "Once we reach the 2,000 questions we'll start the gym
   * brain section with brain teasers, logic exercises, and neurologic exercises
   * people can do to keep their brain guessing."
   *
   * It has its own small round rather than borrowing the quiz's. The quiz round
   * carries a timer, the Vault, the brain map and per-question measurement, all
   * of which are about KNOWLEDGE — how often a fact is answered correctly is a
   * meaningful number, and how often somebody solves a randomly generated
   * sequence is not. Borrowing it would have quietly filled the reader's record
   * with numbers that mean nothing.
   *
   * THE THREE THINGS WE MAY SAY, founder ruling 2026-08-11: it is fun, it is
   * challenging, and you will get better AT THESE with time. Nothing about
   * being smarter, nothing medical. The copy below keeps that promise, and the
   * test in curio-hq fails the build if any string on this screen breaks it.
   */
  /* THE BRAIN GYM SCREENS — 21 Sep 2026.
   *
   * CEO: "we need more illustration, some people are more visual"; "games
   * where we pay attention to details, find an object in an image, follow a
   * ball that changes colour"; "games that don't necessarily need an answer
   * … your non-dominant hand … bilateral coordination drills, finger
   * opposition exercises, neurobics".
   *
   * Every puzzle now carries a scene (src/braingym.js) drawn by src/gymart.js;
   * a tap puzzle's picture is its answer grid; the ball game plays a list of
   * frames (no game loop); the routines ("Moves") live beside the puzzles,
   * never among the day's five, and nothing about them is scored. The three
   * permitted claims (fun, challenging, you get better at these) are the only
   * claims on any of these screens.
   */
  function gymMotionOff() {
    return settings.motion === "reduced" || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function gymHand() { return LS.get("gym.hand", null); }
  function eligibleDrills() {
    var h = gymHand(), GYM = window.CURIO_GYM;
    return (GYM.drills || []).filter(function (d) { return !(h === "one" && d.hands === "two"); });
  }
  /* TODAY'S MOVE, THE SAME FOR EVERYONE (24 Sep 2026). Picked from every move, so a reader who
     uses one hand meets the same move as everybody else - unless that move needs two hands, when
     the next one that does not comes instead. (Picking from the shorter list gave one-hand
     readers a different move from everyone on most days.) */
  function pickDayDrill() {
    var all = window.CURIO_GYM.drills || [], ok = eligibleDrills(), k = all.length ? window.CURIO_GYM.seedForDay() % all.length : 0, j;
    for (j = 0; j < all.length; j++) if (ok.indexOf(all[(k + j) % all.length]) !== -1) return all[(k + j) % all.length];
    return ok[0];
  }

  /* ONCE A DAY (CEO, 24 Sep 2026, D-090: "One the daily gym brain exercise is done, we should not
     be able to retake the test / quiz ... we need to keep things via daily releases"). Today's
     puzzles and today's move are dealt from the day's seed, the same for everyone, and each can be
     finished once. A finished one stays finished until the local day changes - the same day the
     daily challenge counts, with Kids mode keeping its own record as it does there. A set left
     part-way is not finished and can be started again the same day. The record is one small note
     per mode, overwritten each day: the day, the puzzles' count once they are finished, and
     whether the move was. Nothing else about the gym is kept. */
  function gymDayKey() { return "gym.day" + (settings.ageMode === "kids" ? ".kids" : ""); }
  function gymToday() {
    var r = LS.get(gymDayKey(), null);
    return r && typeof r === "object" && r.d === todayKey() ? r : { d: todayKey() };
  }
  function gymPuzzlesDone() { return typeof gymToday().p === "number"; }
  function gymMoveDone() { return gymToday().m === true; }
  /* `key` and `day` are taken when the set is dealt: a set dealt before midnight and finished
     after it was yesterday's, and must not lock today's */
  function gymMarkDone(key, day, fields) {
    if (day !== todayKey()) return;
    var r = LS.get(key, null);
    if (!r || typeof r !== "object" || r.d !== day) r = { d: day };
    Object.keys(fields).forEach(function (k) { r[k] = fields[k]; });
    LS.set(key, r);
  }
  /* back to the Train tab and its Brain Gym card, drawn afresh (so a set just finished shows as
     done). Setting the hash alone does nothing when the tab is already Train. */
  function goGames() {
    closePlay();
    if (currentTab() === "games") route();
    else location.hash = "games";
  }

  /* THE GYM VAULT (CEO, 22 Sep 2026: "adding that exercise into a vault so the person can come
     back to it until they master it, they will be able to keep maximum 3, in their Gym Vault").
     Not the question vault - that one brings missed QUESTIONS back on its own schedule. This one
     holds KINDS the reader chose to work on, a puzzle family or a routine, three at most, and
     nothing is pushed out to make room: a full vault asks which one to take out. Mastery is the
     reader's call - "I have it" takes a kind out and counts it; a perfect round of a kept puzzle
     suggests it, and nothing leaves on its own. Kept on the device, like every other record here. */
  var GYM_VAULT_MAX = 3;
  function gymVault() { var v = LS.get("gym.vault", []); return Array.isArray(v) ? v.filter(function (x) { return x && x.key; }) : []; }
  function saveGymVault(v) { LS.set("gym.vault", v.slice(0, GYM_VAULT_MAX)); }
  function gymVaultHas(key) { return gymVault().some(function (x) { return x.key === key; }); }
  function gymVaultAdd(kind, key) {
    var v = gymVault();
    if (v.some(function (x) { return x.key === key; })) return "have";
    if (v.length >= GYM_VAULT_MAX) return "full";
    v.push({ kind: kind, key: key, added: todayKey(), times: 0 }); saveGymVault(v); return "added";
  }
  function gymVaultRemove(key, mastered) {
    saveGymVault(gymVault().filter(function (x) { return x.key !== key; }));
    if (mastered) LS.set("gym.mastered", (Number(LS.get("gym.mastered", 0)) || 0) + 1);
  }
  function gymKindOf(kind, key) {
    var GYM = window.CURIO_GYM, f = kind === "drill" ? (GYM.drills || []).filter(function (d) { return d.key === key; })[0] : GYM.byKey[key];
    if (!f) return null;
    return { icon: f.icon, name: (QLANG === "fr" && f.nameFr) ? f.nameFr : t(f.name) };
  }
  /* The Vault after D-090 (24 Sep 2026): a saved list, no longer a way to play again - nothing
     is replayed on demand. A kind is added from a puzzle's answer or the end of a move; when one
     of today's puzzles or today's move is a kept kind, it says so on its own screen. */
  function gymVaultNote(key) {
    return gymVaultHas(key) ? ' \u00b7 <span class="gvnote">\ud83d\udddd\ufe0f ' + t("In your Gym Vault") + '</span>' : '';
  }
  /* the button every exercise carries; afterwards() redraws whatever screen it sits on */
  function gymVaultButton(kind, key, afterwards) {
    var have = gymVaultHas(key);
    var b = el('<button class="btn ghost gvkeep"' + (have ? ' aria-pressed="true"' : '') + '>' + (have ? "\u2713 " + t("In your Gym Vault") : "\ud83d\udddd\ufe0f " + t("Keep in my Gym Vault")) + '</button>');
    b.addEventListener("click", function () {
      if (gymVaultHas(key)) return;
      var r = gymVaultAdd(kind, key);
      if (r === "full") {
        /* the screen this button sits on comes back afterwards, showing whether it was kept */
        gymVaultFull(kind, key, function () {
          if (gymVaultHas(key)) { b.setAttribute("aria-pressed", "true"); b.textContent = "\u2713 " + t("In your Gym Vault"); }
          (afterwards || goGames)();
        });
        return;
      }
      b.setAttribute("aria-pressed", "true"); b.textContent = "\u2713 " + t("In your Gym Vault");
      /* the vault shown above counts what it holds - redraw it in place, not the whole page */
      /* the vault on THIS screen: other tabs keep their screens alive but hidden, and theirs is not the one to redraw */
      var up = b.parentNode, shown = null;
      while (up && up !== document && !(shown = up.querySelector(".gvault"))) up = up.parentNode;
      if (shown && shown.parentNode) shown.parentNode.replaceChild(gymVaultCard(afterwards), shown);
    });
    return b;
  }
  /* a full vault asks, it never evicts */
  function gymVaultFull(kind, key, afterwards) {
    var incoming = gymKindOf(kind, key);
    var node = el('<div class="card"><h3 style="margin:0 0 6px">' + t("Your Gym Vault holds three.") + '</h3>' +
      '<p class="mini" style="margin:0 0 12px">' + tf("To keep {name}, take one out.", { name: incoming ? incoming.name : "" }) + '</p><div class="gvlist"></div>' +
      '<div class="btnrow" style="margin-top:12px"><button class="btn ghost" id="gvCancel">' + t("Keep them all") + '</button></div></div>');
    var list = node.querySelector(".gvlist");
    gymVault().forEach(function (item) {
      var k = gymKindOf(item.kind, item.key); if (!k) return;
      var row = el('<div class="gvrow"><span>' + k.icon + ' ' + esc(k.name) + '</span><button class="btn ghost">' + t("Take out") + '</button></div>');
      row.querySelector("button").addEventListener("click", function () {
        gymVaultRemove(item.key, false); gymVaultAdd(kind, key);
        (afterwards || goGames)();
      });
      list.appendChild(row);
    });
    node.querySelector("#gvCancel").addEventListener("click", function () { (afterwards || goGames)(); });
    render(node);
  }
  /* the vault itself, on the Brain Gym card: what is kept, and "I have it" to take one out */
  function gymVaultCard(afterwards) {
    var v = gymVault(), mastered = Number(LS.get("gym.mastered", 0)) || 0;
    var node = el('<div class="card gvault"><h3 style="margin:0 0 4px">🗝️ ' + t("Your Gym Vault") + ' <span class="mini">' + v.length + '/' + GYM_VAULT_MAX + '</span></h3>' +
      '<p class="mini" style="margin:0 0 10px">' + t("Up to three kinds you want to keep an eye on. When one comes up in today’s puzzles or move, it is marked there.") +
        (mastered ? ' · ' + tf("Mastered so far: {n}", { n: mastered }) : '') + '</p><div class="gvlist"></div></div>');
    var list = node.querySelector(".gvlist");
    v.forEach(function (item) {
      var k = gymKindOf(item.kind, item.key); if (!k) return;
      var row = el('<div class="gvrow"><span>' + k.icon + ' ' + esc(k.name) + '</span>' +
        '<span class="btnrow"><button class="btn ghost" data-a="done">' + t("I have it") + '</button></span></div>');
      row.querySelector('[data-a="done"]').addEventListener("click", function () { gymVaultRemove(item.key, true); (afterwards || goGames)(); });
      list.appendChild(row);
    });
    return node;
  }

  /* THE BRAIN GYM CARD (D-090, 24 Sep 2026). Today's puzzles and today's move, each once a day.
     What is finished says so - with the plain count of the round for the puzzles - and the card
     says when the next ones come. Nothing starts them again until the day changes: "Another
     five", "Another move" and the kind picker are gone for free readers (a paid tier would mean
     more exercises each day, still released daily - D-090). */
  function brainGymCard() {
    var rec = gymToday(), pDone = typeof rec.p === "number", mDone = rec.m === true, hand = gymHand();
    var done = [];
    if (pDone) done.push(tf("Today’s puzzles: done — {n}/{total}", { n: rec.p, total: rec.t || 5 }));
    if (mDone) done.push(t("Today’s move: done"));
    var node = el(
      '<div class="card">' +
        '<div class="emoji">🧠</div>' +
        '<h3 style="margin:8px 0 4px">' + t("Qpio Gym") + '</h3>' +
        '<p class="mini" style="margin:0 0 12px">' + t("Puzzles, not questions. Nothing to know in advance. Some are fun. Some are genuinely hard. You will get better at them with time — everyone does. What that changes anywhere else is for you to find out.") + '</p>' +
        (done.length ? '<ul class="gdone">' + done.map(function (x) { return '<li><span aria-hidden="true">✓ </span>' + esc(x) + '</li>'; }).join("") + '</ul>' +
          '<p class="mini gnext">' + (pDone && mDone ? t("Done for today. The next set arrives tomorrow.") : t("The next set arrives tomorrow.")) + '</p>' : '') +
        (pDone && mDone ? '' : '<div class="btnrow">' +
          (pDone ? '' : '<button class="btn" id="gymToday">' + t("Today’s puzzles") + '</button>') +
          (mDone ? '' : '<button class="btn' + (pDone ? '' : ' ghost') + '" id="gymMove">' + t("Today’s move") + '</button>') +
        '</div>') +
        /* the one place to change it, now that the kind picker is gone */
        (hand ? '<p class="mini" style="margin:12px 0 0"><button class="linkish" id="gymHand">' + t("Change hand") + '</button></p>' : '') +
      '</div>'
    );
    var tb = node.querySelector("#gymToday"); if (tb) tb.addEventListener("click", function () { startBrainGym(); });
    var mb = node.querySelector("#gymMove"); if (mb) mb.addEventListener("click", function () { startDrill(); });
    var hb = node.querySelector("#gymHand"); if (hb) hb.addEventListener("click", function () { askHand(goGames); });
    if (gymVault().length) node.appendChild(gymVaultCard(goGames));
    return node;
  }

  /* A gym round: today's five puzzles, one at a time, answer then explanation - the same five for
     everybody, so they can be talked about, which is the reason the exercises are seeded rather
     than random. Once a day (D-090): finished, they wait for tomorrow. */
  /* French typography, applied at render time rather than in the generator:
     a no-break space before ? ; : ! and inside « », so a phone never wraps a
     lone "?" onto the next line; and the typographic apostrophe, so a lead-in
     written with ’ ("Tu viens de t’exercer à") and the generator's text after it
     do not mix two kinds in one sentence. The generator keeps plain spaces and
     straight apostrophes because the independent solvers read its text with
     ordinary regexes. */
  function gymText(s) {
    if (QLANG !== "fr" || !s) return s;
    return String(s).replace(/ ([?;:!»])/g, " $1").replace(/« /g, "« ").replace(/(\d) (\d{3})\b/g, "$1 $2").replace(/'/g, "’");
  }

  /* arrow keys walk a grid of buttons; Enter or Space taps the one in focus */
  function rovingGrid(container, cols) {
    var cells = Array.prototype.slice.call(container.querySelectorAll("button"));
    cells.forEach(function (b, i) { b.setAttribute("tabindex", i === 0 ? "0" : "-1"); });
    container.addEventListener("keydown", function (e) {
      var i = cells.indexOf(document.activeElement); if (i < 0) return;
      var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "ArrowDown" ? i + cols : e.key === "ArrowUp" ? i - cols : -1;
      if (j < 0 || j >= cells.length) return;
      e.preventDefault(); cells[i].setAttribute("tabindex", "-1"); cells[j].setAttribute("tabindex", "0"); cells[j].focus();
    });
  }

  /* THE LIST PUZZLE'S PICTURES (CEO, 24 Sep 2026: "better to use a picture of the object because
     if someone doesn't know the word they can picture it, and place it in their home in their mind
     map"). Built in HTML: the drawings may not carry pictures. The word is always written under
     its picture. They are generated, so they are marked: a small ◆ on each word line and one line
     under each group - which a screen reader hears once, before the words, rather than on every
     tile. Which pictures a screen may show is decided in the gym module (studyPictures while
     studying, questionPictures when asked) and nowhere else. If a picture cannot load, its word
     stands alone. */
  function memLegend(where) {
    return where === "sr" ? '<p class="sr-only mlegend">' + esc(t("Illustrations generated by AI")) + '</p>'
                          : '<p class="mlegend" aria-hidden="true">◆ ' + esc(t("Illustrations generated by AI")) + '</p>';
  }
  function memWatch(node) {
    Array.prototype.forEach.call(node.querySelectorAll(".mpic img"), function (img) {
      var gone = false;
      var fail = function () {
        if (gone) return; gone = true;
        var tile = img.closest(".mtile, .mopt, .manchor");
        if (tile) tile.classList.add("noimg");
        /* on the study screen the word line was silent (the picture carried the word); now it speaks */
        var w = tile && tile.classList.contains("mtile") ? tile.querySelector(".mword") : null;
        if (w) w.removeAttribute("aria-hidden");
        if (img.parentNode) img.parentNode.removeChild(img);
        /* no picture left, no line about pictures */
        if (!node.querySelector(".mpic img")) Array.prototype.forEach.call(node.querySelectorAll(".mlegend"), function (x) { x.hidden = true; });
      };
      img.addEventListener("error", fail);
      if (img.complete && img.getAttribute("src") && !img.naturalWidth) fail();
    });
  }

  function startBrainGym() {
    var GYM = window.CURIO_GYM, ART = window.CURIO_GYM_ART;
    if (gymPuzzlesDone()) { goGames(); return; }
    var seed = GYM.seedForDay(), dayRec = gymDayKey(), day = todayKey();
    var motionOff = gymMotionOff() || settings.readAloud;
    var set = GYM.makeSet(seed, 5, QLANG, { exclude: motionOff ? ["shells"] : [] });
    var idx = 0, right = 0, mathsSeen = 0;

    /* at question time a hidden list stays hidden - the rule lives in the gym module */
    function labelsOf(p) { return GYM.questionLabels ? GYM.questionLabels(p) : {}; }
    function picture(p, o) {
      if (!p.scene || !ART) return "";
      return '<div class="gart" role="img" aria-label="' + esc(gymText(p.sceneText || "")) + '">' + ART.draw(p.scene, o || { motion: !motionOff }, labelsOf(p)) + '</div>';
    }

    function step() {
      var p = set[idx];
      /* A working-memory puzzle has to take the list away, or it is a reading
         test. Study first, then the question, and the list does not come back. */
      if (p.hide && !p._studied) { study(p); return; }
      ask(p);
    }

    function study(p) {
      var isChange = p.scene && p.scene.kind === "change";
      var pics = GYM.studyPictures ? GYM.studyPictures(p) : [];
      var pic = !ART || !p.scene ? "" :
        isChange ? '<div class="gart" role="img" aria-label="' + esc(gymText(p.sceneText || "")) + '">' + ART.draw(p.scene, { which: "before" }, {}) + '</div>' :
        pics.length ? '<div class="mwrap">' + memLegend("sr") + '<ol class="mgrid" role="list">' + pics.map(function (x) {
            return '<li class="mtile"><span class="mpic"><img src="' + esc(x.src) + '" alt="' + esc(x.word) + '" decoding="async"></span>' +
              '<span class="mword" aria-hidden="true">' + x.n + ' · ' + esc(x.word) + ' <span class="mai">◆</span></span></li>';
          }).join("") + '</ol>' + memLegend() + '</div>' :
        p.scene.kind === "cards" ? '<div class="gart" aria-hidden="true">' + ART.draw(p.scene, {}, { words: (p.sceneLabels || {}).words }) + '</div>' : picture(p);
      var node = el(
        '<div class="card">' +
          '<div class="mini">' + t("Qpio Gym") + ' · ' + (idx + 1) + '/' + set.length + gymVaultNote(p.family) + '</div>' +
          '<h3 style="margin:10px 0 6px">' + t(isChange ? "Look carefully" : "Remember these") + '</h3>' + pic +
          /* the words are on the tiles now; read-aloud still speaks the list */
          (p.show && !pics.length ? '<div class="qtext" style="letter-spacing:.04em">' + fmt(gymText(p.show)) + '</div>' : '') +
          '<p class="mini" style="margin:14px 0 0">' + (isChange ? t("Take as long as you like.") : t("Take as long as you like. The list will not come back.")) + '</p>' +
          /* one way to hold the list, suggested on every list puzzle */
          (p.sceneLabels && p.sceneLabels.words ? (function () {
            var w = GYM.holdWayFor(p);
            var L = QLANG === "fr" ? "fr" : "en";
            return '<p class="holdway"><b>' + esc(t("One way people do this:")) + '</b> ' + esc(gymText(w.tip[L])) +
              ' <button class="linkish" id="gymWays">' + t("More ways") + '</button></p>';
          })() : '') +
          '<div class="btnrow" style="margin-top:14px"><button class="btn" id="gymReady">' + t("Ready") + '</button></div>' +
        '</div>');
      memWatch(node);
      node.querySelector("#gymReady").addEventListener("click", function () { p._studied = true; step(); });
      var mw = node.querySelector("#gymWays");
      if (mw) mw.addEventListener("click", function () { holdWaysPage(function () { render(node); }); });
      render(node);
      if (canSpeak() && p.show) speak(p.show);
    }

    function ask(p) {
      var fam = GYM.byKey[p.family], isTap = p.input === "tap", isTwin = p.family === "twin", isShells = p.family === "shells";
      /* a list puzzle asks with pictures: the four answers, and the word the question names -
         only what questionPictures allows, never the rest of the list */
      var qpics = GYM.questionPictures ? GYM.questionPictures(p) : [], isPics = qpics.length > 0;
      var anchor = qpics.filter(function (x) { return x.anchor; })[0];
      var pic = "";
      if (isTap) pic = "";                                   /* the tap grid IS the picture */
      else if (isShells) pic = motionOff
        ? '<p class="mini" style="margin:8px 0 0">' + t("Without the animation this becomes a step-by-step puzzle: here is each move.") + '</p>' + picture(p, { motion: false })
        : picture(p, { motion: true });
      else if (p.icon) pic = '<div class="emoji" aria-hidden="true">' + p.icon + '</div>';
      else pic = picture(p);
      var prompt = '<div class="qtext" style="margin-top:10px">' + fmt(gymText(p.prompt)) + '</div>';
      var html =
        '<div class="card">' +
          '<div class="mini">' + (fam ? fam.icon + ' ' + esc((QLANG === "fr" && fam.nameFr) ? fam.nameFr : t(fam.name)) : t("Qpio Gym")) +
            ' · ' + (idx + 1) + '/' + set.length + gymVaultNote(p.family) + '</div>' +
          (isTap ? '' : pic) +
          /* "What came right after X?": X's picture beside the question (the question already says its word) */
          (anchor ? '<div class="mq">' + prompt + '<span class="manchor" aria-hidden="true"><span class="mpic"><img src="' + esc(anchor.src) + '" alt="" decoding="async"></span>' +
            '<span class="mword">' + esc(anchor.word) + ' <span class="mai">◆</span></span></span></div>' : prompt) +
          (p.show && !p.hide && !isTwin ? '<div class="qtext" style="opacity:.9;letter-spacing:.06em;margin-top:6px">' + fmt(gymText(p.show)) + '</div>' : '') +
          (isShells && p.sceneText ? '<p class="sr-only">' + esc(gymText(p.sceneText)) + '</p>' : '') +
          (isPics ? memLegend("sr") : '') +
          '<div class="opts' + (isTap ? ' gcells' : isTwin ? ' gtwin' : isPics ? ' mopts' : '') + '" id="gymOpts"' + (isTap ? ' style="grid-template-columns:repeat(' + p.scene.cols + ',1fr)"' : '') + '></div>' +
          (isPics ? memLegend() : '') +
          '<div id="gymAfter"></div>' +
        '</div>';
      var node = el(html);
      var opts = node.querySelector("#gymOpts");
      if (isTap && ART) {
        var cells = p.scene.kind === "grid" ? p.scene.tiles : p.scene.after;
        cells.forEach(function (c, i) {
          var id = p.options[i];
          var b = el('<button class="opt gcell" aria-label="' + esc(GYM.cellLabel(p, i, QLANG)) + '"></button>');
          b.setAttribute("data-value", id);
          b.innerHTML = p.scene.kind === "grid" ? ART.tile(c) : ART.objectTile(c);
          b.addEventListener("click", function () { answer(node, p, id); });
          opts.appendChild(b);
        });
        rovingGrid(opts, p.scene.cols);
      } else {
        p.options.forEach(function (o) {
          var b = el('<button class="opt"></button>');
          b.setAttribute("data-value", o);
          var mp = isPics ? qpics.filter(function (x) { return !x.anchor && x.word === o; })[0] : null;
          if (isTwin && ART && /^[cbygv]{9}$/.test(o)) { b.className = "opt gtile"; b.innerHTML = ART.tileGrid(o); b.setAttribute("aria-label", GYM.twinLabel(o, QLANG)); }
          /* a picture and its word; the button's name is the word */
          else if (mp) { b.className = "opt mopt"; b.innerHTML = '<span class="mpic"><img src="' + esc(mp.src) + '" alt="" decoding="async"></span><span class="mword">' + esc(o) + ' <span class="mai" aria-hidden="true">◆</span></span>'; }
          else b.textContent = gymText(o);
          b.addEventListener("click", function () { answer(node, p, o); });
          opts.appendChild(b);
        });
      }
      if (isPics) memWatch(node);
      render(node);
      /* A tap puzzle asks the reader to FIND something in the picture, so its scene
         description IS the answer; speaking it would hand the solution to anyone who
         turned read-aloud on for comfort. Those readers reach the picture through the
         per-cell labels instead. Every other family still hears its description. */
      if (canSpeak()) speak(p.prompt + (p.sceneText && p.input !== "tap" && p.family !== "shells" ? ". " + p.sceneText : ""));
      if (isShells && !motionOff) playShells(node, p, true);
    }

    /* the ball game: frame 0 shows the ring for a second, then the swaps play
       one after another; the options appear when the last frame lands. One
       "Watch again". A tick that arrives far too late (the tab was hidden)
       jumps to the end rather than playing to an empty room. */
    function playShells(node, p, offerAgain) {
      var svg = node.querySelector(".gart svg"), opts = node.querySelector("#gymOpts"), after = node.querySelector("#gymAfter");
      if (!svg) return;
      opts.classList.add("hidden");
      var frames = p.scene.frames, ms = p.scene.ms + p.scene.gap, k = 0, due = Date.now();
      var apply = function (f, i) {
        for (var b = 0; b < 3; b++) {
          var g = svg.querySelector("#b" + b), c = svg.querySelector("#c" + b), m = svg.querySelector("#m" + b);
          if (g) g.setAttribute("transform", "translate(" + ((f.slots[b] - b) * 100) + " 0)");
          if (c && f.recoloured) c.setAttribute("fill", ART.PAL[1]);
          if (m && f.recoloured) { m.setAttribute("fill", "var(--bg2)"); m.setAttribute("stroke", "none"); m.setAttribute("r", "5"); }
        }
        var ring = svg.querySelector("#ring"); if (ring && i >= 1) ring.parentNode.removeChild(ring);
      };
      var finish = function () {
        opts.classList.remove("hidden");
        if (offerAgain) {
          var b = el('<button class="btn ghost" id="gymWatch" style="margin-top:8px">' + t("Watch again") + '</button>');
          b.addEventListener("click", function () {
            b.parentNode.removeChild(b);
            var art = node.querySelector(".gart"); art.innerHTML = ART.draw(p.scene, { motion: true }, {});
            playShells(node, p, false);
          });
          after.appendChild(b);
        }
      };
      apply(frames[0], 0);
      var tick = function () {
        if (!svg.isConnected) return;
        k++;
        if (Date.now() - due > 2 * ms) k = frames.length - 1;
        apply(frames[k], k);
        if (k >= frames.length - 1) { finish(); return; }
        due = Date.now() + ms; setTimeout(tick, ms);
      };
      due = Date.now() + 1000; setTimeout(tick, 1000);
    }

    function answer(node, p, chosen) {
      var correct = chosen === p.answer;
      if (correct) right++;
      var fam = GYM.byKey[p.family];
      if (fam && fam.maths) mathsSeen++;
      Array.prototype.forEach.call(node.querySelectorAll(".opt"), function (b) {
        b.disabled = true;
        var v = b.getAttribute("data-value");
        /* ✓ and ✗ on a picture answer too, not only its colour */
        var mark = function (m) { if (b.classList.contains("mopt")) b.insertAdjacentHTML("beforeend", '<span class="mmark" aria-hidden="true">' + m + '</span>'); };
        if (v === p.answer) { b.classList.add("good"); mark("✓"); if (p.input === "tap") b.classList.add("gpulse"); }
        else if (v === chosen) {
          /* the honest "I lost it" in the ball game is not a wrong guess: grey, never red */
          if (p.lostOption && v === p.lostOption) { b.classList.add("lost"); return; }
          b.classList.add("bad"); mark("✗");
          /* the twin puzzle shows WHICH tile of the wrong pick differs */
          if (p.family === "twin" && ART && /^[cbygv]{9}$/.test(v)) {
            var d = -1, n = 0, i; for (i = 0; i < 9; i++) if (v.charAt(i) !== p.answer.charAt(i)) { d = i; n++; }
            b.innerHTML = ART.tileGrid(v, { mark: n === 1 ? [d] : [] });
          }
        }
      });
      var w = node.querySelector("#gymWatch"); if (w) w.parentNode.removeChild(w);
      if (p.family === "shells") {
        var svg = node.querySelector(".gart svg");
        if (svg && svg.querySelector("#b0")) svg.insertAdjacentHTML("beforeend", '<circle cx="' + (60 + (Number(p.answer) - 1) * 100) + '" cy="56" r="29" fill="none" stroke="var(--good)" stroke-width="3"/>');
      }
      /* the last answer finishes today's puzzles: from here they wait for tomorrow (D-090) */
      if (idx + 1 >= set.length) gymMarkDone(dayRec, day, { p: right, t: set.length });
      var after = node.querySelector("#gymAfter");
      after.appendChild(el(
        '<div class="reveal" style="margin-top:12px">' +
          '<div>' + fmt(gymText(p.explain)) + '</div>' +
          (fam ? '<div class="mini" style="margin-top:8px;opacity:.75">' + t("Here you practise") + ' ' + fmt(gymText(p.trains)) + '.</div>' : '') +
        '</div>'));
      var row = el('<div class="btnrow" style="margin-top:14px"></div>');
      var b = el('<button class="btn"></button>');
      b.textContent = idx + 1 < set.length ? t("Next") : t("Finish");
      b.addEventListener("click", function () { idx++; idx < set.length ? step() : done(); });
      row.appendChild(b);
      /* the one place a puzzle's kind can be kept, now that the kind picker is gone */
      if (fam && !gymVaultHas(p.family)) row.appendChild(gymVaultButton("puzzle", p.family, function () { render(node); }));
      after.appendChild(row);
    }

    function done() {
      /* WHAT HAPPENED, THEN WHAT COMES NEXT (messaging.md, 24 Sep 2026: describe the round, never
         the person). The count is a plain count of five puzzles; one main button - today's move
         if it is still to do, otherwise Home - and Home beside it. */
      var moveLeft = !gymMoveDone();
      var node = el(
        '<div class="card result">' +
          '<div class="scorebig">' + right + '/' + set.length + '</div>' +
          '<h2>' + t("Five puzzles done.") + '</h2>' +
          '<div class="sub">' + (moveLeft ? t("The next set arrives tomorrow.") : t("Done for today. The next set arrives tomorrow.")) + '</div>' +
          '<div class="btnrow" style="justify-content:center;margin-top:14px">' +
            (moveLeft ? '<button class="btn" id="gymDrill">' + t("Today’s move") + '</button>' : '') +
            '<button class="btn' + (moveLeft ? ' ghost' : '') + '" id="gymHome">🏠 ' + t("Home") + '</button>' +
          '</div>' +
          (mathsSeen >= 3 ? '<div class="btnrow" style="justify-content:center;margin-top:10px"><button class="btn ghost" id="gymMaths">' + t("Want the facts behind the numbers? Mathematics quiz") + '</button></div>' : '') +
        '</div>');
      var md = node.querySelector("#gymDrill");
      if (md) md.addEventListener("click", function () { startDrill(); });
      node.querySelector("#gymHome").addEventListener("click", goHome);
      /* the Train tab, where the Mathematics quiz is (this used to open a tab that does not exist) */
      var m = node.querySelector("#gymMaths");
      if (m) m.addEventListener("click", function () { LS.set("lastCat", "Science"); goGames(); });
      render(node);
    }

    step();
  }

  /* WAYS TO HOLD A LIST - the page (CEO, 22 Sep 2026: "add techniques to memorize list of
     words, or perform those exercises"). Each way says what to do and where it comes from. It
     no longer starts a round of its own (D-090): the next list in today's puzzles is the place
     to try one. */
  function holdWaysPage(back) {
    var GYM = window.CURIO_GYM, L = QLANG === "fr" ? "fr" : "en";
    var wrap = el('<div class="grid"></div>');
    wrap.appendChild(el('<div class="card"><h3 style="margin:0 0 4px">' + t("Ways to hold a list") + '</h3>' +
      '<p class="mini" style="margin:0">' + t("Four ways to hold a short list. Try one the next time a list comes up.") + '</p></div>'));
    GYM.holdWays.forEach(function (w) {
      wrap.appendChild(el('<div class="card holdwaycard">' +
        '<h3 style="margin:0 0 6px">' + esc(w.name[L]) + '</h3>' +
        '<p style="margin:0 0 8px">' + esc(gymText(w.how[L])) + '</p>' +
        '<p class="mini" style="margin:0"><b>' + t("Its history") + '</b> · ' + esc(gymText(w.origin[L])) + '</p></div>'));
    });
    var b = el('<div class="card"><div class="btnrow"><button class="btn ghost">← ' + t("Back") + '</button></div></div>');
    b.querySelector("button").addEventListener("click", function () { (back || goGames)(); });
    wrap.appendChild(b);
    render(wrap);
  }

  /* ---------------------------------------------------------- the routines */
  function askHand(then) {
    var node = el(
      '<div class="card">' +
        '<h3 style="margin:0 0 6px">' + t("Which hand do you write with?") + '</h3>' +
        '<p class="mini" style="margin:0 0 12px">' + t("So the moves know which is your other hand. Kept on this device only.") + '</p>' +
        '<div class="btnrow">' +
          '<button class="btn" data-h="left">' + t("Left") + '</button>' +
          '<button class="btn" data-h="right">' + t("Right") + '</button>' +
          '<button class="btn ghost" data-h="one">' + t("I use one hand") + '</button>' +
        '</div>' +
      '</div>');
    Array.prototype.forEach.call(node.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () { LS.set("gym.hand", b.getAttribute("data-h")); then(); });
    });
    render(node);
  }

  /* today's move: once a day, like today's puzzles (D-090). The hand is asked first, so the move
     is picked knowing it - a two-hand move is never dealt to a reader who uses one hand. */
  function startDrill() {
    var GYM = window.CURIO_GYM;
    if (gymMoveDone()) { goGames(); return; }
    if (!gymHand()) { askHand(startDrill); return; }
    var d = GYM.makeDrill(pickDayDrill().key, GYM.seedForDay(), QLANG);
    if (d) runDrill(d);
  }

  /* A routine: timed steps, a picture for each, Next always works, Done always
     visible. Nothing is written anywhere but the day's "move done" (D-090). The
     interval stops itself when the card leaves the page, so render() needs no
     teardown. */
  function runDrill(d) {
    var ART = window.CURIO_GYM_ART, GYM = window.CURIO_GYM;
    var i = 0, elapsed = 0, paused = false, last = Date.now(), timer = null, frameTimer = null, motion = !gymMotionOff();
    var dayRec = gymDayKey(), day = todayKey();
    /* PACE (CEO, 22 Sep 2026: "an option to slow down, several speeds so the user can follow").
       Every moving cue - the dot along its path, the two dots at once, the finger beat, the
       lit dot - runs at the chosen pace. The step's own clock is unchanged, so a slower pace
       means fewer laps, not a longer routine. Remembered between visits; changeable mid-step
       without restarting it. With motion off there is nothing moving, so no pace to choose. */
    var PACES = [[1, "Normal"], [0.75, "Slower"], [0.5, "Slow"], [0.3, "Very slow"]];
    var speed = Number(settings.drillSpeed) || 1;
    if (!PACES.some(function (p) { return p[0] === speed; })) speed = 1;
    var moving = motion && d.steps.some(function (s) { return s.scene && /^(path|path2|hand|dotgrid)$/.test(s.scene.kind); });
    /* A PAUSE TO CHANGE HANDS (CEO, 23 Sep 2026: "transitions before switching hands or going
       from one hand to 2"). A step that changes which hands do the work carries a `before`:
       what changes, a picture of it, and a 3-2-1 that stretches with the pace. The step's
       own clock waits for it. "Start now" skips it; Pause holds it. */
    var trans = null, readyAt = -1;   /* the step whose transition has been shown; the data is never marked */
    /* a step's own clip that could not load, so its icon shows instead for the rest of the move */
    var failedDemo = {};
    /* every photo a pause will show is fetched now, so it is there the moment the pause starts */
    d.steps.forEach(function (st) { if (st.before && st.before.photo) { var im = new Image(); im.decoding = "async"; im.src = st.before.photo; } });
    var node = el(
      '<div class="card">' +
        '<div class="mini">' + esc(d.title) + ' · ' + t("Moves — nothing to answer") + gymVaultNote(d.family) + '</div>' +
        '<div class="gdemo" id="drillDemo" hidden></div>' +
        '<div class="gart" id="drillArt" aria-hidden="true" style="touch-action:none"></div>' +
        (moving ? '<div class="dpace" role="group" aria-label="' + esc(t("Pace")) + '"><span class="mini">' + t("Pace") + '</span>' +
          PACES.map(function (p) { return '<button class="btn ghost dpace-b" data-pace="' + p[0] + '" aria-pressed="' + (p[0] === speed) + '">' + t(p[1]) + '</button>'; }).join("") +
        '</div>' : '') +
        '<div class="qtext" id="drillText" aria-live="polite" style="margin-top:10px"></div>' +
        '<div class="gbar" style="margin-top:12px"><i id="drillBar" style="width:0"></i></div>' +
        '<div class="mini" id="drillMeta" style="margin-top:6px"></div>' +
        '<p class="mini" style="margin:8px 0 0;opacity:.75">' + esc(gymText(d.safety)) + '</p>' +
        '<div class="btnrow" style="margin-top:14px">' +
          '<button class="btn ghost" id="drillNext">' + t("Next step") + '</button>' +
          '<button class="btn ghost" id="drillPause">' + t("Pause") + '</button>' +
          '<button class="btn" id="drillDone">' + t("Done") + '</button>' +
        '</div>' +
      '</div>');
    var textNode = node.querySelector("#drillText"), artNode = node.querySelector("#drillArt"), bar = node.querySelector("#drillBar"), meta = node.querySelector("#drillMeta"), nextBtn = node.querySelector("#drillNext"), demoNode = node.querySelector("#drillDemo");
    /* THE DEMO (CEO, 23 Sep 2026: "when presenting the exercise a short video will be useful
       remember some people are more visual like me"). A few seconds of the move, at the reader's
       pace: on the routine's first screen, and on any step that carries its own clip (an item of
       "A small thing, differently", 24 Sep 2026). Generated by AI, so marked as such on the
       picture, under it and for a screen reader, like every generated picture in Qpio. Fetched
       only when shown; with motion off it waits for a tap. Tapping the clip pauses it and
       tapping again plays it. `onFail` runs if the clip cannot load (the worker keeps no videos,
       so offline it never can): the step then shows its own icon. */
    function showDemo(demo, onFail) {
      var v = demoNode.querySelector("video");
      if (!demo) { if (v) v.pause(); demoNode.innerHTML = ""; demoNode.hidden = true; demoNode.removeAttribute("data-src"); return; }
      if (demoNode.getAttribute("data-src") === demo.src) { if (v) v.playbackRate = speed; return; }
      if (v) v.pause();
      demoNode.setAttribute("data-src", demo.src);
      demoNode.hidden = false;
      /* a still where no generated video showed the move truly (thumb to each finger):
         the same mark, the same sentence, the same words for a screen reader */
      if (demo.photo) {
        demoNode.innerHTML =
          '<div class="gdemo-box"><img src="' + esc(demo.src) + '" alt="' + esc(t("AI-generated illustration") + ". " + demo.alt) + '" decoding="async">' +
          '<span class="qart-ai" aria-hidden="true">◆ ' + esc(t("AI generated")) + '</span></div>' +
          (demo.note ? '<div class="gdemo-note">' + esc(gymText(demo.note)) + '</div>' : "") +
          '<div class="qart-credit qart-credit-ai">' + esc(t("This image was generated by AI to show the pose. It does not show a real person.")) + '</div>';
        return;
      }
      demoNode.innerHTML =
        '<div class="gdemo-box">' +
          '<video src="' + esc(demo.src) + '" poster="' + esc(demo.poster || "") + '" muted loop playsinline tabindex="0" preload="' + (motion ? "auto" : "none") + '" aria-label="' + esc(t("AI-generated video") + ". " + demo.alt) + '"></video>' +
          '<span class="qart-ai" aria-hidden="true">◆ ' + esc(t("AI-generated video")) + '</span>' +
          (motion ? "" : '<button class="gdemo-play" aria-label="' + esc(t("Play the demo")) + '">▶</button>') +
        '</div>' +
        (demo.note ? '<div class="gdemo-note">' + esc(gymText(demo.note)) + '</div>' : "") +
        '<div class="qart-credit qart-credit-ai">' + esc(t("This video was generated by AI to show the move. It does not show a real person.")) + '</div>';
      v = demoNode.querySelector("video"); v.muted = true;
      var go = function () { v.playbackRate = speed; var p = v.play(); if (p && p.catch) p.catch(function () {}); };
      if (motion) go();
      var pb = demoNode.querySelector(".gdemo-play");
      if (pb) pb.addEventListener("click", function () { pb.parentNode.removeChild(pb); go(); });
      var toggle = function () { if (demoNode.querySelector(".gdemo-play")) return; if (v.paused) go(); else v.pause(); };
      v.addEventListener("click", toggle);
      v.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
      if (onFail) v.addEventListener("error", function () { if (demoNode.getAttribute("data-src") === demo.src) onFail(); });
    }
    function stopFrames() { if (frameTimer) { clearInterval(frameTimer); frameTimer = null; } }
    function handFrames(scene) {
      /* each beat redraws the hand with that finger bent and the thumb on it - the touch itself,
         not only a light (v103; the panel: "the thumb never moves") */
      var order = scene.order, orderR = scene.orderRight || null, k = 0;
      var light = function () {
        var f = order[k % order.length], fr2 = orderR ? orderR[k % orderR.length] : f;
        artNode.innerHTML = ART.draw({ kind: "hand", side: scene.side, lit: f, litRight: fr2 }, { motion: true }, {});
        k++;
      };
      light(); frameTimer = setInterval(light, Math.round((scene.beat || 1) * 1000 / speed));
    }
    function dotFrames(scene) {
      var k = 0;
      var light = function () { var lit = (k * 4 + 1) % 9, j; for (j = 0; j < 9; j++) { var dd = artNode.querySelector("#d" + j); if (dd) dd.setAttribute("fill", j === lit ? "var(--brand)" : "var(--card2)"); } k++; };
      light(); frameTimer = setInterval(light, Math.round((scene.beat || 1.5) * 1000 / speed));
    }
    /* the picture and its moving cue, redrawable on its own when the pace changes */
    function drawStep() {
      var s = d.steps[i]; stopFrames();
      var sc = s.scene && s.scene.kind === "hand" && !motion ? { kind: "hand", side: s.scene.side, lit: s.scene.order[0], litRight: (s.scene.orderRight || s.scene.order)[0] } : s.scene;
      artNode.innerHTML = sc && ART ? ART.draw(sc, { motion: motion, speed: speed }, {}) : "";
      if (s.scene && s.scene.kind === "hand" && motion) handFrames(s.scene);
      if (s.scene && s.scene.kind === "dotgrid" && motion) dotFrames(s.scene);
    }
    function startTransition(s) {
      stopFrames();
      var per = Math.min(2.5, 1 / speed);   /* seconds per count: 1 s at normal pace, up to 2.5 s at the slowest */
      /* five counts, not three: time to put the phone down (CEO, 23 Sep 2026: "give people the
         time to put down their phone to do the exercise") */
      trans = { step: s, t: 0, per: per, count: 5, lead: 1 };
      var b = s.before;
      /* what comes next in large words, then what to do, then her photo in that pose - marked
         as generated, on the picture and in a sentence under it, like every generated picture
         in Qpio (the claims standard, section K: never presented as a photograph) */
      textNode.innerHTML = '<span class="dtrans-label">' + esc(gymText(b.label)) + '</span>' + esc(gymText(b.text));
      artNode.innerHTML =
        (b.photo ? '<div class="gdemo-box dtrans-photo"><img src="' + esc(b.photo) + '" alt="" decoding="async"><span class="qart-ai">◆ ' + esc(t("AI generated")) + '</span></div>' +
                   '<div class="qart-credit qart-credit-ai dtrans-credit">' + esc(t("This image was generated by AI to show the pose. It does not show a real person.")) + '</div>'
                 : (b.scene && ART ? ART.draw(b.scene, { motion: false }, {}) : "")) +
        '<div class="dcount" aria-hidden="true"></div>';
      meta.textContent = t("Get ready") + " · " + tf("step {a} of {b}", { a: i + 1, b: d.steps.length });
      bar.style.width = "0%";
      nextBtn.textContent = t("Start now");
      leadButton();
      paintCount();
      if (canSpeak()) speak(b.label + ". " + b.text);
    }
    function paintCount() {
      var c = artNode.querySelector(".dcount"); if (!c || !trans) return;
      var left = trans.count - Math.floor(Math.max(0, trans.t - trans.lead) / trans.per);
      c.textContent = trans.t < trans.lead ? "" : String(Math.max(1, left));
    }
    function endTransition() {
      if (!trans) return;
      readyAt = i; trans = null;
      nextBtn.textContent = t("Next step");
      show();
    }
    function show() {
      var s = d.steps[i];
      /* the step's own clip, or the routine's on its first screen; while a step's own clip shows,
         its icon steps aside - and comes back if the clip cannot load */
      var own = s.demo && !failedDemo[s.demo.src] ? s.demo : null;
      showDemo(own || (s.id === "intro" && d.demo), own ? function () { failedDemo[own.src] = true; showDemo(null); artNode.hidden = false; } : null);
      artNode.hidden = !!own;
      if (s.before && readyAt !== i) { startTransition(s); return; }
      elapsed = 0; last = Date.now();
      textNode.textContent = gymText(s.text) + (s.scene && !motion && (s.scene.kind === "path" || s.scene.kind === "dotgrid") ? " " + t("Follow the numbers.") : "") + (s.still && !motion ? " " + gymText(s.still) : "");
      drawStep();
      if (canSpeak()) speak(s.text);
      paint();
      leadButton();
    }
    /* A DEMO WAITS FOR THE READER (the panel: at Very slow the clip never played through before
       the first screen moved on). While the move is being shown, the clock does not run. */
    function holding() { return i === 0 && d.steps[0].id === "intro" && !!(d.demo || d.steps[0].scene); }
    /* the obvious tap moves on, never out: while the first screen waits or a pause counts down,
       Next step is the filled button and Done steps back (the panel, 23 Sep 2026: a reader
       tapping the filled button to start was ending the routine) */
    function leadButton() {
      var lead = !!trans || holding(), done = node.querySelector("#drillDone");
      nextBtn.className = lead ? "btn" : "btn ghost"; if (done) done.className = lead ? "btn ghost" : "btn";
    }
    function paint() {
      var s = d.steps[i];
      if (holding()) { meta.textContent = tf("step {a} of {b}", { a: i + 1, b: d.steps.length }) + " · " + t("tap Next step when you like"); bar.style.width = "0%"; return; }
      meta.textContent = tf("step {a} of {b}", { a: i + 1, b: d.steps.length }) + " · " + Math.max(0, Math.ceil(s.seconds - elapsed)) + " s";
      bar.style.width = Math.min(100, 100 * elapsed / s.seconds) + "%";
    }
    function next() { if (trans) { endTransition(); return; } if (i + 1 < d.steps.length) { i++; show(); } else end(true); }
    function onVis() { if (document.hidden && !paused) { paused = true; node.querySelector("#drillPause").textContent = t("Resume"); } }
    /* THE END OF A MOVE (messaging.md, 24 Sep 2026). Reaching the last step finishes today's move:
       "Move done." and what it practised, nothing counted. Done tapped before the last step only
       stops it - today's move is still there to finish, and the Brain Gym card agrees. Either
       way, one main button for what comes next, and Home. */
    function end(complete) {
      clearInterval(timer); stopFrames(); showDemo(null); document.removeEventListener("visibilitychange", onVis);
      if (complete) gymMarkDone(dayRec, day, { m: true });
      var puzzlesLeft = !gymPuzzlesDone();
      var res = el(
        '<div class="card result">' +
          (complete
            ? '<h2>' + t("Move done.") + '</h2>' +
              '<div class="sub">' + t("You just practised") + ' ' + esc(gymText(d.trains)) + '.</div>' +
              '<p class="mini" style="margin:10px 0 0">' + (puzzlesLeft ? t("The next set arrives tomorrow.") : t("Done for today. The next set arrives tomorrow.")) + '</p>'
            : '<h2>' + t("Stopped here.") + '</h2>' +
              '<div class="sub">' + t("Today’s move is still here if you want to finish it.") + '</div>') +
          '<div class="btnrow" style="justify-content:center;margin-top:14px">' +
            (!complete ? '<button class="btn" id="drillAgain">' + t("Today’s move") + '</button>'
              : puzzlesLeft ? '<button class="btn" id="drillPuzzles">' + t("Today’s puzzles") + '</button>' : '') +
            '<button class="btn' + (complete && !puzzlesLeft ? '' : ' ghost') + '" id="drillHome">🏠 ' + t("Home") + '</button>' +
          '</div>' +
          '<div class="btnrow gvend" style="justify-content:center;margin-top:10px"></div>' +
        '</div>');
      var gvd = res.querySelector(".gvend");
      if (gymVaultHas(d.family)) {
        var gotD = el('<button class="btn ghost">' + t("I have it") + '</button>');
        gotD.addEventListener("click", function () { gymVaultRemove(d.family, true); gotD.disabled = true; gotD.textContent = "✓ " + t("Taken out"); });
        gvd.appendChild(gotD);
      } else gvd.appendChild(gymVaultButton("drill", d.family, function () { render(res); }));
      var ag = res.querySelector("#drillAgain"); if (ag) ag.addEventListener("click", function () { startDrill(); });
      var pz = res.querySelector("#drillPuzzles"); if (pz) pz.addEventListener("click", function () { startBrainGym(); });
      res.querySelector("#drillHome").addEventListener("click", goHome);
      render(res);
    }
    node.querySelector("#drillNext").addEventListener("click", next);
    Array.prototype.forEach.call(node.querySelectorAll(".dpace-b"), function (b) {
      b.addEventListener("click", function () {
        speed = Number(b.getAttribute("data-pace")) || 1;
        settings.drillSpeed = speed; saveSettings();
        Array.prototype.forEach.call(node.querySelectorAll(".dpace-b"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var dv = demoNode.querySelector("video"); if (dv) dv.playbackRate = speed;
        if (trans) { trans.per = Math.min(2.5, 1 / speed); paintCount(); } else drawStep();   /* the same step, the same clock, the new pace */
      });
    });
    node.querySelector("#drillPause").addEventListener("click", function () {
      paused = !paused; last = Date.now(); this.textContent = paused ? t("Resume") : t("Pause");
      var dv = demoNode.querySelector("video"); if (dv && !demoNode.querySelector(".gdemo-play")) { if (paused) dv.pause(); else { var p = dv.play(); if (p && p.catch) p.catch(function () {}); } }
    });
    /* Done on the last step (not in the pause before it) is the move finished; earlier, a stop */
    node.querySelector("#drillDone").addEventListener("click", function () { end(i === d.steps.length - 1 && !trans); });
    document.addEventListener("visibilitychange", onVis);
    timer = setInterval(function () {
      if (!node.isConnected) { clearInterval(timer); stopFrames(); showDemo(null); document.removeEventListener("visibilitychange", onVis); return; }
      if (paused) { last = Date.now(); return; }
      var now = Date.now(), dt = (now - last) / 1000; last = now;
      if (trans) { trans.t += dt; if (trans.t >= trans.lead + trans.count * trans.per) endTransition(); else paintCount(); return; }
      if (holding()) return;
      elapsed += dt;
      if (elapsed >= d.steps[i].seconds) { next(); return; }
      paint();
    }, 250);
    render(node);
    show();
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
        '<p class="mini" style="margin:0 0 14px">' + t("This page is your record. It fills itself in as you play.") + '</p>' +
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

  /* The first question of that day's daily, as the daily will serve it. This used
     to shuffle the pool with a seed of its own, so the phone notification showed a
     question that was not in that day's five on 364 days out of 365 (the golden-
     source audit, 24 Sep 2026). It now asks the daily itself. */
  function dailyFirstFor(offset) {
    var qs = dailyQuestions(dayNumber(new Date(Date.now() + offset * 86400000)));
    return qs[0] || null;
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
        // The old text said the country picks a bookshop (no code does that)
        // and that it is "counted as a country" (the counted country comes from
        // the internet connection). One sentence now, shared with onboarding.
        '<p class="mini" style="margin:0 0 12px">' +
          t("It will place you on your country's board when contests start. Until then it stays on this device and is not sent to Qpio. The country Qpio counts comes from your internet connection, not from this choice.") +
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
    wrap.appendChild(privacyEntryCard());
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
        // Only what a backup can contain. A pasted code carrying any other
        // curio.* key - curio.measure.off above all - would otherwise switch
        // the counting back on behind the reader's "Counting stays off".
        Object.keys(bag.d).forEach(function (k) {
          if (BACKUP_KEYS.indexOf(k) !== -1 || k.indexOf("curio.daily.") === 0) { localStorage.setItem(k, bag.d[k]); n++; }
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
    // (D-064, 2026-08-14). The hint now says only what the switch does: the
    // "nothing personal is ever collected" and account wording went with the
    // Privacy screen (24 Sep 2026), which says what is and is not kept, and
    // "~" is gone because screen readers read it out as "tilde".
    node.appendChild(segRow(t("👶 Age mode"), t("Kids mode shows only questions written for ages 8 to 12."), [
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

    // Deleting everything on this device moved to Settings › Privacy & your
    // data (24 Sep 2026), with one plain confirmation that says what goes.
    node.appendChild(el('<div class="mini" style="margin-top:18px"><a href="#" id="replayIntro">' + t("Replay the intro") + '</a></div>'));
    node.querySelector("#replayIntro").addEventListener("click", function (e) { e.preventDefault(); onboardingView(0); });

    var back = node.querySelector("#back");
    if (back) back.addEventListener("click", goHome);
    return node;
  }

  /* PRIVACY:begin */
  // ---------- Settings › Privacy & your data ----------
  // Founder, 24 Sep 2026: a data-rights screen in Settings, like a game's
  // "Privacy Rights" screen but written from Qpio's manifesto, with what does
  // not apply dropped (Qpio has no ads, so there are no ad settings) - and the
  // promise "Your curiosity is yours." shown in ONE place instead of under
  // every screen. This is that place. On it the reader can read the promise,
  // see, save and delete what is kept on this device, turn the counting off,
  // see who else sees their connection, and read their rights.
  //
  // It is a sub-page of the Settings tab (#privacy): it renders into #tabView
  // and never through render(), which would destroy a paused quiz.
  //
  // COPY RULE: every sentence here is a string literal handed straight to t or
  // tf, one call on one line, so check_i18n.py can see it and
  // tools/privacy.test.js can prove it. Conditional copy is two literal calls.
  // No copy in variables, objects or src/privacy.js.

  // The last card of the Settings tab.
  function privacyEntryCard() {
    var node = el('<div class="card"><button class="rowlink" id="openPrivacy"><span><span aria-hidden="true">🔒</span> ' + t("Privacy & your data") + '</span><span class="chev" aria-hidden="true">›</span></button><p class="mini" style="margin:8px 0 0">' + t("What is kept on this device, what Qpio counts, and your choices.") + '</p></div>');
    node.querySelector("#openPrivacy").addEventListener("click", function () {
      pvOpenedInApp = true; pvOpener = "openPrivacy"; location.hash = "privacy";
    });
    return node;
  }

  // Back returns to where the reader came from. Opened from inside the app, that
  // is the previous history entry (and Android's back button agrees); reached by
  // a deep link, there is no such entry, so it goes to Settings.
  function pvGoBack() {
    pvReturn = pvOpener || "openPrivacy";
    var inApp = pvOpenedInApp;
    pvOpenedInApp = false; pvOpener = null;
    if (inApp) history.back(); else location.hash = "settings";
  }

  function pvHead(icon, text) { return '<h3 class="section-title"><span aria-hidden="true">' + icon + '</span> ' + text + '</h3>'; }
  function pvLine(html) { return '<p class="mini" style="margin:0 0 6px">' + html + '</p>'; }
  function pvExt(href, label) {
    return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + label + '<span class="sr-only"> ' + t("(opens in a new tab)") + '</span></a>';
  }
  function pvBlock(html) { return el('<div>' + html + '</div>'); }
  function pvDate(d, utc) {
    var o = { day: "numeric", month: "long", year: "numeric" };
    if (utc) o.timeZone = "UTC";   // a week's Monday is a calendar date, not a moment
    var s;
    try { s = d.toLocaleDateString(QLANG === "fr" ? "fr-FR" : "en-GB", o); } catch (e) { return todayKey(d); }
    // French writes the first of the month "1er septembre", which the browser does not.
    return QLANG === "fr" ? s.replace(/^1(?=\s)/, "1er") : s;
  }
  // The same write probe as privacy.js and measure.js. Asked here too, so a
  // privacy.js that failed to load is not reported as blocked storage.
  function pvCanStore() {
    if (window.QpioPrivacy) return QpioPrivacy.canStore();
    try { localStorage.setItem("curio.t", "1"); localStorage.removeItem("curio.t"); return true; } catch (e) { return false; }
  }

  function privacyView() {
    var kids = settings.ageMode === "kids";
    var wrap = el('<div class="pv grid"></div>');
    // Back on its own row: one row overflowed at 320px with Extra large text.
    // No .quizhead here, so the quiz-screen detection can never trigger.
    var head = el('<div class="pv-head"><button class="btn ghost" id="pvBack">' + t("← Back") + '</button><h2 id="pvTitle" tabindex="-1">' + t("Privacy & your data") + '</h2></div>');
    head.querySelector("#pvBack").addEventListener("click", pvGoBack);
    wrap.appendChild(head);
    // 1. The promise (D-087), byte for byte. The only place a reader sees it.
    wrap.appendChild(el('<div class="card"><h3 style="margin:0 0 8px">' + t("Your curiosity is yours.") + '</h3><p class="mini" style="margin:0">' + t("Qpio collects only information that has a defined purpose for improving the product, understanding its performance, operating a feature the reader chose, or fulfilling a transaction the reader initiated. We are transparent about what we collect, we do not sell reader data, and anonymous behaviour is not turned into a personal profile.") + '</p></div>'));
    wrap.appendChild(pvDeviceCard(kids));
    wrap.appendChild(pvCountingCard(kids));
    wrap.appendChild(pvServicesCard(kids));
    wrap.appendChild(pvRightsCard(kids));
    // Same window on purpose: a new tab can have separate storage on an
    // installed iPhone app, and the switch there would then govern nothing.
    wrap.appendChild(el('<div class="card"><a class="rowlink" href="/privacy"><span>' + t("Read the full privacy page") + '</span><span class="chev" aria-hidden="true">›</span></a></div>'));
    return wrap;
  }

  // ---- 2. On this device: see, save, delete ----
  // What the Cache API holds, read without creating anything: has() before
  // open(), because open() creates a cache that is missing.
  var pvAsync = { ready: false, pics: null, queue: null };
  function pvPrefetch(done) {
    if (!window.caches) { pvAsync.ready = true; return; }
    try {
      var pics = caches.has("qpio-img-v1").then(function (has) {
        if (!has) return null;
        return caches.open("qpio-img-v1").then(function (c) { return c.keys(); })
          .then(function (rs) { return rs.map(function (r) { return r.url; }); });
      }).catch(function () { return null; });
      var queue = caches.has(NUDGE_CACHE).then(function (has) {
        if (!has) return null;
        return caches.open(NUDGE_CACHE).then(function (c) { return c.match(NUDGE_URL); })
          .then(function (r) { return r ? r.json() : null; });
      }).catch(function () { return null; });
      Promise.all([pics, queue]).then(function (r) {
        pvAsync.ready = true; pvAsync.pics = r[0]; pvAsync.queue = r[1];
        if (done) done();
      });
    } catch (e) { pvAsync.ready = true; }
  }
  function pvPicsText() {
    if (!pvAsync.ready) return "…";
    return pvAsync.pics ? String(pvAsync.pics.length) : "0";   // a count, like the other count rows
  }
  function pvPaintPics() { var dd = document.getElementById("pvPics"); if (dd) dd.textContent = pvPicsText(); }

  // Keys the list names on a line of its own; anything else Qpio keeps is
  // counted on the last line, so nothing is left out of the picture.
  var PV_LISTED = ["playerName", "leaderboard", "country", "discovery", "vault", "stats", "streak", "hiscore",
    "gym.vault", "gym.day", "gym.day.kids", "qseen2", "settings", "lang", "nudge", "nudgeHour", "measure.off", "firstweek", "mq", "mhealth"];
  function pvRow(label, value) { return '<div><dt>' + label + '</dt><dd>' + esc(value) + '</dd></div>'; }

  // Built each time the panel opens, so every value is what is stored now.
  function pvSeeHtml() {
    if (!pvCanStore()) return '<p class="mini" style="margin:10px 0 6px">' + t("Your browser is blocking storage on this site, so nothing is kept here.") + '</p>';
    var rows = [];
    var name = LS.get("playerName", "");
    rows.push(pvRow(t("Your name on the leaderboard"), (typeof name === "string" && name.trim()) ? name : t("not set")));
    var board = LS.get("leaderboard", []);
    rows.push(pvRow(t("Scores on this device's leaderboard"), Array.isArray(board) ? board.length : 0));
    var C = window.CURIO_COUNTRY, cc = C ? C.get() : null, ccLabel = null;
    if (C && cc) C.list().forEach(function (c) { if (c.code === cc) ccLabel = c.label; });
    rows.push(pvRow(t("The country you represent"), ccLabel || t("not chosen")));
    var ds = LS.get("discovery", null);
    rows.push(pvRow(t("How you said you found Qpio"), (ds && ds !== "unknown") ? discoveryLabel(ds) : t("not answered")));
    var vault = LS.get("vault", {});
    rows.push(pvRow(t("Facts in your Memory Vault"), vault && typeof vault === "object" ? Object.keys(vault).length : 0));
    var st = getStats(), n = 0, c = 0;
    Object.keys(st.cats).forEach(function (k) { var x = st.cats[k] || {}; n += x.s || 0; c += x.c || 0; });
    rows.push(pvRow(t("Questions answered"), tf("{n}, {c} of them correct", { n: n, c: c })));
    // Distinct dates: an adult and a Kids record for one day count once.
    var days = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var m = /^curio\.daily\.(\d{4}-\d{2}-\d{2})(\.kids)?$/.exec(localStorage.key(i) || "");
        if (m) days[m[1]] = true;
      }
    } catch (e) {}
    var dk = Object.keys(days).sort(), d0 = dk.length ? dk[0].split("-") : null;
    rows.push(pvRow(t("Days you played the Daily Challenge"), d0 ? tf("{n}, since {date}", { n: dk.length, date: pvDate(new Date(+d0[0], +d0[1] - 1, +d0[2])) }) : t("none")));
    var sk = getStreak();
    rows.push(pvRow(t("Streak"), tf("{n} now, best {b}", { n: sk.count || 0, b: sk.best || 0 })));
    rows.push(pvRow(t("Best Quick-Fire score"), LS.get("hiscore", 0)));
    var gv = LS.get("gym.vault", []);
    rows.push(pvRow(t("Kinds kept in your Gym Vault"), Array.isArray(gv) ? gv.length : 0));
    // Once a day (D-090): what of today's puzzles and move is finished, one note per mode,
    // overwritten each day. Named here rather than counted among the small notes.
    var gd = gymToday(), gdone = [];
    if (typeof gd.p === "number") gdone.push(tf("puzzles done, {n}/{total}", { n: gd.p, total: gd.t || 5 }));
    if (gd.m === true) gdone.push(t("move done"));
    rows.push(pvRow(t("Qpio Gym, today"), gdone.length ? gdone.join(", ") : t("nothing finished yet")));
    // Filtered here: the stored list is only pruned when a round marks a question seen.
    var led = seenLedger(), today = dayNumber();
    if (!Array.isArray(led)) led = [];
    rows.push(pvRow(t("Questions seen in the last 45 days"), led.filter(function (e) { return e && today - e.d < QF_PRUNE_DAYS; }).length));
    rows.push(pvRow(t("Your settings"), t("text size, timer, reading aids, age mode and language")));
    rows.push(pvRow(t("Daily reminder"), (LS.get("nudge", false) && notifyState() === "granted") ? tf("on, from {h}:00", { h: LS.get("nudgeHour", 8) }) : t("off")));
    rows.push(pvRow(t("Counting"), (window.QpioMeasure && !QpioMeasure.isOff()) ? t("on") : t("off")));
    var ws = window.QpioPrivacy ? QpioPrivacy.weekStart(LS.get("firstweek", null)) : null;
    if (ws) rows.push(pvRow(t("When this device first played (used for counting)"), tf("week of {date}", { date: pvDate(ws, true) })));
    var mq = LS.get("mq", []);
    rows.push(pvRow(t("Round summaries waiting to be sent"), Array.isArray(mq) ? mq.length : 0));
    var hasHealth = false;
    try { hasHealth = localStorage.getItem("curio.mhealth") !== null; } catch (e) {}
    if (hasHealth) rows.push(pvRow(t("A count of the summaries sent, and of any that could not be"), t("kept only here, never sent")));
    if (window.caches) rows.push('<div><dt>' + t("Pictures kept so they load faster") + '</dt><dd id="pvPics">' + esc(pvPicsText()) + '</dd></div>');
    var other = (window.QpioPrivacy ? QpioPrivacy.ownKeys(localStorage) : []).filter(function (k) {
      return !(k.indexOf("curio.") === 0 && (k.indexOf("curio.daily.") === 0 || PV_LISTED.indexOf(k.slice(6)) !== -1));
    });
    rows.push(pvRow(t("Small notes that help the app work"), other.length));
    return '<dl class="pv-list">' + rows.join("") + '</dl>';
  }

  // The build the reader is running, read the way buildShell() reads it.
  function pvAppVersion() {
    var s = document.querySelector('script[src*="app.js"]');
    var m = s && /[?&]v=(\d+)/.exec(s.getAttribute("src") || "");
    return m ? m[1] : "unknown";
  }

  // SAVE A COPY (access and portability; not a restore format). The file is
  // built synchronously inside the tap, so iPhone Safari still counts share()
  // as caused by the tap.
  function pvSave(msg, fb) {
    msg.textContent = ""; fb.innerHTML = "";
    var now = new Date(), day = todayKey(now), name = "qpio-my-data-" + day + ".json";
    var bag = {
      about: tf("Everything Qpio keeps about you in this browser, on this device, saved on {date}.", { date: pvDate(now) }),
      savedOn: day,
      appVersion: pvAppVersion(),
      storage: window.QpioPrivacy ? QpioPrivacy.snapshot(localStorage) : {},
      browser: { notificationPermission: notifyState(), picturesKept: pvAsync.pics, notificationQueue: pvAsync.queue }
    };
    var json = JSON.stringify(bag, null, 2);
    function fallback() {
      msg.textContent = t("Your browser would not save the file. Here is the same text, to copy:");
      fb.innerHTML = "";
      var ta = el('<textarea readonly class="cselect" rows="8" style="padding:8px 12px;margin-top:8px" aria-label="' + esc(t("Your browser would not save the file. Here is the same text, to copy:")) + '"></textarea>');
      ta.value = json;   // .value, never markup: a crafted backup code can put markup into playerName
      var cp = el('<button class="btn ghost" style="margin-top:8px">' + t("Copy the text") + '</button>');
      cp.addEventListener("click", function () { copy(json, msg); });
      fb.appendChild(ta);
      fb.appendChild(cp);
    }
    var file = null;
    try { file = new File([json], name, { type: "application/json" }); } catch (e) {}
    // iPads report a Mac user agent; the touch points give them away.
    var ua = navigator.userAgent || "";
    var phone = /iphone|ipad|ipod|android/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (phone && file && navigator.canShare && navigator.share) {
      var can = false;
      try { can = navigator.canShare({ files: [file] }); } catch (e) {}
      if (can) {
        navigator.share({ files: [file], title: name }).catch(function (e) {
          if (e && e.name === "AbortError") return;   // the reader closed the sheet: nothing to say
          fallback();
        });
        return;
      }
    }
    try {
      var url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      var a = document.createElement("a");
      a.href = url; a.download = name; a.style.display = "none";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      msg.textContent = t("Saved. Look in your downloads.");
    } catch (e) { fallback(); }
  }

  // DELETE EVERYTHING ON THIS DEVICE (US-049): one plain confirmation that says
  // what goes, no guilt copy, and two buttons of equal weight.
  function pvDelete(msg, yes) {
    if (!window.QpioPrivacy) { msg.textContent = t("Not everything could be deleted. Try again, or clear this site's data in your browser's settings."); return; }
    yes.disabled = true;
    WIPING = true;                       // LS.set writes nothing from here
    closePlay();                         // removes a paused quiz from the screen
    var t0 = Date.now();
    QpioPrivacy.wipeDevice().then(function (res) {
      if (res && res.failed) {           // stays on the page; a retry runs it again
        // Saving comes back, so a reader who keeps playing does not lose the
        // rest of the session without being told. Counting stays halted until
        // Qpio is reopened: it errs towards sending less.
        WIPING = false;
        yes.disabled = false;
        msg.textContent = t("Not everything could be deleted. Try again, or clear this site's data in your browser's settings.");
        return;
      }
      // null means storage could not be reached at all: nothing could have been
      // stored, so it counts as done. The restart waits a second so a screen
      // reader can announce the message first.
      msg.textContent = t("Deleted. Qpio is starting again.");
      setTimeout(function () { location.replace("/"); }, Math.max(1000, 1000 - (Date.now() - t0)));
    });
  }

  function pvDeviceCard(kids) {
    var canStore = pvCanStore();
    var node = el('<div class="card">' + pvHead("📱", t("On this device")) +
      pvLine(t("Your progress, the facts in your Memory Vault, your settings and your leaderboard name are kept in this browser, on this device.")) +
      '<details class="pv-more" id="pvSee"><summary>' + t("See what is stored") + '</summary><div id="pvSeeBody"></div></details>' +
      '<div class="btnrow" style="margin-top:8px"><button class="btn" id="pvSave">' + t("Save a copy") + '</button></div>' +
      '<p class="mini" style="margin:8px 0 6px">' + t("A file with everything listed above, in full, laid out for computers to read. To move your progress to another device, use your backup code instead.") + '</p>' +
      '<div class="mini" id="pvSaveMsg" role="status"></div>' +
      '<div id="pvSaveFb"></div>' +
      '<div class="btnrow" style="margin-top:14px"><button class="btn ghost" id="pvDel" aria-expanded="false" aria-controls="pvConfirm" style="color:var(--bad);border-color:var(--bad)">' + t("Delete everything on this device") + '</button></div>' +
      '<div class="pv-confirm" id="pvConfirm" role="group" aria-labelledby="pvDelT" hidden></div>' +
    '</div>');

    var see = node.querySelector("#pvSee"), seeBody = node.querySelector("#pvSeeBody");
    see.addEventListener("toggle", function () {
      if (!see.open) return;
      seeBody.innerHTML = pvSeeHtml();
      pvPrefetch(pvPaintPics);
    });
    pvPrefetch(pvPaintPics);

    var save = node.querySelector("#pvSave");
    // Without privacy.js the file would say "everything" and hold nothing.
    if (!canStore || !window.QpioPrivacy) save.disabled = true;
    save.addEventListener("click", function () { pvSave(node.querySelector("#pvSaveMsg"), node.querySelector("#pvSaveFb")); });

    var del = node.querySelector("#pvDel"), panel = node.querySelector("#pvConfirm");
    function closePanel() {
      panel.hidden = true; panel.innerHTML = "";
      del.setAttribute("aria-expanded", "false");
      del.focus();
    }
    del.addEventListener("click", function () {
      if (!panel.hidden) { closePanel(); return; }
      var off = !!(window.QpioMeasure && QpioMeasure.isOff());
      var kidsNow = settings.ageMode === "kids";
      panel.innerHTML =
        '<h3 id="pvDelT" tabindex="-1" style="margin:0 0 8px">' + t("Delete everything on this device?") + '</h3>' +
        pvLine(t("This deletes:")) +
        '<ul class="mini" style="margin:0 0 8px;padding-left:18px">' +
          '<li>' + t("your progress, your Memory Vault, your streak and your scores") + '</li>' +
          '<li>' + t("your name, country and settings, including language") + '</li>' +
          '<li>' + t("your daily reminder, which will stop") + '</li>' +
          '<li>' + t("the pictures kept so they load faster") + '</li>' +
        '</ul>' +
        pvLine(t("This cannot be undone. Qpio has no copy that could bring it back.")) +
        pvLine(t("To keep your progress, copy your backup code in Settings first.")) +
        (off ? pvLine(t("Counting stays off.")) : '') +
        (kidsNow ? pvLine(t("Kids mode stays on.")) : '') +
        // notifyState(), not Notification.permission, which throws in iPhone
        // Safari when the app is not installed.
        (notifyState() === "granted" ? pvLine(t("Your browser will still remember that you allowed notifications. You can remove that in your browser's settings.")) : '') +
        (kidsNow ? pvLine(t("Unsure? Ask a grown-up first.")) : '') +
        // Dark text on --bad: white on it fails contrast.
        '<div class="btnrow" style="margin-top:10px">' +
          '<button class="btn" id="pvDelYes" style="flex:1;background:var(--bad);color:#3a0d16">' + t("Delete everything") + '</button>' +
          '<button class="btn ghost" id="pvDelNo" style="flex:1">' + t("Keep everything") + '</button>' +
        '</div>' +
        '<div class="mini" id="pvDelMsg" role="status" style="margin-top:8px"></div>';
      panel.hidden = false;
      del.setAttribute("aria-expanded", "true");
      panel.querySelector("#pvDelT").focus();
      panel.querySelector("#pvDelNo").addEventListener("click", closePanel);
      var yes = panel.querySelector("#pvDelYes");
      yes.addEventListener("click", function () { pvDelete(panel.querySelector("#pvDelMsg"), yes); });
    });
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden && !WIPING) { e.preventDefault(); closePanel(); }
    });
    return node;
  }

  // ---- 3. Counting ----
  // The default is On, and the copy says so (D-089 opt-out model). The switch
  // comes early. In Kids mode a line written for a child opens the card and
  // the adult detail folds under "More detail for grown-ups".
  function pvCountingCard(kids) {
    var M = window.QpioMeasure;
    var node = el('<div class="card">' + pvHead("📊", t("Counting, to improve the questions")) + '</div>');
    if (!M) { node.appendChild(el(pvLine(t("Counting did not load, so nothing is being counted.")))); return node; }
    // A browser that cannot record a "no" gets no switch: measure.js already
    // sends nothing there, and a switch that cannot stick would be a lie. The
    // lines about a summary being sent would be false there too, so the card
    // says only this.
    if (!M.storable) { node.appendChild(el(pvLine(t("Your browser is blocking storage on this site, so nothing is counted here.")))); return node; }

    var l1 = pvLine(t("When you finish or leave a round, this device sends Qpio one short summary."));
    var list = pvLine(t("The summary says:")) +
      '<ul class="mini" style="margin:0 0 8px;padding-left:18px">' +
        '<li>' + t("which questions you saw, in what order, and whether each answer was right") + '</li>' +
        '<li>' + t("which game it was, such as the Daily Challenge or Quick-Fire, and whether you finished") + '</li>' +
        '<li>' + t("the day and your language") + '</li>' +
        '<li>' + t("whether Kids mode is on") + '</li>' +
        '<li>' + t("the type of device, and whether Qpio is installed") + '</li>' +
        '<li>' + t("which version of the app and of the questions you had") + '</li>' +
        '<li>' + t("how you said you found Qpio") + '</li>' +
        '<li>' + t("roughly how many weeks since this device first played") + '</li>' +
      '</ul>';
    var facts =
      pvLine(t("Qpio adds the country your internet connection comes from. It does not use the country you picked.")) +
      pvLine(t("The summary holds no name and no number that points back to you.")) +
      pvLine(t("Qpio's server sees your internet address when the summary arrives. Qpio does not store it.")) +
      pvLine(t("Only totals are kept, for 13 months."));
    var kline = pvLine(M.kidsCounted ? t("Rounds in Kids mode are counted the same way, marked as Kids rounds.") : t("Rounds played in Kids mode are not counted."));
    var scope = pvLine(t("This choice applies to this browser on this device."));

    var sw = segRow(t("Counting"), null, [{ label: t("On"), value: true }, { label: t("Off"), value: false }], !M.isOff(), function (on) { M.setOptOut(!on); paint(); });
    sw.querySelector(".cf-title").id = "pvCountT";
    var box = sw.querySelector(".cats");
    box.setAttribute("role", "group");
    box.setAttribute("aria-labelledby", "pvCountT");
    var stat = el('<div class="mini" id="pvCountSt" role="status" aria-live="polite"></div>');
    // Read back after the write, so the status says what is stored, not what was tapped.
    function paint() {
      var off = M.isOff();
      stat.textContent = off ? t("Counting is off. Nothing more is sent from this device, and anything waiting to be sent has been cleared.") : t("Counting is on.");
      sw.querySelectorAll(".chip").forEach(function (b, i) { b.setAttribute("aria-pressed", ((i === 0) === !off) ? "true" : "false"); });
    }
    paint();

    if (kids) {
      node.appendChild(el('<p class="mini" style="margin:0 0 6px"><b>' + (M.kidsCounted ? t("When you finish a round, this device tells Qpio how the questions went. Your name is never in it. You can switch this off here, on your own or with a grown-up.") : t("Your games in Kids mode are not counted. The switch below is for Everyone mode.")) + '</b></p>'));
      node.appendChild(sw);
      node.appendChild(stat);
      node.appendChild(el('<details class="pv-more"><summary>' + t("More detail for grown-ups") + '</summary>' + l1 + list + facts + kline + scope + '</details>'));
    } else {
      node.appendChild(pvBlock(l1 + pvLine(t("Counting is on unless you turn it off. Qpio works the same either way."))));
      node.appendChild(sw);
      node.appendChild(stat);
      node.appendChild(pvBlock('<div style="margin-top:10px">' + list + facts + kline + scope + '</div>'));
    }
    return node;
  }

  // ---- 4. Other services ----
  // Claims nothing about what these services do with the data: their own
  // policies apply, and the links say whose.
  function pvServicesCard(kids) {
    var body =
      pvLine(t("These services see your internet address and type of browser when they send you something. They keep their own records, under their own privacy rules.")) +
      pvLine(t("Cloudflare delivers the app, and stores the counting totals on computers in the European Union.")) +
      pvLine(t("Wikimedia sends most of the pictures. It is not told which Qpio page you are on.")) +
      pvLine(t("YouTube plays a video only when you open one. It is told which video it is and that it played in Qpio, and it can store information in your browser.")) +
      pvLine(t("Links you tap, such as Open Library, Wikipedia, UNESCO or a museum, open that site like any other visit.")) +
      '<ul class="mini" style="margin:0 0 6px;padding-left:18px">' +
        '<li style="padding:4px 0">' + pvExt("https://www.cloudflare.com/privacypolicy/", tf("{name} privacy policy", { name: "Cloudflare" })) + '</li>' +
        '<li style="padding:4px 0">' + pvExt("https://foundation.wikimedia.org/wiki/Policy:Privacy_policy", tf("{name} privacy policy", { name: "Wikimedia" })) + '</li>' +
        '<li style="padding:4px 0">' + pvExt("https://policies.google.com/privacy", tf("{name} privacy policy", { name: "Google (YouTube)" })) + '</li>' +
      '</ul>';
    return el('<div class="card">' + pvHead("🌐", t("Other services Qpio uses")) +
      (kids
        ? pvLine(t("Some pictures and videos come from other websites. Those websites can see which internet connection asked for them.")) +
          '<details class="pv-more"><summary>' + t("More detail for grown-ups") + '</summary>' + body + '</details>'
        : body) +
      // In place of the game's advertising screens: there is nothing to set.
      '<p class="mini" style="margin:10px 0 0;padding-top:10px;border-top:1px solid var(--line)">' + t("Qpio doesn't interrupt your learning with ads, so there are no advertising settings to change.") + '</p>' +
    '</div>');
  }

  // ---- 5. Your rights, and who runs Qpio ----
  // With PRIVACY_CONTACT empty (test site only) there is no mailto anywhere.
  // In Kids mode an address is plain text, never a mailto, so no child's
  // email address is ever collected.
  function pvRightsCard(kids) {
    var regs = '<ul class="mini" style="margin:0 0 6px;padding-left:18px">' +
      '<li style="padding:4px 0">' + pvExt("https://www.cnil.fr", t("CNIL (France)")) + '</li>' +
      '<li style="padding:4px 0">' + pvExt("https://ico.org.uk", t("ICO (UK)")) + '</li>' +
      '<li style="padding:4px 0">' + pvExt("https://www.pcpd.org.hk", t("PCPD (Hong Kong)")) + '</li>' +
    '</ul>';
    var mail = PRIVACY_CONTACT ? '<a href="mailto:' + esc(PRIVACY_CONTACT) + '">' + esc(PRIVACY_CONTACT) + '</a>' : "";
    var body = kids
      ? pvLine(t("Qpio doesn't know who you are. Your progress is kept on this device, and you can see it or delete it above.")) +
        pvLine(PRIVACY_CONTACT ? tf("If something seems wrong, tell a grown-up. They can write to us at {email}, or to the people whose job is to protect your privacy:", { email: esc(PRIVACY_CONTACT) }) : t("If something seems wrong, tell a grown-up. They can write to the people whose job is to protect your privacy:")) +
        regs
      : pvLine(t("Privacy laws in many countries give you rights over information about you: to see it, correct it, delete it, limit how it is used or say no to it, and to complain.")) +
        pvLine(t("Qpio can't look you up, because nothing it keeps says who you are. So there is nothing on its side to find, correct or delete.")) +
        pvLine(t("A total can sometimes describe one person, for example the only player from a country on a given day.")) +
        pvLine(PRIVACY_CONTACT ? tf("If you think that applies to you, or for any other request, write to {email}. We reply within one month.", { email: mail }) : t("Qpio does not yet have an address you can write to about your data.")) +
        pvLine(t("You can also complain to the data protection regulator where you live. For example:")) +
        regs;
    return el('<div class="card">' + pvHead("⚖️", t("Your rights")) + body +
      '<h3 class="section-title" style="margin-top:16px"><span aria-hidden="true">🏢</span> ' + t("Who runs Qpio") + '</h3>' +
      pvLine(t("Qpio will be run by a company that is not set up yet. Its name will appear here once it is.")) +
    '</div>');
  }
  /* PRIVACY:end */

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
      if (pic && pic.u) urls.push(picURL(pic.u));
      // and the picture on the question card itself, so today's five are
      // already on the device if the reader goes offline later in the day
      if (q.img && q.img.u) urls.push(picURL(q.img.u));
    });
    var D = window.CURIO_DISCOVERY;
    if (D) {
      var seen = dq.map(function (q) { return { id: GOL.entityOf(q) }; });
      D.shelves(seen, 8).forEach(function (S) {
        var art = S.items[0] && S.items[0].image;
        if (art) urls.push(picURL(art));
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

    // HOW EACH QUESTION PERFORMS. Opened here, with the deck, so a round that is
    // abandoned still records what was SHOWN - without that, the questions
    // people give up on look exactly like questions nobody was given, and
    // drop-off can never be measured. Nothing about the reader travels with it.
    // cfg.noStats covers the surfaces that are not a round (the vault review).
    if (!cfg.noStats && window.QpioMeasure) {
      window.QpioMeasure.begin({
        surface: cfg.surface || (cfg.resumeKey ? "daily" : "quickfire"),
        mode: settings.ageMode === "kids" ? "kids" : "adult",
        questions: cfg.questions.map(function (q) {
          return { id: q.id, qrev: q.qrev || 1, lrev: q.lrev || 1 };
        })
      });
    }

    function checkpoint() {
      if (!cfg.resumeKey) return;
      LS.set(cfg.resumeKey, { idx: idx, score: score, correct: correctCount,
                              marks: marks, ids: deckIds, at: todayKey() });
    }

    /* THE PICTURE BEFORE THE PAGE (CEO, 22 Sep 2026: "the image need to be preloaded before
       the page appear"). Every picture this round will show is fetched now, at the start -
       not one question ahead - and each question waits for its own picture, fetched AND
       decoded, before it appears. Capped: a picture that has not come in PICTURE_WAIT_MS is
       not allowed to hold the round hostage, and offline nothing waits at all. */
    var PICTURE_WAIT_MS = 3000;
    var roundPics = cfg.questions.map(function (qq) { return qq && qq.img && qq.img.u ? picURL(qq.img.u) : null; });
    var PW = navigator.onLine === false ? null : imageWarmer();
    if (PW) PW.start(roundPics.filter(Boolean));

    var node = el('<div class="card"></div>');
    render(node);
    show();

    function show() {
      var u = roundPics[idx];
      var st = u && PW ? PW.stateOf(u) : "done";
      if (st === "done" || st === "failed") { paint(); return; }
      /* not ready: the answered card stays where it is and Next says it is working;
         on the first question, a quiet sand-timer holds the empty card */
      var nb = node.querySelector("#next");
      if (nb) { nb.disabled = true; nb.setAttribute("aria-busy", "true"); nb.textContent = "⏳"; }
      else if (!node.firstChild) node.appendChild(el('<div class="qwait" role="status" aria-label="' + esc(t("Loading the picture")) + '">⏳</div>'));
      PW.whenReady(u, PICTURE_WAIT_MS, function () { if (node.isConnected) paint(); });
    }

    function paint() {
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
        // AN ILLUSTRATION MUST NEVER BE MISTAKEN FOR A PHOTOGRAPH.
        // CEO, 5 Sep 2026: "any AI generated image needs to have a distinctive
        // mark with a legend saying AI generated." Eleven subjects cannot be
        // photographed (a byte, packet switching, the geometry someone worked
        // on), so they carry a generated illustration. On a product whose whole
        // proposition is verified truth, that has to be visible ON the picture
        // — a credit line under it is not enough, because the picture travels
        // into the vault, into a screenshot and into a share.
        // Three ways of knowing, because a picture that loses its mark is the
        // one failure this must not have: the explicit flag the registry
        // writes, the licence text, and where the file lives.
        var isGen = q.img.gen === true ||
                    /^generated illustration/i.test(q.img.lic || "") ||
                    /^img\/gen\//.test(q.img.u || "");
        artHtml =
          '<div class="qart' + (q.img.fit === "contain" ? " is-contain" : "") +
              (isGen ? " is-generated" : "") + ' is-loading">' +
            '<span class="qart-wait" aria-hidden="true">⏳</span>' +
            '<img src="' + esc(picURL(q.img.u)) + '"' +
              // the Commons address stays on the element: if the bundled copy
              // cannot be read (the new worker not yet installed, then no
              // network), the picture falls back to where it always came from
              (picURL(q.img.u) !== q.img.u ? ' data-orig="' + esc(q.img.u) + '"' : '') +
              ' alt="' +
              esc(isGen ? (t("AI-generated illustration") + ". " + alt) : alt) + '" decoding="async" referrerpolicy="no-referrer">' +
            (isGen ? '<span class="qart-ai">◆ ' + esc(t("AI generated")) + '</span>' : '') +
          '</div>' +
          (isGen
            ? '<div class="qart-credit qart-credit-ai">' +
                esc(t("This image was generated by AI. It illustrates the idea — it is not a photograph of the thing.")) +
              '</div>'
            : (q.img.by ? '<div class="qart-credit">' +
                (q.img.p ? '<a href="' + srcLink0(q.img.p) + '" target="_blank" rel="noopener">' : '') +
                esc(q.img.by) + (q.img.lic ? ' · ' + esc(q.img.lic) : '') +
                (q.img.p ? '</a>' : '') + '</div>' : ''));
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
      /* Show the picture that was already decoded, not a fresh copy that decodes again
         after the card is on screen (22 Sep 2026). Only when that element is free. */
      if (qa && PW) {
        var decoded = PW.imageFor(roundPics[idx]), fresh = qa.querySelector("img");
        if (decoded && fresh && !decoded.parentNode) {
          decoded.alt = fresh.alt;
          try { decoded.referrerPolicy = "no-referrer"; } catch (e5) {}
          if (fresh.getAttribute("data-orig")) decoded.setAttribute("data-orig", fresh.getAttribute("data-orig"));
          fresh.parentNode.replaceChild(decoded, fresh);
        }
      }
      if (qa) {
        var qim = qa.querySelector("img");
        var qaDone = function () { qa.classList.remove("is-loading"); };
        var qaFail = function () {
          // A bundled copy that would not load: one try at the original
          // Commons address before giving up (see picURL).
          var orig = qim.getAttribute("data-orig");
          if (orig && qim.getAttribute("src") !== orig) {
            qim.removeAttribute("data-orig");
            qim.addEventListener("load", qaDone, { once: true });
            qim.addEventListener("error", qaFail, { once: true });
            qim.setAttribute("src", orig);
            return;
          }
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
          if (W) W.start([picURL(nq.img.u)]);
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
      if (window.QpioMeasure) window.QpioMeasure.mark(idx + 1, true, correct);
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
      // THE SAME THREE DOORS ON EVERY ANSWER, WHETHER OR NOT THEY LEAD ANYWHERE.
      //
      // CEO, 2026-09-07: "one of the 1st question i looked at doesn't have
      // visit link, like a museum ... you need to put it but no link so that i
      // know there is no link."
      //
      // This screen used to draw ONE destination — the first slot with
      // anything behind it — which in practice was almost always Read. The
      // museum slot was therefore invisible whether or not a museum existed,
      // and the reader had no way to tell the two apart. Only 59 of the 760
      // questions have somewhere to visit; drawing the empty slot is what
      // turns that silence into a fact, and what makes a new destination
      // noticeable the day it is added. Same rule, same look and the same
      // four-slot vocabulary as the results shelf (golinks.js goFor()).
      //
      // Three here, not the shelf's four: the citation already has its own
      // chip above, inside the fact box, and printing it twice is noise.
      //
      // Order is fixed by usefulness and can never be bought — VAL-12 / D-061.
      var WAY_ORDER = ["read", "visit", "watch"];
      var byKind = {};
      (window.CURIO_GO ? window.CURIO_GO.goFor(q) : []).forEach(function (d) { byKind[d.kind] = d; });
      var waysHtml = WAY_ORDER.map(function (k) {
        var d = byKind[k];
        if (!d) return "";
        /* A DOOR SAYS WHAT IS BEHIND IT.
           Every Watch link is a search inside a vetted channel -- the right
           safety call, and the wrong word. "Watch - Kora" promises a film about
           the kora; what arrives is the British Museum's channel with "Kora"
           typed into its search box, which may return nothing. So a search door
           is labelled Search, and names the channel underneath. The CEO has
           made this exact complaint once already about Visit links that led to
           a UNESCO listing rather than somewhere to go. */
        /* ...but only a door that OPENS can be a search door. 266 questions
           have no video at all: their Watch slot is greyed, and labelling it
           "Search — None yet" described a search nobody is offered and hid
           which of the three doors was the missing one. A dead door is named
           for what it would have been. */
        var word = (d.search && d.on) ? t("Search")
                 : k === "read" ? t("Read")
                 : k === "visit" ? t("Visit") : t("Watch");
        var inner =
          '<span class="gf-ico" aria-hidden="true">' + d.icon + '</span>' +
          '<span class="gf-text">' +
            '<span class="gf-word">' + word + '</span>' +
            '<span class="gf-sub">' + esc(d.on ? (d.title || "") : t("None yet")) + '</span>' +
          '</span>';
        // A slot with nothing behind it is not a link that does nothing — it is
        // an element that was never a link, so nothing about it invites a tap
        // that cannot be answered.
        /* a video door plays inside Qpio; every other door opens its page */
        if (d.on && d.video) return '<button type="button" class="gf-link" data-video="' + esc(d.video) + '" data-title="' + esc(d.title || "") + '" data-chosen="' + (d.chosen ? "1" : "0") + '" data-slot="lead">' + inner + '</button>';
        return d.on
          ? '<a class="gf-link" href="' + doorHref(d.kind, "lead", d.url) + '" target="_blank" rel="noopener">' + inner + '</a>'
          : '<span class="gf-link is-off" aria-disabled="true" title="' + esc(t("Nothing here yet")) +
            '" aria-label="' + esc(word + " \u2014 " + t("Nothing here yet")) + '">' + inner + '</span>';
      }).join("");

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
        /* the golden source in the reader's language: a French reader was always sent to
           English Wikipedia by this button, whatever the inventory held (22 Sep 2026) */
        fmt(q.fact) + srcLink(window.CURIO_GO && window.CURIO_GO.sourceUrl ? window.CURIO_GO.sourceUrl(q) : q.src) + renderQuestionResourcesHtml(q) +
        '<div class="deeperbox"></div>' +
        '</div>' +
        // Outside the fact box on purpose. The fact is the only part whose
        // length we cannot control — a long one on a small phone has to be
        // allowed to scroll inside its own box. The destination and Next sit
        // BELOW it as pinned siblings, so they are always on screen whatever
        // the fact does. That is what makes "no scrolling" a guarantee rather
        // than a hope (CEO, 2026-08-11).
        '<div class="answerfoot">' +
        '<div class="gf-ways">' + waysHtml + '</div>' +
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
        else {
          // Sent before the results screen renders, so a reader who closes the
          // tab on the last question is still counted as having finished it.
          if (window.QpioMeasure) window.QpioMeasure.finish(true);
          cfg.onDone({ score: score, correct: correctCount, total: cfg.questions.length, marks: marks });
        }
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
            /* the round, never the reader (D-053; messaging.md, 24 Sep 2026): the count is in the ring */
            '<span>' + t("Today") + '</span></div>' +
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
      // THE HOOK WRITTEN FOR THIS QUESTION WINS OVER THE ONE WRITTEN FOR ITS
      // SUBJECT. hooks.js is keyed by subject, which was right when a subject
      // had one question. It now has several — twenty on the Silk Road — and
      // they would all have opened with the same line. hooks.q.js carries the
      // hook written for this exact question; the subject hook stays as the
      // fallback, and the depth fact behind that.
      var slugH = window.CURIO_GO.entityOf(q);
      var own = q.id && (window.CURIO_HOOKS_Q || {})[q.id];
      var written = slugH && (window.CURIO_HOOKS || {})[slugH];
      var hook = (own && (window.QLANG === "fr" ? own.fr : own.en))
              || (written && (window.QLANG === "fr" ? written.fr : written.en))
              || q.fact || "";

      // A real photograph of the real thing, from Wikimedia Commons, credited
      // and linked back. Falls back to the category tile when there is no
      // image or the device is offline — the shelf never breaks, it just gets
      // quieter. Visual learners are a large share of any audience and
      // "accessibility is fundamental" is Charter value 5 (CEO, 2026-08-08).
      // The subject's picture where the registry has one; otherwise the picture
      // the question itself carries — the shelf used to read only the registry,
      // so a question whose picture rides on its row got the category tile
      // (CEO, 21 Sep 2026: Wayuu people, Guaraní people, Data compression).
      var pic = (window.CURIO_IMAGES || {})[window.CURIO_GO.entityOf(q)] || ((q.img && q.img.u) ? q.img : null);
      var artHtml = pic
        ? '<a class="topic-art has-pic" href="' + srcLink0(pic.p) + '" target="_blank" rel="noopener" ' +
            'title="' + esc(tf("Photo: {by} · {lic}", { by: pic.by || "Wikimedia Commons", lic: pic.lic || "" })) + '">' +
            '<img src="' + esc(picURL(pic.u)) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' +
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
        if (d.on && d.video) {
          /* a video plays inside Qpio (the document-level handler catches the tap first) */
          a = el('<button type="button" class="way" data-video="' + esc(d.video) + '" data-title="' + esc(d.title || "") + '" data-chosen="' + (d.chosen ? "1" : "0") + '" data-slot="' + esc(slotName) + '"' +
                 (d.title ? ' title="' + esc(d.title) + '"' : '') + '>' + inner + '</button>');
        } else if (d.on) {
          a = el('<a class="way" href="' + doorHref(d.kind, slotName, d.url) + '" target="_blank" rel="noopener"' +
                 (d.title ? ' title="' + esc(d.title + (d.sub ? " · " + d.sub : "")) + '"' : '') +
                 '>' + inner + '</a>');
          // The card is tappable as a whole; a way must not fire it twice.
          a.addEventListener("click", function (e) { e.stopPropagation(); });
        } else {
          a = el('<span class="way is-off" aria-disabled="true" title="' +
                 esc(t("Nothing here yet")) + '">' + inner + '</span>');
          // A dead slot eats its own tap. preventDefault as well as stop, so
          // the guard still holds the day this span becomes an <a> again.
          a.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); });
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
        node.addEventListener("click", function (e) {
          // A TAP ON A GREYED SLOT OPENS NOTHING. The slot stops the event
          // itself, and this is the second lock: for two weeks the stylesheet
          // took the slot out of hit-testing, so its stop never ran and the
          // tap arrived here instead — opening the card's best OTHER door.
          // Tapping a greyed Visit sent the reader to a book. (CEO, 12 Sep
          // 2026.) A fix that lives only in a stylesheet is one stylesheet
          // edit away from coming back.
          var hit = e && e.target && e.target.closest ? e.target.closest(".is-off") : null;
          if (hit && node.contains(hit)) return;
          /* the card's best door is a video: it plays here too, never on youtube.com */
          if (primary.video) { openVideo({ video: primary.video, title: primary.title || "", chosen: primary.chosen, slot: slotName }); return; }
          // Raw URL, not the attribute-escaped one — window.open is not HTML.
          var D = window.QPIO_DOORS;
          var via = D && D.href ? D.href(primary.kind, slotName, primary.url) : null;
          window.open(via || srcOpen0(primary.url), "_blank", "noopener");
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
      var art = picURL((S.items[0] && S.items[0].image) || null);
      var d = el(
        '<button class="door' + (art ? " has-art" : "") + '">' +
          (art ? '<img class="door-art" src="' + esc(art) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') +
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
          (it.image ? '<img src="' + esc(picURL(it.image)) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') +
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
      var open = function () { window.open(srcOpen0(it.url), "_blank", "noopener"); };
      node.addEventListener("click", open);
      node.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    }
    return node;
  }

  // Same scheme check srcLink() applies, for a bare URL going into an HTML
  // attribute — so the result is escaped.
  function srcLink0(u) {
    if (!/^https?:\/\//i.test(u || "")) return "#";
    return esc(u);
  }
  // The same check for a URL going into window.open, which is NOT HTML.
  // Escaping it there turns the first "&" of a query string into "&amp;" and
  // opens an address that does not exist. No shipped link carries a query
  // today, which is why nobody has seen it; the first one would break, and the
  // call sites already carried a comment saying they used the raw URL.
  function srcOpen0(u) {
    if (!/^https?:\/\//i.test(u || "")) return "#";
    return String(u);
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
              '<button class="btn' + (vaultDue().length ? ' ghost' : '') + '" id="vrHome">🏠 ' + t("Home") + '</button>' +
            '</div>' +
          '</div>'
        );
        render(node);
        var more = node.querySelector("#more");
        if (more) more.addEventListener("click", startVaultSession);
        node.querySelector("#vrHome").addEventListener("click", goHome);
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
    wrap.appendChild(el('<p class="mini" style="margin:0 0 8px">' + t("Learn a place before you land — its real story (not just the tourist version), its food, and a few words of the local language. Free.") + '</p>'));
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

    // The city's picture opens the page — for the readers who take in a
    // picture before a paragraph (CEO, 21 Sep 2026). Credit under it, linking
    // to the file page, exactly as a question's picture is credited.
    var hero = pack.pic && pack.pic.u
      ? '<div class="qart cityhero"><img src="' + esc(picURL(pack.pic.u)) + '" alt="' + esc(pack.city) + '" decoding="async" referrerpolicy="no-referrer"></div>' +
        (pack.pic.by ? '<div class="qart-credit">' + (pack.pic.p ? '<a href="' + srcLink0(pack.pic.p) + '" target="_blank" rel="noopener">' : '') + esc(pack.pic.by) + (pack.pic.lic ? ' · ' + esc(pack.pic.lic) : '') + (pack.pic.p ? '</a>' : '') + '</div>' : '')
      : '';
    var play = el('<div class="card">' + hero + '<p style="margin:' + (hero ? '10px' : '0') + ' 0 12px">' + esc(pack.blurb) + '</p><button class="btn block" id="playCity">' + tf("▶ Play the {city} quiz ({n})", { city: esc(pack.city), n: pack.questions.length }) + '</button></div>');
    node.appendChild(play);

    // Key phrases
    if (pack.phrases && pack.phrases.length) {
      var pcard = el('<div class="card"><div class="section-title" style="margin-top:0">🗣️ ' + t("Key phrases") + ' · ' + esc(pack.lang || "") + '</div></div>');
      pack.phrases.forEach(function (ph) {
        var row = el(
          '<div class="phrase">' +
            '<div class="phrase-main"><b>' + esc(ph.phrase) + '</b>' + (canTapSpeak() ? ' <button class="speakbtn phrase-speak" aria-label="' + t("Say it") + '">🔊</button>' : '') + '</div>' +
            '<div class="mini">' + esc(ph.meaning) + ' · <i>' + esc(ph.pron) + '</i></div>' +
          '</div>'
        );
        var sp = row.querySelector(".phrase-speak");
        if (sp) sp.addEventListener("click", function () { speakLang(ph.phrase, pack.lang, sp); });
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
              '<h2>' + esc(pack.city) + ' · ' + t("ready for your trip 🧳") + '</h2>' +
              '<div class="btnrow" style="justify-content:center">' +
                '<button class="btn" id="again">' + t("Play again") + '</button>' +
                '<button class="btn ghost" id="pack">' + tf("Back to {city}", { city: esc(pack.city) }) + '</button>' +
                '<button class="btn ghost" id="cpHome">🏠 ' + t("Home") + '</button>' +
              '</div>' +
            '</div>'
          );
          render(res);
          res.querySelector("#again").addEventListener("click", function () { play.querySelector("#playCity").click(); });
          res.querySelector("#pack").addEventListener("click", function () { render(cityPackView(pack)); });
          res.querySelector("#cpHome").addEventListener("click", goHome);
        }
      });
    });
    return node;
  }

  // Speak a phrase in its own language when the browser has a matching voice.
  // 2026-08-22 (v82 review, #75 — "The Cairo Audio doesn't work"): four pack
  // languages had no mapping at all and fell through to an English voice
  // reading Thai or Greek script aloud — indistinguishable from broken. And a
  // device with no matching voice failed SILENTLY. Now: every pack language
  // maps, the best installed voice is chosen at tap time (exact → language
  // family), and a device that simply cannot speak the language says so in
  // text instead of pretending.
  var LANG_CODE = { Italian: "it-IT", Japanese: "ja-JP", "Egyptian Arabic": "ar-EG", Arabic: "ar", Spanish: "es-ES", Turkish: "tr-TR",
                    Thai: "th-TH", "Moroccan Arabic (Darija)": "ar-MA", Greek: "el-GR", Uzbek: "uz-UZ",
                    /* the eight packs of 17 Sep 2026 — mapped the day they arrived, because an
                       unmapped language fails silently (register item, #75) */
                    Yoruba: "yo-NG", Amharic: "am-ET", "Rioplatense Spanish": "es-AR", "Brazilian Portuguese": "pt-BR",
                    Vietnamese: "vi-VN", Georgian: "ka-GE", "Levantine Arabic": "ar-JO", "Omani Arabic": "ar-OM" };
  function voiceFor(langCode) {
    try {
      var vs = window.speechSynthesis.getVoices() || [];
      var i;
      for (i = 0; i < vs.length; i++) if (vs[i].lang === langCode) return vs[i];
      var family = (langCode || "").split("-")[0];
      for (i = 0; i < vs.length; i++) if (vs[i].lang && vs[i].lang.split("-")[0] === family) return vs[i];
    } catch (e) {}
    return null;
  }
  function speakLang(text, lang, btn) {
    if (!canTapSpeak()) return;
    try {
      // Chrome loads the voice list asynchronously: the first tap can see an
      // empty list on a device that HAS voices. Wait for it once (with a hard
      // deadline — a device with no voices never fires voiceschanged).
      if (!(window.speechSynthesis.getVoices() || []).length && !speakLang._waited) {
        speakLang._waited = true;
        var fired = false;
        var retry = function () { if (fired) return; fired = true; speakLang(text, lang, btn); };
        window.speechSynthesis.addEventListener("voiceschanged", retry, { once: true });
        setTimeout(retry, 800);
        return;
      }
      var code = LANG_CODE[lang] || "en-US";
      var voice = voiceFor(code);
      if (!voice) {
        // Honest, not silent: the device has no voice for this language.
        if (btn && btn.parentNode) {
          var note = el('<span class="mini" role="status"></span>');
          note.textContent = " " + tf("No {language} voice on this device.", { language: lang });
          btn.parentNode.appendChild(note);
          setTimeout(function () { if (note.parentNode) note.parentNode.removeChild(note); }, 5000);
        }
        return;
      }
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.lang = voice.lang; u.rate = 0.9;
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
      var head = (correct ? t("Nice catch! ") : t("Not quite — ")) + (st.truth ? "✅ " : "🚫 ");
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
  /* about the round and the fakes, never the reader (D-053; messaging.md, 24 Sep 2026) */
  function truthPraise(c, t_) {
    var r = c / t_;
    if (r === 1) return t("Every fake spotted. 🔎");
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
      node.querySelector("#clearedOther").addEventListener("click", goGames);
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
        /* the round, never the reader: a new high score says so, otherwise the topic is the heading
           (and is not repeated under it) */
        '<h2>' + (isHi ? t("🏆 New high score!") : esc(label)) + '</h2>' +
        '<div class="sub">' + tf("{c}/{t} correct", { c: r.correct, t: r.total }) + (isHi ? ' · ' + esc(label) : '') + '</div>' +
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
          '<button class="btn" id="again">' + t("Play again") + '</button>' +
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

  // ---------- onboarding (FEAT-011 / US-008): 3 cards, skippable, once ----------
  // The closed list the reader chooses from, and the only values the counter
  // will accept. Kept here beside the screen that asks, so the words a reader
  // sees and the values that are stored cannot drift apart.
  var DISCOVERY_CHOICES = [
    ["unknown", "Prefer not to say"],
    ["tiktok", "TikTok"],
    ["youtube", "YouTube"],
    ["instagram", "Instagram"],
    ["facebook", "Facebook"],
    ["search", "A search engine"],
    ["referral", "Someone told me"],
    ["other", "Somewhere else"],
    ["dontremember", "I do not remember"]
  ];
  // The reader's stored answer, in the words they chose it from (the Privacy
  // screen's "See what is stored" list shows it back to them).
  function discoveryLabel(v) {
    for (var i = 0; i < DISCOVERY_CHOICES.length; i++) if (DISCOVERY_CHOICES[i][0] === v) return t(DISCOVERY_CHOICES[i][1]);
    return String(v);
  }

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
        // ONE sentence for this slide and the Settings country card, so the two
        // cannot drift. The old text said the country picks a bookshop, which no
        // code does, and that it is "counted as a country" - but the country
        // that is counted comes from the internet connection, not this choice.
        text: t("It will place you on your country's board when contests start. Until then it stays on this device and is not sent to Qpio. The country Qpio counts comes from your internet connection, not from this choice."),
        pick: "country" },
      // ASKED ONCE, ANSWERED BY THE READER, NEVER INFERRED.
      //
      // CEO, 6 Sep 2026: "Do not create a hidden lifetime attribution tracker.
      // On first onboarding/install, ask the reader once: How did you hear
      // about Qpio?"
      //
      // The alternative the industry uses is a tracking parameter that follows
      // someone from a post to an install and onwards for the life of the app.
      // This is the opposite: one question, one word kept on this device, no
      // link to anything the reader does afterwards. "Prefer not to say" is a
      // real answer and costs them nothing.
      { emoji: "👋", title: t("How did you hear about Qpio?"),
        text: t("One tap, and it helps us know where to put our effort. It is kept as a single word — no link to you, and nothing follows you around."),
        pick: "discovery" },
      { emoji: "⚙️", title: t("Made for the way you learn."),
        text: t("Turn timers off, switch on dyslexia-friendly text, read-aloud or high contrast — all free, all in Settings. There is a Kids mode too, which never asks for anything at all. Your progress is currently stored on this device — copy your backup code before you change phone.") }
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
        (s.pick === "discovery" ? '<select class="cselect" id="onbDiscovery" aria-label="' +
          esc(t("How did you hear about Qpio?")) + '">' +
          DISCOVERY_CHOICES.map(function (d) {
            return '<option value="' + d[0] + '">' + esc(t(d[1])) + '</option>';
          }).join("") + '</select>' : '') +
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
    var dsField = node.querySelector("#onbDiscovery");
    if (dsField) {
      var pref = LS.get("discovery", null);
      if (pref) dsField.value = pref;
      // Saved as it changes rather than at the end: every step renders a new
      // node, so by the time the last slide finishes this one no longer exists.
      dsField.addEventListener("change", function () {
        LS.set("discovery", dsField.value || "unknown");
      });
    }

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
  // Another tab ran "Delete everything on this device". Halt first, so this
  // tab's pagehide cannot send its open round or write firstweek and mhealth
  // back, then restart on the empty storage.
  window.addEventListener("storage", function (e) { if (e.key === "qpio.wiped" && e.newValue) { WIPING = true; try { QpioMeasure.halt(); } catch (x) {} location.replace("/"); } });
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
