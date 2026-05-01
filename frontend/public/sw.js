// Churvox emergency service worker recovery
// Purpose: stop old cached frontend bundles from trapping users on stale spinner builds.

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "reload" }).catch(() => fetch("/index.html", { cache: "reload" }))
    );
    return;
  }

  event.respondWith(fetch(event.request, { cache: "reload" }));
});
