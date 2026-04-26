// 5Bucks Home — service worker
const VERSION = "2026-04-26.2";
const CACHE = "fivebucks-" + VERSION;
const SHELL = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
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
  const url = new URL(e.request.url);
  // Bypass Firebase / Google APIs entirely — never cache live data
  if (url.hostname.includes("firestore.googleapis.com")
      || url.hostname.includes("firebaseio.com")
      || url.hostname.includes("googleapis.com")
      || url.hostname.includes("gstatic.com")) {
    return;
  }
  // Network-first for navigation (HTML)
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html")))
    );
    return;
  }
  // Cache-first for everything else (static)
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
