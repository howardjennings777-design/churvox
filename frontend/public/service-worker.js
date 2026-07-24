/* Churvox Render service worker cleanup — 20260724-render-only-v2. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (_) {}

    try { await self.clients.claim(); } catch (_) {}
  })());
});

self.addEventListener('fetch', () => {
  // Render owns normal network routing. Do not redirect to ChatGPT Sites.
});

// CHURVOX_PUSH_NOTIFICATION_HANDLER_20260621
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { title: 'Churvox', body: event.data ? event.data.text() : 'New update' };
    } catch {
      data = { title: 'Churvox', body: 'New update' };
    }
  }

  const title = data.title || 'Churvox';
  const options = {
    body: data.body || data.message || 'New job update',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    data: { url: data.url || data.route || '/worker/jobs' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/worker/jobs';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    })
  );
});
