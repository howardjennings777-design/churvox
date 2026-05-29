// CHURVOX_STALE_BUNDLE_RESCUE_20260529
// This file exists only to rescue browsers stuck on an old cached index.html.
// It clears old PWA/cache data and reloads the current app bundle.
(async function () {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {}

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {}

  try {
    sessionStorage.setItem("churvox_stale_bundle_rescued_20260529", "1");
  } catch (e) {}

  window.location.replace("/?fresh=stale-bundle-rescue-20260529-" + Date.now());
})();
