// CHURVOX_STRIPE_CHECKOUT_LIVE_RUNTIME_20260712_PAID_LAUNCH_SAFE
// Public pricing must go Signup -> Plans -> Stripe. Logged-in plan surfaces can open Stripe Checkout.

import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-stripe-live-style';
const MODAL_ID = 'churvox-stripe-live-modal';
const TOAST_ID = 'churvox-stripe-live-toast';
const COUNTRY_STORE = 'churvox:billing-country';
const EMAIL_STORE = 'churvox:billing-email';
const PLAN_STORE = 'churvox:billing-plan';
const GST_RATE = 1.15;

const PLANS = {
  Start: { displayKey: 'start', stripeKey: 'solo', price: 39, type: 'plan', actionLabel: 'Start trial', includes: ['Jobs, clients, quotes and invoices', 'Today view', 'Client and job records'] },
  Crew: { displayKey: 'crew', stripeKey: 'team', price: 89, type: 'plan', actionLabel: 'Start trial', includes: ['Everything in Start', 'Worker app records', 'Team and timesheet review'] },
  Operator: { displayKey: 'operator', stripeKey: 'pro', price: 149, type: 'plan', actionLabel: 'Start Operator trial', includes: ['Everything in Crew', 'Churvox prepares admin', 'Command review queue'] },
  Command: { displayKey: 'command', stripeKey: 'enterprise', price: 299, type: 'plan', actionLabel: 'Start Command', includes: ['Full approval OS', 'Command approval desk', 'Accounting sync option'] },
  'Command Growth Pack': { displayKey: 'command_growth_pack', stripeKey: 'enterprise', addonKey: 'command_growth_pack', price: 99, type: 'addon', actionLabel: 'Add growth pack', includes: ['Adds 50 active team members', 'Extra operating capacity'] },
  'Accounting Sync Add-on': { displayKey: 'accounting_sync_addon', stripeKey: 'team', addonKey: 'xero_addon', price: 39, type: 'addon', actionLabel: 'Add accounting sync', includes: ['For non-Command tiers', 'Draft sync only'] },
};

const COUNTRIES = {
  NZ: { label: 'New Zealand', currency: 'NZD', symbol: '$', tax: '+ GST' },
  AU: { label: 'Australia', currency: 'AUD', symbol: 'A$', tax: '+ GST' },
  US: { label: 'United States', currency: 'USD', symbol: 'US$', tax: '' },
  UK: { label: 'United Kingdom', currency: 'GBP', symbol: 'GBP ', tax: '+ VAT' },
};

const PUBLIC_PLAN_SELECTORS = ['.cp26PlanGrid article', '.publicPlanGrid article'];
const APP_PLAN_SELECTORS = ['#option-f-plans-pricing-desk .ofPlanCard', '#option-f-plans-pricing-desk .ofAddonCard', '.planList > div', '.plan-card', '[data-plan-card]:not(.cp26PlanCard)'];

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function esc(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function money(value) { return `$${Number(value || 0).toFixed(2).replace(/\.00$/, '')}`; }
function incGst(value) { return money(Number(value || 0) * GST_RATE); }

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
  const base = String(API_BASE || '').replace(/\/$/, '');
  return `${base}/api${path}`;
}

