// sw.js — Bokitch Grocery Service Worker
const VERSION = "2026-04-25.1";
const CACHE_NAME = `bokitch-grocery-${VERSION}`;

// Install
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["/", "/index.html"]))
      .catch((err) => console.warn("[SW] precache failed", err))
  );
});

// Activate — clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for navigation, cache-first for everything else
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Don't cache Firebase / Firestore traffic
  const url = new URL(req.url);
  if (url.hostname.includes("googleapis.com") ||
      url.hostname.includes("gstatic.com") ||
      url.hostname.includes("firebaseio.com") ||
      url.hostname.includes("firestore.googleapis.com")) {
    return; // let browser handle directly
  }

  // Navigation requests — network first, fall back to cached index
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        return res;
      }).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Other GETs — cache-first
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
