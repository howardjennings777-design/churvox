// CHURVOX_ROUTE_EVENTS_20260628
// The OS uses hash pages with replaceState. Native hashchange does not fire for replaceState,
// so dispatch one when the URL actually changes.

if (typeof window !== "undefined" && !window.__CHURVOX_ROUTE_EVENTS__) {
  window.__CHURVOX_ROUTE_EVENTS__ = true;

  const wrap = (method) => {
    const original = window.history[method];
    window.history[method] = function routeEventWrapper(...args) {
      const before = window.location.href;
      const result = original.apply(this, args);
      const after = window.location.href;
      if (before !== after) {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
      return result;
    };
  };

  wrap("replaceState");
  wrap("pushState");
}
