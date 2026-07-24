import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-visible-logout-style';
let installed = false;
let loggingOut = false;
let observer = null;

const AUTH_KEYS = [
  'token', 'authToken', 'access_token', 'owner_portal_session', 'platform_owner_email',
  'churvox_auth_session_snapshot_v1', 'churvox_auth_snapshot_v1', 'churvox_auth_snapshot',
  'churvox_plan_choice_required', 'churvox_business_profile_required', 'churvox_first_setup_pending',
  'churvox:stable-current-plan:v1', 'churvox:plan-override', 'churvox:addon:accounting_sync',
  'churvox:addon:command_growth_pack', 'churvox:billing-plan', 'churvox:pending-checkout:v1',
  'churvox_email_verified',
];

const css = `
  .cvxVisibleLogout {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-width: 96px;
    min-height: 44px;
    border: 1px solid rgba(16, 21, 19, 0.12);
    border-radius: 999px;
    padding: 9px 14px;
    background: rgba(255, 255, 255, 0.94);
    color: #101513;
    font-size: 14px;
    font-weight: 1000;
    letter-spacing: -0.01em;
    cursor: pointer;
    box-shadow: 0 14px 34px rgba(16, 21, 19, 0.12);
    white-space: nowrap;
    text-decoration: none;
  }
  .cvxVisibleLogout:hover { transform: translateY(-1px); border-color: rgba(243, 107, 33, 0.42); }
  .cvxVisibleLogout:disabled { opacity: 0.68; cursor: wait; transform: none; }
  .cv3Top .cvxVisibleLogout { margin-left: 8px; }
  .cv3Account .cvxVisibleLogout { margin-top: 9px; align-self: flex-end; }
  .aomSidebar .cvxVisibleLogout, .aomBrand .cvxVisibleLogout { width: 100%; margin-top: 10px; }
  .cvxFloatingLogout {
    position: fixed;
    right: 14px;
    bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    z-index: 10050;
    background: #101513;
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }
  @media (max-width: 720px) {
    .cv3Top .cv3Account { display: grid !important; gap: 6px !important; justify-items: end !important; }
    .cv3Account .cvxVisibleLogout { min-height: 44px; padding: 9px 12px; font-size: 14px; }
    .aomSidebar .cvxVisibleLogout, .aomBrand .cvxVisibleLogout { min-height: 44px; }
    .cvxFloatingLogout {
      right: 10px;
      bottom: calc(10px + env(safe-area-inset-bottom, 0px));
      min-width: 100px;
      min-height: 48px;
    }
  }
`;

function isAppPath() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '';
  return (
    path === '/dashboard' || path.startsWith('/dashboard') || path === '/plans' || path === '/guide' || path === '/setup' || path === '/setup-guide' ||
    path.startsWith('/worker') || path === '/admin' || path === '/churvox-hq' || path === '/admin/hq' || path === '/owner/dashboard' || path === '/platform-dashboard' || path === '/app-owner'
  );
}

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  } else if (style.textContent !== css) {
    style.textContent = css;
  }
}

function token() {
  try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch { return ''; }
}

function clearAuthStorage() {
  try { AUTH_KEYS.forEach((key) => localStorage.removeItem(key)); } catch {}
  try { AUTH_KEYS.forEach((key) => sessionStorage.removeItem(key)); } catch {}
  try { sessionStorage.setItem('churvox:logged-out', String(Date.now())); } catch {}
}

