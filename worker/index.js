/**
 * QPIO edge worker — serves the app, and keeps the question bank out of AI
 * training crawlers.
 *
 * CEO, 2026-08-12: "I want only humans to be able to download the app from our
 * website. AI robot can view the public page, but not download the app."
 *
 * WHAT THIS CAN AND CANNOT DO, stated plainly because it changes what to expect:
 *
 * Qpio is a PWA. There is no installer file — "installing" is the browser
 * keeping pages it has already fetched. So there is no download event to gate.
 * What CAN be gated is who is allowed to fetch the two things that are actually
 * worth taking: the question bank and the app code. That is what this does.
 *
 * The landing page stays open to everyone, including crawlers, because being
 * findable is the point. A crawler that asks for questions.js gets 403.
 *
 * This is signature-based. A determined scraper spoofs a browser User-Agent and
 * walks straight through — no user-agent check has ever stopped one, and saying
 * otherwise would be selling a lock with no door. It stops the honest majority:
 * the large operators who identify themselves properly and who are the ones
 * actually building training sets at scale. For anything stronger the next step
 * is Cloudflare Bot Management scoring or Turnstile, both of which cost real
 * user friction.
 */

// Bots that identify themselves and are here to collect text for models.
// Matched case-insensitively against the User-Agent.
const AI_CRAWLERS = [
  "gptbot", "oai-searchbot", "chatgpt-user",       // OpenAI
  "claudebot", "claude-web", "anthropic-ai",        // Anthropic
  "google-extended",                                // Google model training
  "ccbot",                                          // Common Crawl — the big one
  "bytespider",                                     // ByteDance
  "perplexitybot", "perplexity-user",
  "meta-externalagent", "facebookbot",
  "applebot-extended",
  "amazonbot", "cohere-ai", "diffbot", "omgili",
  "imagesiftbot", "timpibot", "youbot", "petalbot",
  "scrapy", "python-requests", "node-fetch", "go-http-client", "libwww-perl"
];

// Search crawlers that make Qpio findable. Never blocked — they index the page,
// they do not build models from it, and being invisible to them would cost more
// than the bank is worth.
const SEARCH_CRAWLERS = ["googlebot", "bingbot", "duckduckbot", "slurp", "baiduspider", "yandexbot"];

// The assets worth protecting: the question bank, the app logic, the content
// banks. Everything else — the shell, icons, manifest, styles — stays open so
// the page renders and previews correctly for anyone.
function isProtected(pathname) {
  return /^\/src\/.+\.js$/i.test(pathname);
}

function classify(ua) {
  const s = (ua || "").toLowerCase();
  if (!s) return "unknown";                                   // no UA at all
  if (SEARCH_CRAWLERS.some((b) => s.includes(b))) return "search";
  if (AI_CRAWLERS.some((b) => s.includes(b))) return "ai";
  return "human";
}

// Our own sites, and only ours. GitHub Pages used to send
// `access-control-allow-origin: *` on everything, which is how the company
// pages read the live figures. Moving to Workers removed that — correctly, it
// was far too broad — and broke them. This is the narrow replacement.
const ALLOWED_ORIGINS = new Set([
  "https://qpioapp.com",
  "https://www.qpioapp.com",
  "https://hq.qpioapp.com",
  "http://localhost:8125"          // local preview of the company sites
]);

