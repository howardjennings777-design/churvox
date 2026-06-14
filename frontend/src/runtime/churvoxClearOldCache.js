/*
  Churvox old PWA/cache killer.
  Clears old service workers/caches so users stop seeing stale production bundles.
*/

async function clearOldChurvoxCache() {
  if (typeof window === "undefined") return;

  const key = "churvox-cache-reset-20260615-auth-v1";
  if (window.localStorage.getItem(key) === "done") return;

  try {
    if ("caches" in window) {
      const names = await window.caches.keys();
      await Promise.all(names.map((name) => window.caches.delete(name)));
    }

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }

    window.localStorage.setItem(key, "done");

    if (!window.location.search.includes("cacheReset=auth1")) {
      const url = new URL(window.location.href);
      url.searchParams.set("cacheReset", "auth1");
      window.location.replace(url.toString());
    }
  } catch (err) {
    console.warn("Churvox cache reset failed", err);
  }
}

clearOldChurvoxCache();
