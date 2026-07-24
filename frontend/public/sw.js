/* Churvox legacy Render exit worker — 20260724-v3. */
const LEGACY_HOST = 'grassley-frontend.onrender.com';
const CANONICAL_ORIGIN = 'https://www.churvox.com';

function canonicalUrl(input) {
  const url = new URL(input);
  url.protocol = 'https:';
  url.host = 'www.churvox.com';
  url.searchParams.set('fromLegacyRender', '1');
  return url.toString();
}

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
        if (url.hostname === LEGACY_HOST) {
          await client.navigate(canonicalUrl(url.toString()));
        }
      }
    } catch (_) {}
  })());
});

self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);
    if (url.hostname === LEGACY_HOST && event.request.mode === 'navigate') {
      event.respondWith(Response.redirect(canonicalUrl(url.toString()), 302));
      return;
    }
  } catch (_) {}
});
