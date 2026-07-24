import axios from 'axios';
import API_BASE from '../lib/apiBase';

const BUTTON_ID = 'churvox-control-board-mobile-logout';
const STYLE_ID = 'churvox-control-board-mobile-logout-style';
const LOGGED_OUT_MARKER = 'churvox:logged-out';
const AUTH_KEYS = [
  'token', 'authToken', 'access_token', 'owner_portal_session', 'platform_owner_email',
  'churvox_auth_session_snapshot_v1', 'churvox_auth_snapshot_v1', 'churvox_auth_snapshot',
  'churvox_plan_choice_required', 'churvox_business_profile_required', 'churvox_first_setup_pending',
  'churvox:stable-current-plan:v1', 'churvox:plan-override', 'churvox:addon:accounting_sync',
  'churvox:addon:command_growth_pack', 'churvox:billing-plan', 'churvox:pending-checkout:v1',
];

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID}{width:100%;min-height:53px;border:0;border-bottom:1px solid #dedbd2;background:#fff;color:#c44738;text-align:left;font:900 12px/1 Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer}
    #${BUTTON_ID}:disabled{opacity:.55;cursor:wait}
  `;
  document.head.appendChild(style);
}

function clearAuth() {
  try { AUTH_KEYS.forEach((key) => localStorage.removeItem(key)); } catch {}
  try { AUTH_KEYS.forEach((key) => sessionStorage.removeItem(key)); } catch {}
  try { sessionStorage.setItem(LOGGED_OUT_MARKER, String(Date.now())); } catch {}
}

async function logout(button) {
  if (!button || button.disabled) return;
  button.disabled = true;
  button.textContent = 'Signing out…';
  try {
    const base = String(API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
    let auth = '';
    try { auth = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch {}
    await axios.post(`${base}/api/auth/logout`, {}, { withCredentials: true, timeout: 6000, headers: auth ? { Authorization: `Bearer ${auth}` } : undefined });
  } catch {}
  clearAuth();
  window.location.replace('/login?logged_out=1');
}

function ensure() {
  const sheet = document.querySelector('.cv7MobileMore section');
  if (!sheet) {
    document.getElementById(BUTTON_ID)?.remove();
    return;
  }
  ensureStyle();
  let button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Log out';
    button.setAttribute('aria-label', 'Log out');
    button.addEventListener('click', () => logout(button));
  }
  if (button.parentElement !== sheet) sheet.appendChild(button);
}

function start() {
  ensure();
  const observer = new MutationObserver(() => window.requestAnimationFrame(ensure));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', ensure);
  window.addEventListener('popstate', ensure);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

export { ensure, logout };
