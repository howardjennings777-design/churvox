if (typeof window === 'undefined' || typeof document === 'undefined') {
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') module.exports = {};
}
const PLAN_ALIASES = {
  'start': 'start',
  'slim': 'start',
  'solo': 'solo',
  'basic': 'solo',
  'crew': 'crew',
  'team': 'team',
  'plus': 'team',
  'professional': 'pro',
  'pro': 'pro',
  'premium': 'pro',
  'operator': 'operator',
  'advanced': 'operator',
  'command': 'command',
  'enterprise': 'enterprise',
  'custom': 'enterprise',
};
const PLAN_ORDER = ['start', 'solo', 'crew', 'team', 'pro', 'operator', 'command', 'enterprise'];
const API_BASE = (() => {
  try {
    const url = new URL(window.location || 'http://localhost');
    const search = url.searchParams.get('api_base') || '';
    if (search) return search;
    const port = url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? ':8000' : '';
    const proto = url.protocol;
    const host = url.hostname;
    return `${proto}//${host}${port}`;
  } catch (_) {
    return 'http://localhost:8000';
  }
})();
const COUNTRY_STORE = 'churvox_checkout_country';
const EMAIL_STORE = 'churvox_checkout_email';
const PLANS = [
  { key: 'start', name: 'Start', code: 'start', trialDays: 14, monthlyBase: 29 },
  { key: 'solo', name: 'Solo', code: 'solo', trialDays: 14, monthlyBase: 79 },
  { key: 'crew', name: 'Crew', code: 'crew', trialDays: 14, monthlyBase: 149 },
  { key: 'team', name: 'Team', code: 'team', trialDays: 14, monthlyBase: 249 },
  { key: 'pro', name: 'Pro', code: 'pro', trialDays: 14, monthlyBase: 399 },
  { key: 'operator', name: 'Operator', code: 'operator', trialDays: 14, monthlyBase: 699 },
  { key: 'command', name: 'Command', code: 'command', trialDays: 14, monthlyBase: 1299 },
  { key: 'enterprise', name: 'Enterprise', code: 'enterprise', trialDays: 0, monthlyBase: 0 },
];
const COUNTRIES = {
  NZ: { symbol: '$', currency: 'NZD', taxRate: 0.15, tax: true, taxName: 'GST', ta: 'GST' },
  AU: { symbol: '$', currency: 'AUD', taxRate: 0.1, tax: true, taxName: 'GST', ta: 'GST' },
  US: { symbol: '$', currency: 'USD', taxRate: 0, tax: false, taxName: '', ta: '' },
  UK: { symbol: '£', currency: 'GBP', taxRate: 0.2, tax: true, taxName: 'VAT', ta: 'VAT' },
};
const TOAST_ID = 'churvox_of_toast';
const state = {
  loading: false,
  loaded: false,
  currentPlan: '',
  subscriptionStatus: '',
  trialEndsAt: '',
  billingLockReason: '',
  stripeCustomerId: '',
  stripeSubscriptionId: '',
  email: '',
  country: '',
  addons: {},
  error: '',
  notice: '',
};

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function esc(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function apiUrl(path) { return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`; }
function planKey(value) { const raw = lower(value); return PLAN_ALIASES[raw] || (PLAN_ORDER.includes(raw) ? raw : ''); }
function validPlan(value) { return PLAN_ORDER.includes(planKey(value)); }
function planConfig(value) { return PLANS.find((plan) => plan.key === planKey(value) || plan.code === value) || null; }
function planName(value) { return planConfig(value)?.name || 'No plan selected'; }
function rank(value) { return PLAN_ORDER.indexOf(planKey(value)); }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; } }
function authHeaders() { const authToken = token(); return authToken ? { Authorization: `Bearer ${authToken}` } : {}; }
function unwrap(payload) { return payload?.data?.data || payload?.data || payload || {}; }
function meta(countryCode) { return COUNTRIES[countryCode] || COUNTRIES.NZ; }
function money(value, countryCode) { const m = meta(countryCode); return `${m.symbol}${Number(value || 0).toFixed(2).replace(/\.00$/, '')}`; }
function incTax(value, countryCode) { const m = meta(countryCode); const total = Number(value || 0) * (1 + Number(m.taxRate || 0)); return `${money(total, countryCode)}/month ${m.tax ? `inc ${m.taxName}` : ''}`.trim(); }
function normalizeCountry(value) {
  const raw = clean(value).toUpperCase();
  const aliases = { NZ: 'NZ', NZL: 'NZ', 'NEW ZEALAND': 'NZ', AU: 'AU', AUS: 'AU', AUSTRALIA: 'AU', US: 'US', USA: 'US', 'UNITED STATES': 'US', UK: 'UK', GB: 'UK', GBR: 'UK', 'UNITED KINGDOM': 'UK' };
  return aliases[raw] || 'NZ';
}
function detectCountry() {
  try { const param = new URLSearchParams(window.location.search || '').get('country'); if (param) return normalizeCountry(param); } catch (_) {}
  try { const saved = localStorage.getItem(COUNTRY_STORE); if (saved) return normalizeCountry(saved); } catch (_) {}
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/auckland|chatham/i.test(tz)) return 'NZ';
    if (/sydney|melbourne|brisbane|perth|adelaide|hobart|darwin/i.test(tz)) return 'AU';
    if (/london|belfast|guernsey|isle_of_man/i.test(tz)) return 'UK';
    if (/america\//i.test(tz)) return 'US';
  } catch (_) {}
  return 'NZ';
}
function nice(value) { const text = clean(value).replaceAll('_', ' '); return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not active'; }
function trialText() { if (!state.trialEndsAt) return 'Not set'; try { return new Date(state.trialEndsAt).toLocaleDateString('en-NZ'); } catch (_) { return clean(state.trialEndsAt); } }
function lower_status(value) { return lower(value); }
function isTrialExpired() { if (!state.trialEndsAt) return false; try { return new Date(state.trialEndsAt) < new Date(); } catch (_) { return false; } }
function ensureStyle() {
  if (document.getElementById('churvox_of_styles')) return;
  const style = document.createElement('style');
  style.id = 'churvox_of_styles';
  style.textContent = `.ofBillingHero{display:grid;grid-template-columns:1fr 1fr;gap:3rem;padding:4rem 2rem;max-width:1400px;margin:0 auto}.ofBillingHeroText h1{font-size:2.5rem;font-weight:700;margin:0 0 1rem 0;color:#0f172a}.ofBillingHeroText p{color:#475569;line-height:1.6;margin:0}.ofHeroImage{background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;min-height:300px}.ofBillingHeroText{display:flex;flex-direction:column;justify-content:center}.ofCheckoutSection{padding:3rem 2rem;background:#f8fafc}.ofCheckoutContainer{max-width:1400px;margin:0 auto}.ofSectionTitle{font-size:2rem;font-weight:700;margin:0 0 2rem 0;color:#0f172a;text-align:center}.ofPlanGridLive{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2rem;margin-bottom:2rem}.ofPlanCardLive{background:white;border:2px solid #e2e8f0;border-radius:8px;padding:2rem;text-align:center;cursor:pointer;transition:all 0.2s;position:relative}.ofPlanCardLive:hover{border-color:#3b82f6;box-shadow:0 4px 6px rgba(59,130,246,0.1)}.ofPlanCardLive.selected{border-color:#3b82f6;background:#eff6ff}.ofPlanCardPrice{font-size:1.875rem;font-weight:700;color:#0f172a;margin:1rem 0}.ofPlanCardFeatures{text-align:left;margin:1.5rem 0}.ofPlanCardFeatures li{color:#475569;margin:0.5rem 0;font-size:0.875rem}.ofAddonGridLive{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem;margin:2rem 0}.ofAddonCard{background:white;border:1px solid #e2e8f0;border-radius:8px;padding:1.5rem}.ofCheckoutButton{background:#3b82f6;color:white;border:none;padding:0.875rem 1.75rem;border-radius:6px;font-size:1rem;font-weight:600;cursor:pointer;transition:background 0.2s;width:100%;margin-top:1rem}.ofCheckoutButton:hover{background:#2563eb}.ofCheckoutButton:disabled{background:#9ca3af;cursor:not-allowed}.ofToast{position:fixed;bottom:20px;right:20px;background:#0f172a;color:white;padding:1rem 1.5rem;border-radius:6px;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-size:0.875rem;max-width:300px;opacity:0;transition:opacity 0.3s;z-index:9999}.ofToast.show{opacity:1}#${TOAST_ID}{position:fixed;bottom:20px;right:20px;background:#0f172a;color:white;padding:1rem 1.5rem;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:0.875rem;max-width:350px;opacity:0;pointer-events:none;transition:opacity 0.3s;z-index:9999}#${TOAST_ID}.show{opacity:1;pointer-events:auto}#${TOAST_ID} b{display:block;margin-bottom:0.25rem;font-weight:600}#${TOAST_ID} small{display:block;font-size:0.75rem;opacity:0.9}.ofBillingStatus{background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:1rem;margin:1rem 0;font-size:0.875rem;color:#166534}.ofBillingStatus.inactive{background:#fef2f2;border-color:#fecaca;color:#991b1b}.ofBillingStatus.error{background:#fef2f2;border-color:#fca5a5;color:#dc2626}@media(max-width:1120px){.ofBillingHero{grid-template-columns:1fr}.ofPlanGridLive{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.ofPlanGridLive,.ofAddonGridLive{grid-template-columns:1fr}#${TOAST_ID}{left:10px;right:10px;bottom:12px;max-width:none}}`;
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
async function loadBillingStatus(force = false) {
  if (state.loading || (state.loaded && !force)) return;
  state.loading = true;
  state.error = '';
  renderPlans();
  try {
    const authToken = token();
    const promises = [];
    if (authToken) {
      promises.push(
        Promise.allSettled([
          requestJson('/billing/subscription-status', { method: 'GET' }),
          requestJson('/auth/me', { method: 'GET' }),
          requestJson('/billing/addons', { method: 'GET' }),
        ])
      );
    } else {
      promises.push(Promise.resolve([
        { status: 'rejected', reason: 'No token' },
        { status: 'rejected', reason: 'No token' },
        { status: 'rejected', reason: 'No token' },
      ]));
    }
    const results = await promises[0];
    const sub = results[0];
    const me = results[1];
    const addons = results[2];
    const subData = sub.status === 'fulfilled' ? sub.value : {};
    const meData = me.status === 'fulfilled' ? (me.value?.user || me.value) : {};
    const addonData = addons.status === 'fulfilled' ? addons.value : {};
    const rawPlan = subData.plan || subData.plan_name || meData.plan || meData.subscription_plan || meData.billing_plan || meData.tier || '';
    state.currentPlan = planKey(rawPlan);
    state.subscriptionStatus = subData.subscription_status || meData.subscription_status || meData.billing_status || '';
    state.trialEndsAt = subData.trial_ends_at || meData.trial_ends_at || '';
    state.billingLockReason = subData.billing_lock_reason || meData.billing_lock_reason || '';
    state.stripeCustomerId = subData.stripe_customer_id || meData.stripe_customer_id || '';
    state.stripeSubscriptionId = subData.stripe_subscription_id || meData.stripe_subscription_id || '';
    state.email = subData.email || meData.email || state.email || localStorage.getItem(EMAIL_STORE) || '';
    state.country = normalizeCountry(subData.billing_country || meData.billing_country || meData.country || state.country || detectCountry());
    state.addons = {
      xero_addon_active: Boolean(addonData.xero_addon_active || meData.xero_addon_active),
      extra_user_blocks: Number(addonData.extra_user_blocks || meData.extra_user_blocks || 0),
    };
    const locked = ['cancelled', 'canceled', 'unpaid', 'incomplete_expired', 'locked', 'disabled'].includes(lower(state.subscriptionStatus));
    state.hasAppAccess = Boolean(subData.has_app_access === true || meData.has_app_access === true || (validPlan(state.currentPlan) && !locked && !isTrialExpired()));
    if (state.country) localStorage.setItem(COUNTRY_STORE, state.country);
    if (state.email) localStorage.setItem(EMAIL_STORE, state.email);
  } catch (error) {
    state.error = error?.message || 'Could not load current plan.';
  } finally {
    state.loaded = true;
    state.loading = false;
    state.notice = checkoutNotice() || state.notice;
    renderPlans();
  }
}
function buttonLabel(plan) {
  if (state.currentPlan === plan.key) return 'Current plan';
  if (!token()) return 'Create account first';
  if (!validPlan(state.currentPlan)) return `Checkout: Start ${plan.name} trial`;
  if (state.billingLockReason === 'payment_required' || isTrialExpired()) return `Checkout: Pay for ${plan.name}`;
  const currentRank = rank(state.currentPlan);
  const nextRank = rank(plan.key);
  if (currentRank < 0) return `Start trial: ${plan.name}`;
  if (nextRank > currentRank) return `Upgrade to ${plan.name}`;
  if (nextRank < currentRank) return `Switch to ${plan.name}`;
  return `Choose ${plan.name}`;
}
function renderPlanCard(plan, country) {
  const m = meta(country);
  const isCurrent = state.currentPlan === plan.key;
  const isAffordable = rank(plan.key) >= rank(state.currentPlan);
  const monthlyPrice = plan.monthlyBase || 0;
  const basePrice = money(monthlyPrice, country);
  const withTax = incTax(monthlyPrice, country);
  const trialText = plan.trialDays > 0 ? ` + ${plan.trialDays} day trial` : ' (no trial)';
  const features = [
    '<li>Invoice & job management</li>',
    '<li>Team & worker management</li>',
    '<li>Reporting & analytics</li>',
    '<li>Mobile app access</li>',
  ];
  const buttonText = buttonLabel(plan);
  return `
    <div class="ofPlanCardLive${isCurrent ? ' selected' : ''}">
      <h3>${esc(plan.name)}</h3>
      <div class="ofPlanCardPrice">${esc(basePrice)}</div>
      <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">${esc(withTax)}</div>
      <div style="font-size: 0.75rem; color: #9ca3af;">${esc(trialText)}</div>
      <ul class="ofPlanCardFeatures">${features.join('')}</ul>
      <button class="ofCheckoutButton" data-plan="${esc(plan.key)}">${esc(buttonText)}</button>
    </div>
  `;
}
function renderPlans() {
  ensureStyle();
  const container = document.querySelector('[data-churvox-plans-live]');
  if (!container) return;
  const country = state.country || detectCountry();
  const plans = PLANS.filter(p => p.key !== 'enterprise').map(p => renderPlanCard(p, country)).join('');
  const status = state.currentPlan ? `<div class="ofBillingStatus">Current plan: <strong>${esc(planName(state.currentPlan))}</strong> (${esc(nice(state.subscriptionStatus))})</div>` : '<div class="ofBillingStatus inactive">Not on a paid plan yet</div>';
  const error = state.error ? `<div class="ofBillingStatus error">${esc(state.error)}</div>` : '';
  container.innerHTML = `<div class="ofCheckoutSection"><div class="ofCheckoutContainer"><h2 class="ofSectionTitle">Choose your plan</h2>${error}${status}<div class="ofPlanGridLive">${plans}</div></div></div>`;
  container.querySelectorAll('.ofCheckoutButton').forEach(btn => btn.addEventListener('click', handleClick));
}
function checkoutNotice() {
  const hasToken = Boolean(token());
  if (!hasToken) return 'Log in or create an account to get started.';
  if (!state.currentPlan) return 'Choose a plan to begin your trial.';
  if (state.subscriptionStatus === 'trialing' && !isTrialExpired()) return `Your trial ends on ${trialText()}. Billing starts after.`;
  if (state.subscriptionStatus === 'past_due' || state.subscriptionStatus === 'payment_required') return 'Payment update required to continue.';
  return '';
}
function syncInputs() {
  const country = document.querySelector('[data-of-country]')?.value || detectCountry();
  state.country = normalizeCountry(country);
  renderPlans();
}
function isAuditControl(button) { return Boolean(button?.getAttribute?.('data-churvox-qa-control')); }
function auditBlocked(button, label) { if (!isAuditControl(button)) return false; toast('Checkout control ready', `${label} skipped for audit.`); return true; }
async function createCheckoutSession(planKey) {
  const payload = { plan: planKey, country: state.country || detectCountry() };
  const response = await fetch(apiUrl('/billing/create-checkout-session'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Checkout session creation failed');
  const body = await response.json();
  return body?.url || body?.session_url || body?.checkout_url || '';
}
async function handleCheckout(button, planKey) {
  if (auditBlocked(button, 'Checkout')) return;
  if (!token()) { toast('Log in first', 'Create an account or log in to choose a plan.'); return; }
  try {
    button.disabled = true;
    button.textContent = 'Opening checkout...';
    const url = await createCheckoutSession(planKey);
    if (url) window.location.href = url;
    else throw new Error('No checkout URL returned');
  } catch (error) {
    toast('Checkout error', error?.message || 'Could not open checkout. Try again.');
    button.disabled = false;
    button.textContent = buttonLabel({ key: planKey, name: planName(planKey) });
  }
}
async function openBillingPortal(button) {
  if (auditBlocked(button, 'Billing portal')) return;
  if (!(state.stripeCustomerId || state.stripeSubscriptionId)) { toast('No Stripe account yet', 'Choose a plan first, then billing management becomes available.'); return; }
  if (!token()) { toast('Log in first', 'Create an account or log in to access billing.'); return; }
  try {
    const response = await fetch(apiUrl('/billing/open-portal-session'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error('Portal session creation failed');
    const body = await response.json();
    const url = body?.url || body?.portal_url || '';
    if (url) window.location.href = url;
    else throw new Error('No portal URL returned');
  } catch (error) {
    toast('Portal error', error?.message || 'Could not open billing portal. Try again.');
  }
}
function handleClick(event) {
  const button = event.target.closest('.ofCheckoutButton');
  if (!button) return;
  const planKey = button.getAttribute('data-plan');
  if (!planKey) return;
  handleCheckout(button, planKey);
}
function handleInput(event) {
  if (event.target.closest('[data-of-country]')) { syncInputs(); scheduleRender(); }
}
function scheduleRender() { clearTimeout(window._renderTimeout); window._renderTimeout = setTimeout(() => renderPlans(), 300); }
function tryInit() {
  const container = document.querySelector('[data-churvox-plans-live]');
  if (!container || !container.parentElement) { setTimeout(tryInit, 100); return; }
  if (document.readyState !== 'loading') loadBillingStatus();
  else document.addEventListener('DOMContentLoaded', () => loadBillingStatus());
  document.addEventListener('click', handleClick);
  document.addEventListener('input', handleInput);
  window.addEventListener('churvox-billing-refresh', () => loadBillingStatus(true));
}
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInit);
  else tryInit();
}
async function requestJson(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return unwrap(body);
}

export {};
