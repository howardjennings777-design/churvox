import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_PROTECTED_FETCH_AUTH_GUARD__';
const API_ORIGIN = (() => {
  try { return new URL(String(API_BASE || ''), window.location.origin).origin; }
  catch { return ''; }
})();
const PUBLIC_AUTH_PATHS = [
  '/api/auth/login',
  '/api/worker/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/me',
  '/api/auth/logout',
];

function currentPath() {
  return window.location.pathname || '';
}

function insideProtectedApp() {
  const path = currentPath();
  return path === '/dashboard' || path.startsWith('/dashboard') || path === '/plans' || path === '/guide' || path === '/setup' || path === '/setup-guide' || path.startsWith('/worker') || path.startsWith('/admin') || path === '/churvox-hq' || path === '/platform';
}

function requestUrl(input) {
  try {
    if (typeof input === 'string') return new URL(input, window.location.origin);
    if (input instanceof URL) return input;
    if (input?.url) return new URL(input.url, window.location.origin);
  } catch {}
  return null;
}

function isProtectedApiRequest(input) {
  const url = requestUrl(input);
  if (!url || !insideProtectedApp()) return false;
  const apiLike = url.pathname.startsWith('/api/') && (!API_ORIGIN || url.origin === API_ORIGIN || url.origin === window.location.origin);
  if (!apiLike) return false;
  return !PUBLIC_AUTH_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));
}

function authStatus() {
  return String(window.__CHURVOX_AUTH_STATE__?.status || 'checking');
}

function syntheticUnauthorized() {
  return new Response(JSON.stringify({ detail: 'Authentication required' }), {
    status: 401,
    statusText: 'Unauthorized',
    headers: { 'Content-Type': 'application/json', 'X-Churvox-Local-Auth-Guard': '1' },
  });
}

function waitForAuth(maxWaitMs = 9500) {
  if (authStatus() !== 'checking') return Promise.resolve(authStatus());
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('churvox-auth-state', onState);
      window.clearTimeout(timer);
      resolve(authStatus());
    };
    const onState = () => finish();
    const timer = window.setTimeout(finish, maxWaitMs);
    window.addEventListener('churvox-auth-state', onState, { once: true });
  });
}

function publishExpired() {
  const now = Date.now();
  const last = Number(window.__CHURVOX_LAST_AUTH_EXPIRED_EVENT__ || 0);
  if (now - last < 1200) return;
  window.__CHURVOX_LAST_AUTH_EXPIRED_EVENT__ = now;
  window.dispatchEvent(new Event('churvox-auth-expired'));
}

if (typeof window !== 'undefined' && !window[FLAG] && typeof window.fetch === 'function') {
  window[FLAG] = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function guardedChurvoxFetch(input, init) {
    const protectedRequest = isProtectedApiRequest(input);
    if (protectedRequest) {
      const status = await waitForAuth();
      if (status !== 'authenticated') return syntheticUnauthorized();
    }
    const response = await originalFetch(input, init);
    if (protectedRequest && response.status === 401) publishExpired();
    return response;
  };
}

export {};
