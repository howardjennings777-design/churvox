// CHURVOX_NO_CACHE_SERVICE_WORKER_20260529
// Temporary launch-safe service worker.
// It immediately unregisters itself and clears old caches so stale hashed JS/CSS bundles do not break app loading.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      })
      .then(() => self.registration.unregister())
  );
});

self.addEventListener('fetch', () => {
  // No fetch interception. Browser/network handles every request normally.
});
