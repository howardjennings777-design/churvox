/* PHASE_96_MOBILE_RESPONSIVE_INSTALLABLE_PWA */
const CHURVOX_CACHE = "churvox-pwa-v96";
const APP_SHELL = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/logo192.png",
  "/logo512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CHURVOX_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CHURVOX_CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CHURVOX_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  if (url.pathname.startsWith("/static/") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CHURVOX_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return response;
        });
      })
    );
  }
});
