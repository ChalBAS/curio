/* Curio service worker — offline-first for a fully static app.
   Releasing a change: bump CACHE *and* the ?v= asset versions here and in
   index.html. Install fetches with cache:"reload" so the HTTP cache can
   never pin a stale asset into a new SW cache. */
const CACHE = "qpio-v55";
const ASSETS = [
  "./",
  "./index.html",
  "./src/styles.css?v=55",
  "./brand/qpio-mark-96.png?v=55",
  "./brand/icons/qpio-icon-96.png?v=55",
  "./brand/qpio-lockup-header.png?v=55",
  "./src/i18n.js?v=55",
  "./src/questions.fr.js?v=55",
  "./src/truthlab.fr.js?v=55",
  "./src/app.js?v=55",
  "./src/questions.js?v=55",
  "./src/truthlab.js?v=55",
  "./src/citypacks.js?v=55",
  "./src/entities.fr.js?v=55",
  "./src/entities.img.js?v=55",
  "./src/entities.meta.js?v=55",
  "./src/golinks.js?v=55",
  "./src/hooks.js?v=55",
  "./src/discovery.js?v=55",
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

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
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

// Tapping the daily question opens the app rather than a blank tab.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
