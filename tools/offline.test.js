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

  /* ---------- item 1: the page opens from its saved copy after about 3 s ---------- */
  {
    const w = worker();
    w.box(CACHE).set(BASE + 'index.html', new w.Res('saved page'));
    const net = deferred();
    w.setNetwork(() => net.p);
    const nav = w.navigate(BASE);
    await w.settle();
    t('slow network, saved copy: nothing yet, the network gets its chance', nav.now() === PENDING);
    await w.advance(2999);
    t('... still waiting at 2.999 s', nav.now() === PENDING);
    await w.advance(1);
    t('... at 3 s the saved copy opens', nav.now() !== PENDING && nav.now().body === 'saved page', nav.now() === PENDING ? 'still pending' : String(nav.now().body));
    net.resolve(new w.Res('fresh page'));
    await Promise.all(nav.waits);
    await w.settle();
    t('... and the network\'s late answer is kept for next time', w.box(CACHE).get(BASE + 'index.html').body === 'fresh page');
  }
  {
    const w = worker();                                       // a first visit: nothing saved
    const net = deferred();
    w.setNetwork(() => net.p);
    const nav = w.navigate(BASE);
    await w.advance(3000);
    t('slow network, first visit: nothing to open instead, so it keeps waiting', nav.now() === PENDING);
    net.resolve(new w.Res('first page'));
    await w.settle();
    t('... and opens the network\'s page when it comes', nav.now().body === 'first page');
  }
  {
    const w = worker();
    w.box(CACHE).set(BASE + 'index.html', new w.Res('saved page'));
    w.setNetwork(() => Promise.reject(new TypeError('offline')));
    const nav = w.navigate(BASE);
    await w.settle();
    t('no network at all: the saved copy opens at once, as before', nav.now().body === 'saved page');
  }
  {
    const w = worker();
    w.box(CACHE).set(BASE + 'index.html', new w.Res('saved page'));
    w.setNetwork(() => Promise.resolve(new w.Res('fresh page')));
    const nav = w.navigate(BASE);
    await w.settle();
    await Promise.all(nav.waits);
    t('a good network: the newest page, never the saved one', nav.now().body === 'fresh page');
    t('... and it is saved', w.box(CACHE).get(BASE + 'index.html').body === 'fresh page');
  }
  {
    const w = worker();
    w.box(CACHE).set(BASE + 'index.html', new w.Res('saved page'));
    w.box(CACHE).set(BASE + 'privacy', new w.Res('saved privacy'));
    w.setNetwork(() => new Promise(() => {}));
    const nav = w.navigate(BASE + 'privacy');
    await w.advance(3000);
    t('the privacy page opens its own saved copy after 3 s, not the app', nav.now().body === 'saved privacy');
    const other = w.navigate(BASE + 'tests/uat.html');
    await w.advance(5000);
    t('a page with no copy of its own is never swapped for the app on a slow network', other.now() === PENDING);
  }
  {
    const w = worker();
    w.box(CACHE).set(BASE + 'index.html', new w.Res('saved page'));
    w.setNetwork(() => new Promise(() => {}));
    const nav = w.navigate(BASE + 'terms');
    await w.advance(5000);
    t('the terms page with no saved copy of its own keeps waiting, never shows the app instead', nav.now() === PENDING);
  }
  t('the wait is about 3 s', /const SHELL_WAIT_MS = 3000;/.test(SW_SRC));

  /* ---------- item 1: the words, exactly the plan's, in both languages ---------- */
  const PLAN = [
    ['Needs internet', 'Connexion internet requise'],
    ['Loading the video…', 'Chargement de la vidéo…'],
    ['This video needs a better connection. Try again in a moment.', 'Cette vidéo a besoin d’une meilleure connexion. Réessaie dans un instant.'],
    ['This picture needs an internet connection.', 'Cette image a besoin d’une connexion internet.'],
    /* the plan's "Qpio now works offline." is a retired claim (offline-absolute); the register's qualified form */
    ['Qpio is now saved on this device. Most of it works offline.', 'Qpio est maintenant enregistré sur cet appareil. L’essentiel fonctionne hors ligne.']
  ];
  const sb = { window: {}, localStorage: { getItem: () => 'fr' }, navigator: { language: 'fr-FR' },
               document: { documentElement: {}, getElementById: () => null, querySelector: () => null } };
  vm.createContext(sb);
  vm.runInContext(I18N, sb, { filename: 'i18n.js' });
  const FR = sb.window.I18N.fr;
  const said = (s) => APP.includes('t(' + JSON.stringify(s) + ')') || APP.includes('t(' + JSON.stringify(s).replace(/…/g, '\\u2026') + ')');
  PLAN.forEach(([en, fr]) => {
    t('"' + en + '" is drawn through t()', said(en));
    t('"' + en + '" has the plan\'s French', FR[en] === fr, JSON.stringify(FR[en]));
  });
  const hintEn = (/<span id="iosHintText">([\s\S]*?)<\/span>\n/.exec(HTML) || [])[1] || '';
  t('the iPhone banner gives its reason', /, so your progress is kept\.$/.test(hintEn), hintEn);
  t('... in French too, and index.html matches the dictionary key', /, pour garder ta progression\.$/.test(FR[hintEn] || ''), JSON.stringify(FR[hintEn]));
  const said_ = PLAN.map((p) => p.join(' ')).join(' ') + ' so your progress is kept pour garder ta progression';
  t('no new line claims what the claims standard forbids', !/brain|memory|smart|\bIQ\b|focus|health|cerveau|mémoire|santé/i.test(said_));
  /* THE CLAIMS REGISTER (6 Oct 2026). The plan's table said "Qpio now works offline.", a claim
     retired on 14 Aug (offline-absolute). Every new line is read against the register the way
     curio-hq/tools/claims.js reads a surface: a pattern on the line is a failure unless an
     "unless" term is on the same line. */
  {
    const REG = path.join(ROOT, '..', 'curio-hq', '01-Charter', 'RETIRED-CLAIMS.json');
    if (!fs.existsSync(REG)) console.log('  (claims register not checked here: no curio-hq beside this repo)');
    else {
      const claims = JSON.parse(fs.readFileSync(REG, 'utf8')).claims || [];
      const lines = PLAN.flat().concat(['so your progress is kept', 'pour garder ta progression']);
      const hits = [];
      lines.forEach((line) => claims.forEach((c) => {
        let re = null; try { re = new RegExp(c.pattern, 'i'); } catch (e) { return; }
        if (re.test(line) && !(c.unless || []).some((u) => line.includes(u))) hits.push(c.id + ': ' + line);
      }));
      t('no new line makes a retired claim (01-Charter/RETIRED-CLAIMS.json)', hits.length === 0, hits.join(' | '));
    }
  }
  t('v112\'s "not loading" line is replaced, not kept beside the new one', !/t\("The video is not loading/.test(APP) &&
    !Object.prototype.hasOwnProperty.call(FR, 'The video is not loading. You may be offline or on a weak connection.'));

  /* the weak-signal note: one timer, about 10 s; the still at once; connecting on touch */
  {
    const ov = (APP.match(/function openVideo\(door\) \{([\s\S]*?)\n  \}\n/) || [])[1] || '';
    t('the video box says it needs a better connection after about 10 s', /var VIDEO_WAIT_MS = 10000;/.test(APP) && /\}, VIDEO_WAIT_MS\);/.test(ov));
    t('... with one timer, not a second one beside v112\'s', (ov.match(/setTimeout\(/g) || []).length === 1 && !/12000/.test(ov));
    t('the still and "Loading the video…" are drawn with the player, at once', /class="vload" role="status"><img class="vstill" src="https:\/\/i\.ytimg\.com\/vi\//.test(ov));
    t('... and go the moment the player answers', /heard = true; loaded\(\);/.test(ov));
    const warm = (APP.match(/document\.addEventListener\("pointerdown", function \(e\) \{([\s\S]*?)\n  \}, true\);/) || [])[1] || '';
    t('a Watch door starts connecting when the finger touches it', /closest\("\[data-video\]"\)/.test(warm) && /rel = "preconnect"/.test(warm) && /YT_ORIGIN/.test(warm));
    t('... only on a touch of the door, once a visit, never offline', /if \(ytWarm \|\| navigator\.onLine === false\) return;/.test(warm) && /ytWarm = true;/.test(warm) &&
      (APP.match(/rel = "preconnect"/g) || []).length === 1);
  }

  /* the Watch door, the picture, the loading bar */
  t('offline, every Watch door carries the words (the stylesheet, from --needs-net)', /\.is-offline \.gf-link\[data-video\] \.gf-text::after \{\s*content: var\(--needs-net/.test(CSS) &&
    /\.is-offline \.way\[data-video\]::after \{\s*content: var\(--needs-net/.test(CSS) && /\.is-offline \.btn\[data-video\]::after \{ content: [^;]*var\(--needs-net/.test(CSS));
  t('... set from t("Needs internet") and toggled by the network events', /setProperty\("--needs-net", JSON\.stringify\(t\("Needs internet"\)\)\)/.test(APP) &&
    /addEventListener\("offline", netClass\)/.test(APP) && /addEventListener\("online", netClass\)/.test(APP));
  t('a failed picture shows words, not the sand-timer', /\.qart\.is-failed \.qart-off \{\s*display: block;/.test(CSS) && !/\.qart\.is-failed \.qart-wait/.test(CSS));
  t('the page\'s #app starts empty, so the loading bar shows until the app draws', /<div id="app"><\/div>/.test(HTML));
  const boot = (CSS.match(/@keyframes qpioBoot \{([^\n]*)\}/) || [])[1] || '';
  t('the loading bar has no words', /#app:empty::after \{\s*content: "";/.test(CSS));
  t('... and moves by transform only, so nothing is ever hidden by a paused animation', /transform/.test(boot) && !/opacity|visibility|display/.test(boot), boot);
  {
    const head = HTML.slice(0, HTML.indexOf('<link rel="stylesheet"'));
    const early = (/<script>([^<]*rmotion[^<]*)<\/script>/.exec(head) || [])[1] || '';
    const doc = { documentElement: { classList: { added: [], add(c) { this.added.push(c); } } } };
    const run = (stored) => { doc.documentElement.classList.added = []; vm.runInNewContext(early, { document: doc, localStorage: { getItem: (k) => k === 'curio.settings' ? stored : null }, JSON }); return doc.documentElement.classList.added.join(); };
    t('Comfort\'s reduced motion stills the bar before app.js runs (read before the stylesheet paints)', !!early && run('{"motion":"reduced"}') === 'rmotion' && run('{"motion":"full"}') === '' && run(null) === '' && run('{bad') === '');
  }

  console.log('\n  speed and offline, batch A - ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