function currentPath() { return window.location.pathname || ''; }
function isPublicMarketingPath() {
  const path = currentPath();
  return path === '/' || path === '/pricing' || path === '/product' || path === '/features' || path === '/demo' || path === '/signup' || path === '/contact' || path.startsWith('/industries');
}
function isLoggedIn() {
  try { return Boolean(localStorage.getItem('token') || localStorage.getItem('authToken')); } catch (_) { return false; }
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;right:18px;bottom:24px;z-index:1000010;max-width:420px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${TOAST_ID}.show{opacity:1;transform:translateY(0)}#${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.72);font-weight:800}
    #${MODAL_ID}{position:fixed;inset:0;z-index:1000009;display:grid;place-items:center;padding:20px;background:rgba(16,21,19,.46);backdrop-filter:blur(5px)}#${MODAL_ID}[hidden]{display:none}#${MODAL_ID} .stripeLiveModal{width:min(780px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.32)}#${MODAL_ID} header{display:flex;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}#${MODAL_ID} h2{margin:0;font-size:30px;line-height:1.05}#${MODAL_ID} p{margin:7px 0 0;color:#52605a;font-size:13px;font-weight:850}#${MODAL_ID} button{border:0;border-radius:999px;padding:10px 14px;background:#101513;color:#fff;font-weight:950;cursor:pointer}#${MODAL_ID} form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px 22px}#${MODAL_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase}#${MODAL_ID} input,#${MODAL_ID} select{min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif}#${MODAL_ID} .checkoutSummary{grid-column:1/-1;display:grid;gap:8px;border-radius:14px;padding:13px;background:#f8faf9;color:#111815;font-size:13px;font-weight:850}#${MODAL_ID} .checkoutSummary b{font-size:18px}#${MODAL_ID} .checkoutSummary ul{margin:2px 0 0;padding-left:18px;color:#52605a}.checkoutActions{grid-column:1/-1;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px solid rgba(16,21,19,.08)}.checkoutActions .primary{background:#ea580c}.checkoutActions .quiet{background:#eef2ed;color:#111815}.churvoxStripeLiveButton{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;border:0;border-radius:999px;padding:10px 14px;background:#ea580c!important;color:#fff!important;font-weight:950;text-decoration:none;cursor:pointer}.churvoxStripeLiveStatus{display:grid;gap:4px;margin-top:8px;border-radius:12px;padding:9px 10px;background:#eef7ff;color:#075985;font-size:12px;font-weight:900}.churvoxStripeLiveStatus.error{background:#fff1f2;color:#991b1b}.churvoxStripeLiveStatus.ready{background:#eefbf2;color:#166534}
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
  node._timer = setTimeout(() => node.classList.remove('show'), 3600);
}

function modal() {
  ensureStyle();
  let node = document.getElementById(MODAL_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = MODAL_ID;
    node.hidden = true;
    document.body.appendChild(node);
    node.addEventListener('click', (event) => { if (event.target.id === MODAL_ID || event.target.closest('[data-stripe-close]')) closeModal(); });
    node.addEventListener('submit', submitCheckout);
  }
  return node;
}

function closeModal() { const node = document.getElementById(MODAL_ID); if (node) node.hidden = true; }
function planByName(planName) { return PLANS[clean(planName)] || null; }

function findPlanNameFromCard(card) {
  const datasetName = clean(card?.dataset?.planName || card?.getAttribute?.('data-plan-name') || '');
  if (PLANS[datasetName]) return datasetName;
  const text = clean(card?.querySelector('h2,h3,b,strong')?.textContent || card?.textContent || '');
  return Object.keys(PLANS).find((name) => lower(text).includes(lower(name))) || '';
}

function signupUrl(planName) {
  const plan = planByName(planName);
  const country = detectCountry();
  if (!plan) return `/signup?country=${encodeURIComponent(country)}`;
  return `/signup?country=${encodeURIComponent(country)}&plan=${encodeURIComponent(plan.displayKey)}`;
}

function rememberPlan(planName) {
  const plan = planByName(planName);
  if (!plan) return;
  try {
    localStorage.setItem(PLAN_STORE, plan.displayKey);
    localStorage.setItem(COUNTRY_STORE, detectCountry());
  } catch (_) {}
}

function openCheckout(planName, action = 'start_trial') {
  const plan = planByName(planName);
  if (!plan) return;
  if (!isLoggedIn()) {
    rememberPlan(planName);
    window.location.assign(signupUrl(planName));
    return;
  }
  const country = detectCountry();
  const countryMeta = COUNTRIES[country] || COUNTRIES.NZ;
  const node = modal();
  node.innerHTML = `
    <section class="stripeLiveModal" role="dialog" aria-modal="true" aria-label="${esc(planName)} Stripe checkout">
      <header><div><h2>${esc(planName)} checkout</h2><p>Churvox will send you to Stripe checkout. Price is locked at the published monthly price.</p></div><button type="button" data-stripe-close>Close</button></header>
      <form data-plan-name="${esc(planName)}" data-checkout-action="${esc(action)}">
        <div class="checkoutSummary"><b>${esc(countryMeta.symbol)}${esc(plan.price)}/month ${esc(countryMeta.tax)}</b><span>New Zealand GST-inclusive cost: ${esc(incGst(plan.price))}/month inc GST.</span><ul>${plan.includes.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div>
        <label><span>Billing country</span><select name="country">${Object.entries(COUNTRIES).map(([code, item]) => `<option value="${code}" ${code === country ? 'selected' : ''}>${esc(item.label)} - ${esc(item.currency)}</option>`).join('')}</select></label>
        <label><span>Owner email</span><input name="email" type="email" autocomplete="email" placeholder="owner email" value="${esc(localStorage.getItem(EMAIL_STORE) || '')}" /></label>
        <div class="checkoutActions"><button type="button" class="quiet" data-stripe-close>Cancel</button><button type="submit" class="primary">Continue to Stripe</button></div>
      </form>
    </section>`;
  node.hidden = false;
  node.querySelector('input,select')?.focus();
}

