// CHURVOX_OPTION_F_RESTORE_TIMERS_RUNTIME_20260630
// optionFPageActionRuntime contains a short-lived refresh guard. Restore native timers immediately
// after that file loads so later runtimes can register their intervals normally.

if (typeof window !== 'undefined' && window.__CHURVOX_NATIVE_TIMERS__) {
  window.setInterval = window.__CHURVOX_NATIVE_TIMERS__.setInterval;
  window.clearInterval = window.__CHURVOX_NATIVE_TIMERS__.clearInterval;
  window.setTimeout = window.__CHURVOX_NATIVE_TIMERS__.setTimeout;
  window.clearTimeout = window.__CHURVOX_NATIVE_TIMERS__.clearTimeout;
  window.__churvoxOptionFRefreshGuard = false;
}

export {};
