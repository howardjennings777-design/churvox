// CHURVOX_STRIPE_CHECKOUT_RUNTIME_20260629
// Turns public and OS plan buttons into a real checkout attempt with a clean billing-request fallback.

import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-stripe-checkout-style';
const MODAL_ID = 'churvox-stripe-checkout-modal';
const TOAST_ID = 'churvox-stripe-checkout-toast';
const BILLING_STORE = 'churvox:billing-intents';
const COUNTRY_STORE = 'churvox:billing-country';
const GST_RATE = 1.15;

const PLANS = {
  Start: { key: 'start', price: 39, type: 'plan', includes: ['Jobs, clients, quotes and invoices', 'Today view', 'Basic records'] },
  Crew: { key: 'crew', price: 89, type: 'plan', includes: ['Everything in Start', 'Worker app records', 'Timesheet review'] },
  Operator: { key: 'operator', price: 149, type: 'plan', popular: true, includes: ['Everything in Crew', 'Churvox prepares admin', 'Drafted quotes, invoices and replies'] },
  Command: { key: 'command', price: 299, type: 'plan', includes: ['Full approval OS', 'Command approval desk', 'Accounting sync option'] },
  'Command Growth Pack': { key: 'command_growth_pack', price: 99, type: 'addon', includes: ['50 active team members', 'Extra operating capacity'] },
  'Accounting Sync Add-on': { key: 'accounting_sync_addon', price: 39, type: 'addon', includes: ['For non-Command tiers', 'Draft accounting sync only'] },
};

const COUNTRIES = {
  NZ: { label: 'New Zealand', currency: 'NZD', symbol: '$', tax: '+ GST', taxName: 'GST' },
  AU: { label: 'Australia', currency: 'AUD', symbol: 'A$', tax: '+ GST', taxName: 'GST' },
  US: { label: 'United States', currency: 'USD', symbol: 'US$', tax: '', taxName: 'tax' },
  UK: { label: 'United Kingdom', currency: 'GBP', symbol: '£', tax: '+ VAT', taxName: 'VAT' },
};

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function esc(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function dollars(value) { return `$${Number(value || 0).toFixed(2).replace(/\.00$/, '')}`; }
function incGst(value) { return dollars(Number(value || 0) * GST_RATE); }
function now() { return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }); }

function normalizeCountry(value) {
  const raw = clean(value).toUpperCase();
  const aliases = { NZ: 'NZ', NZL: 'NZ', 'NEW ZEALAND': 'NZ', AU: 'AU', AUS: 'AU', AUSTRALIA: 'AU', US: 'US', USA: 'US', 'UNITED STATES': 'US', UK: 'UK', GB: 'UK', GBR: 'UK', 'UNITED KINGDOM': 'UK' };
  return aliases[raw] || 'NZ';
}

function detectCountry() {
  try { const param = new URLSearchParams(window.location.search).get('country'); if (param) return normalizeCountry(param); } catch (_) {}
  try { const saved = localStorage.getItem(COUNTRY_STORE); if (saved) return normalizeCountry(saved); } catch (_) {}
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/auckland|chatham/i.test(tz)) return 'NZ';
    if (/sydney|melbourne|brisbane|perth|adelaide|hobart|darwin/i.test(tz)) return 'AU';
    if (/london|belfast|guernsey|jersey|isle_of_man/i.test(tz)) return 'UK';
    if (/america\//i.test(tz)) return 'US';
  } catch (_) {}
  return 'NZ';
}

function setCountry(value) {
  const country = normalizeCountry(value);
  try { localStorage.setItem(COUNTRY_STORE, country); } catch (_) {}
  return country;
}

function apiUrl(path) {
  return `${API_BASE || ''}/api${path}`;
}

function readIntents() {
  try { return JSON.parse(localStorage.getItem(BILLING_STORE) || '[]'); } catch (_) { return []; }
}

