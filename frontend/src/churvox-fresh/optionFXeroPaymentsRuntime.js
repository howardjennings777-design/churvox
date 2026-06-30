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
    #${PANEL_ID}{display:grid;gap:12px;border-radius:20px;padding:16px;background:linear-gradient(135deg,#111827,#1f2937 58%,#f97316);color:#fff;box-shadow:0 14px 34px rgba(15,23,42,.14);min-height:150px;align-content:start;grid-column:1/-1;order:20;margin-top:10px}
    #${PANEL_ID} *{box-sizing:border-box}
    #${PANEL_ID} span{display:inline-flex;width:max-content;border-radius:999px;background:rgba(255,255,255,.14);padding:6px 10px;color:#fed7aa;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}
    #${PANEL_ID} h2{margin:0;font-size:22px;letter-spacing:-.03em;color:#fff!important}
    #${PANEL_ID} p{margin:0;color:#f8fafc!important;font-weight:850;line-height:1.35}
    #${PANEL_ID} .cvPayStatus{border-radius:14px;background:rgba(255,255,255,.12);padding:10px 12px;color:#fff!important;font-size:13px;font-weight:900}
    #${PANEL_ID} a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;border-radius:999px;padding:10px 14px;background:#fff;color:#111827!important;text-decoration:none;font-weight:1000;box-shadow:0 12px 24px rgba(15,23,42,.16)}
    #${PANEL_ID} .cvPayRules{display:grid;gap:6px;margin-top:2px;grid-template-columns:repeat(3,minmax(0,1fr))}
    #${PANEL_ID} .cvPayRules b{display:block;border-radius:12px;background:rgba(255,255,255,.1);padding:8px 10px;color:#fff;font-size:12px;font-weight:900}
    @media(max-width:860px){#${PANEL_ID} .cvPayRules{grid-template-columns:1fr}}
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

function targetPage() {
  const pages = Array.from(document.querySelectorAll('.workspace .cocPage'));
  return pages.find((page) => page.offsetParent !== null) || pages[0] || null;
}

function mount() {
  ensureStyle();
  const existing = document.getElementById(PANEL_ID);
  if (!isXeroPage()) {
    if (existing) existing.remove();
    return;
  }

  const page = targetPage();
  if (!page) {
    if (existing && !existing.closest('.workspace .cocPage')) existing.remove();
    return;
  }

  if (existing && existing.parentElement !== page) existing.remove();
  if (document.getElementById(PANEL_ID)) return;

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
  window.requestAnimationFrame(() => setTimeout(mount, 180));
}

window.addEventListener('hashchange', schedule);
window.addEventListener('popstate', schedule);
window.addEventListener('DOMContentLoaded', schedule);
window.addEventListener('load', schedule);
setInterval(schedule, 1500);
schedule();
