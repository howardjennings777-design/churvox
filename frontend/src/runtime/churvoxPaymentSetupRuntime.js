import './churvoxPaymentSetupRuntime.css';

const API_BASE = (window.__CHURVOX_API_BASE__ || process.env.REACT_APP_API_BASE || '').replace(/\/$/, '');
const API = `${API_BASE}/api`;

function headers() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function getStatus() {
  try {
    const res = await fetch(`${API}/payments/on-site/status`, { credentials: 'include', headers: headers() });
    if (!res.ok) return { ready: false, detail: 'Payment status needs setup.' };
    return await res.json();
  } catch {
    return { ready: false, detail: 'Payment status could not be checked.' };
  }
}

async function openSetup() {
  const button = document.querySelector('[data-cvx-payment-setup]');
  if (button) button.textContent = 'Opening setup';
  try {
    const res = await fetch(`${API}/payments/on-site/setup-link`, { method: 'POST', credentials: 'include', headers: headers(), body: '{}' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.detail || 'Payment setup is not ready.');
    window.location.assign(data.url);
  } catch (err) {
    if (button) button.textContent = 'Setup needed';
    window.dispatchEvent(new CustomEvent('churvox:notice', { detail: { title: 'Payment setup needed', text: err.message || 'Could not open payment setup.' } }));
  }
}

function render(status) {
  const root = document.querySelector('.cvxWorkspace');
  if (!root) return;
  let panel = document.querySelector('[data-cvx-payment-panel]');
  if (!panel) {
    panel = document.createElement('section');
    panel.dataset.cvxPaymentPanel = 'true';
    panel.className = 'cvxPaymentPanel';
    root.appendChild(panel);
  }
  const ready = Boolean(status.terminal_ready || status.ready);
  const connected = Boolean(status.connected || status.stripe_account_id);
  panel.innerHTML = `<div><small>On-site payments</small><h3>${ready ? 'Worker card collection ready' : connected ? 'Payment account connected' : 'Payment setup required'}</h3><p>${ready ? 'Workers can collect card payments on priced jobs through the reader flow.' : connected ? 'Connect a reader and keep job amounts set before workers collect.' : 'Owner must connect Stripe before workers can take card payments.'}</p></div><button type="button" data-cvx-payment-setup>${ready ? 'Review setup' : 'Setup payments'}</button>`;
  panel.querySelector('[data-cvx-payment-setup]')?.addEventListener('click', openSetup);
}

async function refresh() {
  const path = window.location.pathname || '';
  const hash = window.location.hash || '';
  if (!(path === '/dashboard' || path === '/plans' || path.startsWith('/dashboard'))) return;
  if (!/(invoices|settings|xero|command|plans)/.test(hash || 'settings')) return;
  render(await getStatus());
}

setTimeout(refresh, 900);
setTimeout(refresh, 2200);
window.addEventListener('hashchange', () => setTimeout(refresh, 180));
window.addEventListener('churvox:data-refresh', () => setTimeout(refresh, 180));
