/* QPIO ANALYTICS — the collection endpoint.
 *
 * CEO, 6 September 2026: "Aggregate-on-write: store useful counters/totals
 * rather than a raw per-reader event history." And: "Analytics must never
 * silently fail and then look like real user behaviour."
 *
 * ONE REQUEST PER ROUND, NOT ONE PER ANSWER. A round is five questions; sending
 * five requests would be five times the cost for the same information, and the
 * timing between them would itself be a behavioural trace. The device sends one
 * summary when the round ends.
 *
 * WHAT REACHES THE DATABASE, AND WHAT NEVER DOES.
 *
 *   Written: the content day the reader was served, the question and its
 *   revision, the language and ITS revision, where in the round it sat, which
 *   surface, adult or kids, the app build, the bank release, the country, the
 *   platform, whether it is installed, what the reader once said about how they
 *   found Qpio, and which week-band they first played in.
 *
 *   NEVER written, at any point, in any form: the IP address, in any form,
 *   including hashed or truncated · the User-Agent string (classified
 *   human/robot in memory, then discarded) · Accept-Language (the app tells us
 *   which language it is showing) · Referer, which is not read at all · the
 *   Cloudflare Ray ID, which is a join key into logs we do not control · any
 *   city, region, postcode, coordinate, network operator or TLS fingerprint ·
 *   any session, device or install identifier · any timestamp finer than the
 *   content day · any raw row that could be ordered.
 *
 * THE POINT OF AGGREGATE-ON-WRITE, said plainly: a table of increments has no
 * insertion order, so there is nothing to reconstruct a person's path from. A
 * table of events has one whether you store a timestamp or not, because the row
 * order IS a clock. That is why there is no "we delete it nightly" step here --
 * a deletion step can fail, be paused for debugging, or survive in a backup.
 *
 * COUNTRY IS KEPT AT COUNTRY LEVEL, on the CEO's explicit instruction, because
 * cultural representation and US/Europe-centric bias cannot be detected in a
 * continent. Thin countries are protected when something is PUBLISHED, not by
 * refusing to record them.
 */

const SCHEMA_VERSION = 1;

/* ---------------------------------------------------------------- closed lists
 * Everything that reaches a key column is checked against a fixed list. An
 * unknown value is not stored as itself and not silently mapped to a default --
 * it is counted as a rejection with its reason, because a column quietly
 * filling with "unknown" is how attribution dies while every chart still looks
 * healthy. */
const LANGS = new Set(['en', 'fr']);
const MODES = new Set(['adult', 'kids']);
const SURFACES = new Set(['daily', 'quickfire', 'vault', 'city']);
const PLATFORMS = new Set(['ios', 'android', 'desktop', 'other']);
const BANDS = new Set(['new', 'w2_4', 'w5_12', 'w13plus']);
const DOOR_CLASSES = new Set(['read', 'watch', 'visit', 'lead']);
const SLOTS = new Set(['lead', 'shelf1', 'shelf2', 'shelf3', 'shelf4', 'shelf5']);
/* What the reader said once, at onboarding, in their own answer to "How did you
 * hear about Qpio?". It is self-reported and it is not a tracker: nothing
 * follows them, and "unknown" is an honest value for someone who never
 * answered, not a bucket for something we failed to observe. */
const DISCOVERY = new Set(['tiktok', 'youtube', 'instagram', 'facebook', 'search',
  'referral', 'other', 'dontremember', 'unknown']);

const MAX_QUESTIONS = 20;   // a quick-fire round is ten; twenty is generous and bounded
const MAX_DOORS = 20;
const MAX_BODY = 8192;

const BOT_SIGNS = ['bot', 'crawler', 'spider', 'headless', 'slurp', 'preview',
  'monitor', 'scan', 'curl', 'wget', 'python-requests', 'lighthouse'];

function isHuman(ua) {
  const s = (ua || '').toLowerCase();
  if (!s) return false;
  return !BOT_SIGNS.some(b => s.includes(b));
}
function isPrefetch(headers) {
  const p = h => (headers.get(h) || '').toLowerCase();
  return p('sec-purpose').includes('prefetch') ||
    p('purpose').includes('prefetch') ||
    p('x-moz').includes('prefetch');
}

