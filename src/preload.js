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
        im.onload = function () { settle(u, true); };
        im.onerror = function () { settle(u, false); };
        try { im.src = u; } catch (e2) { settle(u, false); }
      });
    }

    function settle(u, okLoad) {
      if (state[u] !== "loading") return;           // duplicate event — already settled
      state[u] = okLoad ? "done" : "failed";
      pending--;
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

    function idle() { return pending === 0; }
    function stateOf(u) { return state[u] || null; }

    return { start: start, whenSettled: whenSettled, idle: idle, stateOf: stateOf };
  }

  window.CURIO_PRELOAD = { create: create };
})();
