/* SETTINGS › PRIVACY & YOUR DATA — the checks that keep the screen honest.
 *
 * Founder, 24 Sep 2026: a data-rights screen in Settings, and the promise
 * "Your curiosity is yours." in ONE place instead of under every screen. The
 * failures these catch are all quiet ones: the promise creeping back onto a
 * second surface, a "Delete everything" that silently switches counting back
 * on, a Kids-mode sentence on /privacy that no longer matches what the code
 * sends, a French screen with one English line because a string reached t()
 * through a variable the scanner cannot see.
 *
 *   node tools/privacy.test.js
 */

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const index = read('index.html');
const page = read('privacy.html');
const app = read('src/app.js');
const i18n = read('src/i18n.js');
const measure = read('src/measure.js');
const doors = read('src/doors.js');
const privacySrc = read('src/privacy.js');

const PROMISE = 'Qpio collects only information that has a defined purpose for improving the product, understanding its performance, operating a feature the reader chose, or fulfilling a transaction the reader initiated. We are transparent about what we collect, we do not sell reader data, and anonymous behaviour is not turned into a personal profile.';

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? ' — ' + detail : ''));
  if (!ok) failures++;
}
const count = (hay, needle) => hay.split(needle).length - 1;
const absent = (hay, list) => list.filter(s => hay.includes(s));

