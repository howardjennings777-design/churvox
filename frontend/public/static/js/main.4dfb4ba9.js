// CHURVOX_EMERGENCY_STALE_BUNDLE_RESCUE_20260526
// This file exists only to rescue browsers that cached an old index.html pointing at a deleted bundle.
(async function churvoxStaleBundleRescue() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister().catch(() => {})));
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key).catch(() => {})));
    }
  } catch (err) {
    console.warn('Churvox stale bundle rescue cleanup skipped:', err);
  }

  const target = '/dashboard?fresh=' + Date.now();
  if (window.location.pathname === '/dashboard') {
    window.location.replace(target);
  } else {
    window.location.replace(window.location.pathname + '?fresh=' + Date.now());
  }
})();
