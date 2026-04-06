/* Churvox Service Worker — minimal for PWA installability */
const CACHE_NAME = "churvox-v2-legal-refresh";

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first for all requests — keeps data fresh, SW only enables install
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
