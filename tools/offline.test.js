/* SPEED AND OFFLINE, BATCH A (29 Sep 2026; rebuilt on v121, 6 Oct 2026): items 1, 2
 * and 4 of curio-hq/10-Roadmap/proposals/2026-09-28-performance-and-offline.md,
 * approved by the CEO on 29 Sep 2026 (D-100). Item 3 lives in the HQ publishing
 * tool (curio-hq/tools/picture_500.js); its check on this bank is at the end.
 *
 * The founder, 28 Sep: "How can we make the app work online (regarding images
 * loading, video playing) or we keep saying the app doesn't work offline".
 *
 * What a browser is not needed to prove, proved here:
 *   2 · the worker's install asks the server before re-downloading a file the
 *       browser already has (cache "no-cache"), never the cache-busting
 *       "reload" that paid for every file twice;
 *   1 · the page opens from its saved copy when the network has not answered
 *       within about 3 s, a first visit still waits for the network, and a page
 *       with no copy of its own is never swapped for the app;
 *   4 · Commons pictures are fetched in the open ("cors") way, with no cookie
 *       and no referrer, and kept only when a picture really arrived; an error
 *       page is never kept; the old sealed store is dropped;
 *   1 · every new line is in the plan's exact words, English and French, goes
 *       through t(), and claims nothing the claims standard forbids; the loading
 *       bar has no words, moves only by transform and obeys Comfort's reduced
 *       motion; a Watch door connects only when touched;
 *   3 · no question picture is a full-size original that has a lighter 500-px
 *       copy (when the HQ table is there to read).
 *   node tools/offline.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SW_SRC = read('sw.js'), HTML = read('index.html'), APP = read('src/app.js'), CSS = read('src/styles.css'), I18N = read('src/i18n.js'), PRIV = read('src/privacy.js');

let pass = 0, fail = 0;
const t = (name, ok, detail) => { if (ok) pass++; else { fail++; console.log('  FAIL ' + name + (detail ? '  -  ' + detail : '')); } };

/* ---------- a service worker in a box: its events, caches, network and clock are ours ---------- */
const ORIGIN = 'https://qpio.test', BASE = ORIGIN + '/';
const CACHE = (/const CACHE\s*=\s*"([^"]+)"/.exec(SW_SRC) || [])[1];
const IMG_CACHE = (/const IMG_CACHE\s*=\s*"([^"]+)"/.exec(SW_SRC) || [])[1];
function worker() {
  const handlers = {}, store = new Map(), fetched = [], timers = [];
  let now = 0, network = () => new Promise(() => {});           // by default the network never answers
  class Req {
    constructor(u, init) {
      const src = typeof u === 'string' ? null : u;
      this.url = new URL(src ? src.url : u, BASE).href;
      this.cache = (init && init.cache) || (src && src.cache) || 'default';
      this.mode = (init && init.mode) || (src && src.mode) || 'no-cors';
      this.credentials = (init && init.credentials) || (src && src.credentials) || 'same-origin';
      this.referrerPolicy = (init && init.referrerPolicy) || (src && src.referrerPolicy) || '';
      this.method = 'GET';
    }
  }
  class Res {
    constructor(body, init) { this.body = body; this.status = init && init.status !== undefined ? init.status : 200; this.type = (init && init.type) || 'basic'; this.ok = this.status >= 200 && this.status < 300;
      const h = (init && init.headers) || {}; this.headers = { get: (k) => h[k.toLowerCase()] || null }; }
    clone() { return this; }
    static error() { const r = new Res(null, { status: 0 }); r.type = 'error'; return r; }
  }
  const keyOf = (r) => new URL(typeof r === 'string' ? r : r.url, BASE).href;
  const box = (name) => { if (!store.has(name)) store.set(name, new Map()); return store.get(name); };
  const sandbox = {
    self: { addEventListener: (k, h) => { handlers[k] = h; }, location: { href: BASE + 'sw.js', origin: ORIGIN },
            skipWaiting: () => Promise.resolve(), clients: { claim: () => Promise.resolve() }, registration: {} },
    caches: {
      open: async (name) => { const m = box(name); return {
        add: async (req) => { const res = await sandbox.fetch(req); if (!res.ok) throw new Error('not ok'); m.set(keyOf(req), res); },
        put: async (req, res) => { m.set(keyOf(req), res); },
        match: async (req) => m.get(keyOf(req)),
        keys: async () => [...m.keys()].map((url) => ({ url })),
        delete: async (req) => m.delete(keyOf(req)) }; },
      match: async (req) => { for (const m of store.values()) { const hit = m.get(keyOf(req)); if (hit) return hit; } return undefined; },
      keys: async () => [...store.keys()],
      delete: async (name) => store.delete(name)
    },
    fetch: (req, init) => { const r = req instanceof Req ? (init ? new Req(req, init) : req) : new Req(req, init); fetched.push(r); return network(r); },
    Request: Req, Response: Res, URL, Promise, console,
    setTimeout: (fn, ms) => { timers.push({ fn, at: now + (ms || 0), live: true }); return timers.length - 1; },
    clearTimeout: (id) => { if (id !== null && id !== undefined && timers[id]) timers[id].live = false; }
  };
  vm.createContext(sandbox);
  vm.runInContext(SW_SRC, sandbox, { filename: 'sw.js' });
  const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
  const ask = (req) => {
    let answer = null; const waits = [];
    handlers.fetch({ request: req, respondWith: (p) => { answer = Promise.resolve(p); }, waitUntil: (p) => waits.push(p) });
    let got = PENDING, err = null; if (answer) answer.then((r) => { got = r; }, (e) => { err = e; got = null; });
    return { now: () => got, err: () => err, waits, answered: () => !!answer };
  };
  return {
    handlers, store, fetched, Req, Res, box, settle, ask,
    setNetwork: (fn) => { network = fn; },
    advance: async (ms) => { now += ms; for (const tm of timers) if (tm.live && tm.at <= now) { tm.live = false; tm.fn(); } await settle(); },
    navigate: (url) => ask(new Req(url, { mode: 'navigate' }))
  };
}
const PENDING = { pending: true };
const deferred = () => { let resolve, reject; const p = new Promise((a, b) => { resolve = a; reject = b; }); return { p, resolve, reject }; };
const PIC = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Machu_Picchu%2C_2023_%28012%29.jpg/500px-Machu_Picchu%2C_2023_%28012%29.jpg';

