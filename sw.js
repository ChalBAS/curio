/* Curio service worker — offline-first for a fully static app.
   Releasing a change: bump CACHE *and* the ?v= asset versions here and in
   index.html. Install fetches with cache:"reload" so the HTTP cache can
   never pin a stale asset into a new SW cache. */
const CACHE = "qpio-v81";
// Not a versioned asset: the page's week of daily questions, read by the
// periodicsync handler at the bottom of this file. Survives every release.
const NUDGE_CACHE = "qpio-nudge";
const ASSETS = [
  "./",
  "./index.html",
  "./src/styles.css?v=81",
  "./brand/qpio-mark-96.png?v=81",
  "./brand/icons/qpio-icon-96.png?v=81",
  "./brand/qpio-lockup-header.png?v=81",
  "./src/i18n.js?v=81",
  "./src/questions.fr.js?v=81",
  "./src/truthlab.fr.js?v=81",
  "./src/app.js?v=81",
  "./src/questions.js?v=81",
  "./src/truthlab.js?v=81",
  "./src/citypacks.js?v=81",
  "./src/citypacks.fr.js?v=81",
  "./src/entities.fr.js?v=81",
  "./src/entities.img.js?v=81",
  "./src/entities.meta.js?v=81",
  "./src/country.js?v=81",
  "./src/golinks.js?v=81",
  "./src/doors.js?v=81",
  "./src/hooks.js?v=81",
  "./src/discovery.js?v=81",
  "./src/resources.js?v=81",
  "./src/intelligence.js?v=81",
  "./src/intelligence.corpus.js?v=81",
  "./src/preload.js?v=81",
  "./manifest.webmanifest",
  "./brand/icons/qpio-icon-192.png",
  "./brand/icons/qpio-icon-512.png",
  "./brand/icons/qpio-icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: "reload" })))))
      .then(() => self.skipWaiting())
  );
});

// Sweep last release's asset caches — but NOT the nudge queue, which is not a
// versioned asset and would otherwise be wiped on every release, silently
// killing the daily notification the first time we shipped anything.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((k) => k !== CACHE && k !== NUDGE_CACHE)
        .map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// THE STALE-VERSION BUG, fixed 2026-08-09.
//
// This was cache-first for EVERYTHING, including the page shell. index.html is
// the one file with no ?v= on it, so a returning visitor always rendered
// yesterday's HTML — which then asked for yesterday's ?v= assets, which were
// still cached, so the whole app stayed a version behind. Reinstalling did not
// help: the cache belongs to the origin, not to the installed icon.
//
// The shell is now NETWORK-FIRST: always fetch the newest HTML, fall back to
// cache only when genuinely offline. Versioned assets stay cache-first, which
// is safe precisely because their URL changes when their content does.
function isShell(req) {
  if (req.mode === "navigate") return true;
  const u = new URL(req.url);
  return u.pathname.endsWith("/") || u.pathname.endsWith("/index.html");
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Gate 5 door instrument: never intercept, never cache, never fall back.
  // Two defects this guard closes (GATE-5-DOOR-INSTRUMENT.md §2.5): the
  // generic handler below caches AND re-fetches — caches.put() ignores
  // Cache-Control: no-store, and the re-fetch would count the denominator
  // once per RENDER instead of once per device-day — and a /go/ tap is a
  // navigation, so isShell() would answer a failed tap with index.html.
  // Returning without respondWith lets the browser make the request itself.
  // (/doors/ and /go/ must also stay absent from the ASSETS precache above.)
  const p = new URL(req.url).pathname;
  if (p.startsWith("/go/") || p.startsWith("/doors/")) return;

  if (isShell(req)) {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html").then((hit) => hit || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});

// THE DAILY QUESTION, DELIVERED WITHOUT A SERVER.
//
// Chrome on Android wakes an installed PWA's service worker on a schedule it
// chooses — roughly daily, and only for a site the reader genuinely uses. That
// is the only way to reach a closed phone with no backend and no push service.
// It does not exist on iOS or on desktop Safari/Firefox, where the question can
// only arrive while Qpio is open. See app.js registerPeriodicNudge().
//
// The worker has no localStorage and no question bank, so the page leaves it a
// week of questions in its own cache: { on, days: { "2026-08-10": {q, done} } }.
// Nothing here decides anything — it reads what the page already knew.
const NUDGE_URL = "./nudge-queue.json";

async function nudgeToday() {
  const c = await caches.open(NUDGE_CACHE);
  const hit = await c.match(NUDGE_URL);
  if (!hit) return;
  const data = await hit.json().catch(() => null);
  if (!data || !data.on || !data.days) return;

  const n = new Date();
  // The reader picked a delivery hour. The browser wakes this worker on its
  // own schedule, so the contract is "from HH:00", never "at HH:00" — before
  // the chosen hour we simply decline and wait for the next wake.
  if (typeof data.hour === "number" && n.getHours() < data.hour) return;
  const key = n.getFullYear() + "-" +
    String(n.getMonth() + 1).padStart(2, "0") + "-" +
    String(n.getDate()).padStart(2, "0");
  const day = data.days[key];
  if (!day || day.done || day.sent) return;

  await self.registration.showNotification("Qpio", {
    body: day.q,                                 // the question itself, not a reminder to play
    tag: "qpio-daily-" + key,
    badge: "icons/favicon-32.png",
    icon: "brand/icons/qpio-icon-192.png",
    data: { url: "./#daily" }
  });

  // Marked here rather than by the page: the page may not open for days, and
  // the same question must not arrive twice.
  day.sent = true;
  await c.put(NUDGE_URL, new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  }));
}

self.addEventListener("periodicsync", (e) => {
  if (e.tag === "qpio-daily") e.waitUntil(nudgeToday());
});

// Tapping the question lands the reader INSIDE the daily challenge — the Hanzi
// pattern the CEO asked for: the notification is the first question, the tap
// is the way to answer it. An already-open tab is navigated to #daily, not
// merely focused — focusing alone left the reader wherever they last were.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./#daily";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("navigate" in c && "focus" in c) {
          return c.navigate(target).then((cl) => (cl || c).focus()).catch(() => c.focus());
        }
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