async function submitCheckout(event) {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form).entries());
  const planName = form.dataset.planName;
  const action = form.dataset.checkoutAction || 'start_trial';
  if (values.email) localStorage.setItem(EMAIL_STORE, values.email);
  closeModal();
  await startCheckout(planName, action, values.country, values.email);
}

function buildPayload(planName, action, countryValue, email) {
  const plan = planByName(planName);
  const country = setCountry(countryValue || detectCountry());
  const meta = COUNTRIES[country] || COUNTRIES.NZ;
  const isAddon = plan.type === 'addon';
  const displayKey = plan.displayKey;
  return { plan: plan.stripeKey, plan_key: displayKey, selected_plan: displayKey, tier: plan.stripeKey, addon: isAddon ? plan.addonKey : undefined, addon_key: isAddon ? plan.addonKey : undefined, item_type: plan.type, plan_name: planName, action, email: clean(email), country, billing_country: country, currency: meta.currency, billing_interval: 'monthly', interval: 'month', success_url: `${window.location.origin}/billing/success?plan=${encodeURIComponent(displayKey)}&country=${encodeURIComponent(country)}`, cancel_url: `${window.location.origin}/plans?checkout=cancelled&plan=${encodeURIComponent(displayKey)}`, metadata: { display_plan: displayKey, stripe_plan: plan.stripeKey, addon: isAddon ? plan.addonKey : '', source: 'churvox_plans_page' } };
}

function checkoutEndpoints(plan) {
  if (plan.type === 'addon') return ['/billing/addon/checkout', '/stripe/addon/checkout', '/billing/create-checkout-session', '/stripe/create-checkout-session'];
  return ['/billing/create-checkout-session', '/stripe/create-checkout-session', '/billing/checkout', '/stripe/checkout'];
}

