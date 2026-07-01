// Guard platform-owner cockpit network noise.
// Normal business-owner sessions must not keep polling platform-owner endpoints from /admin.
(function () {
  if (typeof window === 'undefined') return;
  if (window.__CHURVOX_PLATFORM_OWNER_NOISE_GUARD__) return;
  window.__CHURVOX_PLATFORM_OWNER_NOISE_GUARD__ = true;

  const PLATFORM_EMAIL = 'hello@churvox.com';
  const ADMIN_PATHS = [
    '/api/admin/owner-overview',
    '/api/admin/owner/plan-report',
    '/api/admin/owner/control-log',
    '/api/admin/owner/tester-intake',
    '/api/admin/owner/control-access',
    '/api/admin/owner/grant-free-tester',
    '/api/admin/owner/revoke-free-tester',
  ];

  function isPlatformOwnerSession() {
    try {
      return String(window.localStorage.getItem('platform_owner_email') || '').trim().toLowerCase() === PLATFORM_EMAIL;
    } catch {
      return false;
    }
  }

  function isAdminOwnerUrl(input) {
    try {
      const url = new URL(typeof input === 'string' ? input : input?.url || '', window.location.origin);
      return ADMIN_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));
    } catch {
      return false;
    }
  }

  function safeResponse(input) {
    return new Response(JSON.stringify({
      success: false,
      guarded: true,
      detail: 'Platform-owner cockpit endpoint blocked for this browser session.',
      items: [],
      testers: [],
      lists: {},
      metrics: {},
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Churvox-Guarded': 'platform-owner' },
    });
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function guardedFetch(input, init) {
      if (isAdminOwnerUrl(input) && !isPlatformOwnerSession()) {
        return Promise.resolve(safeResponse(input));
      }
      return originalFetch.apply(this, arguments);
    };
  }
})();

export {};