(async function () {
  console.log('\nPrivacy — the promise lives in one place\n');

  /* 1 */
  let found = absent(index, ['reader-trust', 'Your curiosity is yours', 'Qpio collects only information', 'Votre curiosit']);
  check('index.html no longer carries the promise under every screen', found.length === 0,
    found.length ? 'still has: ' + found.join(', ') : 'no block, no style, no French swap');

  /* 2 */
  found = absent(page, ['Qpio collects only information', 'ne collecte que', 'class="promise"']);
  check('privacy.html no longer carries the promise', found.length === 0,
    found.length ? 'still has: ' + found.join(', ') : 'the in-app screen is the one place');

  /* 3 */
  const lit = JSON.stringify(PROMISE);
  check('app.js has the D-087 sentence exactly once, inside a literal t()',
    count(app, PROMISE) === 1 && count(app, 't(' + lit + ')') === 1,
    'byte for byte, so the French check can see it');
  check('i18n.js has it exactly once, as a key',
    count(i18n, PROMISE) === 1 && new RegExp('^\\s*' + lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:', 'm').test(i18n));

  console.log('\nPrivacy — the delete (src/privacy.js)\n');

  /* 4. A fake Storage with the five members the code uses, recording removals. */
  function fakeStorage(init) {
    const m = new Map(Object.entries(init || {}));
    const removed = [];
    return {
      m, removed,
      st: {
        get length() { return m.size; },
        key(i) { const k = Array.from(m.keys())[i]; return k === undefined ? null : k; },
        getItem(k) { return m.has(k) ? m.get(k) : null; },
        setItem(k, v) { m.set(k, String(v)); },
        removeItem(k) { removed.push(k); m.delete(k); },
      },
    };
  }
  function load(extra, before) {
    const ctx = Object.assign({
      console,
      /* the 3-second ceiling must not hold the test process open */
      setTimeout: (f, ms) => { const h = setTimeout(f, ms); if (h.unref) h.unref(); return h; },
      navigator: {},
    }, extra || {});
    ctx.window = ctx;
    vm.createContext(ctx);
    // Accessors are defined from inside the context: node's vm does not forward
    // a getter set on the outer object to code running in it.
    if (before) vm.runInContext(before, ctx);
    vm.runInContext(privacySrc, ctx, { filename: 'privacy.js' });
    return ctx;
  }
  const P = load().QpioPrivacy;
  const common = {
    'curio.vault': '{"Q001":{"box":2}}', 'curio.daily.2026-09-01': '{"s":4}', 'curio.dailyProg.2026-09-24': '{}',
    'curio.mq': '[]', 'curio.firstweek': '"2026-W23"', 'curio.mhealth': '{}', 'curio.lang': 'fr',
    'qpio.doorset': '["a"]', 'other.app': 'theirs',
  };

  let s = fakeStorage(Object.assign({ 'curio.measure.off': 'true' }, common));
  let r = P.wipeStorage(s.st);
  check('counting off: only curio.measure.off and a foreign key remain',
    JSON.stringify(Array.from(s.m.keys()).sort()) === JSON.stringify(['curio.measure.off', 'other.app']) && r.keptOff === true,
    'the reader\'s objection survives the delete (GDPR Art. 21)');
  check('counting off: removeItem is never called for curio.measure.off, not even for a moment',
    s.removed.indexOf('curio.measure.off') === -1);

  s = fakeStorage(Object.assign({}, common));
  P.wipeStorage(s.st);
  check('counting never touched: no curio.* key remains',
    Array.from(s.m.keys()).filter(k => /^curio\./.test(k)).length === 0 && s.m.get('other.app') === 'theirs',
    'and another site\'s key on the same origin is left alone');

  s = fakeStorage(Object.assign({ 'curio.measure.off': 'false' }, common));
  P.wipeStorage(s.st);
  check('counting explicitly on ("false"): the key is removed', !s.m.has('curio.measure.off'));
  check('qpio.doorset is removed', !s.m.has('qpio.doorset'));

  s = fakeStorage(Object.assign({ 'curio.settings': '{"ageMode":"kids","timer":"off"}' }, common));
  r = P.wipeStorage(s.st);
  check('Kids mode: settings become exactly {"ageMode":"kids"}, overwritten rather than removed',
    s.m.get('curio.settings') === '{"ageMode":"kids"}' && s.removed.indexOf('curio.settings') === -1 && r.keptKids === true,
    'a child\'s protection is not lowered without saying so');

  s = fakeStorage(Object.assign({ 'curio.settings': '{"ageMode":"all","timer":"off"}' }, common));
  P.wipeStorage(s.st);
  check('Everyone mode: settings are removed like everything else', !s.m.has('curio.settings'));

  s = fakeStorage(Object.assign({}, common));
  const snap = P.snapshot(s.st);
  check('Save a copy: curio.lang stays the string "fr", JSON values are parsed, foreign keys are left out',
    snap['curio.lang'] === 'fr' && snap['curio.vault'].Q001.box === 2 && snap['qpio.doorset'][0] === 'a' && !('other.app' in snap));

  const wk = P.weekStart('2026-W23');
  check('the week a device first played reads as that week\'s Monday',
    wk && wk.toISOString().slice(0, 10) === '2026-06-01' && P.weekStart('junk') === null);

  /* Blocked storage: the getter itself throws, as it does with site data blocked. */
  const deleted = [];
  const blocked = load({
    caches: { delete: n => { deleted.push(n); return Promise.resolve(true); }, keys: () => Promise.resolve([]) },
  }, 'Object.defineProperty(globalThis, "localStorage", { get() { throw new Error("SecurityError"); } });' +
     'Object.defineProperty(globalThis, "sessionStorage", { get() { throw new Error("SecurityError"); } });');
  let threw = false, res;
  try { res = await blocked.QpioPrivacy.wipeDevice(); } catch (e) { threw = true; }
  check('blocked storage: wipeDevice() resolves without throwing, and the caches are still cleared',
    !threw && res === null && deleted.indexOf('qpio-img-v1') !== -1 && deleted.indexOf('qpio-nudge') !== -1,
    'null means nothing could have been stored, which the screen treats as done');

  /* The whole device wipe against working stand-ins: what goes and what stays. */
  const local = fakeStorage(Object.assign({ 'curio.measure.off': 'true' }, common));
  const session = fakeStorage({ 'curio.qidiag': '1' });
  const req = u => ({ url: u });
  const appCache = { entries: [req('https://uat.qpio.app/img/gen/a.webp'), req('https://uat.qpio.app/src/app.js?v=104')] };
  appCache.keys = () => Promise.resolve(appCache.entries.slice());
  appCache.delete = r => { appCache.entries = appCache.entries.filter(x => x !== r); return Promise.resolve(true); };
  const cachesDeleted = [], unregistered = [];
  let halted = 0;
  const full = load({
    localStorage: local.st, sessionStorage: session.st,
    QpioMeasure: { halt: () => { halted++; } },
    caches: {
      delete: n => { cachesDeleted.push(n); return Promise.resolve(true); },
      keys: () => Promise.resolve(['qpio-v104', 'qpio-pictures', 'qpio-img-v1']),
      open: n => Promise.resolve(n === 'qpio-v104' ? appCache : { keys: () => Promise.resolve([req('https://uat.qpio.app/img/gen/b.webp')]), delete: () => { throw new Error('must not touch ' + n); } }),
    },
    navigator: { serviceWorker: { getRegistration: () => Promise.resolve({ periodicSync: { unregister: t => { unregistered.push(t); return Promise.resolve(); } } }) } },
  });
  res = await full.QpioPrivacy.wipeDevice();
  check('the full delete halts counting first, then clears storage, session, caches and the daily wake-up',
    halted === 1 && res && res.failed === 0 &&
    JSON.stringify(Array.from(local.m.keys()).sort()) === JSON.stringify(['curio.measure.off', 'other.app']) &&
    session.m.size === 0 &&
    cachesDeleted.indexOf('qpio-img-v1') !== -1 && cachesDeleted.indexOf('qpio-nudge') !== -1 &&
    appCache.entries.length === 1 && /app\.js/.test(appCache.entries[0].url) &&
    unregistered.join() === 'qpio-daily',
    'viewed img/gen/ pictures leave the app cache; the app files stay so Qpio reopens offline');

  console.log('\nPrivacy — the app\n');

  /* 5 */
  check('the old one-tap reset is gone from Comfort & settings',
    !/id="wipe"/.test(app) && !app.includes('Reset all my data on this device'));
  const lsSet = (/set:\s*function\s*\(k,\s*v\)\s*\{([^\n]*)/.exec(app) || [])[1] || '';
  check('LS.set writes nothing once a delete has started', /WIPING/.test(lsSet), lsSet.trim().slice(0, 60));
  const restore = app.split('\n').find(l => /localStorage\.setItem\(k,\s*bag\.d\[k\]\)/.test(l)) || '';
  check('Restore only writes what a backup can contain', /BACKUP_KEYS/.test(restore),
    'a pasted code cannot switch the counting back on');

  /* 6 */
  const kc = (/var\s+KIDS_COUNTED\s*=\s*(true|false)\s*;/.exec(measure) || [])[1];
  const pageKc = [...page.matchAll(/id="kidsCounting(?:Fr)?"\s+data-kids-counted="(true|false)"/g)].map(m => m[1]);
  check('KIDS_COUNTED in measure.js matches data-kids-counted on /privacy, in both languages',
    kc !== undefined && pageKc.length === 2 && pageKc.every(v => v === kc),
    'measure.js ' + kc + ', privacy.html ' + pageKc.join('/'));
  check('the /privacy Kids sentence says what the code does',
    kc === 'false' ? page.includes('Rounds played in Kids mode are not counted.') && page.includes('Les parties jouées en mode enfants ne sont pas comptées.')
                   : page.includes('It is counted as rounds and answers'));

  /* 7 */
  found = absent(page, [
    'There is nowhere to type', 'has no way to type anything', 'Which links out you tapped', '760 questions',
    'never of children', 'no advertising', 'What is never sent',
    'nulle part où écrire', 'aucun endroit où écrire', 'Les liens sortants ouverts', 'jamais des enfants', 'Tout désactiver',
  ]);
  check('/privacy carries none of the sentences the new screen would contradict', found.length === 0,
    found.length ? 'still has: ' + found.join(' | ') : '');

  /* 8 */
  const contact = (/var\s+PRIVACY_CONTACT\s*=\s*"([^"]*)"/.exec(app) || [])[1];
  const mailtos = [...page.matchAll(/mailto:([^"?\s>]+)/g)].map(m => m[1]);
  check('PRIVACY_CONTACT in app.js matches the address on /privacy',
    contact !== undefined && (contact === '' ? mailtos.length === 0 : mailtos.length > 0 && mailtos.every(a => a === contact)),
    contact === '' ? 'both empty: no mailto anywhere (test site only)' : contact + ' on both');

  /* 9 */
  const a = app.indexOf('/* PRIVACY:begin */'), b = app.indexOf('/* PRIVACY:end */');
  const block = a !== -1 && b > a ? app.slice(a, b) : '';
  const calls = [...block.matchAll(/(?<![\w$.])tf?\(/g)];
  const bad = calls.filter(m => !/^\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')\s*[,)]/.test(block.slice(m.index + m[0].length)))
    .map(m => block.slice(m.index, m.index + 50).split('\n')[0]);
  check('every t() and tf() call on the Privacy screen takes a string literal', block && calls.length > 50 && bad.length === 0,
    bad.length ? 'not literal: ' + bad.join(' | ') : calls.length + ' calls, all literal, so the French check sees every line');

  /* 10. doors.js, run as written, not read for words. With the reader's "no"
   * stored, or in Kids mode, it must neither fetch nor build a /go/ link. Today
   * the kill switch is off, so it does neither; switched on without both
   * guards, this turns red. A search of the source was not enough: a comment
   * naming the opt-out key, or the Kids ternary in mode(), satisfied it. */
  function runDoors(src, store) {
    const m = new Map(Object.entries(store));
    const fetched = [];
    const ctx = {
      console, QLANG: 'en',
      localStorage: { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } },
      fetch: u => { fetched.push(String(u)); return Promise.resolve({ ok: false }); },
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(src, ctx, { filename: 'doors.js' });
    ctx.QPIO_DOORS.roundStart();
    return { fetched: fetched.length, href: ctx.QPIO_DOORS.href('read', 'lead', 'https://openlibrary.org/') };
  }
  const sendOn = /var\s+SEND_ENABLED\s*=\s*true\s*;/.test(doors);
  const state = sendOn ? 'SEND_ENABLED is true' : 'SEND_ENABLED is false today';
  let d = runDoors(doors, { 'curio.measure.off': 'true', 'curio.settings': '{"ageMode":"all"}' });
  check('doors.js with counting turned off: no fetch and no /go/ link', d.fetched === 0 && d.href === null, state);
  d = runDoors(doors, { 'curio.settings': '{"ageMode":"kids"}' });
  check('doors.js in Kids mode: no fetch and no /go/ link', d.fetched === 0 && d.href === null, state);
  /* The probe must be able to see a send at all, or the two checks above prove
   * nothing: a copy with the switch forced on, Everyone mode, no "no". */
  const forced = sendOn ? doors : doors.replace(/var\s+SEND_ENABLED\s*=\s*false\s*;/, 'var SEND_ENABLED = true;');
  d = runDoors(forced, { 'curio.settings': '{"ageMode":"all"}' });
  check('the doors probe sees a send when one happens (switch forced on, Everyone mode)',
    forced !== doors || sendOn ? d.fetched === 1 && typeof d.href === 'string' && d.href.indexOf('/go/read/lead') === 0 : false,
    'fetches: ' + d.fetched + ', link: ' + d.href);

  console.log(failures ? '\n' + failures + ' FAILED\n' : '\nAll checks passed.\n');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('\nTEST HARNESS FAILED: ' + e.stack); process.exit(1); });
