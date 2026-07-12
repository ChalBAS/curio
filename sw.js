/* Curio service worker — offline-first for a fully static app.
   Releasing a change: bump CACHE *and* the ?v= asset versions here and in
   index.html. Install fetches with cache:"reload" so the HTTP cache can
   never pin a stale asset into a new SW cache. */
const CACHE = "curio-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=7",
  "./app.js?v=7",
  "./questions.js?v=7",
  "./truthlab.js?v=7",
  "./citypacks.js?v=7",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
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

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Cache-first, fall back to network, then update cache in background.
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
