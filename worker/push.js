/* THE MORNING QUESTION - sign-up endpoints (N3) and the sender (N4).
 *
 * Founder, 18 Oct 2026 (launch plan ruling Y2): a daily question notification on
 * Android AND iPhone is a launch priority. iPhone web apps can show a notification
 * only through server push, so the server sends one. Design note:
 * curio-hq 10-Roadmap/proposals/2026-10-19-daily-notification-web-push.md.
 *
 * WHAT IS STORED, AND NOTHING ELSE. Per phone: the push address the phone's own
 * push service gave it, the reader's time zone, the hour they chose, and when the
 * next send is due. No language, no Kids/everyday, no answers, no IP address, no
 * user agent. The push address is personal data (an online identifier), so it
 * lives in its own EU database (PUSH_DB, created with --jurisdiction=eu), apart
 * from the anonymous counting, and is deleted the moment the reader turns the
 * reminder off, deletes their data, or their push service says the phone is gone.
 *
 * WHAT IS SENT. An EMPTY push: no content, so nothing needs encrypting (RFC 8291)
 * and no crypto library is needed. It carries only our VAPID signature (RFC 8292,
 * ES256 through WebCrypto). The phone wakes, and its service worker shows today's
 * question from the copy the app already holds (sw.js "push").
 *
 * WHERE IT CAN SEND. Only to the push services of Chrome/Android, Firefox, Apple
 * and Windows (PUSH_HOSTS), so this table can never be used to make the worker call
 * an address of someone else's choosing.
 *
 *   POST /api/push/subscribe    { endpoint, tz, hour }  -> 201
 *   POST /api/push/unsubscribe  { endpoint }            -> 200 (whether or not it existed)
 *   cron PUSH_CRON (every 15 minutes) -> sendDue()
 */

export const PUSH_CRON = '*/15 * * * *';
const MAX_BODY = 1024;
const MAX_SUBS = 100000;   // a ceiling, far above the beta, so the table cannot be flooded
const PER_RUN = 45;        // Workers Free allows 50 outbound calls per invocation
const TTL = 14400;         // a phone that is off keeps the wake-up for 4 hours, then it is dropped
const MAX_FAILS = 5;       // five mornings in a row that the push service refused: forgotten
/* VAPID "sub": how a push service contacts us about our traffic. qpio.app until the
   contact mailbox exists (launch plan B5, C3); then mailto: that address. */
const VAPID_SUB = 'https://qpio.app';

const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,                 // Chrome, Android, Edge on Android, Samsung, Opera
  /^updates\.push\.services\.mozilla\.com$/, // Firefox
  /^web\.push\.apple\.com$/,                 // Safari and iPhone/iPad Home Screen apps
  /^[a-z0-9-]+\.notify\.windows\.com$/       // Edge on Windows
];

export function allowedEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 1024) return false;
  let u;
  try { u = new URL(endpoint); } catch (e) { return false; }
  return u.protocol === 'https:' && !u.port && !u.username && !u.password &&
    PUSH_HOSTS.some(re => re.test(u.hostname));
}

/* ------------------------------------------------------------- time zones
 * The next send is the reader's chosen hour in THEIR zone, stored as a UTC
 * instant and recomputed after every send, so clock changes need no special case.
 * Formatters are cached: building one is the expensive part. */
const FMT = new Map();
function fmt(tz) {
  let f = FMT.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric',
      month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    FMT.set(tz, f);
  }
  return f;
}
export function validZone(tz) {
  if (typeof tz !== 'string' || !tz || tz.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(tz)) return false;
  try { fmt(tz); return true; } catch (e) { return false; }
}
function local(tz, ms) {
  const p = {};
  for (const x of fmt(tz).formatToParts(new Date(ms))) p[x.type] = +x.value;
  return p;
}
/* UTC milliseconds of y-m-d h:00 on the wall clock of tz */
function wallToUtc(tz, y, m, d, h) {
  const want = Date.UTC(y, m - 1, d, h);
  let t = want;
  for (let i = 0; i < 3; i++) {
    const p = local(tz, t);
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const next = t + (want - seen);
    if (next === t) break;
    t = next;
  }
  return t;
}
/* epoch seconds of the first hour:00 in tz strictly after afterMs */
export function nextSendUtc(tz, hour, afterMs) {
  const p = local(tz, afterMs);
  for (let k = 0; k < 3; k++) {
    const day = new Date(Date.UTC(p.year, p.month - 1, p.day + k));
    const t = wallToUtc(tz, day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hour);
    if (t > afterMs) return Math.floor(t / 1000);
  }
  return Math.floor(afterMs / 1000) + 86400;   // unreachable in practice; never a busy loop
}

