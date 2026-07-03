// Guard platform-owner cockpit and stale preload network noise.
// Normal business-owner sessions must not keep polling endpoints that are not ready.
(function () {
  if (typeof window === 'undefined') return;
  if (window.__CHURVOX_PLATFORM_OWNER_NOISE_GUARD__) return;
  window.__CHURVOX_PLATFORM_OWNER_NOISE_GUARD__ = true;

  const PLATFORM_EMAIL = 'hello@churvox.com';
  const SESSION_CACHE_KEY = 'churvox_last_valid_user';
  const ADMIN_PATHS = [
    '/api/admin/owner-overview',
    '/api/admin/owner/plan-report',
    '/api/admin/owner/control-log',
    '/api/admin/owner/tester-intake',
    '/api/admin/owner/control-access',
    '/api/admin/owner/grant-free-tester',
    '/api/admin/owner/revoke-free-tester',
  ];
  const QUIET_GET_PATHS = [
    '/api/auth/me',
    '/api/billing/subscription-status',
  ];

  function readCachedUser() {
    try {
      const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const user = parsed?.user || parsed;
      if (!user || typeof user !== 'object') return null;
      return user;
    } catch {
      return null;
    }
  }

  function isPlatformOwnerSession() {
    try {
      return String(window.localStorage.getItem('platform_owner_email') || '').trim().toLowerCase() === PLATFORM_EMAIL;
    } catch {
      return false;
    }
  }

  function pathOf(input) {
    try {
      const url = new URL(typeof input === 'string' ? input : input?.url || '', window.location.origin);
      return url.pathname || '';
    } catch {
      return '';
    }
  }

  function isAdminOwnerPath(pathname) {
    return ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }

  function isQuietGetPath(pathname) {
    return QUIET_GET_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }

  function methodOf(init) {
    return String(init?.method || 'GET').trim().toUpperCase() || 'GET';
  }

  function jsonResponse(body, status = 200, reason = 'platform-owner') {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'X-Churvox-Guarded': reason },
    });
  }

  function safeAdminResponse(init) {
    const method = methodOf(init);
    if (method !== 'GET' && method !== 'HEAD') {
      return jsonResponse({
        success: false,
        guarded: true,
        detail: 'Platform-owner action blocked for this browser session.',
      }, 403);
    }

    return jsonResponse({
      success: true,
      guarded: true,
      detail: 'Platform-owner cockpit endpoint quieted for this browser session.',
      items: [],
      testers: [],
      paid_users: [],
      trial_users: [],
      free_testers: [],
      no_plan_users: [],
      counts: {},
      lists: {},
      metrics: {},
    });
  }

  function safeSessionResponse(pathname) {
    const user = readCachedUser();
    if (pathname === '/api/auth/me') {
      if (!user?.email) return jsonResponse({ success: false, guarded: true, detail: 'No cached session yet.' }, 401, 'session-preload');
      return jsonResponse({ success: true, guarded: true, user, data: user }, 200, 'session-preload');
    }

    if (pathname === '/api/billing/subscription-status') {
      const plan = user?.plan || user?.ui_plan || user?.current_plan || user?.subscription_plan || user?.billing_plan || user?.tier || 'none';
      return jsonResponse({
        success: true,
        guarded: true,
        plan,
        plan_name: plan,
        subscription_status: user?.subscription_status || user?.billing_status || '',
        trial_ends_at: user?.trial_ends_at || '',
        billing_lock_reason: user?.billing_lock_reason || '',
        stripe_customer_id: user?.stripe_customer_id || '',
        stripe_subscription_id: user?.stripe_subscription_id || '',
        email: user?.email || '',
        country: user?.country || user?.billing_country || 'NZ',
        has_app_access: user?.has_app_access !== false,
      }, 200, 'billing-preload');
    }

    return null;
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function guardedFetch(input, init) {
      const pathname = pathOf(input);
      const method = methodOf(init);

      if (isAdminOwnerPath(pathname) && !isPlatformOwnerSession()) {
        return Promise.resolve(safeAdminResponse(init));
      }

      if (method === 'GET' && isQuietGetPath(pathname)) {
        const safe = safeSessionResponse(pathname);
        if (safe) return Promise.resolve(safe);
      }

      return originalFetch.apply(this, arguments);
    };
  }
})();

export {};