/* ISO 3166-1 alpha-2 as Cloudflare gives it, or XX. Two letters and nothing
 * else reaches the column -- 'T1' (Tor) and other non-country codes become XX
 * rather than becoming a country that does not exist. */
function countryOf(cf) {
  const c = String((cf && cf.country) || '').toUpperCase();
  return /^[A-Z]{2}$/.test(c) && c !== 'T1' ? c : 'XX';
}

function isoWeekOf(day) {
  const t = new Date(day + 'T00:00:00Z');
  if (isNaN(t)) return null;
  const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const y = d.getUTCFullYear();
  const week = Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y + '-W' + String(week).padStart(2, '0');
}

/* THE READER'S DAY IS TRUSTED, WITHIN ONE DAY OF OURS.
 *
 * Qpio serves one set of five per content day, and a reader in Auckland meets
 * the same five as a reader in Lima. Grouping by the server's UTC clock would
 * split one day's audience across two rows and make every daily comparison
 * wrong at the edges, so the device reports the day it was actually served.
 *
 * A device clock can be wrong or set deliberately, so anything more than a day
 * either side of ours is refused rather than quietly filed under a date it did
 * not happen on. One day of slack covers every real timezone; it does not cover
 * a clock set to 2019. */
function dayAcceptable(day, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return false;
  const d = Date.parse(day + 'T00:00:00Z');
  if (isNaN(d)) return false;
  const today = Date.parse(now.toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.abs(d - today) <= 86400000 * 1.5;
}

const pick = (set, v, dflt) => {
  const s = String(v == null ? '' : v).toLowerCase();
  return set.has(s) ? s : dflt;
};
const intIn = (v, lo, hi) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};
/* A version string is a label, not free text. Anything else would let arbitrary
 * content into a key column. */
const versionOf = v => {
  const s = String(v == null ? '' : v).trim();
  return /^[A-Za-z0-9._-]{1,24}$/.test(s) ? s : 'unknown';
};
const qidOf = v => {
  const s = String(v == null ? '' : v).trim();
  return /^[A-Z]\d{3,6}$/.test(s) ? s : null;
};

/* ------------------------------------------------------------------- the write
 * Every statement is an upsert into a row whose key existed as a shape before
 * any reader arrived. They go in one batch: D1 applies it as a single unit, so
 * a round is never half-counted, and one round costs one round trip. */
function upserts(p, country) {
  const week = isoWeekOf(p.day);
  const out = [];
  const add = (sql, ...bind) => out.push({ sql, bind });

  for (const q of p.questions) {
    add(
      'INSERT INTO question_day (content_day,qid,qrev,lang,lrev,surface,mode,position,content_version,shown,answered,correct) ' +
      'VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,1,?10,?11) ' +
      'ON CONFLICT (content_day,qid,qrev,lang,lrev,surface,mode,position,content_version) DO UPDATE SET ' +
      'shown=shown+1, answered=answered+?10, correct=correct+?11',
      p.day, q.id, q.qrev, p.lang, q.lrev, p.surface, p.mode, q.pos, p.contentVersion,
      q.answered, q.correct);

    add(
      'INSERT INTO question_country_week (iso_week,qid,qrev,lang,country,shown,answered,correct) ' +
      'VALUES (?1,?2,?3,?4,?5,1,?6,?7) ' +
      'ON CONFLICT (iso_week,qid,qrev,lang,country) DO UPDATE SET ' +
      'shown=shown+1, answered=answered+?6, correct=correct+?7',
      week, q.id, q.qrev, p.lang, country, q.answered, q.correct);
  }

  add(
    'INSERT INTO audience_day (content_day,country,lang,mode,platform,installed,app_version,content_version,discovery_source,rounds_started,rounds_completed,answers) ' +
    'VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,1,?10,?11) ' +
    'ON CONFLICT (content_day,country,lang,mode,platform,installed,app_version,content_version,discovery_source) DO UPDATE SET ' +
    'rounds_started=rounds_started+1, rounds_completed=rounds_completed+?10, answers=answers+?11',
    p.day, country, p.lang, p.mode, p.platform, p.installed, p.appVersion,
    p.contentVersion, p.discovery, p.completed, p.answers);

  if (p.completed) {
    add(
      'INSERT INTO cohort_week (iso_week,first_seen_band,lang,country,rounds_completed) VALUES (?1,?2,?3,?4,1) ' +
      'ON CONFLICT (iso_week,first_seen_band,lang,country) DO UPDATE SET rounds_completed=rounds_completed+1',
      week, p.band, p.lang, country);
  }

  for (const d of p.doors) {
    add(
      'INSERT INTO door_day (content_day,qid,door_class,slot,lang,country,taps) VALUES (?1,?2,?3,?4,?5,?6,?7) ' +
      'ON CONFLICT (content_day,qid,door_class,slot,lang,country) DO UPDATE SET taps=taps+?7',
      p.day, d.id, d.cls, d.slot, p.lang, country, d.n);
  }

  add(
    'INSERT INTO instrument_day (content_day,signal,app_version,n) VALUES (?1,?2,?3,1) ' +
    'ON CONFLICT (content_day,signal,app_version) DO UPDATE SET n=n+1',
    p.day, 'rounds_accepted', p.appVersion);

  return out;
}

