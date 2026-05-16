/* CHURVOX_CACHE_FIX_2026_05_16
   Network-first shell. Never cache bad static assets. */
const CHURVOX_CACHE = "churvox-pwa-cache-fix-2026-05-16";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("churvox-") && key !== CHURVOX_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/static/") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".mjs") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".woff2")
  );
}

function validAssetResponse(response, pathname) {
  if (!response || !response.ok) return false;

  const type = response.headers.get("content-type") || "";

  if (pathname.endsWith(".css")) return type.includes("text/css");
  if (pathname.endsWith(".js") || pathname.endsWith(".mjs")) {
    return type.includes("javascript") || type.includes("text/javascript");
  }

  return true;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() =>
        caches.match("/").then((cached) => cached || new Response("Churvox is offline.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }))
      )
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: "reload" })
        .then((response) => {
          if (validAssetResponse(response, url.pathname)) {
            const copy = response.clone();
            caches.open(CHURVOX_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