function saveIntent(intent) {
  const rows = [{ id: `billing-${Date.now()}`, at: now(), ...intent }, ...readIntents()].slice(0, 50);
  localStorage.setItem(BILLING_STORE, JSON.stringify(rows));
  return rows[0];
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;right:18px;bottom:24px;z-index:1000010;max-width:390px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${TOAST_ID}.show{opacity:1;transform:translateY(0)}#${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.72);font-weight:800}
    #${MODAL_ID}{position:fixed;inset:0;z-index:1000009;display:grid;place-items:center;padding:20px;background:rgba(16,21,19,.44);backdrop-filter:blur(5px)}#${MODAL_ID}[hidden]{display:none}#${MODAL_ID} .billingModal{width:min(760px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.32)}#${MODAL_ID} header{display:flex;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}#${MODAL_ID} h2{margin:0;font-size:30px;line-height:1.05}#${MODAL_ID} p{margin:7px 0 0;color:#52605a;font-size:13px;font-weight:850}#${MODAL_ID} button{border:0;border-radius:999px;padding:10px 14px;background:#101513;color:#fff;font-weight:950;cursor:pointer}#${MODAL_ID} form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px 22px}#${MODAL_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase}#${MODAL_ID} input,#${MODAL_ID} select{min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif}#${MODAL_ID} .billingSummary{grid-column:1/-1;display:grid;gap:8px;border-radius:14px;padding:13px;background:#f8faf9;color:#111815;font-size:13px;font-weight:850}#${MODAL_ID} .billingSummary b{font-size:18px}.billingActions{grid-column:1/-1;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px solid rgba(16,21,19,.08)}.billingActions .primary{background:#ea580c}.billingActions .quiet{background:#eef2ed;color:#111815}
    .stripeCheckoutButton,.publicPlanGrid [data-stripe-plan],#option-f-plans-pricing-desk [data-stripe-plan]{cursor:pointer}.churvoxStripeStatus{display:grid;gap:4px;margin-top:8px;border-radius:12px;padding:9px 10px;background:#eef7ff;color:#075985;font-size:12px;font-weight:900}.churvoxStripeStatus.error{background:#fff1f2;color:#991b1b}.churvoxStripeStatus.ready{background:#eefbf2;color:#166534}
    @media(max-width:720px){#${MODAL_ID} form{grid-template-columns:1fr}#${TOAST_ID}{left:10px;right:10px;bottom:12px;max-width:none}}
  `;
  document.head.appendChild(style);
}

function toast(title, detail = '') {
  ensureStyle();
  let node = document.getElementById(TOAST_ID);
  if (!node) { node = document.createElement('div'); node.id = TOAST_ID; document.body.appendChild(node); }
  node.innerHTML = `<b>${esc(title)}</b>${detail ? `<small>${esc(detail)}</small>` : ''}`;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 3200);
}

function modal() {
  ensureStyle();
  let node = document.getElementById(MODAL_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = MODAL_ID;
    node.hidden = true;
    document.body.appendChild(node);
    node.addEventListener('click', (event) => { if (event.target.id === MODAL_ID || event.target.closest('[data-billing-close]')) closeModal(); });
    node.addEventListener('submit', submitBillingForm);
  }
  return node;
}

function closeModal() {
  const node = document.getElementById(MODAL_ID);
  if (node) node.hidden = true;
}

function openBillingModal(planName, action = 'start_trial') {
  const plan = PLANS[planName];
  if (!plan) return;
  const country = detectCountry();
  const meta = COUNTRIES[country] || COUNTRIES.NZ;
  const node = modal();
  node.innerHTML = `
    <section class="billingModal" role="dialog" aria-modal="true" aria-label="${esc(planName)} checkout">
      <header><div><h2>${esc(planName)} checkout</h2><p>Churvox will open Stripe checkout for this plan. If checkout is not configured yet, this saves a billing request.</p></div><button type="button" data-billing-close>Close</button></header>
      <form data-plan-name="${esc(planName)}" data-billing-action="${esc(action)}">
        <div class="billingSummary"><b>${esc(planName)} ${esc(meta.symbol)}${esc(plan.price)}/month ${esc(meta.tax)}</b><span>Actual NZ/AU GST-inclusive cost shown for GST regions: ${esc(incGst(plan.price))}/month inc GST.</span><span>${plan.includes.map(esc).join(' | ')}</span></div>
        <label><span>Country</span><select name="country">${Object.entries(COUNTRIES).map(([code, item]) => `<option value="${code}" ${code === country ? 'selected' : ''}>${esc(item.label)} - ${esc(item.currency)}</option>`).join('')}</select></label>
        <label><span>Email</span><input name="email" type="email" autocomplete="email" placeholder="owner email" value="${esc(localStorage.getItem('churvox:billing-email') || '')}" /></label>
        <div class="billingActions"><button type="button" class="quiet" data-billing-close>Cancel</button><button type="submit" class="primary">Continue to Stripe</button></div>
      </form>
    </section>`;
  node.hidden = false;
  node.querySelector('input,select')?.focus();
}

async function submitBillingForm(event) {
  event.preventDefault();
  const form = event.target;
  const planName = form.dataset.planName;
  const formData = Object.fromEntries(new FormData(form).entries());
  if (formData.email) localStorage.setItem('churvox:billing-email', formData.email);
  closeModal();
  await startCheckout(planName, form.dataset.billingAction || 'start_trial', formData.country, formData.email);
}

function checkoutPayload(planName, action, country, email = '') {
  const plan = PLANS[planName];
  return {
    plan: plan.key,
    plan_name: planName,
    action,
    country: setCountry(country || detectCountry()),
    currency: (COUNTRIES[normalizeCountry(country || detectCountry())] || COUNTRIES.NZ).currency,
    email,
    billing_interval: 'monthly',
    success_url: `${window.location.origin}/dashboard#plans?checkout=success&plan=${encodeURIComponent(plan.key)}`,
    cancel_url: `${window.location.origin}/plans?checkout=cancelled&plan=${encodeURIComponent(plan.key)}`,
  };
}

