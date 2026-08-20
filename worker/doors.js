/* Gate 5 door instrument — server half. UAT ONLY.
 *
 * Spec: curio-hq/18-Model-Rebuild/GATE-5-DOOR-INSTRUMENT.md Part 2, carrying
 * the binding corrections of GATE-5-CLOSURE.md ("The revised one thing to do
 * next"): the ruled metric is a COUNT per served round (unbounded above, never
 * a Wilson proportion — intervals are quasi-Poisson with φ published), and the
 * counter key carries `mode` ('all'|'kids') from day one because the key is
 * irreversible and Kids-mode commercial share is a live parameter.
 *
 * THE RULED DENOMINATOR (permanent, 2026-08-20):
 *   door_tap_rate = door taps ÷ door-set requests.
 *   One door-set request = one edge-counted GET /doors/<YYYY-MM-DD>.json 200.
 *   One door tap        = one edge-counted GET /go/<class>/<slot> 302.
 *   Both human-classified, prefetch-excluded, aggregated to ISO week.
 *
 * AGGREGATE-ON-WRITE. No raw line is ever created — there is no window during
 * which raw data exists and no deletion job that can fail. NEVER written, at
 * any point, in any form: IP · User-Agent (classified transiently, discarded)
 * · cookie or identifier · Referer (not read at all) · question id, seed or
 * entity · order within a round · any timestamp finer than ISO week · session,
 * device or install id · destination URL beyond its class · any correlation
 * between a set request and a tap request.
 *
 * COST RULE (this app was taken down once by an edge configuration): no path
 * here is requested during a normal page load. ~1 invocation per device-day,
 * +1 per tap, +1 per day (cron). The counter must never depend on Workers Logs.
 *
 * STATUS: the server half is live on UAT so it can be verified; the CLIENT
 * send is behind a kill switch DEFAULTED OFF in src/doors.js, awaiting founder
 * ruling R1 (is a labelled, editorially chosen, non-paid door a "monetisation
 * surface" under REQ-001 / MODULE-01 §4?). Until R1 lands, nothing calls these
 * paths and every counter stays at zero.
 *
 * KILL SWITCH (server): remove "/doors/*" and "/go/*" from run_worker_first in
 * wrangler.jsonc and deploy. The SPA fallback serves the shell, the client's
 * fetch fails, client rule 3 takes over, the app is exactly v80.
 */
import { DOOR_HOSTS } from "./door_hosts.js";

/* ---------- classification: count humans only, transiently ---------- */
// Mirrors the stance of worker/index.js (signature-based, a speed bump not a
// lock) but broader: for COUNTING, any self-identified non-human — AI crawler,
// search crawler, tool, monitor — is excluded. The UA string is read in the
// isolate and discarded; it is never stored.
const BOT_SIGNS = [
  "bot", "crawl", "spider", "slurp", "preview", "monitor", "scan", "fetch",
  "scrapy", "python-requests", "node-fetch", "go-http-client", "libwww-perl",
  "curl", "wget", "headless", "lighthouse", "pingdom", "facebookexternalhit",
  "bytespider", "diffbot", "omgili", "perplexity", "claude", "gpt", "anthropic",
  "cohere-ai", "meta-externalagent"
];
export function isHuman(ua) {
  const s = (ua || "").toLowerCase();
  if (!s) return false;                       // no UA at all → not counted
  return !BOT_SIGNS.some((b) => s.includes(b));
}
export function isPrefetch(headers) {
  const p = (h) => (headers.get(h) || "").toLowerCase();
  return p("sec-purpose").includes("prefetch") ||
         p("purpose").includes("prefetch") ||
         p("x-moz").includes("prefetch");
}

/* ---------- key coarsening ---------- */
// Five buckets answer the only commercially live geographic question (which
// affiliate programmes can transact for this reader). The country string
// itself is never stored.
const EU = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI",
  "ES", "SE"
]);
export function geoBucket(country) {
  const c = (country || "").toUpperCase();
  if (c === "US" || c === "GB" || c === "FR") return c;
  if (EU.has(c)) return "EU";
  return "RoW";
}
export function langOf(v) { return String(v || "").toLowerCase() === "fr" ? "fr" : "en"; }
export function modeOf(v) { return String(v || "").toLowerCase() === "kids" ? "kids" : "all"; }

/* ---------- time ---------- */
export function todayUTC(d) {
  const n = d || new Date();
  return n.toISOString().slice(0, 10);
}
export function yesterdayUTC(d) {
  const n = d ? new Date(d) : new Date();
  n.setUTCDate(n.getUTCDate() - 1);
  return n.toISOString().slice(0, 10);
}
// ISO-8601 week of a UTC date → '2026-W34'. Aggregating to ISO week absorbs
// the fetch-before-midnight / tap-after-midnight drift except at week
// boundaries, where the residual is second-order (spec §2.7).
export function isoWeekUTC(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;                 // Mon=1 … Sun=7
  t.setUTCDate(t.getUTCDate() + 4 - day);         // nearest Thursday
  const y = t.getUTCFullYear();
  const week = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y + "-W" + String(week).padStart(2, "0");
}

