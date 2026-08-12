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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const kind = classify(request.headers.get("user-agent"));

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
