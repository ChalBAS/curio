/* The morning question - worker/push.js (launch plan N3, N4).
 *
 *   node tools/push.test.js
 *
 * Zero dependencies: the D1 database is stood in for by node:sqlite running the
 * real schema (worker/push-schema.sql), and the push services by a fake fetch.
 * Covers: the next send in the reader's own zone across clock changes and odd
 * offsets; the push-service allow-list; every refusal of the endpoints; that
 * nothing but address, zone and hour is stored; the sender's handling of each
 * answer a push service can give; and that the VAPID signature verifies.
 * What it cannot cover - a real phone receiving the push - is N7, on a device.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { DatabaseSync } = require('node:sqlite');

let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log('  \x1b[32mPASS\x1b[0m  ' + name);
  else { failed++; console.log('  \x1b[31mFAIL\x1b[0m  ' + name + (detail ? '\n        ' + detail : '')); }
}
const iso = s => new Date(s * 1000).toISOString();

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'worker', 'push-schema.sql'), 'utf8'));
  const stmt = (sql, args) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { db.prepare(sql).run(...(args || [])); return { success: true }; },
    first: async () => db.prepare(sql).get(...(args || [])) || null,
    all: async () => ({ results: db.prepare(sql).all(...(args || [])) }),
    exec: () => db.prepare(sql).run(...(args || []))
  });
  return { prepare: sql => stmt(sql), batch: async list => { list.forEach(s => s.exec()); return []; }, db };
}

(async () => {
  const P = await import(pathToFileURL(path.join(__dirname, '..', 'worker', 'push.js')).href);

  console.log('\n  the next send, in the reader\'s own zone');
  const next = (tz, h, at) => iso(P.nextSendUtc(tz, h, Date.parse(at)));
  ok('Paris, before the clocks go back: 08:00 CEST = 06:00Z', next('Europe/Paris', 8, '2026-10-23T12:00:00Z') === '2026-10-24T06:00:00.000Z', next('Europe/Paris', 8, '2026-10-23T12:00:00Z'));
  ok('Paris, the morning the clocks go back (25 Oct): 08:00 CET = 07:00Z', next('Europe/Paris', 8, '2026-10-24T12:00:00Z') === '2026-10-25T07:00:00.000Z', next('Europe/Paris', 8, '2026-10-24T12:00:00Z'));
  ok('Paris, the morning the clocks go forward (28 Mar 2027): 06:00Z', next('Europe/Paris', 8, '2027-03-27T12:00:00Z') === '2027-03-28T06:00:00.000Z', next('Europe/Paris', 8, '2027-03-27T12:00:00Z'));
  ok('New York, 31 Oct (EDT): 12:00Z', next('America/New_York', 8, '2026-10-30T20:00:00Z') === '2026-10-31T12:00:00.000Z');
  ok('New York, 1 Nov (EST from that night): 13:00Z', next('America/New_York', 8, '2026-10-31T20:00:00Z') === '2026-11-01T13:00:00.000Z', next('America/New_York', 8, '2026-10-31T20:00:00Z'));
  ok('Kolkata, +5:30: 02:30Z', next('Asia/Kolkata', 8, '2026-10-19T00:00:00Z') === '2026-10-19T02:30:00.000Z');
  ok('Kathmandu, +5:45: 02:15Z', next('Asia/Kathmandu', 8, '2026-10-19T00:00:00Z') === '2026-10-19T02:15:00.000Z');
  ok('Chatham, +13:45: the day before in UTC', next('Pacific/Chatham', 8, '2026-10-19T00:00:00Z') === '2026-10-19T18:15:00.000Z', next('Pacific/Chatham', 8, '2026-10-19T00:00:00Z'));
  ok('Hong Kong, already past 08:00: tomorrow', next('Asia/Hong_Kong', 8, '2026-10-19T00:30:00Z') === '2026-10-20T00:00:00.000Z');
  ok('exactly on the hour: the next day, never the same instant', next('Asia/Hong_Kong', 8, '2026-10-20T00:00:00Z') === '2026-10-21T00:00:00.000Z');
  ok('a chosen hour other than 8 (06:00 London, winter)', next('Europe/London', 6, '2026-11-10T12:00:00Z') === '2026-11-11T06:00:00.000Z');
  ok('UTC itself', next('UTC', 8, '2026-10-19T09:00:00Z') === '2026-10-20T08:00:00.000Z');

  console.log('\n  time zones accepted');
  ok('a real zone', P.validZone('Europe/Paris') && P.validZone('America/Argentina/Buenos_Aires') && P.validZone('UTC'));
  ok('an invented zone', !P.validZone('Mars/Olympus_Mons'));
  ok('path tricks, empty, too long, not a string', !P.validZone('../etc/passwd') && !P.validZone('') && !P.validZone('A'.repeat(65)) && !P.validZone(8));

  console.log('\n  only the push services can be called');
  const good = ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QAbc', 'https://wns2-par02p.notify.windows.com/w/?token=abc'];
  ok('Chrome/Android, Firefox, Apple, Windows', good.every(P.allowedEndpoint));
  const bad = ['http://fcm.googleapis.com/fcm/send/abc', 'https://evil.example/fcm', 'https://fcm.googleapis.com.evil.example/x',
    'https://fcm.googleapis.com:8443/x', 'https://user:pw@fcm.googleapis.com/x', 'https://169.254.169.254/latest',
    'https://googleapis.com/x', 'https://x.notify.windows.com.evil.example/', 'https://fcm.googleapis.com/' + 'a'.repeat(1100), 42, null];
  for (const b of bad) ok('refused: ' + String(b).slice(0, 60), !P.allowedEndpoint(b));

  console.log('\n  the endpoints');
  const D = fakeD1();
  const env = { PUSH_DB: D, VAPID_PRIVATE_JWK: '{"present":"for the route; the sender tests use a real key"}' };
  const call = (p, body, o = {}) => {
    const url = new URL('https://uat.qpio.app/api/push/' + p);
    const req = new Request(url, { method: o.method || 'POST', headers: { 'content-type': 'application/json', origin: o.origin || 'https://uat.qpio.app', 'cf-connecting-ip': '203.0.113.9' }, // an example address (RFC 5737)
      body: (o.method || 'POST') === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined });
    return P.handlePush(req, o.env || env, url);
  };
  const EP = 'https://fcm.googleapis.com/fcm/send/reader-one';
  ok('another path is not ours', P.handlePush(new Request('https://uat.qpio.app/api/stats'), env, new URL('https://uat.qpio.app/api/stats')) === null);
  ok('unknown push path: 404', (await call('other', {})).status === 404);
  ok('GET: 405', (await call('subscribe', null, { method: 'GET' })).status === 405);
  ok('no database bound (a site without push): 503', (await call('subscribe', { endpoint: EP, tz: 'UTC' }, { env: {} })).status === 503);
  ok('database but no signing key: sign-up refused (503), so no reader waits for a push that cannot come',
    (await call('subscribe', { endpoint: EP, tz: 'UTC' }, { env: { PUSH_DB: D } })).status === 503);
  ok('...but turning off still works there', (await call('unsubscribe', { endpoint: EP }, { env: { PUSH_DB: D } })).status === 200);
  ok('another site\'s page: 403', (await call('subscribe', { endpoint: EP, tz: 'UTC' }, { origin: 'https://evil.example' })).status === 403);
  ok('over the rate limit: 429', (await call('subscribe', { endpoint: EP, tz: 'UTC' }, { env: { PUSH_DB: D, PUSH_LIMIT: { limit: async () => ({ success: false }) } } })).status === 429);
  ok('over 1 KB: 413', (await call('subscribe', JSON.stringify({ endpoint: EP, tz: 'UTC', pad: 'x'.repeat(1100) }))).status === 413);
  ok('not JSON: 400', (await call('subscribe', '{nope')).status === 400);
  ok('an address outside the push services: 400', (await call('subscribe', { endpoint: 'https://evil.example/x', tz: 'UTC' })).status === 400);
  ok('an invented zone: 400', (await call('subscribe', { endpoint: EP, tz: 'Mars/Base' })).status === 400);
  ok('an hour that is not 0-23: 400', (await call('subscribe', { endpoint: EP, tz: 'UTC', hour: 25 })).status === 400 && (await call('subscribe', { endpoint: EP, tz: 'UTC', hour: '8' })).status === 400);
  ok('nothing stored by any refusal', D.db.prepare('SELECT COUNT(*) AS n FROM push_sub').get().n === 0);

  const r1 = await call('subscribe', { endpoint: EP, tz: 'Europe/Paris', hour: 8, extra: 'ignored' });
  ok('sign-up: 201', r1.status === 201);
  let row = D.db.prepare('SELECT * FROM push_sub').get();
  ok('one row, keyed by the address\'s SHA-256', row && /^[0-9a-f]{64}$/.test(row.id) && row.endpoint === EP);
  ok('the next send is 08:00 Paris', row && new Date(row.next_utc * 1000).toLocaleString('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }) === '08:00');
  ok('created is the day only', row && row.created % 86400 === 0);
  ok('only address, zone and hour about the reader (no IP, no language, no agent)',
    Object.keys(row).sort().join() === 'created,endpoint,fails,hour,id,last_sent,next_utc,tz' && !JSON.stringify(row).includes('203.0.113.9'));
  ok('the hour defaults to 8', (await call('subscribe', { endpoint: EP + 'b', tz: 'UTC' })).status === 201 &&
    D.db.prepare('SELECT hour FROM push_sub WHERE endpoint = ?').get(EP + 'b').hour === 8);
  const r2 = await call('subscribe', { endpoint: EP, tz: 'Asia/Tokyo', hour: 7 });
  row = D.db.prepare('SELECT * FROM push_sub WHERE endpoint = ?').get(EP);
  ok('signing up again (travel, a new hour) updates the same row', r2.status === 201 && row.tz === 'Asia/Tokyo' && row.hour === 7 &&
    D.db.prepare('SELECT COUNT(*) AS n FROM push_sub WHERE endpoint = ?').get(EP).n === 1);
  ok('turning off: 200 and the row is gone', (await call('unsubscribe', { endpoint: EP })).status === 200 &&
    D.db.prepare('SELECT COUNT(*) AS n FROM push_sub WHERE endpoint = ?').get(EP).n === 0);
  ok('turning off an address we never had: 200, says nothing', (await call('unsubscribe', { endpoint: EP + 'zzz' })).status === 200);

  console.log('\n  the sender');
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const S = fakeD1();
  const senv = { PUSH_DB: S, VAPID_PRIVATE_JWK: JSON.stringify({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d }) };
  const NOW = Date.parse('2026-10-20T00:05:00Z');
  const nowS = NOW / 1000;
  const add = (ep, tz, next, fails = 0) => S.db.prepare('INSERT INTO push_sub (id, endpoint, tz, hour, next_utc, created, fails) VALUES (?, ?, ?, 8, ?, 0, ?)').run(ep, ep, tz, next, fails);
  add('https://fcm.googleapis.com/fcm/send/ok', 'Asia/Hong_Kong', nowS - 300);
  add('https://web.push.apple.com/gone', 'Asia/Hong_Kong', nowS - 300);
  add('https://updates.push.services.mozilla.com/wpush/v2/tired', 'Asia/Hong_Kong', nowS - 300, 4);
  add('https://wns2-par02p.notify.windows.com/w/?token=busy', 'Asia/Hong_Kong', nowS - 300, 0);
  add('https://fcm.googleapis.com/fcm/send/broken', 'Asia/Hong_Kong', nowS - 300, 0);
  add('https://fcm.googleapis.com/fcm/send/later', 'Europe/Paris', nowS + 3600);
  const calls = [];
  const answer = { ok: 201, gone: 410, tired: 500, 'token=busy': 503 };
  const fakeFetch = async (u, o) => {
    calls.push({ u, o });
    if (u.endsWith('broken')) throw new Error('network');
    const k = Object.keys(answer).find(k => u.endsWith(k));
    return new Response(null, { status: answer[k] || 201 });
  };
  const out = await P.sendDue(senv, NOW, fakeFetch);
  ok('only the five due phones are called', calls.length === 5 && !calls.some(c => c.u.endsWith('later')), JSON.stringify(out));
  ok('counts: 1 sent, 1 gone, 1 dropped after 5 refusals, 2 to retry', out.sent === 1 && out.gone === 1 && out.dropped === 1 && out.failed === 2, JSON.stringify(out));
  const okRow = S.db.prepare('SELECT * FROM push_sub WHERE id = ?').get('https://fcm.googleapis.com/fcm/send/ok');
  ok('sent: next send is tomorrow 08:00 Hong Kong, last_sent set', okRow && iso(okRow.next_utc) === '2026-10-21T00:00:00.000Z' && okRow.last_sent === nowS && okRow.fails === 0);
  ok('410 from the push service: forgotten', !S.db.prepare('SELECT 1 FROM push_sub WHERE id = ?').get('https://web.push.apple.com/gone'));
  ok('a fifth refusal in a row: forgotten', !S.db.prepare('SELECT 1 FROM push_sub WHERE id = ?').get('https://updates.push.services.mozilla.com/wpush/v2/tired'));
  const busy = S.db.prepare('SELECT * FROM push_sub WHERE id = ?').get('https://wns2-par02p.notify.windows.com/w/?token=busy');
  ok('503: kept, counted, tried again tomorrow', busy && busy.fails === 1 && iso(busy.next_utc) === '2026-10-21T00:00:00.000Z');
  const broken = S.db.prepare('SELECT * FROM push_sub WHERE id = ?').get('https://fcm.googleapis.com/fcm/send/broken');
  ok('a network error is a refusal, not a crash', broken && broken.fails === 1);
  ok('not due: untouched', S.db.prepare('SELECT next_utc FROM push_sub WHERE id = ?').get('https://fcm.googleapis.com/fcm/send/later').next_utc === nowS + 3600);

  const c0 = calls[0];
  ok('an empty POST with a 4-hour TTL', c0.o.method === 'POST' && c0.o.body === '' && c0.o.headers.TTL === '14400' && c0.o.headers.Urgency === 'normal');
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=([A-Za-z0-9_-]+)$/.exec(c0.o.headers.Authorization || '');
  ok('Authorization is "vapid t=<jwt>, k=<key>"', !!m, c0.o.headers.Authorization);
  if (m) {
    const dec = s => JSON.parse(Buffer.from(s, 'base64url').toString());
    const head = dec(m[1]), claims = dec(m[2]);
    ok('ES256, audience = the push service\'s origin, expires within an hour, subject set',
      head.alg === 'ES256' && claims.aud === 'https://fcm.googleapis.com' && claims.exp > nowS && claims.exp <= nowS + 3600 && claims.sub === 'https://qpio.app', JSON.stringify(claims));
    const pub = await crypto.subtle.importKey('raw', Buffer.from(m[4], 'base64url'), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, Buffer.from(m[3], 'base64url'), new TextEncoder().encode(m[1] + '.' + m[2]));
    ok('the signature verifies against the public key it names (64-byte r||s)', valid && Buffer.from(m[3], 'base64url').length === 64);
    const appleCall = calls.find(c => c.u.includes('apple'));
    ok('each push service gets its own audience', appleCall && dec(/t=[^.]+\.([^.]+)/.exec(appleCall.o.headers.Authorization)[1]).aud === 'https://web.push.apple.com');
  }

  const many = fakeD1();
  for (let i = 0; i < 60; i++) many.db.prepare('INSERT INTO push_sub (id, endpoint, tz, hour, next_utc, created) VALUES (?, ?, ?, 8, ?, 0)').run('id' + i, 'https://fcm.googleapis.com/fcm/send/' + i, 'UTC', nowS - 60);
  let n = 0;
  const o2 = await P.sendDue({ PUSH_DB: many, VAPID_PRIVATE_JWK: senv.VAPID_PRIVATE_JWK }, NOW, async () => { n++; return new Response(null, { status: 201 }); });
  ok('at most 45 sends a run (Workers Free: 50 outbound calls); the rest the next quarter-hour', n === 45 && o2.sent === 45);
  let n2 = 0;
  const o3 = await P.sendDue({ PUSH_DB: many }, NOW, async () => { n2++; return new Response(null, { status: 201 }); });
  ok('no signing key: sends nothing', n2 === 0 && o3.due === 0);

  console.log('\n  morning question (push) - ' + (failed ? failed + ' FAILED' : 'all checks passed'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
