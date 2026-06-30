import API_BASE from '../lib/apiBase';

const PANEL_ID = 'churvox-xero-payments-panel';

function isXeroPage() {
  return String(window.location.hash || '').toLowerCase() === '#xero' || /\/xero\/?$/i.test(window.location.pathname || '');
}

function ensureStyle() {
  if (document.getElementById('churvox-xero-payments-style')) return;
  const style = document.createElement('style');
  style.id = 'churvox-xero-payments-style';
  style.textContent = `
    #${PANEL_ID}{display:grid;gap:12px;border-radius:24px;padding:18px;background:linear-gradient(135deg,#111827,#1f2937 58%,#f97316);color:#fff;box-shadow:0 18px 44px rgba(15,23,42,.18);min-height:180px;align-content:start}
    #${PANEL_ID} *{box-sizing:border-box}
    #${PANEL_ID} span{display:inline-flex;width:max-content;border-radius:999px;background:rgba(255,255,255,.14);padding:6px 10px;color:#fed7aa;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}
    #${PANEL_ID} h2{margin:0;font-size:24px;letter-spacing:-.03em;color:#fff!important}
    #${PANEL_ID} p{margin:0;color:#f8fafc!important;font-weight:850;line-height:1.35}
    #${PANEL_ID} .cvPayStatus{border-radius:16px;background:rgba(255,255,255,.12);padding:10px 12px;color:#fff!important;font-size:13px;font-weight:900}
    #${PANEL_ID} a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border-radius:999px;padding:10px 14px;background:#fff;color:#111827!important;text-decoration:none;font-weight:1000;box-shadow:0 14px 30px rgba(15,23,42,.18)}
    #${PANEL_ID} .cvPayRules{display:grid;gap:6px;margin-top:2px}
    #${PANEL_ID} .cvPayRules b{display:block;border-radius:12px;background:rgba(255,255,255,.1);padding:8px 10px;color:#fff;font-size:12px;font-weight:900}
  `;
  document.head.appendChild(style);
}

function authHeaders() {
  const token = window.localStorage?.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function refreshStatus(panel) {
  const status = panel.querySelector('.cvPayStatus');
  if (!status) return;
  try {
    const res = await fetch(`${API_BASE}/api/payments/on-site/status`, { credentials: 'include', headers: authHeaders() });
    if (res.status === 404) {
      status.textContent = 'Backend route is still deploying. Payments setup will appear here once Render finishes.';
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.message || `Backend ${res.status}`);
    if (!data.enabled_for_plan) status.textContent = 'Locked: on-site payments require Operator or Command.';
    else if (!data.stripe_configured) status.textContent = 'Render backend needs STRIPE_SECRET_KEY.';
    else if (data.connected) status.textContent = 'Stripe connected. Workers can collect approved card payments for priced jobs.';
    else status.textContent = 'Ready: owner can connect Stripe here. Workers collect only after setup.';
  } catch (error) {
    status.textContent = error?.message || 'Payment status unavailable.';
  }
}

function mount() {
  ensureStyle();
  const existing = document.getElementById(PANEL_ID);
  if (!isXeroPage()) {
    if (existing) existing.remove();
    return;
  }
  const page = document.querySelector('.workspace .cocPage') || document.querySelector('.workspace') || document.querySelector('#root');
  if (!page || existing) return;
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.className = 'cocPanel full';
  panel.innerHTML = `
    <span>Payments + Xero</span>
    <h2>On-site card payments</h2>
    <p>Owner connects Stripe beside accounting. Workers can collect approved customer card payments, but funds go to the business account.</p>
    <p class="cvPayStatus">Checking payment status...</p>
    <a href="/payments/setup/index.html">Connect Stripe payments</a>
    <div class="cvPayRules">
      <b>Xero stays draft sync only.</b>
      <b>No tax filing. No payout files.</b>
      <b>Workers cannot change bank details.</b>
    </div>
  `;
  page.appendChild(panel);
  refreshStatus(panel);
}

function schedule() {
  window.requestAnimationFrame(() => setTimeout(mount, 120));
}

window.addEventListener('hashchange', schedule);
window.addEventListener('popstate', schedule);
window.addEventListener('DOMContentLoaded', schedule);
window.addEventListener('load', schedule);
setInterval(schedule, 1500);
schedule();
