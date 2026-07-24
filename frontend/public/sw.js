/* Churvox forced Sites cutover worker — 20260724-v4. */
const LEGACY_HOSTS = new Set(['grassley-frontend.onrender.com', 'www.churvox.com', 'churvox.com']);
const SITES_ORIGIN = 'https://churvox.howardjennings77.chatgpt.site';

function sitesUrl(input) {
  const source = new URL(input);
  const target = new URL(source.pathname + source.search + source.hash, SITES_ORIGIN);
  target.searchParams.set('fromLegacyBuild', '1');
  return target.toString();
}

self.addEventListener('install', () => self.skipWaiting());

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
        if (LEGACY_HOSTS.has(url.hostname)) await client.navigate(sitesUrl(url.toString()));
      }
    } catch (_) {}
  })());
});

self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);
    if (LEGACY_HOSTS.has(url.hostname) && event.request.mode === 'navigate') {
      event.respondWith(Response.redirect(sitesUrl(url.toString()), 302));
    }
  } catch (_) {}
});
