// CHURVOX_ROUTE_ALIAS_RUNTIME_20260630
// Normalises legacy/simple route names before React Router mounts.

if (typeof window !== 'undefined' && !window.__CHURVOX_ROUTE_ALIAS_RUNTIME__) {
  window.__CHURVOX_ROUTE_ALIAS_RUNTIME__ = true;
  const path = window.location.pathname || '';
  const aliases = {
    '/help': '/dashboard#support',
    '/worker/messages': '/worker/ops',
    '/worker/profile': '/worker/settings',
  };
  const target = aliases[path];
  if (target) {
    window.history.replaceState({}, document.title, target);
  }
}

export {};