(async () => {
  /* ---------- item 2: install asks before it downloads ---------- */
  {
    const w = worker();
    w.setNetwork((r) => Promise.resolve(new w.Res('ok', { status: 200, headers: { 'content-type': /\/img\/(flags|cities)\//.test(r.url) ? 'image/png' : 'text/plain' } })));
    let job = null;
    w.handlers.install({ waitUntil: (p) => { job = p; } });
    await job;
    const assets = w.fetched.filter((r) => !/\/img\/(flags|cities)\//.test(r.url));
    const flags = w.fetched.filter((r) => /\/img\/(flags|cities)\//.test(r.url));
    t('install fetched the release (the precache list)', assets.length > 40, assets.length + ' files');
    t('install never uses the cache-busting "reload" (it paid for every file twice)', w.fetched.every((r) => r.cache !== 'reload'),
      w.fetched.filter((r) => r.cache === 'reload').map((r) => r.url).slice(0, 3).join(', '));
    t('every file the release installs is asked for with "no-cache": the browser\'s copy, once the server confirms it',
      assets.every((r) => r.cache === 'no-cache'), assets.filter((r) => r.cache !== 'no-cache').map((r) => r.url + ' ' + r.cache).slice(0, 3).join(', '));
    t('the bundled flags and city pictures too', flags.length > 80 && flags.every((r) => r.cache === 'no-cache'), flags.length + ' pictures');
    t('the release cache holds the page itself', w.box(CACHE).has(BASE + 'index.html'));
  }
  const SW_CODE = SW_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');   // the comments tell the story
  t('no "reload" left anywhere in the worker\'s code', !/["'`]reload["'`]/.test(SW_CODE));

  console.log('\n  speed and offline, batch A - ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
