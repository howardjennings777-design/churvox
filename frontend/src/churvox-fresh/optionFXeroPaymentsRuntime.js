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
    #${PANEL_ID}{display:grid!important;gap:14px!important;border:1px solid rgba(17,24,39,.08)!important;border-radius:24px!important;padding:16px!important;background:#f8f5ef!important;color:#111827!important;box-shadow:0 14px 34px rgba(15,23,42,.12)!important;grid-column:1/-1!important;order:20!important;margin-top:10px!important;overflow:hidden!important}
    #${PANEL_ID} *{box-sizing:border-box!important}
    #${PANEL_ID} .cvPayTop{display:grid!important;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr)!important;gap:14px!important;align-items:stretch!important}
    #${PANEL_ID} .cvPayHero{display:grid!important;gap:10px!important;align-content:start!important;min-height:190px!important;border-radius:20px!important;padding:18px!important;background:linear-gradient(135deg,#111827,#1f2937 58%,#f97316)!important;color:#fff!important;box-shadow:0 16px 34px rgba(17,24,39,.18)!important;position:relative!important;overflow:hidden!important}
    #${PANEL_ID} .cvPayHero:after{content:""!important;position:absolute!important;right:-60px!important;top:-70px!important;width:190px!important;height:190px!important;border:26px solid rgba(249,115,22,.28)!important;border-radius:999px!important}
    #${PANEL_ID} .cvPaySetup{display:grid!important;gap:11px!important;align-content:start!important;border:1px solid rgba(17,24,39,.1)!important;border-radius:20px!important;background:#fff!important;padding:16px!important;color:#111827!important;box-shadow:0 14px 30px rgba(15,23,42,.08)!important}
    #${PANEL_ID} span.cvPayKicker{display:inline-flex!important;width:max-content!important;border-radius:999px!important;background:rgba(255,255,255,.14)!important;padding:6px 10px!important;color:#fed7aa!important;font-size:11px!important;font-weight:950!important;text-transform:uppercase!important;letter-spacing:.08em!important;position:relative!important;z-index:1!important}
    #${PANEL_ID} h2{margin:0!important;font-size:28px!important;letter-spacing:-.04em!important;color:#fff!important;position:relative!important;z-index:1!important}
    #${PANEL_ID} h3{margin:0!important;font-size:16px!important;color:#111827!important;letter-spacing:-.02em!important}
    #${PANEL_ID} .cvPayHero p{margin:0!important;color:#fff!important;font-weight:900!important;line-height:1.35!important;position:relative!important;z-index:1!important}
    #${PANEL_ID} .cvPayHero small{display:block!important;color:#fed7aa!important;font-weight:950!important;line-height:1.35!important;position:relative!important;z-index:1!important}
    #${PANEL_ID} .cvPaySetup p,#${PANEL_ID} .cvPayCard p,#${PANEL_ID} .cvPayFlow p{margin:0!important;color:#374151!important;font-weight:850!important;line-height:1.35!important}
    #${PANEL_ID} .cvPayStatus{border-radius:14px!important;background:#fff7ed!important;border:1px solid rgba(249,115,22,.22)!important;padding:11px 12px!important;color:#9a3412!important;font-size:13px!important;font-weight:950!important;min-height:46px!important}
    #${PANEL_ID} .cvPayActions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}
    #${PANEL_ID} button{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:44px!important;width:100%!important;border:0!important;border-radius:999px!important;padding:10px 14px!important;background:#111827!important;color:#fff!important;text-decoration:none!important;font-weight:1000!important;box-shadow:0 12px 24px rgba(15,23,42,.16)!important;cursor:pointer!important;white-space:nowrap!important}
    #${PANEL_ID} button.cvPaySecondary{background:#f3f4f6!important;color:#111827!important;border:1px solid rgba(17,24,39,.1)!important;box-shadow:none!important}
    #${PANEL_ID} button:disabled{opacity:.7!important;cursor:wait!important}
    #${PANEL_ID} .cvPayGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
    #${PANEL_ID} .cvPayCard{display:grid!important;gap:7px!important;min-height:122px!important;align-content:start!important;border:1px solid rgba(17,24,39,.09)!important;border-radius:18px!important;background:#fff!important;padding:14px!important;color:#111827!important;box-shadow:0 10px 22px rgba(15,23,42,.05)!important}
    #${PANEL_ID} .cvPayCard b{display:block!important;color:#111827!important;font-size:14px!important;font-weight:1000!important;line-height:1.25!important}
    #${PANEL_ID} .cvPayCard em{display:inline-flex!important;width:max-content!important;border-radius:999px!important;padding:5px 8px!important;background:#fff7ed!important;color:#c2410c!important;font-size:11px!important;font-style:normal!important;font-weight:950!important;text-transform:uppercase!important}
    #${PANEL_ID} .cvPayFlow{display:grid!important;gap:10px!important;border:1px solid rgba(17,24,39,.09)!important;border-radius:18px!important;background:#111827!important;padding:14px!important;color:#fff!important;box-shadow:0 10px 24px rgba(17,24,39,.12)!important}
    #${PANEL_ID} .cvPayFlow h3{color:#fff!important}
    #${PANEL_ID} .cvPaySteps{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
    #${PANEL_ID} .cvPaySteps b{display:grid!important;gap:6px!important;border-radius:14px!important;background:rgba(255,255,255,.1)!important;padding:10px!important;color:#fff!important;font-size:12px!important;font-weight:950!important;min-height:78px!important;align-content:start!important;line-height:1.25!important}
    #${PANEL_ID} .cvPaySteps i{display:inline-grid!important;place-items:center!important;width:24px!important;height:24px!important;border-radius:999px!important;background:#fff!important;color:#111827!important;font-style:normal!important;font-weight:1000!important;font-size:11px!important}
    @media(max-width:980px){#${PANEL_ID} .cvPayTop,#${PANEL_ID} .cvPayGrid,#${PANEL_ID} .cvPaySteps{grid-template-columns:1fr!important}#${PANEL_ID} .cvPayActions{grid-template-columns:1fr!important}}
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
