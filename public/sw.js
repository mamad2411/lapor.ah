// Service Worker — Lapor.ah v2
// Network-only: no caching at all.
// Bumped to v2 to force browsers to replace the old cached SW.

const SW_VERSION = "3";

self.addEventListener("install", () => {
  // Skip waiting immediately — replace old SW right away
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete ALL old caches unconditionally
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// No fetch handler — browser handles all requests natively.
// This is intentional: avoids Cache.put() NetworkError when
// API routes return 4xx/5xx non-cacheable responses.
void SW_VERSION;
