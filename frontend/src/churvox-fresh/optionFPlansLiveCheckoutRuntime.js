// CHURVOX_OPTION_F_PLANS_LIVE_CHECKOUT_20260629
// Replaces the weak Option F plans overlay with a billing screen that shows current plan and starts Stripe Checkout.

import API_BASE from '../lib/apiBase';

const LAYER_ID = 'option-f-plans-pricing-desk';
const STYLE_ID = 'option-f-plans-live-checkout-style';
const TOAST_ID = 'option-f-plans-live-checkout-toast';
const COUNTRY_STORE = 'churvox:billing-country';
const EMAIL_STORE = 'churvox:billing-email';
const GST_RATE = 1.15;

const plans = [
  { key: 'solo', code: 'start', name: 'Start', price: 39, summary: 'For a small operator getting jobs, clients, quotes and invoices under control.', includes: ['Jobs, clients, quotes and invoices', 'Today view', 'Client notes and service memory', 'Price memory', 'CSV import and export'] },
  { key: 'team', code: 'crew', name: 'Crew', price: 89, summary: 'For a business with workers and proof coming back from the field.', includes: ['Everything in Start', 'Worker app records', 'Clocked-in and current job view', 'Proof/photos and worker messages', 'Timesheets and slips review'] },
  { key: 'pro', code: 'operator', name: 'Operator', price: 149, badge: 'Most Popular', summary: 'For owners who want Churvox preparing the admin before they check it.', includes: ['Everything in Crew', 'Churvox drafted quotes, invoices and replies', 'Follow-up ready queue', 'Admin preparation', 'Owner review flow'] },
  { key: 'enterprise', code: 'command', name: 'Command', price: 299, summary: 'For the full approval desk and accounting-ready operating system.', includes: ['Everything in Operator', 'Command approval desk', 'Approve, edit and park workflow', 'One accounting sync option included', 'Owner-approved draft sync only'] },
];

const addons = [
  { key: 'command_growth_pack', name: 'Command Growth Pack', price: 99, detail: 'Adds 50 active team members plus extra job, admin and payroll capacity.' },
  { key: 'xero_addon', code: 'accounting_sync_addon', name: 'Accounting Sync Add-on', price: 39, detail: 'For non-Command tiers where available. Draft sync only. Owner approval required.' },
];

const countries = {
  NZ: { label: 'New Zealand', currency: 'NZD', symbol: '$', tax: '+ GST', taxRate: 0.15 },
  AU: { label: 'Australia', currency: 'AUD', symbol: 'A$', tax: '+ GST', taxRate: 0.10 },
  US: { label: 'United States', currency: 'USD', symbol: 'US$', tax: '', taxRate: 0 },
  UK: { label: 'United Kingdom', currency: 'GBP', symbol: '£', tax: '+ VAT', taxRate: 0.20 },
};

const aliases = {
  start: 'solo', solo: 'solo',
  crew: 'team', team: 'team',
  operator: 'pro', pro: 'pro',
  command: 'enterprise', enterprise: 'enterprise',
};