async function callCheckoutEndpoint(payload) {
  const endpoints = ['/billing/checkout', '/stripe/checkout', '/checkout/session', '/create-checkout-session'];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
      const url = body?.url || body?.checkout_url || body?.session_url || body?.data?.url;
      if (!url) throw new Error('Checkout URL missing');
      return url;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Checkout endpoint not configured');
}

async function startCheckout(planName, action = 'start_trial', country = detectCountry(), email = '') {
  const plan = PLANS[planName];
  if (!plan) return;
  const payload = checkoutPayload(planName, action, country, email);
  const intent = saveIntent({ ...payload, status: 'checkout_started', price: plan.price, inc_gst: incGst(plan.price) });
  toast('Opening Stripe checkout', `${planName} ${dollars(plan.price)}/month + GST.`);
  markStatus(planName, 'Opening Stripe checkout...', 'ready');
  try {
    const url = await callCheckoutEndpoint(payload);
    saveIntent({ ...intent, status: 'redirected_to_stripe', checkout_url: url });
    window.location.assign(url);
  } catch (error) {
    saveIntent({ ...intent, status: 'billing_request_saved', error: error.message || 'Checkout not configured' });
    markStatus(planName, 'Checkout endpoint not configured yet. Billing request saved.', 'error');
    openBillingFallback(planName, payload, error.message || 'Checkout endpoint not configured');
  }
}

function openBillingFallback(planName, payload, reason) {
  const plan = PLANS[planName];
  const node = modal();
  node.innerHTML = `
    <section class="billingModal" role="dialog" aria-modal="true" aria-label="Billing request saved">
      <header><div><h2>Billing request saved</h2><p>Stripe checkout did not return a checkout URL. The plan request has been saved so the owner is not stuck.</p></div><button type="button" data-billing-close>Close</button></header>
      <form><div class="billingSummary"><b>${esc(planName)} ${esc(dollars(plan.price))}/month + GST</b><span>${esc(reason)}</span><span>Saved request: ${esc(payload.email || 'no email entered')} | ${esc(payload.country)} | ${esc(payload.action)}</span></div><div class="billingActions"><button type="button" class="primary" data-billing-close>Done</button></div></form>
    </section>`;
  node.hidden = false;
  toast('Billing request saved', 'Backend checkout route still needs Stripe keys/endpoints.');
}

function markStatus(planName, message, tone = '') {
  const cards = findPlanCards(planName);
  cards.forEach((card) => {
    let status = card.querySelector('.churvoxStripeStatus');
    if (!status) { status = document.createElement('div'); status.className = 'churvoxStripeStatus'; card.appendChild(status); }
    status.className = `churvoxStripeStatus ${tone}`.trim();
    status.textContent = message;
  });
}

