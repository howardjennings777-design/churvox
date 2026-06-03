/* Churvox cache reset service worker */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();

      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      for (const client of clients) {
        client.postMessage({ type: "CHURVOX_CACHE_CLEARED" });
      }
    })()
  );
});

self.addEventListener("fetch", () => {
  // Do not cache app files anymore.
});