let state = {
  loaded: false,
  loading: false,
  currentPlan: '',
  subscriptionStatus: '',
  trialEndsAt: '',
  stripeCustomerId: '',
  stripeSubscriptionId: '',
  billingLockReason: '',
  hasAppAccess: false,
  email: '',
  country: '',
  error: '',
};

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function planKey(value) { return aliases[lower(value)] || lower(value); }
function planName(value) { return plans.find((plan) => plan.key === planKey(value))?.name || 'No plan'; }
function planRank(value) { return plans.findIndex((plan) => plan.key === planKey(value)); }
function money(value) { return `$${Number(value || 0).toFixed(2).replace(/\.00$/, '')}`; }
function incTax(value, country) { return money(Number(value || 0) * (1 + Number((countries[country] || countries.NZ).taxRate || 0))); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function nice(value) { const text = clean(value).replaceAll('_', ' '); return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not active'; }

function apiUrl(path) {
  return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`;
}

function tokenHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeCountry(value) {
  const raw = clean(value).toUpperCase();
  const map = { NZ: 'NZ', NZL: 'NZ', 'NEW ZEALAND': 'NZ', AU: 'AU', AUS: 'AU', AUSTRALIA: 'AU', US: 'US', USA: 'US', 'UNITED STATES': 'US', UK: 'UK', GB: 'UK', GBR: 'UK', 'UNITED KINGDOM': 'UK' };
  return map[raw] || 'NZ';
}

function detectCountry() {
  try { const param = new URLSearchParams(window.location.search || '').get('country'); if (param) return normalizeCountry(param); } catch (_) {}
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

function unwrap(payload) {
  return payload?.data?.data || payload?.data || payload || {};
}

async function requestJson(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...tokenHeaders(), ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return unwrap(body);
}

function isPlansPage() {
  const path = lower(window.location.pathname || '');
  const hash = lower((window.location.hash || '').replace('#', ''));
  if (path.includes('/plans') || hash === 'plans') return true;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return lower(active?.textContent) === 'plans';
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .churvoxOptionC:has(#${LAYER_ID}) .cocPage > .cocPanel{display:none!important}.churvoxOptionC:has(#${LAYER_ID}) .optionFControlDepth[data-page="plans"]{display:none!important}
    #${LAYER_ID}.ofPlansLiveDesk{display:grid;grid-column:1/-1;gap:16px;color:#111815}.ofBillingHero{display:grid;grid-template-columns:minmax(260px,1fr) minmax(280px,420px);gap:14px;align-items:stretch}.ofBillingStatus,.ofBillingRegion{display:grid;gap:12px;padding:18px;border:1px solid rgba(16,21,19,.09);border-radius:16px;background:#fff;box-shadow:0 16px 36px rgba(16,21,19,.06)}.ofBillingStatus{background:linear-gradient(135deg,#111815 0%,#222b26 56%,#ea580c 150%);color:#fff}.ofBillingStatus h2,.ofBillingStatus p{margin:0}.ofBillingStatus h2{font-size:30px;line-height:1.05;color:#fff}.ofBillingStatus p{max-width:740px;color:rgba(255,255,255,.78);font-size:13px;font-weight:850}.ofCurrentGrid,.ofPlanStats{display:flex;flex-wrap:wrap;gap:8px}.ofCurrentGrid span,.ofPlanStats span{display:grid;gap:3px;min-width:112px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14)}.ofCurrentGrid b,.ofPlanStats b{font-size:18px;color:#fff}.ofCurrentGrid small,.ofPlanStats small{font-size:10px;color:rgba(255,255,255,.72);font-weight:950;text-transform:uppercase}.ofBillingRegion label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase}.ofBillingRegion select,.ofBillingRegion input{min-height:40px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font-weight:850}.ofBillingRegion button,.ofPlanAction,.ofAddonAction{border:0;border-radius:999px;min-height:40px;padding:10px 14px;background:#111815;color:#fff;font-weight:950;cursor:pointer}.ofBillingRegion button{background:#ea580c}.ofBillingRegion small{color:#52605a;font-size:12px;font-weight:850;line-height:1.35}.ofPlanGridLive{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.ofPlanLiveCard{position:relative;display:grid;align-content:start;gap:10px;min-height:390px;padding:18px;border:1px solid rgba(16,21,19,.09);border-radius:16px;background:#fff;box-shadow:0 16px 36px rgba(16,21,19,.06)}.ofPlanLiveCard[data-current="true"]{border-color:rgba(22,101,52,.4);box-shadow:0 20px 44px rgba(22,101,52,.14)}.ofPlanLiveCard.featured{border-color:rgba(234,88,12,.4);box-shadow:0 20px 44px rgba(234,88,12,.14)}.ofPlanLiveCard em{justify-self:start;border-radius:999px;padding:5px 8px;background:#ea580c;color:#fff;font-size:10px;font-style:normal;font-weight:950}.ofPlanLiveCard[data-current="true"] em{background:#166534}.ofPlanLiveCard h3{margin:0;font-size:20px;color:#111815}.ofPlanPrice{display:flex;align-items:flex-end;gap:8px}.ofPlanPrice b{font-size:42px;line-height:.95;color:#111815}.ofPlanPrice span{padding-bottom:4px;color:#52605a;font-size:12px;font-weight:900}.ofPlanLiveCard strong{justify-self:start;border-radius:999px;padding:6px 9px;background:#f8faf9;color:#111815;font-size:12px;font-weight:950}.ofPlanLiveCard p{margin:0;color:#52605a;font-size:12px;font-weight:850;line-height:1.35}.ofPlanLiveCard ul{display:grid;gap:7px;margin:2px 0 0;padding:0;list-style:none}.ofPlanLiveCard li{position:relative;padding-left:16px;color:#28332e;font-size:12px;font-weight:850;line-height:1.28}.ofPlanLiveCard li::before{content:"";position:absolute;left:0;top:.45em;width:7px;height:7px;border-radius:999px;background:#ea580c}.ofPlanAction{align-self:end;background:#ea580c}.ofPlanAction.current{background:#166534}.ofPlanAction:disabled,.ofAddonAction:disabled,.ofBillingRegion button:disabled{opacity:.62;cursor:not-allowed}.ofAddonGridLive{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.ofAddonLiveCard{display:grid;gap:8px;padding:16px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff7ed;box-shadow:0 14px 30px rgba(16,21,19,.05)}.ofAddonLiveCard h3{margin:0;font-size:16px;color:#111815}.ofAddonLiveCard b{font-size:28px;color:#111815}.ofAddonLiveCard p,.ofAddonLiveCard span,.ofAddonLiveCard strong{margin:0;color:#52605a;font-size:12px;font-weight:900}.ofAddonAction{justify-self:start;background:#111815}.ofPlanFinePrint{padding:12px 14px;border-radius:14px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:900}.ofPlanError{border-radius:12px;padding:10px 12px;background:#fff1f2;color:#991b1b;font-size:12px;font-weight:900}#${TOAST_ID}{position:fixed;right:18px;bottom:24px;z-index:1000010;max-width:420px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${TOAST_ID}.show{opacity:1;transform:translateY(0)}#${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.72);font-weight:800}
    @media(max-width:1120px){.ofBillingHero{grid-template-columns:1fr}.ofPlanGridLive{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.ofPlanGridLive,.ofAddonGridLive{grid-template-columns:1fr}#${TOAST_ID}{left:10px;right:10px;bottom:12px;max-width:none}}
  `;
  document.head.appendChild(style);
}

function toast(title, detail = '') {
  ensureStyle();
  let node = document.getElementById(TOAST_ID);
  if (!node) { node = document.createElement('div'); node.id = TOAST_ID; document.body.appendChild(node); }
  node.innerHTML = `<b>${escapeHtml(title)}</b>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}`;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 3500);
}

async function loadBillingStatus(force = false) {
  if (state.loading || (state.loaded && !force)) return;
  state.loading = true;
  state.error = '';
  renderPlans();
  try {
    const [sub, me] = await Promise.allSettled([
      requestJson('/billing/subscription-status', { method: 'GET' }),
      requestJson('/auth/me', { method: 'GET' }),
    ]);
    const subData = sub.status === 'fulfilled' ? sub.value : {};
    const meData = me.status === 'fulfilled' ? me.value?.user || me.value : {};
    const rawPlan = subData.plan || subData.plan_name || meData.plan || meData.subscription_plan || meData.billing_plan || meData.tier || '';
    state.currentPlan = planKey(rawPlan);
    state.subscriptionStatus = subData.subscription_status || meData.subscription_status || meData.billing_status || '';
    state.trialEndsAt = subData.trial_ends_at || meData.trial_ends_at || '';
    state.stripeCustomerId = subData.stripe_customer_id || meData.stripe_customer_id || '';
    state.stripeSubscriptionId = subData.stripe_subscription_id || meData.stripe_subscription_id || '';
    state.billingLockReason = subData.billing_lock_reason || meData.billing_lock_reason || '';
    state.hasAppAccess = subData.has_app_access === true || meData.has_app_access === true || Boolean(state.currentPlan);
    state.email = subData.email || meData.email || state.email || localStorage.getItem(EMAIL_STORE) || '';
  } catch (error) {
    state.error = error.message || 'Could not load current plan.';
  } finally {
    state.loaded = true;
    state.loading = false;
    renderPlans();
  }
}

function currentPlanCard(plan) {
  const current = state.currentPlan && state.currentPlan === plan.key;
  if (current) return 'Current plan';
  const currentRank = planRank(state.currentPlan);
  const nextRank = planRank(plan.key);
  if (currentRank < 0) return 'Start trial';
  if (nextRank > currentRank) return `Upgrade to ${plan.name}`;
  if (nextRank < currentRank) return `Switch to ${plan.name}`;
  return `Choose ${plan.name}`;
}

function renderPlanCard(plan, country) {
  const meta = countries[country] || countries.NZ;
  const isCurrent = state.currentPlan === plan.key;
  return `
    <article class="ofPlanLiveCard ${plan.badge ? 'featured' : ''}" data-plan-key="${plan.key}" data-current="${isCurrent ? 'true' : 'false'}">
      ${isCurrent ? '<em>Current plan</em>' : plan.badge ? `<em>${escapeHtml(plan.badge)}</em>` : ''}
      <h3>${escapeHtml(plan.name)}</h3>
      <div class="ofPlanPrice"><b>${escapeHtml(meta.symbol)}${plan.price}</b><span>/month ${escapeHtml(meta.tax)}</span></div>
      <strong>${escapeHtml(incTax(plan.price, country))}/month ${meta.tax ? 'inc tax' : 'monthly'}</strong>
      <p>${escapeHtml(plan.summary)}</p>
      <ul>${plan.includes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <button type="button" class="ofPlanAction ${isCurrent ? 'current' : ''}" data-of-plan-checkout="${plan.key}">${escapeHtml(currentPlanCard(plan))}</button>
    </article>
  `;
}

function renderAddonCard(addon, country) {
  const meta = countries[country] || countries.NZ;
  return `
    <article class="ofAddonLiveCard" data-addon-key="${addon.key}">
      <h3>${escapeHtml(addon.name)}</h3>
      <div><b>${escapeHtml(meta.symbol)}${addon.price}</b> <span>/month ${escapeHtml(meta.tax)}</span></div>
      <strong>${escapeHtml(incTax(addon.price, country))}/month ${meta.tax ? 'inc tax' : 'monthly'}</strong>
      <p>${escapeHtml(addon.detail)}</p>
      <button type="button" class="ofAddonAction" data-of-addon-checkout="${addon.key}">Add to plan</button>
    </article>
  `;
}

function renderPlans() {
  if (!isPlansPage()) {
    const existing = document.getElementById(LAYER_ID);
    if (existing?.dataset.liveCheckout === '1') existing.remove();
    return;
  }
  ensureStyle();
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  let layer = document.getElementById(LAYER_ID);
  if (!layer) {
    layer = document.createElement('section');
    layer.id = LAYER_ID;
    root.appendChild(layer);
  }
  layer.className = 'ofPlansLiveDesk';
  layer.dataset.liveCheckout = '1';

  const country = normalizeCountry(state.country || detectCountry());
  const meta = countries[country] || countries.NZ;
  state.country = country;
  try { localStorage.setItem(COUNTRY_STORE, country); } catch (_) {}
  const current = state.currentPlan ? planName(state.currentPlan) : 'No plan selected';
  const status = state.subscriptionStatus || (state.currentPlan ? 'active' : 'choose plan');
  const trial = state.trialEndsAt ? new Date(state.trialEndsAt).toLocaleDateString('en-NZ') : 'Not set';
  const email = state.email || localStorage.getItem(EMAIL_STORE) || '';

  layer.innerHTML = `
    <div class="ofBillingHero">
      <section class="ofBillingStatus">
        <h2>Plan and billing</h2>
        <p>Select a plan and Churvox opens Stripe Checkout. Current plan and trial status stay visible so the boss knows exactly what is active.</p>
        <div class="ofCurrentGrid">
          <span><b>${escapeHtml(current)}</b><small>Current plan</small></span>
          <span><b>${escapeHtml(nice(status))}</b><small>Status</small></span>
          <span><b>${escapeHtml(trial)}</b><small>Trial ends</small></span>
        </div>
        ${state.error ? `<div class="ofPlanError">${escapeHtml(state.error)}</div>` : ''}
      </section>
      <section class="ofBillingRegion">
        <label><span>Billing country</span><select data-of-country>${Object.entries(countries).map(([code, item]) => `<option value="${code}" ${code === country ? 'selected' : ''}>${escapeHtml(item.label)} - ${escapeHtml(item.currency)}</option>`).join('')}</select></label>
        <label><span>Owner email</span><input data-of-billing-email type="email" placeholder="owner email" value="${escapeHtml(email)}" /></label>
        <button type="button" data-of-manage-billing>Manage billing</button>
        <small>Prices are monthly. GST or local tax is added at checkout and shown here as an inclusive guide.</small>
      </section>
    </div>
    <div class="ofPlanGridLive">${plans.map((plan) => renderPlanCard(plan, country)).join('')}</div>
    <div class="ofAddonGridLive">${addons.map((addon) => renderAddonCard(addon, country)).join('')}</div>
    <div class="ofPlanFinePrint">Pricing is unchanged: Start $39/month + GST, Crew $89/month + GST, Operator $149/month + GST, Command $299/month + GST, Command Growth Pack $99/month + GST, Accounting Sync Add-on $39/month + GST for non-Command tiers.</div>
  `;
}

function checkoutPayload({ plan, addon }) {
  const country = normalizeCountry(state.country || detectCountry());
  const emailInput = document.querySelector('[data-of-billing-email]');
  const email = clean(emailInput?.value || state.email || localStorage.getItem(EMAIL_STORE) || '');
  if (email) localStorage.setItem(EMAIL_STORE, email);
  const base = {
    country,
    billing_country: country,
    email,
    billing_interval: 'monthly',
    interval: 'month',
  };
  if (addon) {
    return {
      ...base,
      addon,
      addon_key: addon,
      success_url: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}&addon=${encodeURIComponent(addon)}&country=${country}`,
      cancel_url: `${window.location.origin}/billing/cancel?addon=${encodeURIComponent(addon)}&country=${country}`,
    };
  }
  return {
    ...base,
    plan,
    plan_key: plan,
    success_url: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(plan)}&country=${country}`,
    cancel_url: `${window.location.origin}/billing/cancel?plan=${encodeURIComponent(plan)}&country=${country}`,
  };
}

async function openCheckout({ plan, addon, button }) {
  const selected = plan ? plans.find((item) => item.key === plan) : addons.find((item) => item.key === addon);
  if (!selected) return;
  const currentLabel = button?.textContent || '';
  if (button) { button.disabled = true; button.textContent = 'Opening Stripe...'; }
  const payload = checkoutPayload({ plan, addon });
  const endpoints = addon
    ? ['/billing/create-addon-checkout', '/billing/addon/checkout', '/stripe/addon/checkout', '/billing/create-checkout-session', '/billing/checkout']
    : ['/billing/create-checkout-session', '/billing/checkout', '/stripe/checkout', '/subscriptions/checkout', '/checkout/session', '/create-checkout-session'];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const body = await requestJson(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      const url = body?.url || body?.checkout_url || body?.session_url || body?.checkoutSession?.url || body?.data?.url;
      if (!url) throw new Error('Stripe checkout URL missing');
      toast('Opening Stripe Checkout', selected.name);
      window.location.assign(url);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  if (button) { button.disabled = false; button.textContent = currentLabel; }
  toast('Checkout could not open', lastError?.message || 'Backend checkout route did not return a Stripe URL.');
}

async function openBillingPortal(button) {
  const currentLabel = button?.textContent || '';
  if (button) { button.disabled = true; button.textContent = 'Opening billing...'; }
  const endpoints = ['/billing/customer-portal', '/billing/portal', '/stripe/portal', '/create-portal-session'];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const body = await requestJson(endpoint, { method: 'POST', body: JSON.stringify({ return_url: `${window.location.origin}/plans` }) });
      const url = body?.url || body?.portal_url || body?.session_url || body?.data?.url;
      if (!url) throw new Error('Billing portal URL missing');
      window.location.assign(url);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  if (button) { button.disabled = false; button.textContent = currentLabel; }
  toast('Billing portal could not open', lastError?.message || 'Portal route did not return a URL.');
}

function handleClick(event) {
  const country = event.target.closest('[data-of-country]');
  if (country) return;
  const manage = event.target.closest('[data-of-manage-billing]');
  if (manage) {
    event.preventDefault();
    openBillingPortal(manage);
    return;
  }
  const planButton = event.target.closest('[data-of-plan-checkout]');
  if (planButton) {
    event.preventDefault();
    openCheckout({ plan: planButton.dataset.ofPlanCheckout, button: planButton });
    return;
  }
  const addonButton = event.target.closest('[data-of-addon-checkout]');
  if (addonButton) {
    event.preventDefault();
    openCheckout({ addon: addonButton.dataset.ofAddonCheckout, button: addonButton });
  }
}

function handleInput(event) {
  const country = event.target.closest('[data-of-country]');
  if (country) {
    state.country = normalizeCountry(country.value);
    localStorage.setItem(COUNTRY_STORE, state.country);
    renderPlans();
    return;
  }
  const email = event.target.closest('[data-of-billing-email]');
  if (email) {
    state.email = clean(email.value);
    if (state.email) localStorage.setItem(EMAIL_STORE, state.email);
  }
}

function scheduleRender() {
  setTimeout(() => { renderPlans(); loadBillingStatus(); }, 80);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OPTION_F_PLANS_LIVE_CHECKOUT__) {
  window.__CHURVOX_OPTION_F_PLANS_LIVE_CHECKOUT__ = true;
  state.country = detectCountry();
  state.email = localStorage.getItem(EMAIL_STORE) || '';
  window.addEventListener('load', scheduleRender);
  window.addEventListener('hashchange', scheduleRender);
  window.addEventListener('popstate', scheduleRender);
  window.addEventListener('churvox-auth-refresh', () => loadBillingStatus(true));
  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleInput, true);
  document.addEventListener('input', handleInput, true);
  const observer = new MutationObserver(() => { if (isPlansPage()) scheduleRender(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
