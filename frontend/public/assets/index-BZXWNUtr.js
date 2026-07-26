/* Churvox Sites escape shim — removes the retired Sites build from this domain. */
(async function churvoxRetiredSitesEscape() {
  try {
    if (window.__CHURVOX_RETIRED_SITES_ESCAPE_RUNNING__) return;
    window.__CHURVOX_RETIRED_SITES_ESCAPE_RUNNING__ = true;

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const names = await window.caches.keys();
      await Promise.all(names.map((name) => window.caches.delete(name)));
    }

    const target = new URL('/', window.location.origin);
    target.searchParams.set('churvoxSiteReset', String(Date.now()));
    window.location.replace(target.toString());
  } catch (error) {
    window.location.replace('/?churvoxSiteReset=' + Date.now());
  }
})();
