// Offline support for LiftLog. Bump VERSION when you change any file.
const VERSION = "liftlog-v19";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
// Fetch fresh copies (skip the browser's HTTP cache) when installing a new version.
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(u => new Request(u, { cache: "reload" })))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Pages: network first so you always get the newest version online; saved copy when offline or slow (4 s).
// Other files: saved copy first, refreshed in the background.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(caches.open(VERSION).then(async cache => {
      const cached = await cache.match("./index.html");
      const net = fetch(req, { cache: "no-store" }).then(r => { if (r.ok) cache.put("./index.html", r.clone()); return r; });
      const timeout = new Promise(res => setTimeout(() => res(null), 4000));
      try { return (await Promise.race([net, cached ? timeout : net])) || cached || net; }
      catch (err) { return cached || Response.error(); }
    }));
    return;
  }
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => cached);
    return cached || net;
  }));
});
