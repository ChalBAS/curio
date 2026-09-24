/* THE AGREEMENT — the checks that keep "Qpio only works once you agree" true.
 *
 * Founder, 24 Sep 2026: "I need the app to only work if the user acknowledges."
 *
 * The failures these catch are the quiet ones: a round counted before anyone
 * agreed, a tab drawn behind the agreement screen, a delete that leaves the
 * agreement behind so the screen never comes back, a terms page whose version
 * no longer matches the one the app asks about, a French screen with one
 * English line.
 *
 *   node tools/terms.test.js
 *
 * The app itself is started with curio-hq/tools/app_runtime.js (the reader's
 * scripts, in index.html's order, in a node vm). What it draws is observed by
 * recording every piece of markup the app builds through its own el(); what it
 * sends, by counting beacons and fetches. Each "nothing" below has a matching
 * control that sees "something" when the reader has agreed, so an empty result
 * cannot come from a probe that sees nothing at all.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const app = read('src/app.js');
const termsSrc = read('src/terms.js');
const measureSrc = read('src/measure.js');
const privacySrc = read('src/privacy.js');
const i18nSrc = read('src/i18n.js');
const page = read('terms.html');
const privacyPage = read('privacy.html');
const index = read('index.html');
const sw = read('sw.js');
const worker = read('worker/index.js');
const licence = read('CONTENT-LICENCE.md');
const aiTxt = read('ai.txt');
const gym = read('src/braingym.js');
const css = read('src/styles.css');

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? ' — ' + detail : ''));
  if (!ok) failures++;
}
const tick = () => new Promise(r => setImmediate(r));

/* A Storage with the members the code uses. `blocked` makes every write throw. */
function storage(init, blocked) {
  const m = new Map(Object.entries(init || {}));
  return {
    m,
    get length() { return m.size; },
    key(i) { const k = Array.from(m.keys())[i]; return k === undefined ? null : k; },
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { if (blocked) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
  };
}

/* terms.js and measure.js as index.html runs them, against a counted network. */
function loadMeasure(store, opts) {
  const o = opts || {};
  const sent = { beacons: 0, fetches: 0 };
  const ctx = {
    console, QLANG: o.lang || 'en', localStorage: store, Blob: function () {},
    navigator: { userAgent: 'Mozilla/5.0 (iPhone) Safari', sendBeacon: () => { sent.beacons++; return true; } },
    fetch: () => { sent.fetches++; return Promise.resolve({}); },
    document: { querySelector: () => ({ getAttribute: () => 'src/app.js?v=107' }), addEventListener() {}, visibilityState: 'visible' },
    addEventListener() {}, matchMedia: () => ({ matches: false }),
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  if (!o.noTerms) vm.runInContext(termsSrc, ctx, { filename: 'terms.js' });
  vm.runInContext(measureSrc, ctx, { filename: 'measure.js' });
  return { ctx, sent, T: ctx.QpioTerms, M: ctx.QpioMeasure };
}
function today() { const d = new Date(), p = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }

(async function () {
  /* ------------------------------------------------------------ src/terms.js */
  console.log('\nThe agreement — what this device remembers (src/terms.js)\n');

  let L = loadMeasure(storage({}));
  const VERSION = L.T.VERSION, TERMS_DATE = L.T.DATE, PRIVACY_VERSION = L.T.PRIVACY_VERSION;
  check('never agreed: the state is "new" and Qpio is not open', L.T.state() === 'new' && L.T.accepted() === false);
  L = loadMeasure(storage({ 'curio.terms': JSON.stringify({ terms: VERSION + '-older', privacy: '2026-01-01', at: '2026-01-01' }) }));
  check('agreed to another version: the state is "changed" and Qpio is not open', L.T.state() === 'changed' && L.T.accepted() === false,
    'the agreement screen comes back with what has changed');
  L = loadMeasure(storage({ 'curio.terms': '{not json' }));
  check('a damaged record counts as never agreed', L.T.state() === 'new');
  L = loadMeasure(storage({ 'curio.terms': JSON.stringify({ terms: VERSION, privacy: PRIVACY_VERSION, lang: 'en', at: '2026-09-24' }) }));
  check('agreed to this version: Qpio is open', L.T.state() === 'ok' && L.T.accepted() === true);

  let st = storage({});
  L = loadMeasure(st, { lang: 'fr' });
  const res = L.T.accept();
  const rec = JSON.parse(st.getItem('curio.terms'));
  check('agreeing stores exactly the terms version and the date of its wording, the privacy notice version, the language and the day',
    JSON.stringify(Object.keys(rec).sort()) === JSON.stringify(['at', 'lang', 'privacy', 'terms', 'termsDate']) &&
    rec.terms === VERSION && rec.termsDate === TERMS_DATE && rec.privacy === PRIVACY_VERSION && rec.lang === 'fr' && rec.at === today() && res.kept === true,
    JSON.stringify(rec) + ' — no identifier, nothing finer than the day');
  check('what terms.html says is kept matches the record',
    page.includes('It keeps which version of these terms and of the privacy notice you agreed to, each with its date, the language you read them in, and the day you agreed. None of this is sent to Qpio.') &&
    page.includes('Il garde la version de ces conditions et celle de la politique de confidentialité que vous avez acceptées, chacune avec sa date, la langue dans laquelle vous les avez lues et le jour de votre accord. Rien de cela n’est envoyé à Qpio.'));

  st = storage({}, true);
  L = loadMeasure(st);
  const blockedRes = L.T.accept();
  const again = loadMeasure(st);
  check('blocked storage: the agreement lasts for this page only, and the next opening asks again',
    blockedRes.kept === false && L.T.accepted() === true && again.T.accepted() === false && L.T.canStore() === false,
    'which is what the terms and the storage-blocked line tell the reader');

  /* ------------------------------------------------------------ measure.js */
  console.log('\nThe agreement — nothing is counted before it (src/measure.js)\n');

  const waiting = JSON.stringify([{ d: today(), mode: 'adult', q: [{ id: 'Q001' }] }]);
  const round = { surface: 'daily', mode: 'adult', questions: [{ id: 'Q001', qrev: 1, lrev: 1 }] };
  for (const [label, init] of [
    ['never agreed', { 'curio.mq': waiting }],
    ['agreed to an older version', { 'curio.mq': waiting, 'curio.terms': JSON.stringify({ terms: VERSION + '-older', at: '2026-01-01' }) }],
  ]) {
    st = storage(init);
    L = loadMeasure(st);
    const atLoad = L.sent.beacons + L.sent.fetches;
    L.M.begin(round); L.M.mark(1, true, true);
    const fin = L.M.finish(true);
    const r = L.M.round({ surface: 'daily', mode: 'adult', questions: [{ id: 'Q001', answered: true, correct: true }] });
    L.M.flush();
    check(label + ': nothing is sent — not the waiting round at load, not a new round, not a flush',
      atLoad === 0 && fin === false && r === false && L.sent.beacons + L.sent.fetches === 0 && st.getItem('curio.mq') === waiting,
      'the waiting round stays on the device until the reader agrees');
  }
  st = storage({ 'curio.mq': waiting });
  L = loadMeasure(st);
  L.M.begin(round);
  check('before agreeing, no round is even opened', L.M.finish(true) === false && L.M.agreed() === false);
  L.T.accept();
  L.M.flush();
  const afterFlush = L.sent.beacons;
  L.M.begin(round); L.M.mark(1, true, true);
  check('control: once the reader agrees, the waiting round goes and a new round is sent',
    afterFlush === 1 && L.M.finish(true) === true && L.sent.beacons === 2, 'so the probe above could have seen a send');

  st = storage({ 'curio.mq': waiting, 'curio.terms': JSON.stringify({ terms: VERSION, at: today() }) });
  L = loadMeasure(st, { noTerms: true });
  L.M.begin(round); L.M.mark(1, true, true);
  check('if src/terms.js did not load, nothing is sent (it fails closed)', L.M.finish(true) === false && L.sent.beacons + L.sent.fetches === 0);

  /* ------------------------------------------------------------ the delete */
  console.log('\nThe agreement — "Delete everything on this device" takes it too\n');

  const pctx = { console, window: null, navigator: {}, setTimeout: (f, ms) => { const h = setTimeout(f, ms); if (h.unref) h.unref(); return h; } };
  pctx.window = pctx;
  vm.createContext(pctx);
  vm.runInContext(privacySrc, pctx, { filename: 'privacy.js' });
  const P = pctx.QpioPrivacy;
  const agreed = JSON.stringify({ terms: VERSION, privacy: PRIVACY_VERSION, lang: 'en', at: today() });
  for (const [label, extra] of [
    ['Everyone mode', {}],
    ['Kids mode, counting off', { 'curio.settings': '{"ageMode":"kids"}', 'curio.measure.off': 'true' }],
  ]) {
    st = storage(Object.assign({ 'curio.terms': agreed, 'curio.vault': '{}' }, extra));
    P.wipeStorage(st);
    check(label + ': curio.terms is removed, so the agreement screen comes back', !st.m.has('curio.terms'));
  }
  st = storage({ 'curio.terms': agreed, 'curio.lang': 'fr' });
  const local = st;
  const full = { console, localStorage: local, sessionStorage: storage({}), navigator: {}, setTimeout: pctx.setTimeout };
  full.window = full;
  vm.createContext(full);
  vm.runInContext(privacySrc, full, { filename: 'privacy.js' });
  await full.QpioPrivacy.wipeDevice();
  check('wipeDevice() (the button itself) removes curio.terms', !local.m.has('curio.terms'));
  const delBlock = app.slice(app.indexOf('function pvDeleteWire('), app.indexOf('// ---- 3. Counting ----'));
  check('the delete confirmation says the agreement goes and Qpio will ask again',
    delBlock.includes('t("your agreement to the Terms of use, so Qpio will ask again")'));
  check('/privacy says the agreement, to the terms and to the notice itself, is one of the things kept on the device',
    privacyPage.includes('which versions of the terms of use and of this privacy notice you agreed to, in which language and on which day') &&
    privacyPage.includes('les versions des conditions d’utilisation et de cette politique de confidentialité que vous avez acceptées, la langue et le jour de cet accord'));
  check('behind the agreement screen, the delete confirmation points to Save a copy on that screen, not to Settings',
    delBlock.includes('onGate ? pvLine(t("To keep a copy of what is on this device, tap Save a copy above first."))') &&
    /pvDeleteWire\(card\.querySelector\("#pvDel"\), card\.querySelector\("#pvConfirm"\), true\)/.test(app));

  /* ------------------------------------------------------------ the pages */
  console.log('\nThe agreement — the page it asks about (terms.html)\n');

  const versions = [...page.matchAll(/<section id="(en|fr)"[^>]*\bdata-terms-version="([^"]*)"/g)].map(m => m[1] + '=' + m[2]);
  check('terms.html: English and French carry the same version as TERMS_VERSION',
    versions.length === 2 && versions.every(v => v.split('=')[1] === VERSION), versions.join(', ') + ' · TERMS_VERSION ' + VERSION);

  /* The version's name on the Privacy screen is the one the page prints. */
  const ictx = { localStorage: storage({ 'curio.lang': 'fr' }), navigator: { language: 'fr-FR' }, document: { documentElement: {}, getElementById: () => null, querySelector: () => null } };
  ictx.window = ictx;
  vm.createContext(ictx);
  vm.runInContext(i18nSrc, ictx, { filename: 'i18n.js' });
  const FR = ictx.I18N.fr;
  const nameEn = (new RegExp('var TERMS_NAMES = \\{[^}]*"' + VERSION + '":\\s*t\\("([^"]+)"\\)').exec(app) || [])[1];
  const nameFr = nameEn && FR[nameEn];
  const enSec = page.slice(page.indexOf('<section id="en"'), page.indexOf('<section id="fr"'));
  const frSec = page.slice(page.indexOf('<section id="fr"'));
  check('the name the Privacy screen gives this version is the one terms.html prints, in both languages',
    !!nameEn && !!nameFr && enSec.includes('<strong>' + nameEn + ',') && frSec.includes('<strong>' + nameFr.replace(/ /g, '&nbsp;') + ','),
    nameEn + ' / ' + nameFr);

  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const [py, pm, pd] = PRIVACY_VERSION.split('-').map(Number);
  check('PRIVACY_VERSION is the date /privacy says it was last updated, in both languages',
    privacyPage.includes('Last updated ' + pd + ' ' + MONTHS_EN[pm - 1] + ' ' + py + '.') &&
    privacyPage.includes('Mise à jour le ' + (pd === 1 ? '1er' : pd) + ' ' + MONTHS_FR[pm - 1] + ' ' + py + '.'), PRIVACY_VERSION);

  const [ty, tm, td] = TERMS_DATE.split('-').map(Number);
  const dEn = nameEn + ', ' + td + ' ' + MONTHS_EN[tm - 1] + ' ' + ty + '.';
  const dFr = (nameFr || '').split(String.fromCharCode(160)).join('&nbsp;') + ', ' + td + '&nbsp;' + MONTHS_FR[tm - 1] + ' ' + ty + '.';
  check('TERMS_DATE is the date terms.html prints for this wording, at the top and the foot, in both languages',
    enSec.split(dEn).length - 1 === 2 && frSec.split(dFr).length - 1 === 2,
    TERMS_DATE + ' (' + (enSec.split(dEn).length - 1) + ' EN, ' + (frSec.split(dFr).length - 1) + ' FR) — a small correction changes the date here and in src/terms.js, so the record says which wording was agreed to');

  /* EVERY VERSION KEPT, AT AN ADDRESS THAT NEVER CHANGES. The answer "the
     block is enough, no record on Qpio's side" rests on this archive. */
  const n = Number(VERSION);
  const workerCurrent = (/const TERMS_CURRENT = (\d+);/.exec(worker) || [])[1];
  check('the worker serves /terms/v<N>: the current version from terms.html, an earlier one from its frozen copy, a later one 404',
    workerCurrent === VERSION && /\/\^\\\/terms\\\/v\(\[1-9\]\[0-9\]\*\)\\\/\?\$\//.test(worker) &&
    worker.includes('n === TERMS_CURRENT ? "/terms" : "/terms-v" + n') && /if \(n > TERMS_CURRENT\) return new Response\("Not found", \{ status: 404/.test(worker),
    'TERMS_CURRENT ' + workerCurrent + ' · TERMS_VERSION ' + VERSION);
  check('terms.html gives this version\'s own address, in both languages',
    enSec.includes('<a href="/terms/v' + VERSION + '">') && frSec.includes('<a href="/terms/v' + VERSION + '">'));
  const missingFrozen = [];
  for (let v = 1; v < n; v++) {
    const f = 'terms-v' + v + '.html';
    const ok = fs.existsSync(path.join(ROOT, f)) &&
      [...read(f).matchAll(/<section id="(en|fr)"[^>]*\bdata-terms-version="([^"]*)"/g)].filter(m => m[2] === String(v)).length === 2;
    if (!ok) missingFrozen.push(f);
  }
  check('every earlier version is kept word for word as terms-v<N>.html, EN and FR', missingFrozen.length === 0,
    n === 1 ? 'version 1 is the first: nothing earlier to keep' : missingFrozen.join(', '));
  const earlierEn = enSec.slice(enSec.indexOf('<h2>Earlier versions</h2>'));
  const earlierFr = frSec.slice(frSec.indexOf('<h2>Versions précédentes</h2>'));
  const listed = [];
  for (let v = 1; v < n; v++) if (!earlierEn.includes('href="/terms/v' + v + '"') || !earlierFr.includes('href="/terms/v' + v + '"')) listed.push('v' + v);
  check('"Earlier versions" lists every earlier version with its address, in both languages (or says this is the first)',
    earlierEn.length > 30 && earlierFr.length > 30 && (n === 1
      ? earlierEn.includes('This is the first version.') && earlierFr.includes('Ceci est la première version.')
      : listed.length === 0), listed.join(', '));
  const names = [];
  for (let v = 1; v <= n; v++) if (!new RegExp('var TERMS_NAMES = \\{[^}]*"' + v + '":\\s*t\\("').test(app)) names.push(String(v));
  check('every version, earlier and current, has its name in TERMS_NAMES', names.length === 0, names.join(', '));
  const changesSrc = (/var TERMS_CHANGES = (\{[\s\S]*?\});/.exec(app) || [])[1] || '';
  const theseChanges = (new RegExp('"' + VERSION + '":\\s*\\[([\\s\\S]*?)\\]').exec(changesSrc) || [])[1] || '';
  const changeLines = (theseChanges.match(/t\("(?:[^"\\]|\\.)*"\)/g) || []).length;
  check('a version that asks again says what changed, in two lines ("Qpio will show you in a few lines what has changed")',
    n === 1 ? changesSrc.replace(/\s/g, '') === '{}' : changeLines === 2,
    n === 1 ? 'version 1: nobody agreed to an earlier one, so there is nothing to list' : changeLines + ' lines for version ' + VERSION);

  /* WHAT IS AGREED TO. YouTube API Services Developer Policies III.A.2: every
     app using them "must require users to agree to a privacy policy", and that
     policy must say the app uses YouTube API Services and link to the Google
     Privacy Policy. Agreeing is still not consent to any use of data. */
  check('the tick agrees to the terms AND the privacy notice (not "I have read")',
    app.includes('t("I agree to the Terms of use and the Privacy notice.")') && !/I have read the Privacy notice/.test(app) &&
    FR['I agree to the Terms of use and the Privacy notice.'] === 'J’accepte les Conditions d’utilisation et la Politique de confidentialité.');
  check('terms.html says the notice is agreed to as well, and that agreeing is not consent to any use of data, in both languages',
    enSec.includes('you agree to that notice as well as to these terms') && !enSec.includes('It is not part of this agreement') &&
    enSec.includes('does not mean agreeing to any use of your data') &&
    frSec.includes('vous acceptez cette politique en plus de ces conditions') && !frSec.includes('Elle ne fait pas partie de cet accord') &&
    frSec.includes('ne veut pas dire accepter une quelconque utilisation de vos données'));
  const pvEn = privacyPage.slice(privacyPage.indexOf('<section id="en"'), privacyPage.indexOf('<section id="fr"'));
  const pvFr = privacyPage.slice(privacyPage.indexOf('<section id="fr"'));
  check('/privacy says Qpio uses YouTube API Services and links to the Google Privacy Policy, in both languages',
    pvEn.includes('Qpio uses YouTube API Services') && pvFr.includes('services d’API de YouTube') &&
    pvEn.includes('href="https://policies.google.com/privacy"') && pvFr.includes('href="https://policies.google.com/privacy"'));

  /* NO ADDRESS ANYWHERE WHILE THERE IS NONE. The terms and /privacy say Qpio
     has no address yet, and link to the licence and ai.txt: none of them may
     give one until PRIVACY_CONTACT (app.js) is set. */
  const contact = (/var\s+PRIVACY_CONTACT\s*=\s*"([^"]*)"/.exec(app) || [])[1];
  const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
  const withAddress = [['terms.html', page], ['privacy.html', privacyPage], ['CONTENT-LICENCE.md', licence], ['ai.txt', aiTxt]]
    .filter(([, txt]) => (txt.match(EMAIL) || []).some(a => a !== contact)).map(([f, txt]) => f + ' (' + (txt.match(EMAIL) || []).join(', ') + ')');
  check('while Qpio has no address, no page the terms link to gives one (or gives any other than PRIVACY_CONTACT)',
    contact !== undefined && withAddress.length === 0 &&
    (contact !== '' || (page.includes('Qpio does not yet have an address you can write to.') && page.includes('Qpio n’a pas encore d’adresse à laquelle vous pouvez écrire.'))),
    withAddress.join('; ') || (contact === '' ? 'no address anywhere, and the terms say so' : contact));

  /* THE COMPANY. Naming it changes who the agreement is with, so it asks again. */
  check('naming the company is a change that asks again, not a small correction, in both languages',
    enSec.includes('Naming the company that will run Qpio is one of those changes.') && !/adding the company's name and address, are made on this page/.test(enSec) &&
    frSec.includes('Donner le nom de la société qui exploitera Qpio est l’un de ces changements.') && !frSec.includes('l’ajout du nom et de l’adresse de la société, sont faites'));

  /* QPIO GYM: what the terms describe is what the Gym offers, and the safety
     lines are on the Gym screen itself, not only in the terms. */
  check('terms.html describes the Gym\'s everyday moves too, and the doctor line covers legs and feet, in both languages',
    enSec.includes('small everyday things to do a different way') && enSec.includes('shoulders, legs or feet') &&
    frSec.includes('petits gestes de tous les jours à faire autrement') && frSec.includes('aux jambes ou aux pieds'));
  check('every Gym routine shows: sit down, go gently, a doctor first; and in Kids mode, a grown-up nearby',
    /en: "Do these sitting down\. Go gently, and stop if anything hurts\. If an injury or a health condition affects how you move, ask a doctor first\."/.test(gym) &&
    /fr: "Fais-les assis\.[^"]*médecin\."/.test(gym) &&
    app.includes('(settings.ageMode === "kids" ? " " + t("Have a grown-up nearby.") : "")') && !!FR['Have a grown-up nearby.']);

  /* The French for younger readers speaks to them as the app does, with "tu". */
  const kidsFr = frSec.slice(frSec.indexOf('<h2 id="kids-fr">'), frSec.indexOf('<h2>Versions précédentes</h2>'));
  check('the French version for younger readers says "tu", as the app does to children', kidsFr.length > 50 && !/\bvous\b|\bVous\b|\bvotre\b|\bVotre\b/.test(kidsFr) && /\btu\b/.test(kidsFr));

  /* The delete confirmation's two buttons break between words, never inside one. */
  check('the agreement screen\'s buttons break between words (the card\'s "anywhere" squeezed Delete everything to one letter per line)',
    /\.tgate \.btn\{[^}]*overflow-wrap:break-word/.test(css));

  check('terms.html has both younger readers\' sections the agreement screen links to',
    /<h2 id="kids">/.test(enSec) && /<h2 id="kids-fr">/.test(frSec) && app.includes('href="/terms#kids"'));
  const local404 = ['/privacy', '/CONTENT-LICENCE.md', '/ai.txt'].filter(h => page.includes('href="' + h + '"') &&
    !fs.existsSync(path.join(ROOT, h === '/privacy' ? 'privacy.html' : h.slice(1))));
  check('every page on Qpio that terms.html links to exists', local404.length === 0, local404.join(', '));
  check('/privacy and the Privacy screen both link to the terms',
    (privacyPage.match(/href="\/terms"/g) || []).length === 2 && /class="rowlink" href="\/terms"/.test(app));

  console.log('\nThe agreement — served online and offline\n');
  check('the worker answers /terms with terms.html, as it does /privacy',
    /url\.pathname === "\/terms"[^\n]*\n\s*return env\.ASSETS\.fetch\(new Request\(url\.origin \+ "\/terms\.html"/.test(worker));
  const ver = (/src\/app\.js\?v=(\d+)/.exec(index) || [])[1];
  check('the service worker precaches /terms (best effort, like /privacy) and terms.js on this release',
    sw.includes('"./terms"\n];') && /const OPTIONAL = \[[^\]]*"\.\/terms"/.test(sw) && sw.includes('"./src/terms.js?v=' + ver + '"') &&
    /path === "\/terms"[^\n]*\? "\.\/terms"/.test(sw), 'v' + ver);
  const order = ['src/terms.js', 'src/measure.js', 'src/app.js'].map(s => index.indexOf('<script src="' + s + '?v='));
  check('index.html loads terms.js before measure.js and app.js', order[0] > 0 && order[0] < order[1] && order[1] < order[2]);

  /* ------------------------------------------------------------ the app */
  console.log('\nThe agreement — the app, started as a phone starts it\n');

  const runtimePath = path.resolve(ROOT, '..', 'curio-hq', 'tools', 'app_runtime.js');
  if (!fs.existsSync(runtimePath)) {
    check('curio-hq/tools/app_runtime.js is there to start the app', false, 'not found at ' + runtimePath);
  } else {
    const { startApp } = require(runtimePath);
    /* startApp builds its stand-in browser and then runs each script with
     * vm.runInContext. That call is wrapped for the length of one start, so the
     * stand-in can be prepared (the reader's storage, the hash, a counted
     * network) and the markup the app builds recorded, before the first script. */
    function boot(o) {
      const built = [], listeners = [], sent = { n: 0 }, queue = [];
      const real = vm.runInContext;
      let seen = null;
      vm.runInContext = function (src, ctx) {
        if (seen !== ctx) {
          seen = ctx;
          Object.entries(o.store || {}).forEach(([k, v]) => ctx.localStorage.setItem(k, v));
          if (o.hash) ctx.location.hash = o.hash;
          const doc = ctx.document, make = doc.createElement;
          doc.createElement = function (tag) {
            return new Proxy(make.call(doc, tag), { set(t, k, v) { if (k === 'innerHTML') built.push(String(v)); t[k] = v; return true; } });
          };
          const add = ctx.addEventListener;
          ctx.addEventListener = function (type) { listeners.push(type); return add.apply(this, arguments); };
          ctx.navigator.sendBeacon = () => { sent.n++; return true; };
          ctx.fetch = () => { sent.n++; return new Promise(() => {}); };
          ctx.Response = function (body) { this.body = body; };
          ctx.caches = {
            has: () => Promise.resolve(true),
            open: () => Promise.resolve({ put: (u, r) => { queue.push(JSON.parse(r.body)); return Promise.resolve(); }, match: () => Promise.resolve(null), keys: () => Promise.resolve([]) }),
          };
        }
        return real.apply(this, arguments);
      };
      let a;
      try { a = startApp({ lang: o.lang || 'en', mode: o.mode || 'adult' }); } finally { vm.runInContext = real; }
      return { a, html: built.join('\n'), listeners, sent, queue };
    }
    const waitingRound = { 'curio.mq': waiting };
    const agreedStore = { 'curio.terms': agreed };
    const MARK = {
      gate: 'id="termsGate"', firstTitle: '>Before you start</h1>', changedTitle: '>Qpio\'s rules have changed</h1>',
      box: 'id="tgAgree"', unticked: 'type="checkbox" id="tgAgree" aria-describedby="tgHint">',
      onboarding: 'class="card onb"', home: 'class="card hero"', quiz: 'class="qtext"',
    };
    const behind = h => ['onboarding', 'home', 'quiz'].filter(k => h.includes(MARK[k]));

    /* A new reader: the stand-in starts as an onboarded phone, so "new" is said. */
    const NEW = { 'curio.onboarded': 'false' };
    let b = boot({ store: Object.assign({ 'curio.nudge': 'true' }, NEW, waitingRound) });
    await tick(); await tick(); await tick();
    check('never agreed: the app starts (it does not throw) and shows the agreement screen',
      b.html.includes(MARK.gate) && b.html.includes(MARK.firstTitle));
    check('the box is not ticked for the reader, and Start is there', b.html.includes(MARK.unticked) && !/id="tgAgree"[^>]*checked/.test(b.html) && b.html.includes('id="tgStart">Start<'));
    check('behind it: no tab is drawn, and no round',
      behind(b.html).length === 0, behind(b.html).length ? 'rendered: ' + behind(b.html).join(', ') : '');
    check('behind it: tabs do not answer the address bar (no hashchange listener)', b.listeners.indexOf('hashchange') === -1);
    /* A round that starts marks its five as seen at once (markSeen, before any
       picture loads), so "no round" is observed in storage, not inferred. */
    const dl = boot({ hash: '#daily' });
    check('behind it: a #daily deep link (a notification tap) starts no round',
      dl.a.window.localStorage.getItem('curio.qseen2') === null && behind(dl.html).length === 0);
    const nb = boot({ store: { 'curio.onboarded': 'false' } });
    check('behind it: a first visit gets no welcome screens', !nb.html.includes(MARK.onboarding) && nb.html.includes(MARK.gate));
    check('behind it: nothing is sent, not even the round left waiting', b.sent.n === 0);
    check('behind it: the daily reminder is switched off for the service worker, never on',
      b.queue.length > 0 && b.queue.every(q => q.on === false), 'reminder queue writes: ' + b.queue.map(q => (q.on ? 'on' : 'off')).join(', '));
    check('the counting notice is on the screen, never called anonymous, with a switch right there',
      b.html.includes('what Qpio counts, with no name or identifier attached, to improve the questions and see how Qpio is used') &&
      !/anonym/i.test(b.html) && b.html.includes('id="tgCount"') && b.html.includes('href="/privacy"') && b.html.includes('href="/terms"'));
    check('the first screen names both texts to agree to', b.html.includes('To use it, you need to agree to its <a href="/terms">Terms of use</a> and its privacy notice.'));
    check('the gate is a labelled dialog whose title takes focus',
      /id="termsGate" role="dialog" aria-modal="true" aria-labelledby="tgTitle"/.test(b.html) && /<h1 id="tgTitle" tabindex="-1">/.test(b.html));

    /* The same start, the reader having agreed: the controls that prove the probe sees things. */
    const ok = boot({ store: Object.assign({ 'curio.nudge': 'true' }, agreedStore, waitingRound) });
    await tick(); await tick(); await tick();
    check('control: agreed, the app opens with no agreement screen, the Home tab is drawn and tabs follow the address bar',
      !ok.html.includes(MARK.gate) && ok.html.includes(MARK.home) && ok.listeners.indexOf('hashchange') !== -1);
    check('control: agreed, the waiting round is sent and the reminder queue follows the reader\'s setting',
      ok.sent.n === 1 && ok.queue.some(q => q.on === true));
    const onb = boot({ store: Object.assign({}, agreedStore, { 'curio.onboarded': 'false' }) });
    check('control: agreed but new, the welcome screens are drawn (so the probe can see them)', onb.html.includes(MARK.onboarding));
    const okDl = boot({ store: agreedStore, hash: '#daily' });
    check('control: agreed, a #daily deep link starts today\'s round (its five are marked seen)',
      okDl.a.window.localStorage.getItem('curio.qseen2') !== null);

    /* Agreeing, as the Start button does it, from the stand-in. */
    b.a.window.QpioTerms.accept();
    b.a.window.QpioMeasure.flush();
    check('agreeing (QpioTerms.accept, then flush, as Start does) sends the waiting round',
      b.sent.n === 1 && b.a.window.QpioTerms.accepted() === true);

    b = boot({ store: { 'curio.terms': JSON.stringify({ terms: VERSION + '-older', at: '2026-01-01' }) } });
    check('agreed to an older version: the screen says the rules have changed, with Carry on and Not now',
      b.html.includes(MARK.changedTitle) && b.html.includes('id="tgStart">Carry on<') && b.html.includes('id="tgNotNow">Not now<') && behind(b.html).length === 0);

    /* Every tester moving up from v107: progress on the device, no agreement.
       Same screen as a change, so Not now (Save a copy, Delete) is there. */
    b = boot({ store: { 'curio.onboarded': 'true' } });
    check('a device with progress but no agreement gets Carry on and Not now, and no "what has changed" list',
      b.html.includes(MARK.changedTitle) && b.html.includes('id="tgStart">Carry on<') && b.html.includes('id="tgNotNow">Not now<') &&
      !b.html.includes('What has changed:') && behind(b.html).length === 0);

    b = boot({ mode: 'kids', store: { 'curio.terms': JSON.stringify({ terms: VERSION + '-older', at: '2026-01-01' }) } });
    check('Kids mode, rules changed: the child\'s line does not repeat the heading',
      b.html.includes(MARK.changedTitle) && b.html.includes('Ask a grown-up who looks after you to read the new rules with you.') &&
      !b.html.includes("Qpio's rules have changed. Ask"));

    b = boot({ mode: 'kids', store: NEW });
    check('Kids mode: the child\'s line, the grown-up\'s line and the younger readers\' version are shown',
      b.html.includes('Ask a grown-up who looks after you to read these rules with you.') &&
      b.html.includes('For grown-ups: please read these rules with the child before they tick the box.') &&
      b.html.includes('href="/terms#kids"') && b.html.includes('Under 18?'));
    const kidsCounted = /var\s+KIDS_COUNTED\s*=\s*true\s*;/.test(measureSrc);
    check('Kids mode: the privacy line says what measure.js does with Kids rounds',
      kidsCounted ? b.html.includes('id="tgCount"') : b.html.includes('Rounds played in Kids mode are not counted.') && !b.html.includes('what Qpio counts') && !b.html.includes('id="tgCount"'),
      'KIDS_COUNTED is ' + kidsCounted);

    b = boot({ lang: 'fr', store: NEW });
    check('French: the agreement screen is in French', b.html.includes('>Avant de commencer</h1>') &&
      b.html.includes('J’accepte les Conditions d’utilisation') && b.html.includes('>Commencer<') && !b.html.includes('Before you start'));
    b = boot({ lang: 'fr', store: { 'curio.terms': JSON.stringify({ terms: VERSION + '-older', at: '2026-01-01' }) } });
    check('French: the changed screen is in French', b.html.includes('>Les règles de Qpio ont changé</h1>') && b.html.includes('>Pas maintenant<'));
  }

  check('Carry on with the box empty says "to carry on", not "to start"',
    app.includes('hint.textContent = again ? t("Tick the box first to carry on.") : t("Tick the box first to start.")'));
  check('after agreeing, focus goes to a heading in the layer the reader sees (not the hidden tab behind the welcome screen)',
    /var layer = playShown \? playLayer : tabView;\s*var h = layer && layer\.querySelector\("h1, h2, h3, h4, \.qtext"\);/.test(app));
  check('the welcome screens no longer say Kids mode "never asks for anything at all"',
    !app.includes('which never asks for anything at all') && app.includes('There is a Kids mode too, with nothing to buy and no account.'));

  /* ------------------------------------------------------------ the words */
  console.log('\nThe agreement — every line reaches the French check\n');
  const a0 = app.indexOf('/* TERMS:begin */'), a1 = app.indexOf('/* TERMS:end */');
  /* comments removed first: they talk about t() without calling it */
  const block = a0 !== -1 && a1 > a0 ? app.slice(a0, a1).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n') : '';
  const calls = [...block.matchAll(/(?<![\w$.])tf?\(/g)];
  const lits = [];
  const bad = calls.filter(m => {
    const lit = /^\s*("(?:[^"\\\n]|\\.)*")\s*[,)]/.exec(block.slice(m.index + m[0].length));
    if (lit) lits.push(JSON.parse(lit[1]));
    return !lit;
  }).map(m => block.slice(m.index, m.index + 50).split('\n')[0]);
  check('every t() and tf() on the agreement screen takes a string literal', block && calls.length >= 20 && bad.length === 0,
    bad.length ? 'not literal: ' + bad.join(' | ') : calls.length + ' calls');
  const untranslated = lits.filter(s => !Object.prototype.hasOwnProperty.call(FR, s));
  check('every one of them has a French translation', untranslated.length === 0, untranslated.join(' | '));
  const typo = lits.map(s => FR[s]).filter(f => f && / [:;?!»]|« /.test(f));
  check('French typography: a non-breaking space before : ; ? ! and inside « »', typo.length === 0, typo.join(' | '));

  console.log(failures ? '\n' + failures + ' FAILED\n' : '\nAll checks passed.\n');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('\nTEST HARNESS FAILED: ' + e.stack); process.exit(1); });