function findPlanCards(planName) {
  const selectors = ['.publicPlanGrid article', '#option-f-plans-pricing-desk .ofPlanCard', '#option-f-plans-pricing-desk .ofAddonCard'];
  return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).filter((card) => lower(card.querySelector('h2,h3,b')?.textContent || card.textContent).includes(lower(planName)));
}

function buttonHtml(planName, label = 'Start trial') {
  return `<button type="button" class="stripeCheckoutButton publicPrimary" data-stripe-plan="${esc(planName)}" data-stripe-action="${label.toLowerCase().includes('add') ? 'add_on' : 'start_trial'}">${esc(label)}</button>`;
}

function enhancePublicPlans() {
  document.querySelectorAll('.publicPlanGrid article').forEach((card) => {
    const name = clean(card.querySelector('h3')?.textContent || card.querySelector('h2')?.textContent);
    if (!PLANS[name] || card.dataset.stripeReady === '1') return;
    card.dataset.stripeReady = '1';
    const old = card.querySelector('a.publicPrimary,button.publicPrimary');
    if (old) {
      old.setAttribute('data-stripe-plan', name);
      old.setAttribute('data-stripe-action', 'start_trial');
      old.setAttribute('href', '#checkout');
      old.textContent = name === 'Command' ? 'Start Command' : name === 'Operator' ? 'Start Operator trial' : 'Start trial';
    } else {
      card.insertAdjacentHTML('beforeend', buttonHtml(name, name === 'Command' ? 'Start Command' : 'Start trial'));
    }
  });
  document.querySelectorAll('.publicAddOnGrid article').forEach((card) => {
    const name = Object.keys(PLANS).find((planName) => lower(card.textContent).includes(lower(planName)));
    if (!name || card.dataset.stripeReady === '1') return;
    card.dataset.stripeReady = '1';
    card.insertAdjacentHTML('beforeend', buttonHtml(name, 'Add to plan'));
  });
}

function enhanceDashboardPlans() {
  document.querySelectorAll('#option-f-plans-pricing-desk .ofPlanCard').forEach((card) => {
    const name = clean(card.querySelector('h3')?.textContent);
    if (!PLANS[name] || card.dataset.stripeReady === '1') return;
    card.dataset.stripeReady = '1';
    card.querySelectorAll('button').forEach((button) => {
      if (/start|choose/i.test(button.textContent)) {
        button.dataset.stripePlan = name;
        button.dataset.stripeAction = /choose/i.test(button.textContent) ? 'choose_plan' : 'start_trial';
      }
    });
  });
  document.querySelectorAll('#option-f-plans-pricing-desk .ofAddonCard').forEach((card) => {
    const name = clean(card.querySelector('h3')?.textContent);
    if (!PLANS[name] || card.dataset.stripeReady === '1') return;
    card.dataset.stripeReady = '1';
    card.querySelectorAll('button').forEach((button) => {
      if (/add/i.test(button.textContent)) {
        button.dataset.stripePlan = name;
        button.dataset.stripeAction = 'add_on';
      }
    });
  });
}

function renderSuccessNotice() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('checkout') === 'success') toast('Checkout complete', 'Plan checkout returned successfully.');
    if (params.get('checkout') === 'cancelled') toast('Checkout cancelled', 'No plan was changed.');
  } catch (_) {}
}

function enhance() {
  ensureStyle();
  enhancePublicPlans();
  enhanceDashboardPlans();
}

function clickHandler(event) {
  const button = event.target.closest('[data-stripe-plan]');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  openBillingModal(button.dataset.stripePlan, button.dataset.stripeAction || 'start_trial');
}

if (typeof window !== 'undefined' && !window.__CHURVOX_STRIPE_CHECKOUT_RUNTIME__) {
  window.__CHURVOX_STRIPE_CHECKOUT_RUNTIME__ = true;
  window.addEventListener('load', () => { enhance(); renderSuccessNotice(); });
  window.addEventListener('hashchange', () => setTimeout(enhance, 100));
  window.addEventListener('popstate', () => setTimeout(enhance, 100));
  document.addEventListener('click', clickHandler, true);
  document.addEventListener('click', () => setTimeout(enhance, 140));
  const observer = new MutationObserver(() => enhance());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
