/* QPIO UAT edge entry — the production worker plus the Gate 5 door instrument.
 *
 * UAT ONLY, by construction: this file is named as `main` in wrangler.jsonc
 * (UAT) and nowhere else. wrangler.prod.jsonc keeps `main: worker/index.js`
 * and carries no /doors/* or /go/* route, so nothing in this file — or in
 * worker/doors.js — can run in production. worker/index.js is untouched.
 *
 * Everything that is not the door instrument is delegated to the production
 * worker unchanged, so UAT keeps behaving exactly like production plus the
 * instrument under test.
 */
import app from "./index.js";
import { handleDoorInstrument, pruneOld } from "./doors.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Gate 5 instrument paths. These only reach the worker at all because
    // wrangler.jsonc (UAT) lists "/doors/*" and "/go/*" in run_worker_first —
    // removing those two lines is the server-side kill switch.
    const r = handleDoorInstrument(request, env, ctx, url);
    if (r) return r;

    // robots.txt: add the instrument paths to the generated disallow block
    // (spec §2.1C — crawler taps would inflate the numerator, crawler payload
    // fetches the denominator). Amended HERE rather than in index.js so the
    // production worker file stays byte-identical to what production serves.
    if (url.pathname === "/robots.txt") {
      const res = await app.fetch(request, env, ctx);
      const body = await res.text();
      return new Response(
        body.replace("Disallow: /src/", "Disallow: /src/\nDisallow: /go/\nDisallow: /doors/"),
        { status: res.status, headers: res.headers }
      );
    }

    return app.fetch(request, env, ctx);
  },

  // "10 3 * * *" — prunes aggregate rows older than 13 months. One invocation
  // per day. There is NO nightly aggregation job: aggregation happens at write
  // time and raw lines never exist.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pruneOld(env));
  }
};
