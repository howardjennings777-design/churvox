// Churvox Service Worker — network-first and deploy-safe
// Bumped to force old PWA/browser caches to drop stale dashboard bundles.

const CACHE_NAME = "churvox-command-office-v4";

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