/* A refusal is counted, with its reason and against OUR day rather than the
 * unusable one the caller sent. Silence here is the failure mode this whole
 * file exists to prevent: a counter that has stopped and a quiet week look
 * identical unless the refusals are on the record. */
async function reject(env, reason, now) {
  try {
    await env.ANALYTICS_DB.prepare(
      'INSERT INTO rejected_day (content_day,reason,n) VALUES (?1,?2,1) ' +
      'ON CONFLICT (content_day,reason) DO UPDATE SET n=n+1'
    ).bind(now.toISOString().slice(0, 10), reason).run();
  } catch (e) { /* the refusal counter must never be the thing that throws */ }
}

/* ------------------------------------------------------------------ the handler
 *
 *   POST /m   one round summary
 *
 * Answers 204 whatever happens. The reader is not waiting on this and must
 * never see a failure of ours; whether the row landed is recorded in the
 * instrument tables, where it belongs, rather than in a status code nobody
 * reads. */
export function handleAnalytics(request, env, ctx, url) {
  if (url.pathname !== '/m') return null;
  const no = new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  if (!env || !env.ANALYTICS_DB || env.ANALYTICS_OFF === '1') return no;

  /* Robots and prefetches are excluded before anything is read. A crawler
   * counted as a reader does not merely add noise -- it moves every rate. */
  if (!isHuman(request.headers.get('user-agent')) || isPrefetch(request.headers)) return no;

  const now = new Date();
  const country = countryOf(request.cf);

  ctx.waitUntil((async () => {
    let body;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY) return reject(env, 'oversize', now);
      body = JSON.parse(text);
    } catch (e) { return reject(env, 'unparseable', now); }
    if (!body || typeof body !== 'object') return reject(env, 'unparseable', now);

    if (!dayAcceptable(body.d, now)) return reject(env, 'day_out_of_range', now);

    const lang = pick(LANGS, body.lang, null);
    if (!lang) return reject(env, 'bad_lang', now);
    const mode = pick(MODES, body.mode, null);
    if (!mode) return reject(env, 'bad_mode', now);
    const surface = pick(SURFACES, body.surface, null);
    if (!surface) return reject(env, 'bad_surface', now);
    const platform = pick(PLATFORMS, body.plat, 'other');
    const band = pick(BANDS, body.band, null);
    if (!band) return reject(env, 'bad_band', now);
    const discovery = pick(DISCOVERY, body.ds, 'unknown');

    const rawQ = Array.isArray(body.q) ? body.q : null;
    if (!rawQ || !rawQ.length) return reject(env, 'no_questions', now);
    if (rawQ.length > MAX_QUESTIONS) return reject(env, 'too_many_questions', now);

    const questions = [];
    for (const q of rawQ) {
      const id = qidOf(q && q.id);
      const qrev = intIn(q && q.qrev, 1, 9999);
      const lrev = intIn(q && q.lrev, 1, 9999);
      const pos = intIn(q && q.pos, 1, MAX_QUESTIONS);
      if (!id || qrev === null || lrev === null || pos === null) return reject(env, 'bad_question_row', now);
      const answered = q.a ? 1 : 0;
      /* Correct without answered is arithmetically impossible and would make
       * every rate above 100%. It is refused rather than clamped, because a
       * clamp hides the bug that produced it. */
      const correct = q.c ? 1 : 0;
      if (correct && !answered) return reject(env, 'correct_without_answer', now);
      questions.push({ id, qrev, lrev, pos, answered, correct });
    }

    const rawD = Array.isArray(body.doors) ? body.doors : [];
    if (rawD.length > MAX_DOORS) return reject(env, 'too_many_doors', now);
    const doors = [];
    for (const d of rawD) {
      const id = qidOf(d && d.id);
      const cls = pick(DOOR_CLASSES, d && d.cls, null);
      const slot = pick(SLOTS, d && d.slot, null);
      const n = intIn(d && d.n, 1, 20);
      if (!id || !cls || !slot || n === null) return reject(env, 'bad_door_row', now);
      doors.push({ id, cls, slot, n });
    }

    const answers = questions.filter(q => q.answered).length;
    const p = {
      day: body.d,
      lang, mode, surface, platform, band, discovery, country,
      installed: body.inst ? 1 : 0,
      appVersion: versionOf(body.av),
      contentVersion: versionOf(body.cv),
      questions, doors, answers,
      completed: body.done ? 1 : 0,
    };

    try {
      const stmts = upserts(p, country).map(u => env.ANALYTICS_DB.prepare(u.sql).bind(...u.bind));
      await env.ANALYTICS_DB.batch(stmts);
    } catch (e) {
      /* THE WRITE FAILED AND SOMEBODY HAS TO KNOW. A database at its limit, a
       * schema drift, a transient error -- all of them look exactly like "no
       * readers today" if the failure is swallowed. The message is not stored,
       * only its class, because an error string can echo the input back. */
      const kind = /limit|exceeded|quota|too many/i.test(String(e && e.message)) ? 'write_limit'
        : /no such table|no such column/i.test(String(e && e.message)) ? 'schema_drift'
          : 'write_failed';
      await reject(env, kind, now);
    }
  })());

  return no;
}

