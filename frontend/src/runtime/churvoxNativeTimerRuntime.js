// CHURVOX_NATIVE_TIMER_RUNTIME_20260630
// Keeps later page runtimes from losing their interval registrations if an older guard wraps timers.

if (typeof window !== 'undefined' && !window.__CHURVOX_NATIVE_TIMERS__) {
  window.__CHURVOX_NATIVE_TIMERS__ = {
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
  };
}

export {};
