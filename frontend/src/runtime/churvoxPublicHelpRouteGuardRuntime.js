// Paid-launch public route guard.
// Anonymous visitors should never fall through /support or /security into an
// authenticated app route. Logged-in owners keep the existing in-app /support flow.

function hasSession() {
  try {
    return Boolean(
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('churvox_auth_session_snapshot_v1')
    );
  } catch {
    return false;
  }
}

function redirectPublicHelpRoutes() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '';

  if (path === '/security') {
    window.location.replace('/legal/privacy?section=security');
    return;
  }

  if (path === '/support' && !hasSession()) {
    window.location.replace('/contact?reason=support');
  }
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PUBLIC_HELP_ROUTE_GUARD__) {
  window.__CHURVOX_PUBLIC_HELP_ROUTE_GUARD__ = true;
  redirectPublicHelpRoutes();
  window.addEventListener('popstate', redirectPublicHelpRoutes);
}

export {};
