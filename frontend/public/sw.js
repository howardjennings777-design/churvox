/* PHASE_238_DISABLE_PWA_CACHE_20260517070111
   Temporary no-cache service worker while Churvox theme is being finalised.
*/
const CHURVOX_CACHE_VERSION = "phase-238-disable-cache-20260517070111";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  event.respondWith(fetch(request, { cache: "no-store" }));
});
