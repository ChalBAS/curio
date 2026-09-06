/* QPIO MEASUREMENT — the reader's half.
 *
 * CEO, 6 September 2026: "Analytics must never silently fail and then look like
 * real user behaviour." And: "Use economical batching rather than one
 * network/database operation per answer when unnecessary."
 *
 * ONE SEND PER ROUND. A round is five questions. Five sends would cost five
 * times as much for the same information, and the gaps between them would be a
 * behavioural trace in their own right — the shape of somebody thinking.
 *
 * WHAT LEAVES THE DEVICE, in full, so the privacy page can be checked against
 * this file rather than against a promise:
 *
 *   the content day the reader was served      2026-09-06
 *   language and mode                          en · adult
 *   surface                                    daily
 *   platform, and whether installed            ios · yes
 *   app build and bank release                 86 · 2026-09-06
 *   how they once said they found Qpio         tiktok
 *   which week-band they first played in       new | w2_4 | w5_12 | w13plus
 *   per question: id, revision, translation revision, position, answered, correct
 *   per door tapped: question id, class, slot
 *
 * WHAT NEVER LEAVES IT, and could not, because nothing here reads it: any
 * identifier of any kind, any timestamp finer than the day, the questions the
 * reader has met before, their vault, their score, their streak, their answers
 * to anything they did not complete, or any free text.
 *
 * THE BAND IS NOT AN IDENTIFIER. Every device that first played this week sends
 * "new". Every device that first played nine weeks ago sends "w5_12". Millions
 * of devices send the same four values, so nothing can be followed and nothing
 * singled out. What it supports is a statement about ROUNDS — "of the rounds
 * finished this week, N in 100 came from devices that first played eight or
 * more weeks ago" — and that is not a statement about people.
 */
