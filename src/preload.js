/* Qpio image preloader — the state machine behind the issue #1 fix.
 *
 * The CEO's report (2026-08-17): "the refreshing speed for the images in the
 * app is a bit slow." The adopted design (issue #1): fetch the pictures a
 * screen is GOING to show while the reader is still on the screen before it —
 * spending time they were already spending — and only ever wait at the end
 * behind a short, capped sand-timer when the silent fetch has not finished.
 *
 * This file is only the machine: it warms URLs and answers "is everything
 * settled?". It decides nothing about screens — app.js owns when to warm and
 * when to gate. Kept separate so it can be unit-tested in Node with fake
 * images and fake timers (tools/preload.test.js), the way the banks are.
 *
 * States per URL:  (untracked) → loading → done | failed
 * A failure IS a settled state. An image that cannot load must release the
 * gate exactly like one that loaded — a reader must never wait on a fetch
 * that already lost (graceful failure, never a hang).
 */
(function () {
  "use strict";

  // deps are injectable for tests only; the app calls create() bare.
  //   image()       → an object with .src, .onload, .onerror  (default: Image)
  //   setTimeout / clearTimeout                               (default: globals)
  function create(deps) {
    deps = deps || {};
    var makeImage = deps.image || function () { return new window.Image(); };
    var setT = deps.setTimeout || function (fn, ms) { return setTimeout(fn, ms); };
    var clearT = deps.clearTimeout || function (id) { clearTimeout(id); };

    var state = {};      // url → "loading" | "done" | "failed"
    var pending = 0;     // count of "loading"
    var waiters = [];    // whenSettled callbacks still owed an answer
    var images = {};     // url → the Image that fetched it, kept so a screen can show the decoded picture itself
    var urlWaiters = {}; // url → whenReady callbacks waiting on that one picture

    // Warm a batch. A URL already known — in flight, done or failed — is
    // never fetched twice: rapid navigation (answer, Next, answer, Next)
    // calls start() repeatedly and must cost one request per picture, ever.
    function start(urls) {
      (urls || []).forEach(function (u) {
        if (!u || state[u]) return;                 // cache hit / already in flight
        state[u] = "loading";
        pending++;
        var im;
        try { im = makeImage(); } catch (e) { settle(u, false); return; }
        // THE WARMER FETCHES THE SAME PICTURES, SO IT LEAKS THE SAME THING.
        // Without this the visible <img> tags stop sending the page a reader is
        // on and the pre-fetch quietly keeps sending it - a fix that looks
        // complete and is not, which is worse than no fix at all.
        try { im.referrerPolicy = "no-referrer"; } catch (e3) { /* older engines ignore it */ }
        images[u] = im;
        /* READY MEANS DECODED, NOT MERELY FETCHED (22 Sep 2026). A picture that has
           arrived still has to be decoded before it can be painted, and a card that
           appears before that happens shows the picture a beat late. decode() is
           where the engine supports it; a rejected decode still counts as arrived. */
        im.onload = function () {
          var d = null;
          try { d = typeof im.decode === "function" ? im.decode() : null; } catch (e4) { d = null; }
          if (d && typeof d.then === "function") d.then(function () { settle(u, true); }, function () { settle(u, true); });
          else settle(u, true);
        };
        im.onerror = function () { settle(u, false); };
        try { im.src = u; } catch (e2) { settle(u, false); }
      });
    }

    function settle(u, okLoad) {
      if (state[u] !== "loading") return;           // duplicate event — already settled
      state[u] = okLoad ? "done" : "failed";
      pending--;
      var mine = urlWaiters[u] || []; delete urlWaiters[u];
      mine.forEach(function (w) { fire(w, okLoad); });
      if (pending === 0) {
        var owed = waiters; waiters = [];
        owed.forEach(function (w) { fire(w, true); });
      }
    }

    function fire(w, allSettled) {
      if (w.fired) return;                          // exactly-once, whatever races
      w.fired = true;
      if (w.timer !== null) { clearT(w.timer); w.timer = null; }
      w.cb(allSettled);
    }

    // Call cb exactly once: with true when every started fetch has settled,
    // or with false when capMs elapses first (render anyway — the images
    // arrive progressively; an uncapped wait would hang the screen forever).
    // Returns a cancel function: a caller whose moment has passed (the reader
    // navigated away) cancels, and the callback then never fires at all.
    function whenSettled(capMs, cb) {
      var w = { cb: cb, fired: false, timer: null };
      if (pending === 0) { fire(w, true); return function () {}; }
      waiters.push(w);
      w.timer = setT(function () {
        var i = waiters.indexOf(w);
        if (i !== -1) waiters.splice(i, 1);
        fire(w, false);
      }, capMs);
      return function cancel() {
        var i = waiters.indexOf(w);
        if (i !== -1) waiters.splice(i, 1);
        if (w.timer !== null) { clearT(w.timer); w.timer = null; }
        w.fired = true;
      };
    }

    /* Wait for ONE picture: cb(true) when it is decoded, cb(false) when it failed or
       capMs passed first. Starts the fetch if nobody has. Settled pictures answer at
       once, synchronously, so a ready card never waits a tick. Returns a cancel. */
    function whenReady(u, capMs, cb) {
      var w = { cb: cb, fired: false, timer: null };
      if (!u) { fire(w, false); return function () {}; }
      if (!state[u]) start([u]);
      if (state[u] === "done" || state[u] === "failed") { fire(w, state[u] === "done"); return function () {}; }
      (urlWaiters[u] = urlWaiters[u] || []).push(w);
      w.timer = setT(function () {
        var list = urlWaiters[u] || [], i = list.indexOf(w);
        if (i !== -1) list.splice(i, 1);
        fire(w, false);
      }, capMs);
      return function cancel() {
        var list = urlWaiters[u] || [], i = list.indexOf(w);
        if (i !== -1) list.splice(i, 1);
        if (w.timer !== null) { clearT(w.timer); w.timer = null; }
        w.fired = true;
      };
    }

    function idle() { return pending === 0; }
    function stateOf(u) { return state[u] || null; }
    /* the decoded picture itself, for a screen to show instead of a fresh <img> that would decode again */
    function imageFor(u) { return state[u] === "done" ? (images[u] || null) : null; }

    return { start: start, whenSettled: whenSettled, whenReady: whenReady, idle: idle, stateOf: stateOf, imageFor: imageFor };
  }

  window.CURIO_PRELOAD = { create: create };
})();
