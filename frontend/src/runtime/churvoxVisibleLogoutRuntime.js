import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-visible-logout-style';
let installed = false;
let loggingOut = false;

const css = `
  .cvxVisibleLogout {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 38px;
    border: 1px solid rgba(16, 21, 19, 0.12);
    border-radius: 999px;
    padding: 9px 12px;
    background: rgba(255, 255, 255, 0.88);
    color: #101513;
    font-size: 12px;
    font-weight: 1000;
    letter-spacing: -0.02em;
    cursor: pointer;
    box-shadow: 0 14px 34px rgba(16, 21, 19, 0.08);
    white-space: nowrap;
    text-decoration: none;
  }
  .cvxVisibleLogout:hover { transform: translateY(-1px); border-color: rgba(243, 107, 33, 0.28); }
  .cvxVisibleLogout:disabled { opacity: 0.68; cursor: wait; transform: none; }
  .cv3Top .cvxVisibleLogout { margin-left: 8px; }
  .cv3Account .cvxVisibleLogout { margin-top: 9px; align-self: flex-end; }
  .aomSidebar .cvxVisibleLogout, .aomBrand .cvxVisibleLogout { width: 100%; margin-top: 10px; }
  .cvxFloatingLogout {
    position: fixed;
    right: 14px;
    bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    z-index: 9999;
    background: #101513;
    color: #fff;
    border-color: rgba(255, 255, 255, 0.16);
  }
  @media (max-width: 720px) {
    .cv3Top .cv3Account { display: grid !important; gap: 6px !important; justify-items: end !important; }
    .cv3Account .cvxVisibleLogout { min-height: 34px; padding: 8px 10px; font-size: 11px; }
    .aomSidebar .cvxVisibleLogout, .aomBrand .cvxVisibleLogout { min-height: 40px; }
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
  const localKeys = [
    'token', 'authToken', 'access_token', 'owner_portal_session', 'platform_owner_email',
    'churvox_auth_session_snapshot_v1', 'churvox_auth_snapshot_v1', 'churvox_auth_snapshot',
    'churvox_plan_choice_required', 'churvox_business_profile_required', 'churvox_first_setup_pending'
  ];
  try { localKeys.forEach((key) => localStorage.removeItem(key)); } catch {}
  try { localKeys.forEach((key) => sessionStorage.removeItem(key)); } catch {}
}

async function postLogout(path) {
  try {
    const auth = token();
    await fetch(`${String(API_BASE || '').replace(/\/$/, '')}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
      body: '{}',
    });
  } catch {}
}

async function doLogout(button) {
  if (loggingOut) return;
  loggingOut = true;
  if (button) {
    button.disabled = true;
    button.textContent = 'Logging out...';
  }
  await Promise.allSettled([
    postLogout('/api/auth/logout'),
    postLogout('/api/worker/auth/logout'),
  ]);
  clearAuthStorage();
  try { window.dispatchEvent(new Event('churvox-auth-refresh')); } catch {}
  window.location.replace('/login?logged_out=1');
}

function makeButton(extraClass = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `cvxVisibleLogout ${extraClass}`.trim();
  button.textContent = 'Log out';
  button.setAttribute('data-churvox-visible-logout', 'true');
  button.addEventListener('click', () => doLogout(button));
  return button;
}

function removeDuplicates() {
  const buttons = Array.from(document.querySelectorAll('[data-churvox-visible-logout="true"]'));
  buttons.slice(1).forEach((button) => button.remove());
  return buttons[0] || null;
}

function injectOwnerLogout(existing) {
  const account = document.querySelector('.cv3Top .cv3Account') || document.querySelector('.cv3Account');
  if (!account) return false;
  let button = existing || account.querySelector('[data-churvox-visible-logout="true"]');
  if (!button) button = makeButton();
  if (button.parentElement !== account) account.appendChild(button);
  button.classList.remove('cvxFloatingLogout');
  return true;
}

function injectHqLogout(existing) {
  const anchor = document.querySelector('.aomSidebar') || document.querySelector('.aomBrand') || document.querySelector('.aomMain');
  if (!anchor) return false;
  let button = existing || anchor.querySelector('[data-churvox-visible-logout="true"]');
  if (!button) button = makeButton();
  if (button.parentElement !== anchor) anchor.appendChild(button);
  button.classList.remove('cvxFloatingLogout');
  return true;
}

function injectWorkerLogout(existing) {
  const anchor = document.querySelector('.workerHeader, .wffHeader, .workerTop, header');
  if (!anchor) return false;
  let button = existing || anchor.querySelector('[data-churvox-visible-logout="true"]');
  if (!button) button = makeButton();
  if (button.parentElement !== anchor) anchor.appendChild(button);
  button.classList.remove('cvxFloatingLogout');
  return true;
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
  let button = removeDuplicates();
  const path = window.location.pathname || '';
  const placed = path.startsWith('/worker') ? injectWorkerLogout(button) : (path.includes('admin') || path.includes('hq') || path.includes('owner') || path.includes('platform') || path.includes('app-owner')) ? injectHqLogout(button) : injectOwnerLogout(button);
  if (!placed) injectFallback(button);
}

function schedule(delay = 100) { setTimeout(run, delay); }

if (typeof window !== 'undefined' && !installed) {
  installed = true;
  [120, 500, 1200, 2600, 5200].forEach(schedule);
  window.addEventListener('load', () => schedule(200));
  window.addEventListener('hashchange', () => [80, 300, 900].forEach(schedule));
  window.addEventListener('popstate', () => [80, 300, 900].forEach(schedule));
  window.addEventListener('churvox-auth-refresh', () => schedule(300));
  document.addEventListener('click', () => schedule(160), true);
}

export {};
