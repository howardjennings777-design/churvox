/* Churvox stale Sites/PWA migration worker — 20260724. */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (_) {}

    try { await self.clients.claim(); } catch (_) {}

    try {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        const url = new URL(client.url);
        if (url.hostname === 'churvox.com' || url.hostname === 'www.churvox.com') {
          url.searchParams.set('churvoxSitesExit', '20260724-v1');
          client.navigate(url.toString());
        }
      }
    } catch (_) {}
  })());
});

self.addEventListener('fetch', () => {
  return;
});
