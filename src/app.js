/* Curio — v1.1. Vanilla JS, no build, state in localStorage.
   Modules: LS (storage) · Settings/Comfort · Stats (Brain Map) · Vault (SRS)
   · quiz engine · views.
   i18n: UI chrome goes through t() (src/i18n.js). Stored data values,
   localStorage keys, scoring and the daily seed are language-independent. */
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
  var Q_EN = window.CURIO_QUESTIONS || [];
  var Q_FR = window.CURIO_QUESTIONS_FR || [];
  var Q = (QLANG === "fr" && Q_FR.length) ? Q_FR : Q_EN;
  var CATS = ["History", "Science", "Geography", "Arts", "Tech", "Nature"];
  var CAT_EMOJI = { History: "🏛️", Science: "🔬", Geography: "🌍", Arts: "🎨", Tech: "💻", Nature: "🦉" };
  var DAILY_COUNT = 5;
  var QUICKFIRE_COUNT = 10;
  var VAULT_SESSION_MAX = 10;

  // ---------- storage ----------
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("curio." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("curio." + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- stable question ids (hash of question text) ----------
  function qid(q) {
    var h = 5381, s = q.q;
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
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(rng() * (j + 1)); var t = arr[j]; arr[j] = arr[k]; arr[k] = t; }
    return arr;
  }

  // ---------- settings / comfort ----------
  var DEFAULT_SETTINGS = {
    timer: "normal",      // normal (15s) | relaxed (30s) | off
    dyslexia: false,
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
  function dailyQuestions() {
    var p = pool();
    var seed = dayNumber() + (settings.ageMode === "kids" ? 51000 : 1);
    var order = shuffledIndices(p.length, seed);
    return order.slice(0, DAILY_COUNT).map(function (i) { return p[i]; });
  }
  function quickfireQuestions(cat, region) {
    var p = pool().filter(function (x) { return cat === "All" || x.cat === cat; });
    if (region && region !== "All") p = p.filter(function (x) { return x.region === region; });
    for (var i = p.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)); var t = p[i]; p[i] = p[k]; p[k] = t; }
    return p.slice(0, Math.min(QUICKFIRE_COUNT, p.length));
  }
  // Regions present among History questions (for the region sub-filter), in a stable order.
  function historyRegions() {
    var order = ["Africa", "Americas", "Asia", "Europe", "MiddleEast", "Global"];
    var have = {};
    Q.forEach(function (x) { if (x.cat === "History" && x.region) have[x.region] = true; });
    return order.filter(function (r) { return have[r]; });
  }

  // For each question, shuffle the option display order deterministically per session.
  function withShuffledOptions(q, seed) {
    var order = shuffledIndices(q.options.length, seed);
    var opts = order.map(function (i) { return q.options[i]; });
    var ans = order.indexOf(q.answer);
    return { id: qid(q), q: q.q, cat: q.cat, region: q.region, theme: q.theme, diff: q.diff, fact: q.fact, src: q.src, deeper: q.deeper, options: opts, answer: ans };
  }
  var REGION_LABEL = { Africa: "Africa", Americas: "Americas", Asia: "Asia", Europe: "Europe", MiddleEast: "Middle East", Global: "Global" };
  function srcLink(url) {
    if (!url) return "";
    // Visible, tappable chip on its own line — the CEO missed the old 12.5px inline link
    // while testing (issue #8). If the founder misses it, users will. VAL-06 made visible.
    return '<a class="srclink" href="' + esc(url) + '" target="_blank" rel="noopener">' + t("📖 Check the source ↗") + '</a>';
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
  function render(node) { hushed(); app.innerHTML = ""; app.appendChild(node); window.scrollTo(0, 0); }

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

  // ---------- home ----------
  function homeView() {
    var s = getStreak();
    var daily = LS.get("daily." + todayKey() + (settings.ageMode === "kids" ? ".kids" : ""), null);
    var due = vaultDue();
    var wrap = el('<div class="grid"></div>');

    wrap.appendChild(el(
      '<div class="card hero">' +
        '<span class="pill free">' + t("Free forever") + '</span>' +
        (settings.ageMode === "kids" ? '<span class="pill kids">' + t("Kids mode") + '</span>' : '') +
        '<h1>' + t("Feed your brain today.") + '</h1>' +
        '<p>' + t("Five questions. Same for everyone, everywhere. Every answer teaches you something worth knowing. Keep the streak alive.") + '</p>' +
        '<div class="btnrow">' +
          '<button class="btn" id="startDaily">' + (daily ? t("Review today's ✓") : t("Play daily challenge")) + '</button>' +
          (s.count > 0 ? '<span class="streakchip">' + (s.count === 1 ? t("🔥 1 day") : tf("🔥 {n} days", { n: s.count })) + '</span>' : '') +
        '</div>' +
      '</div>'
    ));

    // Memory Vault card
    if (due.length > 0) {
      wrap.appendChild(el(
        '<div class="card vaultcard">' +
          '<div class="vaultrow"><div><h3>' + t("🗝️ Memory Vault") + '</h3>' +
          '<p>' + (due.length === 1
            ? t("1 fact ready to strengthen. Beat them 5 times over 2 months and they’re yours for good.")
            : tf("{n} facts ready to strengthen. Beat them 5 times over 2 months and they’re yours for good.", { n: due.length })) + '</p></div>' +
          '<button class="btn" id="startVault">' + t("Review") + '</button></div>' +
        '</div>'
      ));
    } else if (vaultCount() > 0) {
      var v = getVault();
      var next = Object.keys(v).filter(function (id) { return BY_ID[id]; }).map(function (k) { return v[k].due; }).sort()[0];
      wrap.appendChild(el(
        '<div class="card vaultcard quiet">' +
          '<h3>' + t("🗝️ Memory Vault") + '</h3>' +
          '<p>' + tf("All {n} facts strengthened for now. Next review: {date}. Facts mastered for good: {m} 🏅",
            { n: vaultCount(), date: esc(next), m: (getStats().mastered || 0) }) + '</p>' +
        '</div>'
      ));
    }

    var modes = el('<div class="row"></div>');
    modes.appendChild(el(
      '<div class="card mode" id="modeQuick">' +
        '<div class="emoji">⚡</div><h3>' + t("Quick-Fire") + '</h3>' +
        '<p>' + (timerSecs()
          ? tf("Ten questions, {s}s each. Chase your high score.", { s: timerSecs() })
          : t("Ten questions, no timer. Chase your high score.")) + '</p>' +
      '</div>'
    ));
    modes.appendChild(el(
      '<div class="card mode" id="modeDaily">' +
        '<div class="emoji">📅</div><h3>' + t("Daily Challenge") + '</h3>' +
        '<p>' + (daily ? '<span class="done-badge">' + tf("Done today — {score}/{total}. Come back tomorrow.", { score: daily.score, total: DAILY_COUNT }) + '</span>' : t("Today's five. Shareable score. The daily ritual.")) + '</p>' +
      '</div>'
    ));
    if (truthPool().length >= 4) {
      modes.appendChild(el(
        '<div class="card mode" id="modeTruth">' +
          '<div class="emoji">🔎</div><h3>' + t("Fact or Fake?") + '</h3>' +
          '<p>' + t("Real facts hide among convincing fakes. Spot the tricks — every verdict comes with a source.") + '</p>' +
        '</div>'
      ));
    }
    if (cityPacks().length) {
      modes.appendChild(el(
        '<div class="card mode" id="modeTravel">' +
          '<div class="emoji">🧳</div><h3>' + t("Before you travel") + '</h3>' +
          '<p>' + tf("{n} cities, told from their own history. Learn the place, the food, and a few words before you go.", { n: cityPacks().length }) + '</p>' +
        '</div>'
      ));
    }
    wrap.appendChild(modes);

    // category picker feeding quick-fire
    var picker = el('<div class="card"><div class="section-title" style="margin-top:0">' + t("Quick-Fire topic") + '</div><div class="cats"></div><div class="regionrow hidden"><div class="mini" style="margin:2px 0 6px">' + t("History by region — every part of the world, on its own terms:") + '</div><div class="cats regioncats"></div></div><div class="btnrow"><button class="btn block" id="startQuick">' + t("Start Quick-Fire ⚡") + '</button></div></div>');
    var cats = picker.querySelector(".cats");
    var regionRow = picker.querySelector(".regionrow");
    var regionCats = picker.querySelector(".regioncats");
    var chosen = LS.get("lastCat", "All");
    var chosenRegion = "All";
    function syncRegionRow() { regionRow.classList.toggle("hidden", chosen !== "History" || historyRegions().length === 0); }
    ["All"].concat(CATS).forEach(function (c) {
      var b = el('<button class="chip" aria-pressed="' + (c === chosen ? "true" : "false") + '">' + (CAT_EMOJI[c] || "✨") + " " + t(c) + '</button>');
      b.addEventListener("click", function () {
        chosen = c; LS.set("lastCat", c);
        cats.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        syncRegionRow();
      });
      cats.appendChild(b);
    });
    ["All"].concat(historyRegions()).forEach(function (rg) {
      var label = rg === "All" ? t("🌍 All regions") : (rg === "Africa" ? "🌍" : rg === "Americas" ? "🌎" : rg === "Asia" ? "🌏" : rg === "Europe" ? "🏰" : rg === "MiddleEast" ? "🕌" : "🗺️") + " " + t(REGION_LABEL[rg] || rg);
      var b = el('<button class="chip" aria-pressed="' + (rg === chosenRegion ? "true" : "false") + '">' + label + '</button>');
      b.addEventListener("click", function () {
        chosenRegion = rg;
        regionCats.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
      });
      regionCats.appendChild(b);
    });
    syncRegionRow();
    wrap.appendChild(picker);

    // Brain Map
    wrap.appendChild(brainMapCard());

    // leaderboard
    wrap.appendChild(leaderboardCard());

    // streak stats
    wrap.appendChild(el(
      '<div class="card">' +
        '<div class="section-title" style="margin-top:0">' + t("Your stats") + '</div>' +
        '<div class="row" style="margin-top:6px">' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + s.count + '</div><div class="mini">' + t("current streak") + '</div></div>' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + (s.best || 0) + '</div><div class="mini">' + t("best streak") + '</div></div>' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + LS.get("hiscore", 0) + '</div><div class="mini">' + t("quick-fire best") + '</div></div>' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + (getStats().mastered || 0) + '</div><div class="mini">' + t("facts mastered") + '</div></div>' +
        '</div>' +
      '</div>'
    ));

    wrap.appendChild(el(
      '<div class="footer">' + t("Qpio — knowledge is free, forever. No ads, no data selling.") + '<br>' +
      t("I am curious to become wise. 🧠") + ' · <a href="#" id="openComfort2">' + t("Comfort & settings") + '</a></div>'
    ));

    // wire
    wrap.querySelector("#startDaily").addEventListener("click", startDaily);
    wrap.querySelector("#modeDaily").addEventListener("click", startDaily);
    picker.querySelector("#startQuick").addEventListener("click", function () { startQuickfire(chosen, chosen === "History" ? chosenRegion : "All"); });
    wrap.querySelector("#modeQuick").addEventListener("click", function () {
      picker.scrollIntoView({ behavior: settings.motion === "reduced" ? "auto" : "smooth", block: "center" });
    });
    var sv = wrap.querySelector("#startVault");
    if (sv) sv.addEventListener("click", startVaultSession);
    var mt = wrap.querySelector("#modeTruth");
    if (mt) mt.addEventListener("click", startTruthLab);
    var mtr = wrap.querySelector("#modeTravel");
    if (mtr) mtr.addEventListener("click", function () { render(cityHomeView()); });
    wrap.querySelector("#openComfort2").addEventListener("click", function (e) { e.preventDefault(); render(comfortView()); });

    return wrap;
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

  function comfortView() {
    var node = el('<div class="card"></div>');
    node.appendChild(el('<div class="quizhead" style="margin-bottom:6px"><button class="btn ghost" id="back" style="padding:8px 12px;font-size:13px">' + t("← Home") + '</button><h2 style="margin:0 auto">' + t("Comfort & settings") + '</h2><span style="width:64px"></span></div>'));
    node.appendChild(el('<p class="mini" style="margin:0 0 14px">' + t("Knowledge is for everyone. Tune Qpio to the way <b>you</b> read, hear and think — nothing here is ever paywalled.") + '</p>'));

    node.appendChild(segRow(t("⏱️ Quick-Fire timer"), t("Timers measure speed, not knowledge. Turn them off if they get in the way — scoring adapts fairly."), [
      { label: t("Normal (15s)"), value: "normal" }, { label: t("Relaxed (30s)"), value: "relaxed" }, { label: t("Off"), value: "off" }
    ], settings.timer, function (v) { settings.timer = v; saveSettings(); }));

    node.appendChild(segRow(t("🔤 Dyslexia-friendly reading"), t("Wider spacing, taller lines, a rounder font."), [
      { label: t("Off"), value: false }, { label: t("On"), value: true }
    ], settings.dyslexia, function (v) { settings.dyslexia = v; saveSettings(); }));

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

    node.appendChild(segRow(t("👶 Age mode"), t("Kids mode uses kid-friendly questions only (ages ~8–12). No account, no tracking — ever."), [
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

    node.querySelector("#back").addEventListener("click", function () { render(homeView()); });
    node.querySelector("#wipe").addEventListener("click", function (e) {
      e.preventDefault();
      if (confirm(t("Erase streaks, scores, vault and settings on this device?"))) {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf("curio.") === 0) localStorage.removeItem(k); });
        settings = Object.assign({}, DEFAULT_SETTINGS);
        applySettings(); render(homeView());
      }
    });
    return node;
  }

  // ---------- quiz engine ----------
  // cfg: { questions:[...], timed:bool, vault:bool, onDone(result) }
  function runQuiz(cfg) {
    var idx = 0, score = 0, correctCount = 0, marks = [], answered = false, timer = null, timeLeft = 0;
    var seedBase = dayNumber() * 100;
    var secs = cfg.timed ? timerSecs() : null;

    var node = el('<div class="card"></div>');
    render(node);
    show();

    function show() {
      answered = false;
      var raw = cfg.questions[idx];
      var q = withShuffledOptions(raw, seedBase + idx * 7 + (cfg.timed ? 1 : 0));
      node.innerHTML = "";
      node.appendChild(el(
        '<div class="quizhead">' +
          '<button class="btn ghost" id="quit" style="padding:8px 12px;font-size:13px">' + t("← Quit") + '</button>' +
          '<div class="progress"><i style="width:' + Math.round((idx) / cfg.questions.length * 100) + '%"></i></div>' +
          '<div class="qmeta">' + (idx + 1) + '/' + cfg.questions.length + (secs ? ' · <span class="timer" id="timer">' + secs + 's</span>' : '') + '</div>' +
        '</div>'
      ));
      var catLabel = q.theme || q.cat || "";
      var catEmoji = CAT_EMOJI[q.cat] || cfg.emoji || "";
      var regionBit = q.region && REGION_LABEL[q.region] ? ' · ' + t(REGION_LABEL[q.region]) : "";
      var body = el(
        '<div>' +
          '<span class="qcat">' + catEmoji + " " + esc(t(catLabel)) + regionBit + ' · ' + [t("Easy"), t("Medium"), t("Hard")][q.diff - 1] + (cfg.vault ? ' · 🗝️ ' + t("Vault") : '') + '</span>' +
          '<div class="qtext">' + esc(q.q) + (canSpeak() ? ' <button class="speakbtn" id="speakBtn" aria-label="' + t("Read this question aloud") + '">🔊</button>' : '') + '</div>' +
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
      node.querySelector("#quit").addEventListener("click", function () { stopTimer(); render(homeView()); });

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

      var buttons = opts.querySelectorAll(".opt");
      buttons.forEach(function (b, bi) {
        b.disabled = true;
        if (bi === q.answer) { b.classList.add("correct"); b.querySelector(".key").textContent = "✓"; }
        else if (bi === i) { b.classList.add("wrong"); b.querySelector(".key").textContent = "✗"; }
      });
      var head = correct ? t("Correct! ") : (i === -1 ? t("Time! ") : t("Not quite. "));
      var hasDeeper = q.deeper && q.deeper.length > 0;
      var fact = el('<div class="fact"><b>' + head + '</b>' + esc(q.fact) + srcLink(q.src) +
        '<div class="deeperbox"></div>' +
        '<div class="btnrow">' +
          '<button class="btn" id="next">' + (idx + 1 < cfg.questions.length ? t("Next →") : t("See results →")) + '</button>' +
          (hasDeeper ? '<button class="btn ghost" id="deeper">' + t("🕳️ Go deeper") + '</button>' : '') +
        '</div></div>');
      node.appendChild(fact);
      requestAnimationFrame(function () { fact.classList.add("show"); });
      speak(head + q.fact);
      if (hasDeeper) {
        var dIdx = 0, dBox = fact.querySelector(".deeperbox"), dBtn = fact.querySelector("#deeper");
        dBtn.addEventListener("click", function () {
          if (dIdx >= q.deeper.length) return;
          var d = el('<div class="fact-deeper">🕳️ ' + esc(q.deeper[dIdx]) + '</div>');
          dBox.appendChild(d);
          requestAnimationFrame(function () { d.classList.add("show"); });
          speak(q.deeper[dIdx]);
          dIdx++;
          if (dIdx >= q.deeper.length) { dBtn.disabled = true; dBtn.textContent = t("🕳️ Bottom reached"); }
        });
      }
      fact.querySelector("#next").addEventListener("click", function () {
        idx++;
        if (idx < cfg.questions.length) show();
        else cfg.onDone({ score: score, correct: correctCount, total: cfg.questions.length, marks: marks });
      });
    }
  }

  // ---------- daily ----------
  function dailyKey() { return "daily." + todayKey() + (settings.ageMode === "kids" ? ".kids" : ""); }
  function startDaily() {
    var existing = LS.get(dailyKey(), null);
    if (existing) { return dailyResultView(existing, true); }
    runQuiz({
      questions: dailyQuestions(),
      timed: false,
      onDone: function (r) {
        var s = bumpStreak();
        var rec = { score: r.correct, total: r.total, marks: r.marks, streak: s.count, date: todayKey() };
        LS.set(dailyKey(), rec);
        dailyResultView(rec, false);
      }
    });
  }

  function dailyResultView(rec, already) {
    var emoji = rec.marks.map(function (m) { return m ? "🟩" : "🟥"; }).join("");
    var s = getStreak();
    var missed = rec.marks.filter(function (m) { return !m; }).length;
    var node = el(
      '<div class="card result">' +
        '<div class="scorebig">' + rec.score + '/' + rec.total + '</div>' +
        '<h2>' + (already ? t("Today's challenge") : praise(rec.score, rec.total)) + '</h2>' +
        '<div class="sub">' + (s.count === 1 ? t("🔥 1-day streak") : tf("🔥 {n}-day streak", { n: s.count })) + (s.count === s.best && s.best > 1 ? t(" — your best ever!") : "") + '</div>' +
        '<div class="sharebox">' + emoji + '</div>' +
        '<div class="mini">Qpio Daily · ' + rec.date + '</div>' +
        (!already && missed ? '<div class="mini" style="margin-top:10px">' + (missed === 1
          ? t("🗝️ 1 fact added to your Memory Vault — they’ll come back until you own them.")
          : tf("🗝️ {n} facts added to your Memory Vault — they’ll come back until you own them.", { n: missed })) + '</div>' : '') +
        '<div class="btnrow center" style="justify-content:center">' +
          '<button class="btn" id="share">' + t("Share result") + '</button>' +
          '<button class="btn ghost" id="home">' + t("Home") + '</button>' +
        '</div>' +
        '<div class="mini" id="msg"></div>' +
      '</div>'
    );
    render(node);
    node.querySelector("#home").addEventListener("click", function () { render(homeView()); });
    node.querySelector("#share").addEventListener("click", function () {
      var text = "Qpio Daily " + rec.date + "\n" + emoji + " " + rec.score + "/" + rec.total +
        "\n🔥 " + (s.count === 1 ? t("1-day streak") : tf("{n}-day streak", { n: s.count })) +
        "\nhttps://chalbas.github.io/curio/ — " + t("free, forever.");
      shareOrCopy(text, node.querySelector("#msg"));
    });
  }

  // ---------- vault session ----------
  function startVaultSession() {
    var due = vaultDue();
    if (!due.length) { render(homeView()); return; }
    // shuffle, cap the session
    for (var i = due.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)); var t = due[i]; due[i] = due[k]; due[k] = t; }
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
              '<button class="btn ghost" id="home">' + t("Home") + '</button>' +
            '</div>' +
          '</div>'
        );
        render(node);
        node.querySelector("#home").addEventListener("click", function () { render(homeView()); });
        var more = node.querySelector("#more");
        if (more) more.addEventListener("click", startVaultSession);
      }
    });
  }

  // ---------- City packs ("Before you travel") ----------
  function cityPacks() { return window.CURIO_CITYPACKS || []; }

  function cityHomeView() {
    var packs = cityPacks();
    var wrap = el('<div class="grid"></div>');
    wrap.appendChild(el('<div class="quizhead" style="margin-bottom:2px"><button class="btn ghost" id="back" style="padding:8px 12px;font-size:13px">' + t("← Home") + '</button><h2 style="margin:0 auto">🧳 ' + t("Before you travel") + '</h2><span style="width:64px"></span></div>'));
    wrap.appendChild(el('<p class="mini" style="margin:0 0 8px">' + t("Learn a place before you land — its real story (not just the tourist version), its food, and a few words of the local language. Free, offline, no ads.") + '</p>'));
    packs.forEach(function (p) {
      var card = el(
        '<div class="card mode citycard">' +
          '<div class="cityrow"><span class="cityemoji">' + (p.emoji || "🌍") + '</span>' +
          '<div><h3>' + esc(p.city) + '</h3><div class="mini">' + esc(p.country) + ' · ' + (REGION_LABEL[p.region] ? t(REGION_LABEL[p.region]) : esc(p.region)) + '</div></div></div>' +
          '<p>' + esc(p.blurb) + '</p>' +
        '</div>'
      );
      card.addEventListener("click", function () { cityPackView(p); });
      wrap.appendChild(card);
    });
    wrap.querySelector("#back").addEventListener("click", function () { render(homeView()); });
    return wrap;
  }

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

    render(node);
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
                '<button class="btn ghost" id="home">' + t("Home") + '</button>' +
              '</div>' +
            '</div>'
          );
          render(res);
          res.querySelector("#again").addEventListener("click", function () { play.querySelector("#playCity").click(); });
          res.querySelector("#pack").addEventListener("click", function () { cityPackView(pack); });
          res.querySelector("#home").addEventListener("click", function () { render(homeView()); });
        }
      });
    });
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
    if (pool.length < 4) { render(homeView()); return; }
    for (var i = pool.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[k]; pool[k] = t; }
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
          '<div class="qtext">“' + esc(st.s) + '”' + (canSpeak() ? ' <button class="speakbtn" id="speakBtn" aria-label="' + t("Read aloud") + '">🔊</button>' : '') + '</div>' +
          '<div class="truthbtns">' +
            '<button class="opt truthopt" id="btnFact"><span class="key">✅</span><span>' + t("Fact — this is real") + '</span></button>' +
            '<button class="opt truthopt" id="btnFake"><span class="key">🚫</span><span>' + t("Fake — don’t fall for it") + '</span></button>' +
          '</div>' +
        '</div>'
      ));
      node.querySelector("#quit").addEventListener("click", function () { render(homeView()); });
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
      var fact = el('<div class="fact"><b>' + head + '</b>' + esc(st.explain) + srcLink(st.src) +
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
            '<button class="btn ghost" id="home">' + t("Home") + '</button>' +
          '</div>' +
        '</div>'
      );
      render(res);
      res.querySelector("#home").addEventListener("click", function () { render(homeView()); });
      res.querySelector("#again").addEventListener("click", startTruthLab);
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
    if (!qs.length) { render(homeView()); return; }
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
        '<div class="btnrow" style="justify-content:center">' +
          '<button class="btn" id="save">' + t("Save to leaderboard") + '</button>' +
          '<button class="btn ghost" id="again">' + t("Play again") + '</button>' +
          '<button class="btn ghost" id="home">' + t("Home") + '</button>' +
        '</div>' +
        '<div class="mini" id="msg"></div>' +
      '</div>'
    );
    render(node);
    node.querySelector("#home").addEventListener("click", function () { render(homeView()); });
    node.querySelector("#again").addEventListener("click", function () { startQuickfire(cat, region); });
    node.querySelector("#save").addEventListener("click", function () {
      var name = (prompt(t("Name for the leaderboard:"), LS.get("playerName", "Curious")) || "").trim().slice(0, 16) || "Curious";
      LS.set("playerName", name);
      var board = LS.get("leaderboard", []);
      board.push({ name: name, pts: r.score, date: todayKey() });
      board.sort(function (a, b) { return b.pts - a.pts; });
      LS.set("leaderboard", board.slice(0, 20));
      node.querySelector("#save").disabled = true;
      node.querySelector("#msg").textContent = t("Saved! ⭐");
    });
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
      { emoji: "🦉", title: t("Knowledge should be free."),
        text: t("Qpio (say: cue-pee-oh) is a free knowledge app — no ads, no paywalls, ever. Every answer teaches you a fact worth keeping, with the source one tap away.") },
      { emoji: "📅", title: t("Five questions a day."),
        text: t("Everyone in the world gets the same daily five. Keep your streak alive — and facts you miss come back until you own them for good.") },
      { emoji: "⚙️", title: t("Made for the way you learn."),
        text: t("Timers off, dyslexia-friendly reading, read-aloud, high contrast — free in Comfort settings (⚙️). A Kids mode too: no accounts, no tracking.") }
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
        '<div class="onb-dots">' + dots + '</div>' +
        '<div class="btnrow" style="justify-content:center">' +
          '<button class="btn" id="onbNext">' + (last ? t("Play today's challenge ▶") : t("Next →")) + '</button>' +
          (last ? '' : '<button class="btn ghost" id="onbSkip">' + t("Skip") + '</button>') +
        '</div>' +
      '</div>'
    );
    render(node);
    function finish(toDaily) {
      LS.set("onboarded", true);
      if (toDaily) startDaily(); else render(homeView());
    }
    node.querySelector("#onbNext").addEventListener("click", function () {
      if (last) finish(true); else onboardingView(step + 1);
    });
    var sk = node.querySelector("#onbSkip");
    if (sk) sk.addEventListener("click", function () { finish(false); });
  }

  // ---------- boot ----------
  applySettings();
  pruneVault();
  var gear = document.getElementById("gearBtn");
  if (gear) gear.addEventListener("click", function () { render(comfortView()); });
  if (LS.get("onboarded", false)) { render(homeView()); } else { onboardingView(0); }
})();
