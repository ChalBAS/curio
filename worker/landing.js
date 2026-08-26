/* Social landing-path counter — server half. UAT ONLY (same construction as
 * doors.js: this module is imported only by worker/uat.js, and "/s/*" appears
 * only in wrangler.jsonc's run_worker_first).
 *
 * WHAT IT IS. The D-067 ruling-free measurement tier: counting requests to
 * NAMED LANDING PATHS, nothing else. The approved cadence (D-083, the signed
 * CADENCE-DECISION-SHEET.md) puts one path per platform in each social bio /
 * per-post link, and the 90-day pilot's sixth weekly number — the social→app
 * arrival rate — is read from these counters, not from a tracker. UTMs are
 * retired for privacy; the path IS the channel label.
 *
 *   GET /s/tt → TikTok    GET /s/yt → YouTube
 *   GET /s/ig → Instagram GET /s/fb → Facebook
 *
 * Each is a 302 to "/" (the app shell). No parameter survives the redirect,
 * nothing is written to the device, and the browser lands on the same app
 * every direct visitor gets.
 *
 * AGGREGATE-ON-WRITE, exactly as doors.js: no raw line ever exists. NEVER
 * written, at any point, in any form: IP · User-Agent (classified transiently,
 * discarded) · cookie or identifier · Referer (not read at all) · any
 * timestamp finer than ISO week · any correlation with any other request.
 * Humans only, prefetch excluded, geo coarsened to the five buckets.
 *
 * SCHEMA (D1 `qpio-doors-uat`, beside door_counts):
 *   CREATE TABLE IF NOT EXISTS landing_counts (
 *     iso_week TEXT NOT NULL, path TEXT NOT NULL,
 *     lang TEXT NOT NULL, geo TEXT NOT NULL,
 *     n INTEGER NOT NULL DEFAULT 0,
 *     PRIMARY KEY (iso_week, path, lang, geo));
 *
 * COST RULE: one invocation per social arrival — a person following a bio
 * link — never during a normal page load. KILL SWITCH (server): remove
 * "/s/*" from run_worker_first in wrangler.jsonc and deploy; the SPA fallback
 * serves the shell and the path stops counting, changing nothing a reader
 * sees. PRODUCTION: activating there is a release — worker/index.js wiring +
 * a D1 binding in wrangler.prod.jsonc — and rides the founder's sign-off.
 */
import { isHuman, isPrefetch, geoBucket, isoWeekUTC } from "./doors.js";

const PATHS = new Set(["tt", "yt", "ig", "fb"]);

export function handleLanding(request, env, ctx, url) {
  if (request.method !== "GET") return null;
  const m = /^\/s\/([a-z]{2})$/.exec(url.pathname);
  if (!m || !PATHS.has(m[1])) return null;

  if (env && env.LANDING_DB_OK !== "0" && env.DOOR_DB && ctx &&
      isHuman(request.headers.get("user-agent")) && !isPrefetch(request.headers)) {
    const key = {
      iso_week: isoWeekUTC(new Date()),
      path: m[1],
      // lang from the Accept-Language leading tag only — 'fr' or 'en' bucket,
      // the same two-value coarsening the app itself uses. Never stored raw.
      lang: /^fr\b/i.test((request.headers.get("accept-language") || "").trim()) ? "fr" : "en",
      geo: geoBucket(request.cf && request.cf.country)
    };
    try {
      ctx.waitUntil(
        env.DOOR_DB.prepare(
          "INSERT INTO landing_counts (iso_week, path, lang, geo, n) VALUES (?1, ?2, ?3, ?4, 1) " +
          "ON CONFLICT (iso_week, path, lang, geo) DO UPDATE SET n = n + 1"
        ).bind(key.iso_week, key.path, key.lang, key.geo).run().catch(() => {})
      );
    } catch (e) { /* counting must never surface */ }
  }

  // The redirect happens whether or not the count did — the instrument is
  // never permitted to break, delay or alter what the reader receives.
  return new Response(null, {
    status: 302,
    headers: { location: "/", "cache-control": "no-store" }
  });
}

/* retention — same 13-month rolling window as door_counts, same cron */
export async function pruneLanding(env) {
  if (!env || !env.DOOR_DB) return;
  const cutoff = isoWeekUTC(new Date(Date.now() - 395 * 86400000));
  try {
    await env.DOOR_DB.prepare("DELETE FROM landing_counts WHERE iso_week < ?1").bind(cutoff).run();
  } catch (e) { /* the prune retries tomorrow */ }
}