/* ---------- aggregate-on-write ---------- */
// One UPSERT inside ctx.waitUntil() so it never blocks the response. Hundreds
// of rows, not millions. A missing binding or a failed write silently counts
// nothing — the instrument is never permitted to break, delay or alter what
// the reader receives.
function count(env, ctx, key) {
  if (!env || !env.DOOR_DB || !ctx) return;
  try {
    ctx.waitUntil(
      env.DOOR_DB.prepare(
        "INSERT INTO door_counts (iso_week, event, class, slot, lang, geo, mode, n) " +
        "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1) " +
        "ON CONFLICT (iso_week, event, class, slot, lang, geo, mode) " +
        "DO UPDATE SET n = n + 1"
      ).bind(key.iso_week, key.event, key.class, key.slot, key.lang, key.geo, key.mode)
        .run().catch(() => {})
    );
  } catch (e) { /* counting must never surface */ }
}

function shouldCount(request) {
  return isHuman(request.headers.get("user-agent")) && !isPrefetch(request.headers);
}

/* ---------- A · the DENOMINATOR — GET /doors/<YYYY-MM-DD>.json ---------- */
// One 200 here = one served round. The body is deliberately minimal: the daily
// renders client-side from a deterministic seed (MODULE-01 US-001) and door
// composition stays a property of the SHIPPED BUNDLE (src/golinks.js), so the
// server neither knows nor dictates the day's doors. Serving composition from
// the edge would create a second author of editorial content — a VAL-12
// surface this instrument must not open. The client always renders from its
// local computation; this request is the denominator, counted at the edge.
// Deviation from spec §2.1A's body shape, recorded deliberately here.
function handleDoors(request, env, ctx, url) {
  const m = /^\/doors\/(\d{4}-\d{2}-\d{2})\.json$/.exec(url.pathname);
  // Date must be today or yesterday UTC; anything else → 404, counted as
  // NOTHING (blocks enumeration inflating the denominator).
  if (!m || (m[1] !== todayUTC() && m[1] !== yesterdayUTC())) {
    return new Response("not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }
  const lang = langOf(url.searchParams.get("lang"));   // explicit param only —
  const mode = modeOf(url.searchParams.get("mode"));   // Accept-Language is never parsed
  if (shouldCount(request)) {
    count(env, ctx, {
      iso_week: isoWeekUTC(new Date()), event: "set", class: "-", slot: "-",
      lang, geo: geoBucket(request.cf && request.cf.country), mode
    });
  }
  return new Response(JSON.stringify({
    date: m[1], lang, mode,
    doors: null,
    note: "The door set renders client-side from the deterministic daily seed; this response is the served-round denominator (Gate 5 ruling, 2026-08-20)."
  }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-robots-tag": "noindex, nofollow"
      // no access-control-allow-origin — same-origin only
    }
  });
}

/* ---------- B · the NUMERATOR — GET /go/<class>/<slot>?u=… ---------- */
const GO_CLASSES = new Set(["read", "visit", "watch"]);   // source → 400: the
// evidence link is never a door (charter VAL-12 / NN-3) and routing it through
// /go/ would break the charter and contaminate the numerator.
const GO_SLOTS = new Set(["lead", "s1", "s2", "s3", "s4", "s5"]);

function bad(reason) {
  return new Response("400 — " + reason, {
    status: 400,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
  });
}

// The destination, byte-for-byte. URLSearchParams is deliberately NOT used:
// it decodes '+' as a space, which would corrupt any destination whose own
// query string carries a literal '+'. The raw percent-encoded value of u is
// taken from the query string and decoded exactly once, so the Location the
// browser receives is the byte-for-byte destination the client encoded —
// affiliate sub-IDs and search queries survive untouched.
export function rawParam(search, name) {
  const q = search.startsWith("?") ? search.slice(1) : search;
  for (const part of q.split("&")) {
    if (part.startsWith(name + "=")) return part.slice(name.length + 1);
  }
  return null;
}

export function validDestination(dest) {
  let u;
  try { u = new URL(dest); } catch (e) { return false; }
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  // exact host, or a subdomain of a listed host
  return DOOR_HOSTS.some((d) => h === d || h.endsWith("." + d));
}

function handleGo(request, env, ctx, url) {
  const m = /^\/go\/([^/]+)\/([^/]+)$/.exec(url.pathname);
  if (!m) return bad("bad path");
  const cls = m[1], slot = m[2];
  if (!GO_CLASSES.has(cls)) return bad("unknown door class");
  if (!GO_SLOTS.has(slot)) return bad("unknown slot");

  const raw = rawParam(url.search, "u");
  if (raw == null) return bad("missing destination");
  let dest;
  try { dest = decodeURIComponent(raw); } catch (e) { return bad("malformed destination"); }
  if (!validDestination(dest)) return bad("destination not allowed");

  if (shouldCount(request)) {
    count(env, ctx, {
      iso_week: isoWeekUTC(new Date()), event: "tap", class: cls, slot,
      lang: langOf(url.searchParams.get("lang")),
      geo: geoBucket(request.cf && request.cf.country),
      mode: modeOf(url.searchParams.get("mode"))
    });
  }

  // 302, NEVER 301: a 301 is cached by the browser, the second tap never
  // reaches the edge, and the counter silently under-reports over time —
  // worsening with loyalty, the exact bias that would flatter a partner report.
  return new Response(null, {
    status: 302,
    headers: {
      "location": dest,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

/* ---------- dispatch ---------- */
export function handleDoorInstrument(request, env, ctx, url) {
  if (request.method !== "GET") return null;
  if (url.pathname.startsWith("/doors/")) return handleDoors(request, env, ctx, url);
  if (url.pathname.startsWith("/go/")) return handleGo(request, env, ctx, url);
  return null;
}

/* ---------- retention — nightly cron, one invocation/day ---------- */
// Aggregate rows kept 13 months rolling (thirteen, not twelve, so one
// like-for-like year-on-year week comparison is possible). Raw retention is
// zero seconds, by construction. iso_week sorts lexically ('2025-W53' <
// '2026-W01'), so a string comparison prunes correctly.
export async function pruneOld(env) {
  if (!env || !env.DOOR_DB) return;
  const cutoffDate = new Date(Date.now() - 395 * 86400000);   // ~13 months
  const cutoff = isoWeekUTC(cutoffDate);
  try {
    await env.DOOR_DB.prepare("DELETE FROM door_counts WHERE iso_week < ?1").bind(cutoff).run();
  } catch (e) { /* the prune retries tomorrow */ }
}

/* ---------- publication rules (spec §2.4, corrected by GATE-5-CLOSURE) ----------
 * Suppression is a PUBLICATION rule, not a storage rule; the table is not a
 * publication surface. ANY number that leaves this instrument must pass
 * through these two functions. There is deliberately no report endpoint —
 * publication is an offline act against these rules.
 */
// 1–2. A cell below 10 publishes as "<10" — never as 0, never omitted
// (omission leaks: six countries shown and a seventh missing IS the seventh).
// Published counts are rounded to the nearest 10.
export function publishCount(n) {
  if (!(n >= 0)) return "<10";
  if (n < 10) return "<10";
  return String(Math.round(n / 10) * 10);
}

// 3–5. A rate publishes only at denominator ≥ 500 and numerator ≥ 10, from
// UNROUNDED counts, two significant figures, unit inline. The ruled quantity
// is a COUNT per served round with per-round values in {0…20} — it can exceed
// 1, so Wilson is the wrong distribution (GATE-5-CLOSURE): the interval is
// QUASI-POISSON, with the dispersion φ estimated from the weekly series and
// PUBLISHED, never assumed. With fewer than two weeks φ is not estimable and
// no interval may be printed.
export function publishRate(weeks) {
  const N = weeks.reduce((s, w) => s + w.taps, 0);
  const D = weeks.reduce((s, w) => s + w.sets, 0);
  if (D < 500 || N < 10) return { publishable: false, text: "below the reporting floor" };
  const r = N / D;
  const per100 = Number((100 * r).toPrecision(2));
  let phi = null, interval = null;
  if (weeks.length >= 2) {
    // Pearson dispersion of the weekly counts against the pooled rate.
    let x2 = 0, used = 0;
    for (const w of weeks) {
      const mu = r * w.sets;
      if (mu > 0) { x2 += ((w.taps - mu) ** 2) / mu; used++; }
    }
    if (used >= 2) {
      phi = Number(Math.max(1, x2 / (used - 1)).toPrecision(3));
      const se = Math.sqrt((phi * r) / D);
      interval = [
        Number((100 * Math.max(0, r - 1.96 * se)).toPrecision(2)),
        Number((100 * (r + 1.96 * se)).toPrecision(2))
      ];
    }
  }
  return {
    publishable: true,
    // The measured rate is a FLOOR on the completed-round rate (a device that
    // fetches the payload and abandons is in the denominator only) — reported
    // as a bound, never as a point estimate. Scope: online-served rounds only.
    text: "at least " + per100 + " taps per 100 served rounds" +
      (interval ? " (quasi-Poisson 95% " + interval[0] + "–" + interval[1] + ", φ = " + phi + ")" : " (no interval: dispersion needs ≥ 2 weeks)"),
    per100, phi, interval
  };
}
