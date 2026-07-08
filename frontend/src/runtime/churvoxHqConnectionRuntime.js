import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-hq-connection-runtime-style';
let installed = false;
let lastStatus = null;

const css = `
  .aomConnectionStatus {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    border-radius: 999px;
    padding: 8px 11px;
    border: 1px solid rgba(16,21,19,.1);
    background: rgba(255,255,255,.88);
    color: #101513;
    font-size: 11px;
    font-weight: 1000;
    box-shadow: 0 12px 30px rgba(16,21,19,.08);
  }
  .aomConnectionStatus::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #d97706;
    box-shadow: 0 0 0 4px rgba(217,119,6,.12);
  }
  .aomConnectionStatus.connected::before { background:#059669; box-shadow:0 0 0 4px rgba(5,150,105,.14); }
  .aomConnectionStatus.error::before { background:#dc2626; box-shadow:0 0 0 4px rgba(220,38,38,.14); }
  .aomConnectionStatus.connected { border-color: rgba(5,150,105,.2); color:#047857; }
  .aomConnectionStatus.error { border-color: rgba(220,38,38,.2); color:#b91c1c; }
`;

function token() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}
function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
}
function isHq() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '';
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner'].includes(path);
}
function host() {
  return String(API_BASE || '').replace(/\/$/, '');
}
async function checkConnection() {
  const headers = { Accept: 'application/json' };
  const auth = token();
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const response = await fetch(`${host()}/api/admin/owner/connection`, { credentials: 'include', headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || body?.connected !== true) {
    throw new Error(body?.detail || body?.message || body?.error || `HQ connection failed ${response.status}`);
  }
  return body;
}
function findAnchor() {
  return document.querySelector('.aomHeroActions') || document.querySelector('.aomHero') || document.querySelector('.aomBrand') || document.querySelector('[data-version="CHURVOX_APP_OWNER_MACHINE_20260708"]');
}
function renderStatus(state, detail = '') {
  if (!isHq()) return;
  ensureStyle();
  const anchor = findAnchor();
  if (!anchor) return;
  let node = document.querySelector('.aomConnectionStatus');
  if (!node) {
    node = document.createElement('span');
    node.className = 'aomConnectionStatus';
    if (anchor.classList?.contains('aomHeroActions')) anchor.prepend(node);
    else anchor.appendChild(node);
  }
  node.className = `aomConnectionStatus ${state}`;
  node.textContent = state === 'connected' ? `HQ connected · ${detail || 'live backend'}` : state === 'error' ? `HQ not connected · ${detail || 'check backend'}` : 'Checking HQ connection...';
}
async function run() {
  if (!isHq()) return;
  renderStatus('checking');
  try {
    const body = await checkConnection();
    lastStatus = body;
    const users = body?.counts?.users;
    renderStatus('connected', Number.isFinite(Number(users)) ? `${users} users` : 'live backend');
    window.__CHURVOX_HQ_CONNECTION__ = body;
  } catch (error) {
    renderStatus('error', error?.message || 'backend failed');
  }
}
function schedule(delay = 120) { setTimeout(run, delay); }

if (typeof window !== 'undefined' && !installed) {
  installed = true;
  schedule(250);
  window.addEventListener('load', () => schedule(250));
  window.addEventListener('popstate', () => schedule(250));
  window.addEventListener('hashchange', () => schedule(250));
  setInterval(() => { if (isHq()) run(); }, 30000);
}

export { lastStatus };