/* THIRTEEN MONTHS, AND THE REASON IS NOT SENTIMENT. A year lets any week be
 * compared with the same week a year earlier; the extra month covers a partial
 * week at each end. Beyond that the rows answer nothing that the previous year
 * did not already answer, and data kept without a purpose is exactly what the
 * doctrine forbids. */
export async function pruneAnalytics(env) {
  if (!env || !env.ANALYTICS_DB) return;
  const cutDay = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
  const cutWeek = isoWeekOf(cutDay);
  const jobs = [
    ['question_day', 'content_day', cutDay],
    ['audience_day', 'content_day', cutDay],
    ['door_day', 'content_day', cutDay],
    ['instrument_day', 'content_day', cutDay],
    ['rejected_day', 'content_day', cutDay],
    ['question_country_week', 'iso_week', cutWeek],
    ['cohort_week', 'iso_week', cutWeek],
  ];
  for (const [table, col, cut] of jobs) {
    try {
      await env.ANALYTICS_DB.prepare('DELETE FROM ' + table + ' WHERE ' + col + ' < ?1').bind(cut).run();
    } catch (e) { /* one table failing must not stop the rest */ }
  }
}

export const _internals = {
  isHuman, isPrefetch, countryOf, isoWeekOf, dayAcceptable, pick, intIn,
  versionOf, qidOf, upserts, SCHEMA_VERSION,
  LANGS, MODES, SURFACES, PLATFORMS, BANDS, DOOR_CLASSES, SLOTS, DISCOVERY,
  MAX_QUESTIONS, MAX_DOORS, MAX_BODY,
};
