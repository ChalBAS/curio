/* Tests for the issue #1 image-preloader state machine. Zero dependencies.
 *
 *   node tools/preload.test.js
 *
 * Proves the agreed design's load-bearing behaviours:
 *   - cache hit: a settled URL is never fetched twice, and a wait over a
 *     settled machine releases immediately (the no-timer common case)
 *   - miss: a wait holds until every in-flight fetch settles, then fires once
 *   - failure: a failed fetch SETTLES — it releases the gate exactly like a
 *     success, so a dead URL can never hang the results screen
 *   - rapid navigation: repeated start() calls dedupe; a cancelled wait never
 *     fires (the reader who tabbed away is not yanked back)
 *   - the cap: the timer fires the wait with false, and the late settle that
 *     follows does not fire it a second time
 *
 * Images and timers are injected fakes, so the machine's whole life can be
 * driven by hand — no browser, no network, no waiting.
 */
'use strict';
const path = require('path');

let failed = 0;
function is(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log('  \x1b[32mPASS\x1b[0m  ' + name);
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        expected ${e}\n        actual   ${a}`); }
}
function ok(name, cond, detail) { is(name, !!cond, true); if (!cond && detail) console.log('        ' + detail); }

global.window = {};
require(path.join(__dirname, '..', 'src', 'preload.js'));
const PRE = global.window.CURIO_PRELOAD;

// A fresh machine wired to hand-cranked images and timers.
function rig() {
  const imgs = [];                       // every Image the machine created
  const timers = [];                     // every timer it set
  const P = PRE.create({
    image: () => { const im = { src: null, onload: null, onerror: null }; imgs.push(im); return im; },
    setTimeout: (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length - 1; },
    clearTimeout: (id) => { if (timers[id]) timers[id].cleared = true; }
  });
  return {
    P, imgs, timers,
    load: (i) => imgs[i].onload(),
    err: (i) => imgs[i].onerror(),
    tick: (id) => { if (timers[id] && !timers[id].cleared) timers[id].fn(); }
  };
}

console.log('\n\x1b[1mMiss — the wait holds until the fetch lands\x1b[0m');
(function () {
  const r = rig();
  r.P.start(['https://img/a.jpg']);
  is('a started URL is loading', r.P.stateOf('https://img/a.jpg'), 'loading');
  is('the machine is busy', r.P.idle(), false);
  const calls = [];
  r.P.whenSettled(1200, (all) => calls.push(all));
  is('the wait does not fire early', calls, []);
  r.load(0);
  is('the wait fires once the fetch lands', calls, [true]);
  is('the URL is done', r.P.stateOf('https://img/a.jpg'), 'done');
  is('the machine is idle again', r.P.idle(), true);
  ok('the cap timer was cleared', r.timers[0].cleared, 'timer left armed after settle');
})();

console.log('\n\x1b[1mCache hit — one request per picture, ever\x1b[0m');
(function () {
  const r = rig();
  r.P.start(['https://img/a.jpg']);
  r.P.start(['https://img/a.jpg']);               // rapid re-entry, same URL
  is('an in-flight URL is not fetched again', r.imgs.length, 1);
  r.load(0);
  r.P.start(['https://img/a.jpg']);               // settled — still no refetch
  is('a settled URL is not fetched again', r.imgs.length, 1);
  const calls = [];
  r.P.whenSettled(1200, (all) => calls.push(all));
  is('a wait over a settled machine releases immediately', calls, [true]);
  is('…without arming a timer', r.timers.length, 0);   // synchronous release, no cap needed
})();

console.log('\x1b[1m\nFailure — settles, never hangs\x1b[0m');
(function () {
  const r = rig();
  r.P.start(['https://img/dead.jpg', 'https://img/b.jpg']);
  const calls = [];
  r.P.whenSettled(1200, (all) => calls.push(all));
  r.err(0);
  is('one failure alone does not release a two-fetch wait', calls, []);
  is('the failed URL is failed, not loading', r.P.stateOf('https://img/dead.jpg'), 'failed');
  r.load(1);
  is('failure + success together release the wait with true', calls, [true]);
  r.err(0);                                        // duplicate event, late
  is('a duplicate settle event changes nothing', r.P.idle(), true);
})();

console.log('\x1b[1m\nRapid navigation — dedupe, cancel, exactly-once\x1b[0m');
(function () {
  const r = rig();
  r.P.start(['https://img/q2.jpg']);               // answer 1 warms q2
  r.P.start(['https://img/q3.jpg']);               // answer 2 warms q3
  r.P.start(['https://img/q2.jpg']);               // replay never refetches
  is('three warm calls, two URLs, two fetches', r.imgs.length, 2);
  const calls = [];
  const cancel = r.P.whenSettled(1200, (all) => calls.push(all));
  cancel();                                        // the reader tabbed away
  r.load(0); r.load(1);
  is('a cancelled wait never fires', calls, []);
  is('the machine still settles normally underneath', r.P.idle(), true);
  const calls2 = [];
  r.P.whenSettled(1200, (all) => calls2.push(all));
  is('the next wait is unaffected by the cancelled one', calls2, [true]);
})();

console.log('\x1b[1m\nThe cap — render regardless, but only once\x1b[0m');
(function () {
  const r = rig();
  r.P.start(['https://img/slow.jpg']);
  const calls = [];
  r.P.whenSettled(1200, (all) => calls.push(all));
  is('the cap was armed at the agreed delay', r.timers[0].ms, 1200);
  r.tick(0);                                       // 1.2s elapses first
  is('the cap fires the wait with false', calls, [false]);
  r.load(0);                                       // the image lands late
  is('the late settle does not fire the wait again', calls, [false]);
  is('the late settle still books the URL as done', r.P.stateOf('https://img/slow.jpg'), 'done');
})();

console.log('\x1b[1m\nBad input — never counted, never waited on\x1b[0m');
(function () {
  const r = rig();
  r.P.start([null, '', undefined]);
  is('empty URLs are ignored', r.imgs.length, 0);
  is('the machine stays idle', r.P.idle(), true);
  r.P.start();                                     // no list at all
  is('no list at all is a no-op', r.P.idle(), true);
})();

console.log('');
if (failed) { console.log('\x1b[31m' + failed + ' failing\x1b[0m'); process.exit(1); }
console.log('\x1b[32mall green\x1b[0m');