// One small JSON endpoint instead of letting other sites read the bank.
//
// The company pages need three facts: which version is live, how many verified
// questions exist, and one real question to show. They used to get these by
// downloading questions.js (300 KB) and parsing it with a regex — fragile, and
// it meant opening the bank cross-origin, which is exactly what the bot gate
// above exists to prevent. This serves the three facts directly: ~1 KB, no
// parsing, and the bank itself stays closed.
async function stats(request, env, url) {
  const origin = request.headers.get("origin") || "";
  const cors = {
    "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://qpioapp.com",
    "vary": "origin",
    "cache-control": "public, max-age=300",
    "content-type": "application/json; charset=utf-8"
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const shell = await env.ASSETS.fetch(new Request(url.origin + "/index.html"));
  const html = await shell.text();
  const version = (html.match(/\?v=(\d+)/) || [])[1] || null;

  const bankRes = await env.ASSETS.fetch(new Request(url.origin + "/src/questions.js?v=" + version));
  const js = await bankRes.text();

  // Count by the answer field — one per question, and it cannot drift from a
  // number written down anywhere.
  const count = (js.match(/\banswer:\s*\d/g) || []).length;

  // One real question to show, chosen for readability rather than at random:
  // a genuine payoff fact, short options, no picture needed.
  const picks = [];
  const re = /\{\s*cat:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?\n/g;
  let m;
  while ((m = re.exec(js)) !== null && picks.length < 400) {
    const blk = m[0];
    if (/\bimg:\s*\{/.test(blk)) continue;
    const q = (blk.match(/\bq:\s*"((?:[^"\\]|\\.)*)"/) || [])[1];
    const fact = (blk.match(/\bfact:\s*"((?:[^"\\]|\\.)*)"/) || [])[1];
    const src = (blk.match(/\bsrc:\s*"([^"]*)"/) || [])[1];
    const optsRaw = (blk.match(/\boptions:\s*(\[[^\]]*\])/) || [])[1];
    const ans = (blk.match(/\banswer:\s*(\d)/) || [])[1];
    if (!q || !fact || !optsRaw || ans == null) continue;
    let options;
    try { options = JSON.parse(optsRaw); } catch { continue; }
    if (q.length > 110 || fact.length < 45 || fact.length > 155) continue;
    if (!options.every((o) => String(o).length < 30)) continue;
    let text;
    try { text = JSON.parse('"' + q + '"'); } catch { continue; }
    let factText;
    try { factText = JSON.parse('"' + fact + '"'); } catch { continue; }
    picks.push({ cat: m[1], q: text, options, answer: +ans, fact: factText, src });
  }
  const sample = picks.length ? picks[Math.floor(Math.random() * picks.length)] : null;

  return new Response(JSON.stringify({ version, questions: count, languages: 2, sample }), { headers: cors });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kind = classify(request.headers.get("user-agent"));

    if (url.pathname === "/api/stats") return stats(request, env, url);

    // robots.txt is generated here rather than shipped as a file, so the
    // disallow list and the block list can never drift apart — they are the
    // same array.
    if (url.pathname === "/robots.txt") {
      const lines = [
        "# Qpio — knowledge, free forever.",
        "# The pages are open. The question bank is not: it is verified, sourced",
        "# work and it is not training data. See /ai.txt for the full position.",
        "",
        "User-agent: *",
        "Allow: /",
        "Disallow: /src/",
        "",
        ...AI_CRAWLERS.flatMap((b) => [`User-agent: ${b}`, "Disallow: /", ""]),
        `Sitemap: ${url.origin}/sitemap.xml`
      ];
      return new Response(lines.join("\n"), {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" }
      });
    }

    if (kind === "ai" && isProtected(url.pathname)) {
      return new Response(
        "403 — Qpio's question bank is not training data.\n\n" +
        "Every question here is written, sourced and fact-checked by hand. The pages\n" +
        "are open to read and to link to; the bank is not open to ingest.\n" +
        "See /ai.txt. To discuss licensed access, get in touch.\n",
        {
          status: 403,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-store",
            // Vary matters: without it the CDN could serve one visitor's answer
            // to another with a different User-Agent — blocking a human, or
            // worse, handing a crawler a cached copy.
            "vary": "user-agent",
            "x-robots-tag": "noai, noimageai"
          }
        }
      );
    }

    const res = await env.ASSETS.fetch(request);

    // A protected asset's response must never be cached without varying on the
    // User-Agent, for the same reason as above.
    if (isProtected(url.pathname)) {
      const out = new Response(res.body, res);
      out.headers.set("vary", "user-agent");
      out.headers.set("x-robots-tag", "noai, noimageai");
      return out;
    }
    return res;
  }
};
