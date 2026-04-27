// Churvox Service Worker — lightweight, network-first, no aggressive caching
// Enables PWA installability + iPhone "Add to Home Screen" without stale files

const CACHE_NAME = "churvox-v1";

// Install: take over immediately
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate: claim all clients, purge any old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: always network-first, no caching of app files
// This ensures new Render deploys are picked up immediately
self.addEventListener("fetch", (event) => {
  // Only handle same-origin navigation and asset requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // For navigation requests (HTML pages): always go to network
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/index.html")
      )
    );
    return;
  }

  // For all other requests: network-first, no fallback caching
  // This prevents stale JS/CSS after deploys
  event.respondWith(fetch(event.request));
});
