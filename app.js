/* Curio — v1 MVP. Vanilla JS, no build, state in localStorage. */
(function () {
  "use strict";

  var Q = window.CURIO_QUESTIONS || [];
  var CATS = ["History", "Science", "Geography", "Arts", "Tech", "Nature"];
  var CAT_EMOJI = { History: "🏛️", Science: "🔬", Geography: "🌍", Arts: "🎨", Tech: "💻", Nature: "🦉" };
  var DAILY_COUNT = 5;
  var QUICKFIRE_COUNT = 10;
  var QUICKFIRE_SECS = 15;

  // ---------- storage ----------
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("curio." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("curio." + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- date helpers (local day) ----------
  function todayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dayNumber(d) { d = d || new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000); }

  // Deterministic PRNG so everyone gets the same daily set.
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffledIndices(n, seed) {
    var rng = mulberry32(seed), arr = [];
    for (var i = 0; i < n; i++) arr.push(i);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(rng() * (j + 1)); var t = arr[j]; arr[j] = arr[k]; arr[k] = t; }
    return arr;
  }

  function dailyQuestions() {
    var seed = dayNumber() + 1;
    var order = shuffledIndices(Q.length, seed);
    return order.slice(0, DAILY_COUNT).map(function (i) { return Q[i]; });
  }
  function quickfireQuestions(cat) {
    var pool = cat === "All" ? Q.slice() : Q.filter(function (x) { return x.cat === cat; });
    // random each play
    for (var i = pool.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[k]; pool[k] = t; }
    return pool.slice(0, Math.min(QUICKFIRE_COUNT, pool.length));
  }

  // For each question, shuffle the option display order deterministically per session.
  function withShuffledOptions(q, seed) {
    var order = shuffledIndices(q.options.length, seed);
    var opts = order.map(function (i) { return q.options[i]; });
    var ans = order.indexOf(q.answer);
    return { q: q.q, cat: q.cat, diff: q.diff, fact: q.fact, options: opts, answer: ans };
  }

  // ---------- DOM ----------
  var app = document.getElementById("app");
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---------- streak ----------
  function getStreak() { return LS.get("streak", { count: 0, best: 0, last: null }); }
  function bumpStreak() {
    var s = getStreak(), tk = todayKey();
    if (s.last === tk) return s; // already counted today
    var yk = todayKey(new Date(Date.now() - 86400000));
    s.count = (s.last === yk) ? s.count + 1 : 1;
    s.best = Math.max(s.best || 0, s.count);
    s.last = tk;
    LS.set("streak", s);
    return s;
  }

  // ---------- views ----------
  function render(node) { app.innerHTML = ""; app.appendChild(node); window.scrollTo(0, 0); }

  function homeView() {
    var s = getStreak();
    var daily = LS.get("daily." + todayKey(), null);
    var wrap = el('<div class="grid"></div>');

    wrap.appendChild(el(
      '<div class="card hero">' +
        '<span class="pill free">Free forever</span>' +
        '<h1>Feed your brain today.</h1>' +
        '<p>Five questions. Same for everyone, everywhere. Every answer teaches you something worth knowing. Keep the streak alive.</p>' +
        '<div class="btnrow">' +
          '<button class="btn" id="startDaily">' + (daily ? "Review today's ✓" : "Play daily challenge") + '</button>' +
          (s.count > 0 ? '<span class="streakchip">🔥 ' + s.count + ' day' + (s.count === 1 ? "" : "s") + '</span>' : '') +
        '</div>' +
      '</div>'
    ));

    var modes = el('<div class="row"></div>');
    modes.appendChild(el(
      '<div class="card mode" id="modeQuick">' +
        '<div class="emoji">⚡</div><h3>Quick-Fire</h3>' +
        '<p>Ten timed questions. Beat the clock, chase the speed bonus, top your high score.</p>' +
      '</div>'
    ));
    modes.appendChild(el(
      '<div class="card mode" id="modeDaily">' +
        '<div class="emoji">📅</div><h3>Daily Challenge</h3>' +
        '<p>' + (daily ? '<span class="done-badge">Done today — ' + daily.score + '/' + DAILY_COUNT + '. Come back tomorrow.</span>' : "Today's five. Shareable score. The daily ritual.") + '</p>' +
      '</div>'
    ));
    wrap.appendChild(modes);

    // category picker feeding quick-fire
    var picker = el('<div class="card"><div class="section-title" style="margin-top:0">Quick-Fire topic</div><div class="cats"></div><div class="btnrow"><button class="btn block" id="startQuick">Start Quick-Fire ⚡</button></div></div>');
    var cats = picker.querySelector(".cats");
    var chosen = LS.get("lastCat", "All");
    ["All"].concat(CATS).forEach(function (c) {
      var b = el('<button class="chip" aria-pressed="' + (c === chosen ? "true" : "false") + '">' + (CAT_EMOJI[c] || "✨") + " " + c + '</button>');
      b.addEventListener("click", function () {
        chosen = c; LS.set("lastCat", c);
        cats.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
      });
      cats.appendChild(b);
    });
    wrap.appendChild(picker);

    // leaderboard
    wrap.appendChild(leaderboardCard());

    // streak stats + mission
    wrap.appendChild(el(
      '<div class="card">' +
        '<div class="section-title" style="margin-top:0">Your stats</div>' +
        '<div class="row" style="margin-top:6px">' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + s.count + '</div><div class="mini">current streak</div></div>' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + (s.best || 0) + '</div><div class="mini">best streak</div></div>' +
          '<div style="flex:1"><div class="scorebig" style="font-size:34px">' + LS.get("hiscore", 0) + '</div><div class="mini">quick-fire best</div></div>' +
        '</div>' +
      '</div>'
    ));

    wrap.appendChild(el(
      '<div class="footer">Curio — knowledge is free, forever. No ads, no data selling.<br>' +
      'Make being a nerd sexy again. 🧠</div>'
    ));

    // wire
    wrap.querySelector("#startDaily").addEventListener("click", startDaily);
    wrap.querySelector("#modeDaily").addEventListener("click", startDaily);
    picker.querySelector("#startQuick").addEventListener("click", function () { startQuickfire(chosen); });
    wrap.querySelector("#modeQuick").addEventListener("click", function () {
      picker.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return wrap;
  }

  function leaderboardCard() {
    var board = LS.get("leaderboard", []);
    var card = el('<div class="card"><div class="section-title" style="margin-top:0">🏆 Quick-Fire leaderboard (this device)</div></div>');
    if (!board.length) {
      card.appendChild(el('<div class="empty">No scores yet. Play Quick-Fire to claim the top spot.</div>'));
    } else {
      var ul = el('<ul class="lb"></ul>');
      board.slice(0, 8).forEach(function (row, i) {
        ul.appendChild(el('<li><span class="rank">' + (i + 1) + '</span><span class="who">' + esc(row.name) + '</span><span class="pts">' + row.pts + '</span></li>'));
      });
      card.appendChild(ul);
    }
    return card;
  }

  // ---------- quiz engine ----------
  function runQuiz(cfg) {
    // cfg: { title, questions:[...], timed:bool, onDone(result) }
    var idx = 0, score = 0, correctCount = 0, marks = [], answered = false, timer = null, timeLeft = 0;
    var seedBase = dayNumber() * 100;

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
          '<button class="btn ghost" id="quit" style="padding:8px 12px;font-size:13px">← Quit</button>' +
          '<div class="progress"><i style="width:' + Math.round((idx) / cfg.questions.length * 100) + '%"></i></div>' +
          '<div class="qmeta">' + (idx + 1) + '/' + cfg.questions.length + (cfg.timed ? ' · <span class="timer" id="timer">' + QUICKFIRE_SECS + 's</span>' : '') + '</div>' +
        '</div>'
      ));
      var body = el(
        '<div>' +
          '<span class="qcat">' + (CAT_EMOJI[q.cat] || "") + " " + esc(q.cat) + ' · ' + ["Easy", "Medium", "Hard"][q.diff - 1] + '</span>' +
          '<div class="qtext">' + esc(q.q) + '</div>' +
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
      node.querySelector("#quit").addEventListener("click", function () { stopTimer(); render(homeView()); });

      if (cfg.timed) {
        timeLeft = QUICKFIRE_SECS;
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

    function choose(i, q, opts, tLeft) {
      if (answered) return;
      answered = true; stopTimer();
      var correct = i === q.answer;
      if (correct) {
        correctCount++;
        var pts = 100 + (cfg.timed ? Math.max(0, tLeft) * 10 : 0) + (q.diff - 1) * 25;
        score += pts;
      }
      marks.push(correct);
      var buttons = opts.querySelectorAll(".opt");
      buttons.forEach(function (b, bi) {
        b.disabled = true;
        if (bi === q.answer) b.classList.add("correct");
        else if (bi === i) b.classList.add("wrong");
      });
      var fact = el('<div class="fact"><b>' + (correct ? "Correct! " : (i === -1 ? "Time! " : "Not quite. ")) + '</b>' + esc(q.fact) + '<div class="btnrow"><button class="btn" id="next">' + (idx + 1 < cfg.questions.length ? "Next →" : "See results →") + '</button></div></div>');
      node.appendChild(fact);
      requestAnimationFrame(function () { fact.classList.add("show"); });
      fact.querySelector("#next").addEventListener("click", function () {
        idx++;
        if (idx < cfg.questions.length) show();
        else cfg.onDone({ score: score, correct: correctCount, total: cfg.questions.length, marks: marks });
      });
    }
  }

  // ---------- daily ----------
  function startDaily() {
    var existing = LS.get("daily." + todayKey(), null);
    if (existing) { return dailyResultView(existing, true); }
    runQuiz({
      title: "Daily Challenge",
      questions: dailyQuestions(),
      timed: false,
      onDone: function (r) {
        var s = bumpStreak();
        var rec = { score: r.correct, total: r.total, marks: r.marks, streak: s.count, date: todayKey() };
        LS.set("daily." + todayKey(), rec);
        dailyResultView(rec, false);
      }
    });
  }

  function dailyResultView(rec, already) {
    var emoji = rec.marks.map(function (m) { return m ? "🟩" : "🟥"; }).join("");
    var s = getStreak();
    var node = el(
      '<div class="card result">' +
        '<div class="scorebig">' + rec.score + '/' + rec.total + '</div>' +
        '<h2>' + (already ? "Today's challenge" : praise(rec.score, rec.total)) + '</h2>' +
        '<div class="sub">🔥 ' + s.count + '-day streak' + (s.count === s.best && s.best > 1 ? " — your best ever!" : "") + '</div>' +
        '<div class="sharebox">' + emoji + '</div>' +
        '<div class="mini">Curio Daily · ' + rec.date + '</div>' +
        '<div class="btnrow center" style="justify-content:center">' +
          '<button class="btn" id="share">Copy shareable result</button>' +
          '<button class="btn ghost" id="home">Home</button>' +
        '</div>' +
        '<div class="mini" id="msg"></div>' +
      '</div>'
    );
    render(node);
    node.querySelector("#home").addEventListener("click", function () { render(homeView()); });
    node.querySelector("#share").addEventListener("click", function () {
      var text = "Curio Daily " + rec.date + "\n" + emoji + " " + rec.score + "/" + rec.total + "\n🔥 " + s.count + "-day streak\nPlay free — knowledge should be.";
      copy(text, node.querySelector("#msg"));
    });
  }

  // ---------- quickfire ----------
  function startQuickfire(cat) {
    var qs = quickfireQuestions(cat);
    if (!qs.length) { render(homeView()); return; }
    runQuiz({
      title: "Quick-Fire",
      questions: qs,
      timed: true,
      onDone: function (r) { quickResultView(r, cat); }
    });
  }

  function quickResultView(r, cat) {
    var hi = LS.get("hiscore", 0);
    var isHi = r.score > hi;
    if (isHi) LS.set("hiscore", r.score);
    var node = el(
      '<div class="card result">' +
        '<div class="scorebig">' + r.score + '</div>' +
        '<h2>' + (isHi ? "🏆 New high score!" : praise(r.correct, r.total)) + '</h2>' +
        '<div class="sub">' + r.correct + '/' + r.total + ' correct · ' + esc(cat) + '</div>' +
        '<div class="btnrow" style="justify-content:center">' +
          '<button class="btn" id="save">Save to leaderboard</button>' +
          '<button class="btn ghost" id="again">Play again</button>' +
          '<button class="btn ghost" id="home">Home</button>' +
        '</div>' +
        '<div class="mini" id="msg"></div>' +
      '</div>'
    );
    render(node);
    node.querySelector("#home").addEventListener("click", function () { render(homeView()); });
    node.querySelector("#again").addEventListener("click", function () { startQuickfire(cat); });
    node.querySelector("#save").addEventListener("click", function () {
      var name = (prompt("Name for the leaderboard:", LS.get("playerName", "Nerd")) || "").trim().slice(0, 16) || "Nerd";
      LS.set("playerName", name);
      var board = LS.get("leaderboard", []);
      board.push({ name: name, pts: r.score, date: todayKey() });
      board.sort(function (a, b) { return b.pts - a.pts; });
      LS.set("leaderboard", board.slice(0, 20));
      node.querySelector("#save").disabled = true;
      node.querySelector("#msg").textContent = "Saved! ⭐";
    });
  }

  function praise(c, t) {
    var r = c / t;
    if (r === 1) return "Flawless. Certified nerd. 🧠";
    if (r >= 0.8) return "Sharp. Very sharp.";
    if (r >= 0.6) return "Solid work.";
    if (r >= 0.4) return "Room to grow — you learned something.";
    return "Everyone starts somewhere. Now you know more.";
  }

  function copy(text, msgEl) {
    function ok() { if (msgEl) msgEl.textContent = "Copied to clipboard! 📋 Paste it anywhere."; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { if (msgEl) msgEl.textContent = text; }
      document.body.removeChild(ta);
    }
  }

  // ---------- boot ----------
  render(homeView());
})();
