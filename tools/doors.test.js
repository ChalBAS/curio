/* Gate 5 door instrument — offline half of the §2.9 verification gate.
 *
 *   node tools/doors.test.js
 *
 * Zero dependencies. Covers every gate item that can be proven without a
 * deployed edge: path validation, the open-redirect allow-list, byte-for-byte
 * destination preservation, 302-never-301 headers, human/prefetch counting
 * exclusions, the `mode` column in the counter key, date fencing on the
 * denominator, ISO-week aggregation, the publication rules (sub-10
 * suppression, rounding, floors, quasi-Poisson interval with φ published),
 * DOOR_HOSTS ↔ golinks.js sync, and the CLIENT KILL SWITCH DEFAULT (off,
 * awaiting founder ruling R1).
 *
 * The four remaining §2.9 items need the deployed UAT edge and a device:
 * one-fetch-per-device-day on an installed PWA, airplane-mode fallback, the
 * cron prune, and the cold-page-load invocation regression read from the
 * Cloudflare dashboard. They stay with the integrator.
 */
'use strict';
const path = require('path');
const cp = require('child_process');
const { pathToFileURL } = require('url');

let failed = 0;
function is(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log('  \x1b[32mPASS\x1b[0m  ' + name);
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        expected ${e}\n        actual   ${a}`); }
}
function ok(name, cond, detail) { is(name, !!cond, true); if (!cond && detail) console.log('        ' + detail); }

function spy() {
  const rows = [];
  return {
    rows,
    env: { DOOR_DB: { prepare: () => ({ bind: (...a) => ({ run: async () => { rows.push(a); } }) }) } },
    ctx: { waitUntil: () => {} }
  };
}
function req(u, headers, cf) {
  const r = new Request('https://uat.qpio.app' + u, { headers: headers || { 'user-agent': 'Mozilla/5.0 (iPhone) Safari' } });
  if (cf) Object.defineProperty(r, 'cf', { value: cf });
  return r;
}

(async () => {
  const D = await import(pathToFileURL(path.join(__dirname, '..', 'worker', 'doors.js')).href);
  const go = (u, headers, cf) => {
    const s = spy();
    const request = req(u, headers, cf);
    const res = D.handleDoorInstrument(request, s.env, s.ctx, new URL(request.url));
    return { res, rows: s.rows };
  };

  console.log('\n\x1b[1m/go/ — the numerator (§2.9 items 1–4)\x1b[0m');
  const dest = 'https://www.britishmuseum.org/collection/object/Y_EA24';
  {
    const { res, rows } = go('/go/read/lead?u=' + encodeURIComponent(dest) + '&lang=en&mode=all');
    is('allowed destination → 302', res.status, 302);
    is('location is the exact destination', res.headers.get('location'), dest);
    is('cache-control: no-store (never a cacheable 301)', res.headers.get('cache-control'), 'no-store');
    is('referrer-policy: no-referrer', res.headers.get('referrer-policy'), 'no-referrer');
    is('x-robots-tag: noindex, nofollow', res.headers.get('x-robots-tag'), 'noindex, nofollow');
    is('counted once', rows.length, 1);
    is('counter key = (week, tap, read, lead, en, geo, mode) — mode present day one',
      rows[0].slice(1), ['tap', 'read', 'lead', 'en', 'RoW', 'all']);
  }
  {
    // Byte-for-byte: a destination whose own query carries '+', '&' and a
    // percent-escape must come back untouched. URLSearchParams would decode
    // '+' to a space — the exact corruption this test exists to catch.
    const tricky = 'https://www.youtube.com/@TED-Ed/search?query=machu+picchu&ref=a%2Bb';
    const { res } = go('/go/watch/s3?u=' + encodeURIComponent(tricky) + '&lang=fr&mode=kids');
    is('query string preserved byte-for-byte', res.headers.get('location'), tricky);
  }
  {
    const { res, rows } = go('/go/read/lead?u=' + encodeURIComponent('https://evil.example/phish'));
    is('unlisted host → 400, no redirect', res.status, 400);
    is('unlisted host → counted as nothing', rows.length, 0);
  }
  is('http:// destination → 400', go('/go/read/lead?u=' + encodeURIComponent('http://bookshop.org/x')).res.status, 400);
  is('lookalike host bookshop.org.evil.com → 400',
    go('/go/read/lead?u=' + encodeURIComponent('https://bookshop.org.evil.com/x')).res.status, 400);
  is('subdomain of a listed host is allowed',
    go('/go/read/lead?u=' + encodeURIComponent('https://covers.openlibrary.org/x')).res.status, 302);
  is('source is never a door (VAL-12 / NN-3) → 400', go('/go/source/lead?u=' + encodeURIComponent(dest)).res.status, 400);
  is('unknown slot s9 → 400', go('/go/read/s9?u=' + encodeURIComponent(dest)).res.status, 400);
  is('missing u → 400', go('/go/read/lead').res.status, 400);
  {
    const { rows } = go('/go/visit/s2?u=' + encodeURIComponent(dest) + '&lang=fr&mode=kids', undefined, { country: 'DE' });
    is('kids-mode tap keyed (tap, visit, s2, fr, EU, kids)', rows[0].slice(1), ['tap', 'visit', 's2', 'fr', 'EU', 'kids']);
  }

  console.log('\n\x1b[1m/doors/ — the denominator (§2.9 item 5)\x1b[0m');
  const today = D.todayUTC();
  {
    const { res, rows } = go('/doors/' + today + '.json?lang=en&mode=all', undefined, { country: 'US' });
    is('today → 200', res.status, 200);
    is('no-store on the payload', res.headers.get('cache-control'), 'no-store, no-cache, must-revalidate');
    ok('same-origin only (no CORS header)', !res.headers.get('access-control-allow-origin'));
    is('counted once as a served round', rows.length, 1);
    is('counter key = (week, set, -, -, en, US, all)', rows[0].slice(1), ['set', '-', '-', 'en', 'US', 'all']);
  }
  is('yesterday still valid (UTC midnight straddle)', go('/doors/' + D.yesterdayUTC() + '.json').res.status, 200);
  {
    const { res, rows } = go('/doors/2020-01-01.json');
    is('stale date → 404 (enumeration cannot inflate the denominator)', res.status, 404);
    is('stale date → counted as nothing', rows.length, 0);
  }

  console.log('\n\x1b[1mHuman classification and prefetch exclusion (§2.9 item 8)\x1b[0m');
  is('GPTBot on /go/ → not counted',
    go('/go/read/lead?u=' + encodeURIComponent(dest), { 'user-agent': 'GPTBot/1.0' }).rows.length, 0);
  is('GPTBot on /doors/ → not counted',
    go('/doors/' + today + '.json', { 'user-agent': 'GPTBot/1.0' }).rows.length, 0);
  is('empty UA → not counted', go('/doors/' + today + '.json', { 'user-agent': '' }).rows.length, 0);
  is('Sec-Purpose: prefetch → not counted',
    go('/doors/' + today + '.json', { 'user-agent': 'Mozilla/5.0 Safari', 'sec-purpose': 'prefetch;prerender' }).rows.length, 0);
  is('a prefetch still gets its 200 (only the count is skipped)',
    go('/doors/' + today + '.json', { 'user-agent': 'Mozilla/5.0 Safari', 'purpose': 'prefetch' }).res.status, 200);

  console.log('\n\x1b[1mKey coarsening — nothing finer than the ruled key\x1b[0m');
  is('geo buckets', ['US', 'GB', 'FR', 'DE', 'JP', '', null].map(D.geoBucket), ['US', 'GB', 'FR', 'EU', 'RoW', 'RoW', 'RoW']);
  is('ISO week — 2026-01-01 (Thu)', D.isoWeekUTC(new Date(Date.UTC(2026, 0, 1))), '2026-W01');
  is('ISO week — 2025-12-29 (Mon) belongs to 2026-W01', D.isoWeekUTC(new Date(Date.UTC(2025, 11, 29))), '2026-W01');
  is('ISO week — 2025-12-28 (Sun) stays in 2025', D.isoWeekUTC(new Date(Date.UTC(2025, 11, 28))), '2025-W52');

  console.log('\n\x1b[1mPublication rules (§2.4, corrected: quasi-Poisson, not Wilson)\x1b[0m');
  is('n = 0 publishes "<10", never 0', D.publishCount(0), '<10');
  is('n = 9 suppressed', D.publishCount(9), '<10');
  is('n = 10 passes, rounded', D.publishCount(10), '10');
  is('n = 1234 → 1230 (nearest 10)', D.publishCount(1234), '1230');
  is('rate refused below D ≥ 500', D.publishRate([{ taps: 40, sets: 499 }]).publishable, false);
  is('rate refused below N ≥ 10', D.publishRate([{ taps: 9, sets: 900 }]).publishable, false);
  {
    const r = D.publishRate([{ taps: 12, sets: 700 }, { taps: 18, sets: 800 }]);
    ok('rate publishes at the floors with unit inline', r.publishable && /taps per 100 served rounds/.test(r.text), r.text);
    ok('reported as a FLOOR, never a point ("at least")', /^at least /.test(r.text), r.text);
    ok('quasi-Poisson φ estimated and published', r.phi >= 1 && /φ = /.test(r.text), r.text);
    ok('interval brackets the rate', r.interval[0] <= r.per100 && r.per100 <= r.interval[1], JSON.stringify(r));
  }
  {
    const r = D.publishRate([{ taps: 30, sets: 2000 }]);
    ok('one week → no interval (φ not estimable, never assumed)', r.publishable && r.interval === null && /dispersion/.test(r.text), r.text);
  }

  console.log('\n\x1b[1mDOOR_HOSTS ↔ src/golinks.js — the allow-list cannot drift\x1b[0m');
  try {
    cp.execFileSync(process.execPath, [path.join(__dirname, 'build_door_hosts.js'), '--check'], { stdio: 'pipe' });
    ok('worker/door_hosts.js is in sync with src/golinks.js', true);
  } catch (e) {
    ok('worker/door_hosts.js is in sync with src/golinks.js', false, String(e.stdout || e.stderr || e).trim());
  }

  console.log('\n\x1b[1mClient kill switch — OFF, awaiting founder ruling R1\x1b[0m');
  {
    global.window = {};
    require(path.join(__dirname, '..', 'src', 'doors.js'));
    const C = global.window.QPIO_DOORS;
    ok('src/doors.js registers the client half', !!C);
    is('SEND_ENABLED defaults OFF (pending R1 — no agent flips it)', C.enabled, false);
    is('href() routes nothing while off', C.href('read', 'lead', dest), null);
    ok('roundStart() sends nothing and cannot throw while off', (() => { try { C.roundStart(); return true; } catch (e) { return false; } })());
  }

  console.log('');
  if (failed) { console.log(`\x1b[31m\x1b[1mDOOR INSTRUMENT TESTS FAILED\x1b[0m  ${failed} failing`); process.exit(1); }
  console.log('\x1b[32m\x1b[1mDOOR INSTRUMENT TESTS PASSED\x1b[0m  paths, allow-list, byte-for-byte 302, counting exclusions, key, publication rules, kill switch.');
})().catch((e) => { console.error(e); process.exit(1); });
