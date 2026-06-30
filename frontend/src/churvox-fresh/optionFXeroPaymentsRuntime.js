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
    #${PANEL_ID}{display:grid;gap:14px;border-radius:22px;padding:18px;background:linear-gradient(135deg,#111827,#1f2937 58%,#f97316);color:#fff;box-shadow:0 14px 34px rgba(15,23,42,.14);grid-column:1/-1;order:20;margin-top:10px}
    #${PANEL_ID} *{box-sizing:border-box}
    #${PANEL_ID} .cvPayTop{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:14px;align-items:stretch}
    #${PANEL_ID} .cvPayHero,#${PANEL_ID} .cvPaySetup,#${PANEL_ID} .cvPayCard,#${PANEL_ID} .cvPayFlow{border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(255,255,255,.09);padding:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
    #${PANEL_ID} .cvPayHero{display:grid;gap:9px;align-content:start}
    #${PANEL_ID} .cvPaySetup{display:grid;gap:10px;align-content:start;background:rgba(255,255,255,.13)}
    #${PANEL_ID} span.cvPayKicker{display:inline-flex;width:max-content;border-radius:999px;background:rgba(255,255,255,.14);padding:6px 10px;color:#fed7aa;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}
    #${PANEL_ID} h2{margin:0;font-size:26px;letter-spacing:-.04em;color:#fff!important}
    #${PANEL_ID} h3{margin:0;font-size:15px;color:#fff!important;letter-spacing:-.02em}
    #${PANEL_ID} p{margin:0;color:#f8fafc!important;font-weight:850;line-height:1.35}
    #${PANEL_ID} small{display:block;color:#fed7aa!important;font-weight:900;line-height:1.35}
    #${PANEL_ID} .cvPayStatus{border-radius:14px;background:rgba(255,255,255,.12);padding:10px 12px;color:#fff!important;font-size:13px;font-weight:900}
    #${PANEL_ID} .cvPayActions{display:flex;gap:8px;flex-wrap:wrap}
    #${PANEL_ID} button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;border:0;border-radius:999px;padding:10px 14px;background:#fff;color:#111827!important;text-decoration:none;font-weight:1000;box-shadow:0 12px 24px rgba(15,23,42,.16);cursor:pointer}
    #${PANEL_ID} button.cvPaySecondary{background:rgba(255,255,255,.12);color:#fff!important;border:1px solid rgba(255,255,255,.18);box-shadow:none}
    #${PANEL_ID} button:disabled{opacity:.7;cursor:wait}
    #${PANEL_ID} .cvPayGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    #${PANEL_ID} .cvPayCard{display:grid;gap:6px;min-height:118px;align-content:start}
    #${PANEL_ID} .cvPayCard b{display:block;color:#fff;font-size:13px;font-weight:1000}
    #${PANEL_ID} .cvPayCard em{display:inline-flex;width:max-content;border-radius:999px;padding:5px 8px;background:rgba(255,255,255,.12);color:#fed7aa;font-size:11px;font-style:normal;font-weight:950;text-transform:uppercase}
    #${PANEL_ID} .cvPayCard p{font-size:12px;color:#f8fafc!important}
    #${PANEL_ID} .cvPayFlow{display:grid;gap:8px;background:rgba(15,23,42,.18)}
    #${PANEL_ID} .cvPaySteps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    #${PANEL_ID} .cvPaySteps b{display:grid;gap:4px;border-radius:14px;background:rgba(255,255,255,.1);padding:10px;color:#fff;font-size:12px;font-weight:950;min-height:76px;align-content:start}
    #${PANEL_ID} .cvPaySteps i{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:999px;background:#fff;color:#111827;font-style:normal;font-weight:1000;font-size:11px}
    @media(max-width:980px){#${PANEL_ID} .cvPayTop,#${PANEL_ID} .cvPayGrid,#${PANEL_ID} .cvPaySteps{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function authHeaders() {
  const token = window.localStorage?.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, { credentials: 'include', headers: authHeaders(), ...options });
  if (res.status === 404) throw new Error('Backend payment route is not live yet. Wait for the backend Render deploy, then refresh.');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Backend ${res.status}`);
  return data;
}

function setValue(panel, selector, text) {
  const node = panel.querySelector(selector);
  if (node) node.textContent = text;
}

async function refreshStatus(panel) {
  const status = panel.querySelector('.cvPayStatus');
  if (!status) return;
  try {
    const data = await api('/payments/on-site/status');
    const connected = Boolean(data.connected);
    const configured = Boolean(data.stripe_configured);
    const allowed = Boolean(data.enabled_for_plan);
    setValue(panel, '.cvPayPlanValue', allowed ? 'Operator / Command ready' : 'Locked to Operator / Command');
    setValue(panel, '.cvPayStripeValue', connected ? 'Connected' : configured ? 'Key saved, onboarding needed' : 'Stripe key missing');
    setValue(panel, '.cvPayWorkerValue', connected ? 'Workers can collect after job price is set' : 'Workers stay locked until owner connects');
    setValue(panel, '.cvPayAccountValue', connected ? 'Business account connected' : 'Owner bank setup required');
    if (!allowed) status.textContent = 'Locked: on-site payments require Operator or Command.';
    else if (!configured) status.textContent = 'Render backend needs STRIPE_SECRET_KEY.';
    else if (connected) status.textContent = 'Stripe connected. Workers can collect approved card payments for priced jobs.';
    else status.textContent = 'Ready: owner can connect Stripe here. Workers collect only after setup.';
  } catch (error) {
    status.textContent = error?.message || 'Payment status unavailable.';
    setValue(panel, '.cvPayStripeValue', 'Backend route not ready');
    setValue(panel, '.cvPayWorkerValue', 'Waiting for backend');
    setValue(panel, '.cvPayAccountValue', 'Not connected');
  }
}

async function openStripe(panel) {
  const status = panel.querySelector('.cvPayStatus');
  const button = panel.querySelector('.cvPayButton');
  if (button) {
    button.disabled = true;
    button.textContent = 'Opening Stripe...';
  }
  if (status) status.textContent = 'Requesting secure Stripe onboarding link...';
  try {
    const data = await api('/payments/on-site/setup-link', { method: 'POST', body: '{}' });
    if (!data.url) throw new Error('Stripe did not return an onboarding link.');
    window.location.assign(data.url);
  } catch (error) {
    if (status) status.textContent = error?.message || 'Could not open Stripe onboarding.';
    if (button) {
      button.disabled = false;
      button.textContent = 'Connect Stripe payments';
    }
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
    <div class="cvPayTop">
      <div class="cvPayHero">
        <span class="cvPayKicker">Payments + Xero</span>
        <h2>On-site card payments</h2>
        <p>Customer pays the business on site. Xero stays clean: draft invoice sync only, owner-approved, no tax filing and no payout files.</p>
        <small>Workers collect only. The owner controls Stripe, bank setup and payout details.</small>
      </div>
      <div class="cvPaySetup">
        <h3>Owner setup</h3>
        <p class="cvPayStatus">Checking payment status...</p>
        <div class="cvPayActions">
          <button class="cvPayButton" type="button">Connect Stripe payments</button>
          <button class="cvPaySecondary cvPayRefresh" type="button">Refresh status</button>
        </div>
      </div>
    </div>
    <div class="cvPayGrid">
      <div class="cvPayCard"><em>Plan</em><b class="cvPayPlanValue">Checking</b><p>Available only on Operator and Command so money features stay premium.</p></div>
      <div class="cvPayCard"><em>Stripe</em><b class="cvPayStripeValue">Checking</b><p>Owner connects the payment account. Churvox never stores card numbers.</p></div>
      <div class="cvPayCard"><em>Worker app</em><b class="cvPayWorkerValue">Checking</b><p>Worker can collect payment only for priced jobs after owner setup.</p></div>
    </div>
    <div class="cvPayFlow">
      <h3>Payment flow</h3>
      <div class="cvPaySteps">
        <b><i>1</i>Owner connects Stripe</b>
        <b><i>2</i>Job or invoice has a price</b>
        <b><i>3</i>Worker collects customer card</b>
        <b><i>4</i>Business receives funds</b>
      </div>
    </div>
    <div class="cvPayGrid">
      <div class="cvPayCard"><em>Xero rule</em><b>Draft sync only</b><p>Accounting sync remains owner-approved. Nothing gets sent automatically.</p></div>
      <div class="cvPayCard"><em>Bank control</em><b class="cvPayAccountValue">Checking</b><p>Workers cannot edit payout bank details or business payment setup.</p></div>
      <div class="cvPayCard"><em>Command</em><b>Approval desk stays owner-only</b><p>Risky money or invoice decisions stay in Command for approve, edit or park.</p></div>
    </div>
  `;
  page.appendChild(panel);
  panel.querySelector('.cvPayButton')?.addEventListener('click', () => openStripe(panel));
  panel.querySelector('.cvPayRefresh')?.addEventListener('click', () => refreshStatus(panel));
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
