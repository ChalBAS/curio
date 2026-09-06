/* THE INSTRUMENT'S OWN TESTS.
 *
 * CEO, 6 September 2026: "Analytics must never silently fail and then look like
 * real user behaviour" and "tests for instrument correctness".
 *
 * Every failure these catch is invisible in production. A counter that rejects
 * everything and a week when nobody played produce the same empty table. A
 * validator that lets an unknown value through fills a column with "unknown"
 * while every chart still looks healthy. A key that quietly changes shape turns
 * one question's history into two.
 *
 *   node tools/measure.test.js
 */

'use strict';
const path = require('path');

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? ' — ' + detail : ''));
  if (!ok) failures++;
}

(async function () {
  const m = await import('file://' + path.resolve(__dirname, '..', 'worker', 'analytics.js').replace(/\\/g, '/'));
  const I = m._internals;
  const NOW = new Date('2026-09-06T12:00:00Z');

  console.log('\nMeasurement — the server half\n');

  /* ------------------------------------------------------- the reader's day */
  check("today is accepted", I.dayAcceptable('2026-09-06', NOW) === true);
  check("a day either side is accepted, because timezones are real",
    I.dayAcceptable('2026-09-05', NOW) && I.dayAcceptable('2026-09-07', NOW),
    'Auckland and Lima meet the same five questions on different UTC dates');
  check("a clock three days out is refused, not filed under a date it did not happen on",
    I.dayAcceptable('2026-09-09', NOW) === false);
  check("junk is refused", I.dayAcceptable('yesterday', NOW) === false &&
    I.dayAcceptable('', NOW) === false && I.dayAcceptable(null, NOW) === false);

  /* ------------------------------------------------------------- the country */
  check('a real country code is kept as itself', I.countryOf({ country: 'SN' }) === 'SN',
    'country level, never a region — cultural bias cannot be seen in a continent');
  check('a non-country code becomes XX rather than an invented country',
    I.countryOf({ country: 'T1' }) === 'XX' && I.countryOf({}) === 'XX');
  check('anything that is not two letters becomes XX',
    I.countryOf({ country: 'ENGLAND' }) === 'XX' && I.countryOf({ country: '1' }) === 'XX');

  /* ------------------------------------------------------------ closed lists */
  check('an unknown language is refused, not defaulted',
    I.pick(I.LANGS, 'de', null) === null && I.pick(I.LANGS, 'fr', null) === 'fr');
  check('an unknown surface is refused',
    I.pick(I.SURFACES, 'somewhere', null) === null && I.pick(I.SURFACES, 'daily', null) === 'daily');
  check('an unknown discovery answer falls back to a stated unknown',
    I.pick(I.DISCOVERY, 'carrier pigeon', 'unknown') === 'unknown' &&
    I.pick(I.DISCOVERY, 'tiktok', 'unknown') === 'tiktok');

  /* -------------------------------------------------- nothing arbitrary in a key */
  check('a question id must look like a question id',
    I.qidOf('Q001') === 'Q001' && I.qidOf('X0042') === 'X0042' &&
    I.qidOf("'; DROP TABLE question_day; --") === null && I.qidOf('') === null,
    'the id reaches a primary key, so its shape is checked rather than trusted');
  check('a version string is a label, not free text',
    I.versionOf('86') === '86' && I.versionOf('760-6fe7b0dd') === '760-6fe7b0dd' &&
    I.versionOf('a'.repeat(50)) === 'unknown' && I.versionOf('bad value;') === 'unknown');
  check('a revision must be a whole number in range',
    I.intIn(1, 1, 9999) === 1 && I.intIn(0, 1, 9999) === null &&
    I.intIn(1.5, 1, 9999) === null && I.intIn('3', 1, 9999) === 3);

  /* ------------------------------------------------------------------ the week */
  check('a content day maps to its ISO week', I.isoWeekOf('2026-09-06') === '2026-W36',
    '2026-09-06 is a Sunday, so it belongs to the week that started on the 31st');
  check('a bad day has no week', I.isoWeekOf('not-a-day') === null);

  /* ------------------------------------------------------------- the write set */
  const round = {
    day: '2026-09-06', lang: 'en', mode: 'adult', surface: 'daily', platform: 'ios',
    band: 'new', discovery: 'tiktok', installed: 1, appVersion: '86',
    contentVersion: '760-6fe7b0dd', answers: 5, completed: 1,
    questions: [1, 2, 3, 4, 5].map(p => ({ id: 'Q00' + p, qrev: 1, lrev: 1, pos: p, answered: 1, correct: p % 2 })),
    doors: [{ id: 'Q001', cls: 'read', slot: 'lead', n: 1 }],
  };
  const stmts = I.upserts(round, 'GB');

  check('a five-question round is one bounded batch', stmts.length === 14,
    stmts.length + ' statements: 5 questions x 2 tables, plus audience, cohort, one door and the health row');

  const sql = stmts.map(s => s.sql).join(' ');
  check('every write is an increment into a key that already existed',
    stmts.every(s => /^INSERT INTO/.test(s.sql) && /ON CONFLICT/.test(s.sql)),
    'aggregate-on-write: no raw row is ever created, so there is no insertion order to reconstruct');
  check('no statement deletes or rewrites history', !/\bDELETE\b|\bDROP\b|\bUPDATE [a-z_]+ SET (?!.*\+)/i.test(sql));

  /* THE LIST THAT MATTERS MOST. If any of these ever appears in a write, the
   * promise on the privacy page becomes false, and it becomes false silently. */
  const FORBIDDEN = ['ip', 'ip_address', 'user_agent', 'ua', 'ray', 'cf_ray', 'session',
    'device_id', 'install_id', 'fingerprint', 'referer', 'referrer', 'city',
    'postal', 'latitude', 'longitude', 'asn', 'timestamp', 'email'];
  const found = FORBIDDEN.filter(f => new RegExp('[,(]\\s*' + f + '\\s*[,)]', 'i').test(sql));
  check('no identifying column is written, in any statement', found.length === 0,
    found.length ? 'found ' + found.join(', ') : 'no ip, user agent, ray id, session, device, referer, city or timestamp');

  const bound = stmts.map(s => JSON.stringify(s.bind)).join(' ');
  check('nothing finer than a day is bound to any statement',
    !/T\d\d:\d\d/.test(bound) && !/\d{10,}/.test(bound),
    'a timestamp is a join key; the finest thing sent is the content day');

  /* ------------------------------------------------- arithmetic that must hold */
  check('country and question are never crossed at day level in one row',
    !/question_day[\s\S]{0,400}country/.test(stmts[0].sql),
    'question x day x country would put nearly every row at a count of one, which is both useless and the point a row starts describing a person');

  console.log('\nMeasurement — the reader half\n');

  /* The client module runs in a browser, so it is exercised against a small
   * stand-in rather than mocked away: the point is that the real code paths
   * run, not that a mock returns what the test wants. */
  const store = {};
  global.window = {
    QLANG: 'en',
    addEventListener() {},
    matchMedia: () => ({ matches: false }),
    navigator: {},
  };
  global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
  /* Node defines navigator as a getter, so it is replaced rather than assigned. */
  Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'Mozilla/5.0 (iPhone) Safari', sendBeacon: () => true },
    configurable: true, writable: true,
  });
  global.document = {
    querySelector: () => ({ getAttribute: () => 'src/app.js?v=86' }),
    addEventListener() {},
    visibilityState: 'visible',
  };
  global.Blob = function () {};
  global.fetch = () => Promise.resolve({});
  require(path.resolve(__dirname, '..', 'src', 'measure.js'));
  const M = global.window.QpioMeasure;
  const C = M._internals;

  check('the module loads and exposes a round lifecycle',
    typeof M.begin === 'function' && typeof M.mark === 'function' && typeof M.finish === 'function');

  check('the first visit is the "new" band and nothing else', C.band() === 'new',
    'every device that first played this week sends the same word, so it singles nobody out');

  /* An ISO week label, which is what the module stores - a plain date would
     be a fixture bug rather than a finding. 2026-W23 is thirteen weeks before
     the week this test runs in. */
  store['curio.firstweek'] = JSON.stringify('2026-W23');
  check('a device that first played fourteen weeks ago reports the oldest band',
    C.band() === 'w13plus', 'still one of four values shared by everyone in it');

  check('the platform is a class, not a fingerprint', C.platform() === 'ios',
    'the User-Agent is read once, reduced to one of four words, and never sent');

  check('the app version is read from what was actually served', C.appVersion() === '86');

  check('an unanswered discovery question is an honest unknown', C.discovery() === 'unknown');

  /* THE OPT-OUT IS A CONDITION, NOT A COURTESY. Counting how a service is used
   * without asking is only lawful while a working objection route ships in the
   * same release. This asserts it actually stops the sending. */
  M.setOptOut(true);
  M.begin({ surface: 'daily', mode: 'adult', questions: [{ id: 'Q001', qrev: 1, lrev: 1 }] });
  M.mark(1, true, true);
  check('a reader who opts out sends nothing at all', M.finish(true) === false,
    'the objection route is a condition of counting without asking, so it is tested like one');
  M.setOptOut(false);

  M.begin({ surface: 'daily', mode: 'kids', questions: [
    { id: 'Q001', qrev: 1, lrev: 1 }, { id: 'Q002', qrev: 1, lrev: 1 }] });
  M.mark(1, true, true);
  check('an abandoned round still reports what was shown', M.finish() !== false,
    'without this, a question people give up on looks exactly like a question nobody was given');

  check('a round cannot be sent twice', M.finish() === false,
    'a double send would inflate every denominator and look like growth');

  console.log(failures ? '\n' + failures + ' FAILED\n' : '\nAll checks passed.\n');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('\nTEST HARNESS FAILED: ' + e.stack); process.exit(1); });