async function postLogout() {
  try {
    const auth = token();
    const base = String(API_BASE || window.__CHURVOX_API_BASE__ || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
    const response = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
      body: '{}',
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function doLogout(button) {
  if (loggingOut) return;
  loggingOut = true;
  if (button) {
    button.disabled = true;
    button.textContent = 'Signing out…';
  }
  await postLogout();
  clearAuthStorage();
  try { window.dispatchEvent(new Event('churvox-auth-refresh')); } catch {}
  window.location.replace('/login?logged_out=1');
}

function makeButton(extraClass = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `cvxVisibleLogout ${extraClass}`.trim();
  button.textContent = 'Log out';
  button.setAttribute('aria-label', 'Log out of Churvox');
  button.setAttribute('data-churvox-visible-logout', 'true');
  button.addEventListener('click', () => doLogout(button));
  return button;
}

function isVisibleControl(element) {
  if (!element || !element.isConnected || typeof window === 'undefined') return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const insideViewport = rect.right > 0 && rect.bottom > 0 && rect.left < viewportWidth && rect.top < viewportHeight;
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && Number(style.opacity || 1) > 0.05
    && style.pointerEvents !== 'none'
    && rect.width >= 72
    && rect.height >= 36
    && insideViewport;
}

function removeDuplicates() {
  const buttons = Array.from(document.querySelectorAll('[data-churvox-visible-logout="true"]'));
  const keep = buttons.find((button) => button.isConnected) || buttons[0] || null;
  buttons.forEach((button) => { if (button !== keep) button.remove(); });
  return keep;
}

function injectOwnerLogout(existing) {
  const account = document.querySelector('.cv3Top .cv3Account') || document.querySelector('.cv3Account');
  if (!account) return false;
  let button = existing || account.querySelector('[data-churvox-visible-logout="true"]');
  if (!button) button = makeButton();
  if (button.parentElement !== account) account.appendChild(button);
  button.classList.remove('cvxFloatingLogout');
  return isVisibleControl(button);
}

function injectHqLogout(existing) {
  const anchor = document.querySelector('.aomSidebar') || document.querySelector('.aomBrand') || document.querySelector('.aomMain');
  if (!anchor) return false;
  let button = existing || anchor.querySelector('[data-churvox-visible-logout="true"]');
  if (!button) button = makeButton();
  if (button.parentElement !== anchor) anchor.appendChild(button);
  button.classList.remove('cvxFloatingLogout');
  return isVisibleControl(button);
}

function injectWorkerLogout(existing) {
  const anchor = document.querySelector('.workerHeader, .wffHeader, .workerTop, header');
  if (!anchor) return false;
  let button = existing || anchor.querySelector('[data-churvox-visible-logout="true"]');
  if (!button) button = makeButton();
  if (button.parentElement !== anchor) anchor.appendChild(button);
  button.classList.remove('cvxFloatingLogout');
  return isVisibleControl(button);
}

function injectFallback(existing) {
  let button = existing || document.querySelector('[data-churvox-visible-logout="true"]');
  if (!button) button = makeButton('cvxFloatingLogout');
  if (button.parentElement !== document.body) document.body.appendChild(button);
  button.classList.add('cvxFloatingLogout');
}

function run() {
  if (!isAppPath() || typeof document === 'undefined') return;
  ensureStyle();
  const injected = removeDuplicates();
  const authenticating = document.querySelector('.cvAuthLoading, .cvOwnerScreenGuardLoading');
  if (authenticating) {
    injected?.remove();
    return;
  }

  const nativeCandidates = Array.from(document.querySelectorAll('.cvSiteLogout, .cvWorkerLogout, .cvWorkerRouteLogout, [data-churvox-native-logout="true"]'));
  const visibleNative = nativeCandidates.find(isVisibleControl);
  if (visibleNative) {
    injected?.remove();
    return;
  }

  const path = window.location.pathname || '';
  const placed = path.startsWith('/worker')
    ? injectWorkerLogout(injected)
    : (path.includes('admin') || path.includes('hq') || path.includes('owner') || path.includes('platform') || path.includes('app-owner'))
      ? injectHqLogout(injected)
      : injectOwnerLogout(injected);
  if (!placed) injectFallback(injected);
}

function schedule(delay = 100) { setTimeout(run, delay); }

if (typeof window !== 'undefined' && !installed) {
  installed = true;
  [80, 240, 600, 1200, 2600, 5200].forEach(schedule);
  window.addEventListener('load', () => schedule(120));
  window.addEventListener('resize', () => [40, 180].forEach(schedule));
  window.addEventListener('orientationchange', () => [80, 320].forEach(schedule));
  window.addEventListener('hashchange', () => [40, 160, 500].forEach(schedule));
  window.addEventListener('popstate', () => [40, 160, 500].forEach(schedule));
  window.addEventListener('churvox-auth-refresh', () => schedule(160));
  document.addEventListener('click', () => schedule(100), true);
  if (typeof MutationObserver !== 'undefined' && document.documentElement) {
    observer = new MutationObserver(() => schedule(60));
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] });
  }
}

export { clearAuthStorage, doLogout, postLogout };
