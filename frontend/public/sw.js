// Churvox Service Worker — lightweight, network-first, hard refresh friendly
// Keeps PWA installability while avoiding stale dashboard JS/CSS after deploys.

const CACHE_NAME = "churvox-ai-control-room-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);
  const isAppAsset =
    event.request.mode === "navigate" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/";

  if (isAppAsset) {
    event.respondWith(
      fetch(new Request(event.request, { cache: "no-store" })).catch(() => fetch(event.request))
    );
    return;
  }

  event.respondWith(fetch(event.request));
});
