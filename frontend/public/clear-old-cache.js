(function () {
  try {
    localStorage.setItem("churvox_cache_clear", String(Date.now()));
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (reg) { reg.unregister(); });
      });
    }
    if (window.caches) {
      caches.keys().then(function (keys) {
        keys.forEach(function (key) { caches.delete(key); });
      });
    }
  } catch (e) {}
})();