(function () {
  "use strict";

  var ENDPOINT = "/m";
  var QUEUE_KEY = "curio.mq";        // rounds that could not be sent yet
  var FIRST_KEY = "curio.firstweek"; // the week this device first played
  var OFF_KEY = "curio.measure.off"; // the reader said no
  var HEALTH_KEY = "curio.mhealth";  // what the instrument knows about itself
  var MAX_QUEUE = 20;                 // bounded: a queue that grows without limit is a leak

  function LSget(k, d) {
    try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }
    catch (e) { return d; }
  }
  function LSset(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }

  /* THE READER CAN SAY NO, AND IT WORKS IMMEDIATELY.
   *
   * This is not a courtesy. Counting how a service is used without asking is
   * only lawful in the UK while a plain explanation and a free, simple way to
   * object are both actually shipped — the objection route is a CONDITION of
   * the exemption, not a nice-to-have to add later. So it ships in the same
   * release as the counting, and it is one boolean read before anything else
   * happens. */
  function isOff() { return LSget(OFF_KEY, false) === true; }

  /* ---------------------------------------------------------------- the day */
  /* THE READER'S OWN DAY, NOT THE SERVER'S. Qpio serves one set of five per
   * content day, and a reader in Auckland meets the same five as a reader in
   * Lima. Sending the server's UTC date would split one day's audience across
   * two rows and make every daily comparison wrong at the edges. */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function contentDay(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y = t.getUTCFullYear();
    var w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
    return y + "-W" + pad(w);
  }
  function weeksBetween(aWeek, bWeek) {
    function toDate(s) {
      var m = /^(\d{4})-W(\d{2})$/.exec(s || "");
      if (!m) return null;
      var jan4 = new Date(Date.UTC(+m[1], 0, 4));
      var mon = new Date(jan4);
      mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (+m[2] - 1) * 7);
      return mon;
    }
    var a = toDate(aWeek), b = toDate(bWeek);
    if (!a || !b) return 0;
    return Math.round((b - a) / (7 * 86400000));
  }
  function band() {
    var now = isoWeek(new Date());
    var first = LSget(FIRST_KEY, null);
    if (!first) { LSset(FIRST_KEY, now); return "new"; }
    var w = weeksBetween(first, now);
    if (w < 1) return "new";
    if (w < 5) return "w2_4";
    if (w < 13) return "w5_12";
    return "w13plus";
  }

  /* ------------------------------------------------------------- environment */
  function platform() {
    var ua = (navigator.userAgent || "").toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (/android/.test(ua)) return "android";
    if (/mobi/.test(ua)) return "other";
    return "desktop";
  }
  function installed() {
    try {
      return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
        window.navigator.standalone === true;
    } catch (e) { return false; }
  }
  /* The build the reader is running, read from the cache-busting parameter the
   * page already carries, so it cannot disagree with what was actually served. */
  function appVersion() {
    try {
      var s = document.querySelector('script[src*="app.js?v="]');
      var m = s && /v=([A-Za-z0-9._-]+)/.exec(s.getAttribute("src"));
      return m ? m[1] : "unknown";
    } catch (e) { return "unknown"; }
  }
  /* WHICH RELEASE OF THE BANK. This matters more than it looks: the daily
   * rotation is seeded partly by how many questions are in the bank, so
   * publishing questions re-deals the deck. Without it, two stretches of a
   * question's history would be different experiments glued into one series. */
  function contentVersion() {
    return (window.CURIO_CONTENT_VERSION || appVersion());
  }
  function discovery() {
    var v = LSget("curio.discovery", null);
    return typeof v === "string" && v ? v : "unknown";
  }

  /* --------------------------------------------------------- health, locally */
  /* An instrument that fails quietly is worse than no instrument: a broken
   * counter and a quiet week look identical. The device keeps its own tally so
   * a failure is visible even when the failure is "nothing reaches the server". */
  function note(signal) {
    var h = LSget(HEALTH_KEY, {});
    h[signal] = (h[signal] || 0) + 1;
    h.updated = contentDay();
    LSset(HEALTH_KEY, h);
  }

  /* ----------------------------------------------------------------- sending */
  function send(payload) {
    var body = JSON.stringify(payload);
    /* sendBeacon survives the page being closed, which is exactly when a round
     * ends. Its queue can be full, and it says so — that is a real failure and
     * it is treated as one rather than assumed away. */
    try {
      if (navigator.sendBeacon) {
        var ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
        if (ok) { note("sent"); return true; }
        note("beacon_refused");
      }
    } catch (e) { note("beacon_threw"); }

    try {
      fetch(ENDPOINT, {
        method: "POST", body: body, keepalive: true,
        headers: { "content-type": "application/json" },
        /* No cookies, no credentials — there are none, and asking for them
         * would be the first step toward having some. */
        credentials: "omit", mode: "same-origin", cache: "no-store"
      }).then(function () { note("sent_fetch"); })
        .catch(function () { queue(payload); });
      return true;
    } catch (e) { queue(payload); return false; }
  }

  /* A ROUND THAT COULD NOT BE SENT IS KEPT, ONCE. Losing it would understate
   * every rate that divides by rounds, and the loss would be invisible. The
   * queue is bounded and is dropped oldest-first, because an unbounded retry
   * store is a slow leak in someone else's browser — and because a round from
   * three weeks ago answers nothing anyone will ask. */
  function queue(payload) {
    var q = LSget(QUEUE_KEY, []);
    if (!Array.isArray(q)) q = [];
    q.push(payload);
    while (q.length > MAX_QUEUE) { q.shift(); note("queue_overflow"); }
    LSset(QUEUE_KEY, q);
    note("queued");
  }

  function flush() {
    if (isOff()) { LSset(QUEUE_KEY, []); return; }
    var q = LSget(QUEUE_KEY, []);
    if (!Array.isArray(q) || !q.length) return;
    LSset(QUEUE_KEY, []);
    for (var i = 0; i < q.length; i++) {
      /* Only rounds still within the day window the server will accept. An
       * older one would be refused there anyway, and re-sending it forever
       * would be a loop that never drains. */
      var d = Date.parse((q[i] && q[i].d) + "T00:00:00Z");
      if (isNaN(d) || Math.abs(Date.now() - d) > 2 * 86400000) { note("dropped_stale"); continue; }
      send(q[i]);
    }
  }

  /* ------------------------------------------------------------------- public */
  /* round({ surface, mode, questions, doors, done })
   *
   *   questions: [{ id, qrev, lrev, pos, answered, correct }]
   *   doors:     [{ id, cls, slot }]
   *
   * Called once, when a round ends. Anything missing or malformed is dropped
   * here rather than sent for the server to refuse — a refusal costs a request
   * and tells us nothing we could not see locally. */
  function round(r) {
    if (isOff() || !r || !Array.isArray(r.questions) || !r.questions.length) return false;

    var qs = [];
    for (var i = 0; i < r.questions.length; i++) {
      var q = r.questions[i];
      if (!q || !q.id) continue;
      qs.push({
        id: String(q.id),
        qrev: q.qrev || 1,
        lrev: q.lrev || 1,
        pos: q.pos || (i + 1),
        a: q.answered ? 1 : 0,
        c: q.correct ? 1 : 0
      });
    }
    if (!qs.length) { note("empty_round"); return false; }

    var doors = [];
    var raw = Array.isArray(r.doors) ? r.doors : [];
    for (var j = 0; j < raw.length; j++) {
      var d = raw[j];
      if (d && d.id && d.cls && d.slot) doors.push({ id: String(d.id), cls: d.cls, slot: d.slot, n: 1 });
    }

    var payload = {
      d: contentDay(),
      lang: (window.QLANG === "fr" ? "fr" : "en"),
      mode: (r.mode === "kids" ? "kids" : "adult"),
      surface: r.surface || "daily",
      plat: platform(),
      inst: installed() ? 1 : 0,
      av: appVersion(),
      cv: contentVersion(),
      ds: discovery(),
      band: band(),
      done: r.done ? 1 : 0,
      q: qs,
      doors: doors
    };
    return send(payload);
  }

  /* ---------------------------------------------------- a round, as it happens
   *
   * SHOWN IS THE DENOMINATOR, AND IT ONLY EXISTS IF ABANDONED ROUNDS COUNT.
   *
   * Sending only on completion would mean every question a reader gave up on
   * was never recorded as shown. Drop-off - "which question stops people" - is
   * one of the few things this instrument can genuinely see, and it would be
   * invisible: the questions people quit on would look identical to questions
   * nobody was ever given.
   *
   * So a round is opened when it starts, marked as it goes, and sent when it
   * ends OR when the page goes away, whichever happens first. sendBeacon is
   * what makes the second half possible - it survives the tab closing.
   *
   *   begin({ surface, mode, questions })   questions: [{id,qrev,lrev}]
   *   mark(pos, answered, correct)
   *   door(pos, cls, slot)
   *   finish()
   */
  var live = null;

  function begin(r) {
    if (isOff() || !r || !Array.isArray(r.questions) || !r.questions.length) { live = null; return; }
    live = {
      surface: r.surface || "daily",
      mode: r.mode === "kids" ? "kids" : "adult",
      questions: r.questions.map(function (q, i) {
        return { id: q && q.id, qrev: (q && q.qrev) || 1, lrev: (q && q.lrev) || 1,
                 pos: i + 1, answered: 0, correct: 0 };
      }),
      doors: [],
      done: false,
      sent: false
    };
  }

  function mark(pos, answered, correct) {
    if (!live) return;
    var q = live.questions[pos - 1];
    if (!q) return;
    q.answered = answered ? 1 : 0;
    q.correct = correct ? 1 : 0;
  }

  function door(pos, cls, slot) {
    if (!live) return;
    var q = live.questions[pos - 1];
    if (!q || !q.id) return;
    live.doors.push({ id: q.id, cls: cls, slot: slot });
  }

  function finish(complete) {
    if (!live || live.sent) { live = null; return false; }
    live.sent = true;
    var payload = live;
    live = null;
    return round({
      surface: payload.surface,
      mode: payload.mode,
      questions: payload.questions,
      doors: payload.doors,
      /* A round is complete when every question in it was answered. Anything
       * else is a round that was served and abandoned, which still counts as
       * shown - that is the whole point of sending on the way out. */
      done: complete === undefined
        ? payload.questions.every(function (q) { return q.answered; })
        : !!complete
    });
  }

  /* The tab going away is the commonest way a round ends, not the rarest.
   * pagehide fires where unload does not on mobile Safari, and the hidden
   * state covers the reader switching apps and never coming back. */
  function onAway() { try { if (live) finish(); } catch (e) { /* never block a page unload */ } }
  try {
    window.addEventListener("pagehide", onAway);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") onAway();
    });
  } catch (e) { /* an environment without these still sends on completion */ }

  /* What the device knows about its own instrument, for the founder's own
   * diagnostics. Never sent anywhere; it exists so "no numbers" can be told
   * apart from "no readers" without guessing. */
  function health() { return LSget(HEALTH_KEY, {}); }

  function setOptOut(off) {
    LSset(OFF_KEY, !!off);
    if (off) { LSset(QUEUE_KEY, []); LSset(HEALTH_KEY, {}); }
    return !!off;
  }

  window.QpioMeasure = {
    begin: begin,
    mark: mark,
    door: door,
    finish: finish,
    round: round,
    flush: flush,
    health: health,
    isOff: isOff,
    setOptOut: setOptOut,
    /* exposed for the tests, which check the parts rather than the network */
    _internals: { contentDay: contentDay, isoWeek: isoWeek, weeksBetween: weeksBetween,
      band: band, platform: platform, appVersion: appVersion, discovery: discovery }
  };

  /* Anything stranded by a closed tab or a dropped connection goes on the next
   * visit, not never. */
  try { flush(); } catch (e) { /* measurement must never stop the app loading */ }
})();