/* ------------------------------------------------------------- helpers */
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function sha256hex(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

/* ------------------------------------------------------------- endpoints */
export function handlePush(request, env, url) {
  if (!url.pathname.startsWith('/api/push/')) return null;
  return pushRoute(request, env, url).catch(() => json(500, { error: 'push failed' }));
}

async function pushRoute(request, env, url) {
  const what = url.pathname.slice('/api/push/'.length);
  if (what !== 'subscribe' && what !== 'unsubscribe') return json(404, { error: 'not found' });
  if (request.method !== 'POST') return json(405, { error: 'POST only' });
  if (!env.PUSH_DB) return json(503, { error: 'push not available here' });
  /* only the app's own pages: a browser on another site cannot sign a reader up */
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json(403, { error: 'wrong origin' });
  /* the IP is used here as a key for Cloudflare's in-memory limiter and is never stored */
  if (env.PUSH_LIMIT) {
    const { success } = await env.PUSH_LIMIT.limit({ key: request.headers.get('cf-connecting-ip') || 'none' });
    if (!success) return json(429, { error: 'slow down' });
  }
  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { error: 'too large' });
  let body;
  try { body = JSON.parse(text); } catch (e) { return json(400, { error: 'not json' }); }
  if (!body || !allowedEndpoint(body.endpoint)) return json(400, { error: 'endpoint' });
  const id = await sha256hex(body.endpoint);

  if (what === 'unsubscribe') {
    await env.PUSH_DB.prepare('DELETE FROM push_sub WHERE id = ?').bind(id).run();
    return json(200, { ok: true });
  }
  /* a site that holds no signing key could store sign-ups but never send them:
     refuse, so the app tells the reader instead of promising a silent morning */
  if (!env.VAPID_PRIVATE_JWK) return json(503, { error: 'push not available here' });

  const hour = body.hour === undefined ? 8 : body.hour;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return json(400, { error: 'hour' });
  if (!validZone(body.tz)) return json(400, { error: 'tz' });
  const now = Date.now();
  const had = await env.PUSH_DB.prepare('SELECT 1 FROM push_sub WHERE id = ?').bind(id).first();
  if (!had) {
    const n = await env.PUSH_DB.prepare('SELECT COUNT(*) AS n FROM push_sub').first();
    if (n && n.n >= MAX_SUBS) return json(503, { error: 'full' });
  }
  await env.PUSH_DB.prepare(
    'INSERT INTO push_sub (id, endpoint, tz, hour, next_utc, created, fails) VALUES (?, ?, ?, ?, ?, ?, 0) ' +
    'ON CONFLICT(id) DO UPDATE SET tz = excluded.tz, hour = excluded.hour, next_utc = excluded.next_utc, fails = 0'
  ).bind(id, body.endpoint, body.tz, hour, nextSendUtc(body.tz, hour, now),
    Math.floor(now / 86400000) * 86400).run();   // created: the day only
  return json(201, { ok: true });
}

/* ------------------------------------------------------------- VAPID */
let KEY = null;   // { jwk, private CryptoKey, k (public key, raw, base64url) }
async function vapidKey(env) {
  if (KEY && KEY.jwk === env.VAPID_PRIVATE_JWK) return KEY;
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const priv = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const raw = new Uint8Array(65);
  raw[0] = 4; raw.set(fromB64url(jwk.x), 1); raw.set(fromB64url(jwk.y), 33);
  KEY = { jwk: env.VAPID_PRIVATE_JWK, priv, k: b64url(raw) };
  return KEY;
}
/* the Authorization header for one push service (aud = its origin); valid one hour */
export async function vapidHeader(env, audience, nowSec) {
  const key = await vapidKey(env);
  const enc = o => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc({ aud: audience, exp: nowSec + 3600, sub: VAPID_SUB });
  /* WebCrypto returns the raw 64-byte r||s signature, which is exactly what ES256 wants */
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key.priv, new TextEncoder().encode(unsigned));
  return 'vapid t=' + unsigned + '.' + b64url(sig) + ', k=' + key.k;
}

/* ------------------------------------------------------------- the sender
 * Every 15 minutes (so half- and quarter-hour zones get their own hour): the
 * phones whose hour has come, oldest first, at most PER_RUN a run.
 *   201/200/202 -> sent; the next send is the same hour tomorrow in their zone
 *   404/410     -> the phone is gone or turned it off: forgotten now
 *   anything else -> counted; tried again tomorrow; forgotten after MAX_FAILS in a row */
export async function sendDue(env, nowMs = Date.now(), fetchImpl = fetch) {
  const out = { due: 0, sent: 0, gone: 0, failed: 0, dropped: 0 };
  if (!env.PUSH_DB || !env.VAPID_PRIVATE_JWK) return out;
  const nowSec = Math.floor(nowMs / 1000);
  const { results } = await env.PUSH_DB.prepare(
    'SELECT id, endpoint, tz, hour, fails FROM push_sub WHERE next_utc <= ? ORDER BY next_utc LIMIT ?'
  ).bind(nowSec, PER_RUN).all();
  out.due = results.length;
  const auth = new Map();
  const writes = [];
  for (const r of results) {
    let status = 0;
    try {
      const aud = new URL(r.endpoint).origin;
      if (!auth.has(aud)) auth.set(aud, await vapidHeader(env, aud, nowSec));
      const res = await fetchImpl(r.endpoint, {
        method: 'POST',
        headers: { TTL: String(TTL), Urgency: 'normal', Authorization: auth.get(aud) },
        body: ''   // an empty body is sent as Content-Length: 0, which every push service accepts
      });
      status = res.status;
    } catch (e) { status = 0; }
    const next = validZone(r.tz) ? nextSendUtc(r.tz, r.hour, nowMs) : nowSec + 86400;
    if (status >= 200 && status < 300) {
      out.sent++;
      writes.push(env.PUSH_DB.prepare('UPDATE push_sub SET last_sent = ?, next_utc = ?, fails = 0 WHERE id = ?').bind(nowSec, next, r.id));
    } else if (status === 404 || status === 410) {
      out.gone++;
      writes.push(env.PUSH_DB.prepare('DELETE FROM push_sub WHERE id = ?').bind(r.id));
    } else if ((r.fails || 0) + 1 >= MAX_FAILS) {
      out.dropped++;
      writes.push(env.PUSH_DB.prepare('DELETE FROM push_sub WHERE id = ?').bind(r.id));
    } else {
      out.failed++;
      writes.push(env.PUSH_DB.prepare('UPDATE push_sub SET fails = fails + 1, next_utc = ? WHERE id = ?').bind(next, r.id));
    }
  }
  if (writes.length) await env.PUSH_DB.batch(writes);
  if (out.failed || out.dropped) console.error('push: ' + JSON.stringify(out));   // counts only, never an address
  return out;
}
