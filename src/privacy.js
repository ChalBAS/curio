/* QPIO PRIVACY — the reader's own copy, and the reader's own delete.
 *
 * Settings › Privacy & your data (spec 24 Sep 2026). This file holds only the
 * mechanics: which keys are Qpio's, a snapshot of them for "Save a copy", and
 * the wipe behind "Delete everything on this device". No reader-facing words
 * live here — every sentence is a literal t() call in app.js, so the French
 * check can see it.
 *
 * TWO THINGS THE DELETE NEVER UNDOES.
 *   curio.measure.off = "true"   the reader said no to the counting. Deleting
 *                                their data must not quietly say yes again, so
 *                                the key is never removed, not even for a moment.
 *   curio.settings  = kids       a child's protection is not lowered without
 *                                saying so. It is overwritten with Kids mode
 *                                alone rather than removed.
 * Everything else that is Qpio's goes: localStorage and sessionStorage keys,
 * the picture and notification caches, the illustrations cached with the app,
 * and the daily wake-up. The app files themselves stay, so Qpio still opens
 * offline after the restart.
 */
(function () {
  "use strict";
  var OWN = /^(curio|qpio)\./, OFF_KEY = "curio.measure.off", SET_KEY = "curio.settings";

  function ownKeys(s) { var o = []; try { for (var i = 0; i < s.length; i++) { var k = s.key(i); if (k && OWN.test(k)) o.push(k); } } catch (e) {} return o; }
  function parse(v) { try { return JSON.parse(v); } catch (e) { return v; } }
  function snapshot(s) { var o = {}; ownKeys(s).forEach(function (k) { try { o[k] = parse(s.getItem(k)); } catch (e) {} }); return o; }
  function canStore() { try { localStorage.setItem("curio.t", "1"); localStorage.removeItem("curio.t"); return true; } catch (e) { return false; } }

  function weekStart(w) {                       // "2026-W23" -> Monday of that ISO week, or null
    var m = /^(\d{4})-W(\d{2})$/.exec(w || ""); if (!m) return null;
    var j4 = new Date(Date.UTC(+m[1], 0, 4)); j4.setUTCDate(j4.getUTCDate() - ((j4.getUTCDay() || 7) - 1) + (+m[2] - 1) * 7); return j4;
  }

  function wipeStorage(s) {
    var keepOff = false, keepKids = false, failed = 0;
    try { keepOff = s.getItem(OFF_KEY) === "true"; } catch (e) {}
    try { var st = JSON.parse(s.getItem(SET_KEY) || "{}"); keepKids = !!st && st.ageMode === "kids"; } catch (e) {}
    var ks = ownKeys(s);                        // list first, then remove
    ks.forEach(function (k) {
      if (k === OFF_KEY && keepOff) return;     // the reader's "no" is never removed, not even for a moment
      if (k === SET_KEY && keepKids) return;    // overwritten below, not removed
      try { s.removeItem(k); } catch (e) { failed++; }
    });
    if (keepKids) { try { s.setItem(SET_KEY, JSON.stringify({ ageMode: "kids" })); } catch (e) { failed++; } }
    return { removed: ks.length, keptOff: keepOff, keptKids: keepKids, failed: failed };
  }

  function wipeDevice() {                       // never throws; resolves within 3 s; does not reload
    try { if (window.QpioMeasure && QpioMeasure.halt) QpioMeasure.halt(); } catch (e) {}
    var res = null;
    try { res = wipeStorage(window.localStorage); } catch (e) {}   // blocked storage: carry on
    try { var ss = window.sessionStorage; ownKeys(ss).forEach(function (k) { ss.removeItem(k); }); } catch (e) {}
    /* Other open tabs hear this and restart too (app.js boot), so none of them
     * writes its old state back over the empty storage. */
    try { localStorage.setItem("qpio.wiped", String(Date.now())); localStorage.removeItem("qpio.wiped"); } catch (e) {}
    var jobs = [];
    try {
      if (window.caches) {
        jobs.push(caches.delete("qpio-img-v1"), caches.delete("qpio-nudge"));
        jobs.push(caches.keys().then(function (names) {          // illustrations viewed, cached with the app (sw.js generic handler)
          return Promise.all(names.filter(function (n) { return /^qpio-v\d+$/.test(n); }).map(function (n) {
            return caches.open(n).then(function (c) { return c.keys().then(function (rs) {
              return Promise.all(rs.filter(function (r) { return r.url.indexOf("/img/gen/") !== -1; }).map(function (r) { return c.delete(r); }));
            }); });
          }));
        }));
      }
    } catch (e) {}
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) jobs.push(navigator.serviceWorker.getRegistration()
        .then(function (r) { return r && r.periodicSync ? r.periodicSync.unregister("qpio-daily") : null; }));
    } catch (e) {}
    var all = Promise.all(jobs.map(function (p) { return Promise.resolve(p).catch(function () {}); }));
    return Promise.race([all, new Promise(function (r) { setTimeout(r, 3000); })]).then(function () { return res; });
  }

  window.QpioPrivacy = { ownKeys: ownKeys, snapshot: snapshot, canStore: canStore, weekStart: weekStart, wipeStorage: wipeStorage, wipeDevice: wipeDevice };
})();