async function callCheckout(payload, plan) {
  let lastError = null;
  for (const endpoint of checkoutEndpoints(plan)) {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const response = await fetch(apiUrl(endpoint), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
      const url = body?.url || body?.checkout_url || body?.session_url || body?.checkoutSession?.url || body?.data?.url;
      if (!url) throw new Error('Stripe checkout URL missing');
      return url;
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('Stripe checkout route not configured');
}

async function startCheckout(planName, action, country, email) {
  const plan = planByName(planName);
  if (!plan) return;
  if (!isLoggedIn()) {
    rememberPlan(planName);
    window.location.assign(signupUrl(planName));
    return;
  }
  const payload = buildPayload(planName, action, country, email);
  markStatus(planName, 'Opening Stripe checkout...', 'ready');
  toast('Opening Stripe checkout', `${planName} ${money(plan.price)}/month + GST.`);
  try { window.location.assign(await callCheckout(payload, plan)); }
  catch (error) { const message = error?.message || 'Stripe checkout is not configured yet'; markStatus(planName, message, 'error'); showCheckoutError(planName, plan, message); }
}

function showCheckoutError(planName, plan, message) {
  const node = modal();
  node.innerHTML = `<section class="stripeLiveModal" role="dialog" aria-modal="true" aria-label="Stripe checkout configuration needed"><header><div><h2>Stripe checkout needs config</h2><p>The page is wired. The backend did not return a Stripe checkout URL.</p></div><button type="button" data-stripe-close>Close</button></header><form><div class="checkoutSummary"><b>${esc(planName)} ${esc(money(plan.price))}/month + GST</b><span>${esc(message)}</span><span>Check Stripe route and Render env vars on the backend.</span></div><div class="checkoutActions"><button type="button" class="primary" data-stripe-close>Done</button></div></form></section>`;
  node.hidden = false;
  toast('Stripe checkout blocked', message);
}

function findCards(planName) {
  return [...PUBLIC_PLAN_SELECTORS, ...APP_PLAN_SELECTORS]
    .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
    .filter((card) => !card.closest('.cvReleasePlansRoot'))
    .filter((card) => lower(card.textContent).includes(lower(planName)) || lower(card.dataset?.planName).includes(lower(planName)));
}

function markStatus(planName, message, tone = '') {
  findCards(planName).forEach((card) => {
    let status = card.querySelector('.churvoxStripeLiveStatus');
    if (!status) { status = document.createElement('div'); status.className = 'churvoxStripeLiveStatus'; card.appendChild(status); }
    status.className = `churvoxStripeLiveStatus ${tone}`.trim();
    status.textContent = message;
  });
}

function wirePublicCard(card, planName) {
  const plan = planByName(planName);
  if (!plan || card.dataset.signupReady === '1') return;
  card.dataset.signupReady = '1';
  const url = signupUrl(planName);
  const existing = Array.from(card.querySelectorAll('a,button')).find((node) => /trial|start|choose|plan/i.test(node.textContent || ''));
  if (existing) {
    existing.setAttribute('data-churvox-signup-plan', planName);
    existing.setAttribute('href', url);
    existing.textContent = plan.actionLabel;
    return;
  }
  const anchor = document.createElement('a');
  anchor.className = 'churvoxStripeLiveButton';
  anchor.href = url;
  anchor.dataset.churvoxSignupPlan = planName;
  anchor.textContent = plan.actionLabel;
  card.appendChild(anchor);
}

function wireCheckoutCard(card, planName) {
  if (card.closest('.cvReleasePlansRoot')) return;
  const plan = planByName(planName);
  if (!plan || card.dataset.stripeLiveReady === '1') return;
  card.dataset.stripeLiveReady = '1';
  const existing = Array.from(card.querySelectorAll('a,button')).find((node) => /trial|start|choose|add|upgrade|checkout|plan/i.test(node.textContent || ''));
  if (existing) {
    existing.classList.add('churvoxStripeLiveButton');
    existing.setAttribute('href', '#checkout');
    existing.setAttribute('data-stripe-live-plan', planName);
    existing.setAttribute('data-stripe-live-action', plan.type === 'addon' ? 'add_on' : 'start_trial');
    existing.textContent = plan.actionLabel;
    return;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'churvoxStripeLiveButton';
  button.dataset.stripeLivePlan = planName;
  button.dataset.stripeLiveAction = plan.type === 'addon' ? 'add_on' : 'start_trial';
  button.textContent = plan.actionLabel;
  card.appendChild(button);
}

function enhance() {
  ensureStyle();
  if (isPublicMarketingPath() && !isLoggedIn()) {
    PUBLIC_PLAN_SELECTORS.forEach((selector) => document.querySelectorAll(selector).forEach((card) => { const planName = findPlanNameFromCard(card); if (planName) wirePublicCard(card, planName); }));
    return;
  }
  APP_PLAN_SELECTORS.forEach((selector) => document.querySelectorAll(selector).forEach((card) => { const planName = findPlanNameFromCard(card); if (planName) wireCheckoutCard(card, planName); }));
}

function clickHandler(event) {
  const signup = event.target.closest('[data-churvox-signup-plan]');
  if (signup) {
    const planName = signup.dataset.churvoxSignupPlan;
    if (planByName(planName)) {
      rememberPlan(planName);
      return;
    }
  }
  const button = event.target.closest('[data-stripe-live-plan],[data-stripe-plan]');
  if (!button || button.closest('.cvReleasePlansRoot')) return;
  const planName = button.dataset.stripeLivePlan || button.dataset.stripePlan;
  if (!planByName(planName)) return;
  event.preventDefault();
  event.stopPropagation();
  openCheckout(planName, button.dataset.stripeLiveAction || button.dataset.stripeAction || 'start_trial');
}

function successNotice() {
  try { const search = new URLSearchParams(window.location.search || ''); const state = search.get('checkout'); if (state === 'success') toast('Checkout complete', 'Stripe returned successfully.'); if (state === 'cancelled') toast('Checkout cancelled', 'No plan was changed.'); } catch (_) {}
}

if (typeof window !== 'undefined' && !window.__CHURVOX_STRIPE_CHECKOUT_LIVE_RUNTIME__) {
  window.__CHURVOX_STRIPE_CHECKOUT_LIVE_RUNTIME__ = true;
  window.addEventListener('load', () => { enhance(); successNotice(); });
  window.addEventListener('hashchange', () => setTimeout(enhance, 100));
  window.addEventListener('popstate', () => setTimeout(enhance, 100));
  document.addEventListener('click', clickHandler, true);
  document.addEventListener('click', () => setTimeout(enhance, 160));
  const observer = new MutationObserver(() => enhance());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
