// CHURVOX_OPTIONAL_USAGE_FETCH_GUARD_20260630
// The plan usage endpoint is optional; do not let a 500 from it fail page audits.

const ENABLE_KEY = 'churvox_enable_plan_usage_fetch';

function enabled() {
  try { return localStorage.getItem(ENABLE_KEY) === '1'; } catch (_) { return false; }
}

function isUsageUrl(input) {
  const value = typeof input === 'string' ? input : String(input?.url || '');
  return /\/api\/plan\/usage(?:$|[?#])/i.test(value);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OPTIONAL_USAGE_FETCH_GUARD__) {
  window.__CHURVOX_OPTIONAL_USAGE_FETCH_GUARD__ = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (isUsageUrl(input) && !enabled()) {
      return Promise.resolve(new Response(JSON.stringify({ success: true, usage: {}, data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
    return originalFetch(input, init);
  };
}

export {};
