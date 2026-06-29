// CHURVOX_OPTION_F_PLANS_ACCOUNT_CENTER_V3_20260629
// Single source of truth for the logged-in Plans page.
// Uses the existing backend billing flow:
// - current state: /api/billing/subscription-status + /api/auth/me + /api/billing/addons
// - plan checkout: POST form to /api/billing/start-checkout-form (backend redirects to Stripe)
// - add-on checkout: POST /api/billing/create-addon-checkout-session
// - returns: /billing/success and /billing/cancel handled by BillingReturnPage

import API_BASE from '../lib/apiBase';

const LAYER_ID = 'option-f-plans-pricing-desk';
const STYLE_ID = 'option-f-plans-account-center-v3-style';
const TOAST_ID = 'option-f-plans-account-center-v3-toast';
const COUNTRY_STORE = 'churvox:billing-country';
const EMAIL_STORE = 'churvox:billing-email';

const PLAN_ORDER = ['solo', 'team', 'pro', 'enterprise'];
const PLAN_ALIASES = {
  start: 'solo',
  solo: 'solo',
  crew: 'team',
  team: 'team',
  operator: 'pro',
  pro: 'pro',
  command: 'enterprise',
  enterprise: 'enterprise',
};

const PLANS = [
  {
    key: 'solo',
    code: 'start',
    name: 'Start',
    price: 39,
    summary: 'For a small operator getting jobs, clients, quotes and invoices under control.',
    includes: [
      'Jobs, clients, quotes and invoices',
      'Today view for jobs and money due',
      'Client notes, service memory and price memory',
      'CSV client import and export',
      'Accounting Sync Add-on available',
    ],
  },
  {
    key: 'team',
    code: 'crew',
    name: 'Crew',
    price: 89,
    summary: 'For a small crew with worker proof, photos, messages and timesheets coming back from the field.',
    includes: [
      'Everything in Start',
      'Worker app records',
      'Clocked-in and current job view',
      'Proof/photos and worker messages',
      'Timesheets and slips review',
    ],
  },
  {
    key: 'pro',
    code: 'operator',
    name: 'Operator',
    price: 149,
    badge: 'Most Popular',
    summary: 'For owners who want Churvox preparing the admin before they check it.',
    includes: [
      'Everything in Crew',
      'Churvox drafted quotes, invoices and replies',
      'Follow-up ready queue',
      'Admin preparation',
      'Command review flow',
    ],
  },
  {
    key: 'enterprise',
    code: 'command',
    name: 'Command',
    price: 299,
    summary: 'The full approval desk and accounting-ready operating system.',
    includes: [
      'Everything in Operator',
      'Command approval desk',
      'Approve, edit and park workflow',
      'Up to 50 active team members',
      'One accounting sync option included',
    ],
  },
];

const ADDONS = [
  {
    key: 'command_growth_pack',
    name: 'Command Growth Pack',
    price: 99,
    requires: 'enterprise',
    detail: 'Adds 50 more active team members plus extra job, admin and payroll capacity.',
  },
  {
    key: 'xero_addon',
    name: 'Accounting Sync Add-on',
    price: 39,
    includedOn: 'enterprise',
    detail: 'For non-Command tiers where available. Xero or MYOB draft sync only. Owner approval required.',
  },
];

const COUNTRIES = {
  NZ: { label: 'New Zealand', currency: 'NZD', symbol: '$', tax: '+ GST', taxName: 'GST', taxRate: 0.15 },
  AU: { label: 'Australia', currency: 'AUD', symbol: 'A$', tax: '+ GST', taxName: 'GST', taxRate: 0.10 },
  US: { label: 'United States', currency: 'USD', symbol: 'US$', tax: '', taxName: 'tax', taxRate: 0 },
  UK: { label: 'United Kingdom', currency: 'GBP', symbol: '£', tax: '+ VAT', taxName: 'VAT', taxRate: 0.20 },
};

const state = {
  loading: false,
  loaded: false,
  renderQueued: false,
  currentPlan: '',
  subscriptionStatus: '',
  trialEndsAt: '',
  billingLockReason: '',
  stripeCustomerId: '',
  stripeSubscriptionId: '',
  hasAppAccess: false,
  email: '',
  country: '',
  addons: {},
  error: '',
  notice: '',
};

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[char]));
}

function planKey(value) {
  const raw = lower(value);
  if (!raw || ['none', 'free', 'null', 'undefined'].includes(raw)) return '';
  return PLAN_ALIASES[raw] || raw;
}

function validPlan(value) {
  return PLAN_ORDER.includes(planKey(value));
}

function planConfig(value) {
  const key = planKey(value);
  return PLANS.find((plan) => plan.key === key) || null;
}

function planName(value) {
  return planConfig(value)?.name || 'No plan selected';
}

function rank(value) {
  return PLAN_ORDER.indexOf(planKey(value));
}

function apiUrl(path) {
  return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`;
}

function token() {
  try {
    return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || '';
  } catch (_) {
    return '';
  }
}

function authHeaders() {
  const authToken = token();
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

function money(value, countryCode) {
  const meta = COUNTRIES[countryCode] || COUNTRIES.NZ;
  return `${meta.symbol}${Number(value || 0).toFixed(2).replace(/\.00$/, '')}`;
}

function incTax(value, countryCode) {
  const meta = COUNTRIES[countryCode] || COUNTRIES.NZ;
  const total = Number(value || 0) * (1 + Number(meta.taxRate || 0));
  return `${money(total, countryCode)}/month ${meta.tax ? `inc ${meta.taxName}` : ''}`.trim();
}

function normalizeCountry(value) {
  const raw = clean(value).toUpperCase();
  const aliases = {
    NZ: 'NZ',
    NZL: 'NZ',
    'NEW ZEALAND': 'NZ',
    AU: 'AU',
    AUS: 'AU',
    AUSTRALIA: 'AU',
    US: 'US',
    USA: 'US',
    'UNITED STATES': 'US',
    UK: 'UK',
    GB: 'UK',
    GBR: 'UK',
    'UNITED KINGDOM': 'UK',
  };
  return aliases[raw] || 'NZ';
}

function detectCountry() {
  try {
    const param = new URLSearchParams(window.location.search || '').get('country');
    if (param) return normalizeCountry(param);
  } catch (_) {}
  try {
    const saved = localStorage.getItem(COUNTRY_STORE);
    if (saved) return normalizeCountry(saved);
  } catch (_) {}
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
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  }
  return unwrap(body);
}

function isPlansPage() {
  const path = lower(window.location.pathname || '');
  const hash = lower((window.location.hash || '').replace('#', ''));
  if (path === '/plans' || path.endsWith('/plans') || hash === 'plans') return true;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return lower(active?.textContent) === 'plans';
}

function hasCheckoutReturnNotice() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('checkout') === 'cancelled' || params.get('canceled')) return 'Checkout cancelled. No plan changed.';
    if (params.get('addon_success')) return 'Add-on checkout returned. Refreshing billing status.';
    if (params.get('addon_cancelled')) return 'Add-on checkout cancelled. No add-on changed.';
  } catch (_) {}
  return '';
}

function nice(value) {
  const text = clean(value).replaceAll('_', ' ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not active';
}

function trialText() {
  if (!state.trialEndsAt) return 'Not set';
  try {
    return new Date(state.trialEndsAt).toLocaleDateString('en-NZ');
  } catch (_) {
    return clean(state.trialEndsAt);
  }
}

function statusText() {
  if (state.billingLockReason === 'payment_required') return 'Payment required';
  if (!validPlan(state.currentPlan)) return 'Choose plan';
  if (state.subscriptionStatus) return nice(state.subscriptionStatus);
  if (state.stripeSubscriptionId) return 'Stripe active';
  return 'Plan active';
}

function isTrialExpired() {
  if (!state.trialEndsAt) return false;
  try {
    return new Date(state.trialEndsAt) < new Date();
  } catch (_) {
    return false;
  }
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .churvoxOptionC:has(#${LAYER_ID}) .cocPage > .cocPanel{display:none!important}
    .churvoxOptionC:has(#${LAYER_ID}) .optionFControlDepth[data-page="plans"]{display:none!important}
    #${LAYER_ID}.ofPlansAccount{display:grid;grid-column:1/-1;gap:16px;color:#111815}
    #${LAYER_ID} .ofBillingHero{display:grid;grid-template-columns:minmax(280px,1fr) minmax(280px,420px);gap:14px;align-items:stretch}
    #${LAYER_ID} .ofBillingStatus,#${LAYER_ID} .ofBillingRegion,#${LAYER_ID} .ofBillingFlow,#${LAYER_ID} .ofPlanLiveCard,#${LAYER_ID} .ofAddonLiveCard{border:1px solid rgba(16,21,19,.09);border-radius:18px;background:#fff;box-shadow:0 16px 36px rgba(16,21,19,.06)}
    #${LAYER_ID} .ofBillingStatus{display:grid;gap:14px;padding:18px;background:linear-gradient(135deg,#111815 0%,#222b26 55%,#ea580c 150%);color:#fff}
    #${LAYER_ID} .ofBillingStatus h2,#${LAYER_ID} .ofBillingStatus p{margin:0}
    #${LAYER_ID} .ofBillingStatus h2{font-size:32px;line-height:1.05;color:#fff}
    #${LAYER_ID} .ofBillingStatus p{max-width:760px;color:rgba(255,255,255,.78);font-size:13px;font-weight:850;line-height:1.4}
    #${LAYER_ID} .ofCurrentGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    #${LAYER_ID} .ofCurrentGrid span{display:grid;gap:3px;min-width:0;padding:10px 12px;border-radius:13px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14)}
    #${LAYER_ID} .ofCurrentGrid b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18px;color:#fff}
    #${LAYER_ID} .ofCurrentGrid small{font-size:10px;color:rgba(255,255,255,.72);font-weight:950;text-transform:uppercase;letter-spacing:.04em}
    #${LAYER_ID} .ofBillingNotice,#${LAYER_ID} .ofPlanError{border-radius:13px;padding:10px 12px;font-size:12px;font-weight:900;line-height:1.35}
    #${LAYER_ID} .ofBillingNotice{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.16)}
    #${LAYER_ID} .ofPlanError{background:#fff1f2;color:#991b1b;border:1px solid rgba(153,27,27,.16)}
    #${LAYER_ID} .ofBillingRegion{display:grid;gap:12px;padding:18px}
    #${LAYER_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase}
    #${LAYER_ID} select,#${LAYER_ID} input{min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:13px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif}
    #${LAYER_ID} button{border:0;border-radius:999px;min-height:40px;padding:10px 14px;background:#111815;color:#fff;font-weight:950;cursor:pointer}
    #${LAYER_ID} button.primary,#${LAYER_ID} .ofPlanAction{background:#ea580c}
    #${LAYER_ID} button.quiet{background:#eef2ed;color:#111815}
    #${LAYER_ID} button.current{background:#166534}
    #${LAYER_ID} button:disabled{opacity:.56;cursor:not-allowed}
    #${LAYER_ID} .ofBillingActions{display:flex;flex-wrap:wrap;gap:8px}
    #${LAYER_ID} .ofBillingRegion small,#${LAYER_ID} .ofPlanFinePrint{color:#52605a;font-size:12px;font-weight:850;line-height:1.4}
    #${LAYER_ID} .ofBillingFlow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:14px;background:#f8faf9}
    #${LAYER_ID} .ofBillingFlow span{display:grid;gap:4px;padding:12px;border-radius:14px;background:#fff;border:1px solid rgba(16,21,19,.07)}
    #${LAYER_ID} .ofBillingFlow b{color:#111815;font-size:13px}
    #${LAYER_ID} .ofBillingFlow small{color:#52605a;font-size:12px;font-weight:850;line-height:1.35}
    #${LAYER_ID} .ofPlanGridLive{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
    #${LAYER_ID} .ofPlanLiveCard{position:relative;display:grid;align-content:start;gap:10px;min-height:430px;padding:18px}
    #${LAYER_ID} .ofPlanLiveCard[data-current="true"]{border-color:rgba(22,101,52,.42);box-shadow:0 20px 44px rgba(22,101,52,.14)}
    #${LAYER_ID} .ofPlanLiveCard.featured{border-color:rgba(234,88,12,.4);box-shadow:0 20px 44px rgba(234,88,12,.14)}
    #${LAYER_ID} .ofPlanLiveCard em{justify-self:start;border-radius:999px;padding:5px 8px;background:#ea580c;color:#fff;font-size:10px;font-style:normal;font-weight:950}
    #${LAYER_ID} .ofPlanLiveCard[data-current="true"] em{background:#166534}
    #${LAYER_ID} .ofPlanLiveCard h3{margin:0;font-size:22px;color:#111815}
    #${LAYER_ID} .ofPlanPrice{display:flex;align-items:flex-end;gap:8px}
    #${LAYER_ID} .ofPlanPrice b{font-size:42px;line-height:.95;color:#111815}
    #${LAYER_ID} .ofPlanPrice span{padding-bottom:4px;color:#52605a;font-size:12px;font-weight:900}
    #${LAYER_ID} .ofPlanLiveCard strong{justify-self:start;border-radius:999px;padding:6px 9px;background:#f8faf9;color:#111815;font-size:12px;font-weight:950}
    #${LAYER_ID} .ofPlanLiveCard p{margin:0;color:#52605a;font-size:12px;font-weight:850;line-height:1.35}
    #${LAYER_ID} .ofPlanLiveCard ul{display:grid;gap:7px;margin:2px 0 0;padding:0;list-style:none}
    #${LAYER_ID} .ofPlanLiveCard li{position:relative;padding-left:16px;color:#28332e;font-size:12px;font-weight:850;line-height:1.28}
    #${LAYER_ID} .ofPlanLiveCard li::before{content:"";position:absolute;left:0;top:.45em;width:7px;height:7px;border-radius:999px;background:#ea580c}
    #${LAYER_ID} .ofPlanAction{align-self:end}
    #${LAYER_ID} .ofAddonGridLive{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    #${LAYER_ID} .ofAddonLiveCard{display:grid;gap:8px;padding:16px;background:#fff7ed}
    #${LAYER_ID} .ofAddonLiveCard h3{margin:0;font-size:17px;color:#111815}
    #${LAYER_ID} .ofAddonLiveCard b{font-size:30px;color:#111815}
    #${LAYER_ID} .ofAddonLiveCard p,#${LAYER_ID} .ofAddonLiveCard span,#${LAYER_ID} .ofAddonLiveCard strong{margin:0;color:#52605a;font-size:12px;font-weight:900;line-height:1.35}
    #${LAYER_ID} .ofPlanFinePrint{padding:12px 14px;border-radius:14px;background:#f8faf9}
    #${TOAST_ID}{position:fixed;right:18px;bottom:24px;z-index:1000010;max-width:430px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}
    #${TOAST_ID}.show{opacity:1;transform:translateY(0)}
    #${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.72);font-weight:800}
    @media(max-width:1120px){#${LAYER_ID} .ofBillingHero{grid-template-columns:1fr}#${LAYER_ID} .ofPlanGridLive{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:760px){#${LAYER_ID} .ofPlanGridLive,#${LAYER_ID} .ofAddonGridLive,#${LAYER_ID} .ofBillingFlow,#${LAYER_ID} .ofCurrentGrid{grid-template-columns:1fr}#${LAYER_ID} .ofBillingStatus h2{font-size:27px}#${TOAST_ID}{left:10px;right:10px;bottom:12px;max-width:none}}
  `;
  document.head.appendChild(style);
}

function toast(title, detail = '') {
  ensureStyle();
  let node = document.getElementById(TOAST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = TOAST_ID;
    document.body.appendChild(node);
  }
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
    const [sub, me, addons] = await Promise.allSettled([
      requestJson('/billing/subscription-status', { method: 'GET' }),
      requestJson('/auth/me', { method: 'GET' }),
      requestJson('/billing/addons', { method: 'GET' }),
    ]);

    const subData = sub.status === 'fulfilled' ? sub.value : {};
    const meData = me.status === 'fulfilled' ? (me.value?.user || me.value) : {};
    const addonData = addons.status === 'fulfilled' ? addons.value : {};

    const rawPlan = subData.plan || subData.plan_name || meData.plan || meData.subscription_plan || meData.billing_plan || meData.tier || '';
    const nextPlan = planKey(rawPlan);

    state.currentPlan = validPlan(nextPlan) ? nextPlan : '';
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
    state.hasAppAccess = Boolean(
      subData.has_app_access === true ||
      meData.has_app_access === true ||
      (validPlan(state.currentPlan) && !locked && !isTrialExpired())
    );

    if (state.country) localStorage.setItem(COUNTRY_STORE, state.country);
    if (state.email) localStorage.setItem(EMAIL_STORE, state.email);
  } catch (error) {
    state.error = error?.message || 'Could not load current plan.';
  } finally {
    state.loaded = true;
    state.loading = false;
    const notice = hasCheckoutReturnNotice();
    if (notice) state.notice = notice;
    renderPlans();
  }
}

function buttonLabel(plan) {
  if (state.currentPlan === plan.key) return 'Current plan';
  if (!token()) return 'Create account first';
  if (!validPlan(state.currentPlan)) return `Start ${plan.name} trial`;
  if (state.billingLockReason === 'payment_required' || isTrialExpired()) return `Pay for ${plan.name}`;
  const currentRank = rank(state.currentPlan);
  const nextRank = rank(plan.key);
  if (nextRank > currentRank) return `Upgrade to ${plan.name}`;
  if (nextRank < currentRank) return `Switch to ${plan.name}`;
  return `Choose ${plan.name}`;
}

function renderPlanCard(plan, country) {
  const meta = COUNTRIES[country] || COUNTRIES.NZ;
  const isCurrent = state.currentPlan === plan.key;
  const disabled = isCurrent;
  const badge = isCurrent ? 'Current plan' : plan.badge || '';
  return `
    <article class="ofPlanLiveCard ${plan.badge ? 'featured' : ''}" data-plan-key="${plan.key}" data-current="${isCurrent ? 'true' : 'false'}">
      ${badge ? `<em>${esc(badge)}</em>` : ''}
      <h3>${esc(plan.name)}</h3>
      <div class="ofPlanPrice"><b>${esc(money(plan.price, country))}</b><span>/month ${esc(meta.tax)}</span></div>
      <strong>${esc(incTax(plan.price, country))}</strong>
      <p>${esc(plan.summary)}</p>
      <ul>${plan.includes.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
      <button type="button" class="ofPlanAction ${isCurrent ? 'current' : ''}" data-of-plan-checkout="${plan.key}" ${disabled ? 'disabled' : ''}>${esc(buttonLabel(plan))}</button>
    </article>`;
}

function addonButton(addon) {
  if (!token()) return { label: 'Create account first', disabled: true };
  if (!validPlan(state.currentPlan)) return { label: 'Choose a plan first', disabled: true };
  if (addon.requires && state.currentPlan !== addon.requires) return { label: 'Requires Command', disabled: true };
  if (addon.includedOn && state.currentPlan === addon.includedOn) return { label: 'Included with Command', disabled: true };
  if (addon.key === 'xero_addon' && state.addons.xero_addon_active) return { label: 'Sync add-on active', disabled: true };
  return { label: addon.key === 'command_growth_pack' ? 'Add Growth Pack' : 'Add Accounting Sync', disabled: false };
}

function renderAddonCard(addon, country) {
  const meta = COUNTRIES[country] || COUNTRIES.NZ;
  const action = addonButton(addon);
  const blocks = addon.key === 'command_growth_pack' && state.addons.extra_user_blocks ? `<span>${state.addons.extra_user_blocks} Growth Pack${state.addons.extra_user_blocks === 1 ? '' : 's'} active</span>` : '';
  return `
    <article class="ofAddonLiveCard" data-addon-key="${addon.key}">
      <h3>${esc(addon.name)}</h3>
      <div><b>${esc(money(addon.price, country))}</b> <span>/month ${esc(meta.tax)}</span></div>
      <strong>${esc(incTax(addon.price, country))}</strong>
      <p>${esc(addon.detail)}</p>
      ${blocks}
      <button type="button" class="ofAddonAction" data-of-addon-checkout="${addon.key}" ${action.disabled ? 'disabled' : ''}>${esc(action.label)}</button>
    </article>`;
}

function renderPlans() {
  if (!isPlansPage()) {
    const existing = document.getElementById(LAYER_ID);
    if (existing?.dataset.accountCenter === '3') existing.remove();
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

  layer.className = 'ofPlansAccount';
  layer.dataset.accountCenter = '3';

  const country = normalizeCountry(state.country || detectCountry());
  const meta = COUNTRIES[country] || COUNTRIES.NZ;
  const email = state.email || localStorage.getItem(EMAIL_STORE) || '';
  const current = planName(state.currentPlan);
  const status = statusText();
  const trial = trialText();
  const stripeState = state.stripeSubscriptionId ? 'Stripe subscription saved' : state.stripeCustomerId ? 'Stripe customer saved' : 'Stripe not connected yet';
  const access = state.hasAppAccess ? 'Allowed' : 'Plan required';

  layer.innerHTML = `
    <div class="ofBillingHero">
      <section class="ofBillingStatus">
        <h2>Plan and billing</h2>
        <p>This is the owner account centre. Pick a plan, Churvox opens Stripe, then the return page confirms the session and updates this current-plan box.</p>
        <div class="ofCurrentGrid">
          <span><b>${esc(current)}</b><small>Current plan</small></span>
          <span><b>${esc(status)}</b><small>Status</small></span>
          <span><b>${esc(trial)}</b><small>Trial ends</small></span>
          <span><b>${esc(access)}</b><small>App access</small></span>
        </div>
        <div class="ofBillingNotice">${esc(stripeState)}</div>
        ${state.notice ? `<div class="ofBillingNotice">${esc(state.notice)}</div>` : ''}
        ${state.error ? `<div class="ofPlanError">${esc(state.error)}</div>` : ''}
      </section>
      <section class="ofBillingRegion">
        <label><span>Billing country</span><select data-of-country>${Object.entries(COUNTRIES).map(([code, item]) => `<option value="${code}" ${code === country ? 'selected' : ''}>${esc(item.label)} - ${esc(item.currency)}</option>`).join('')}</select></label>
        <label><span>Owner email</span><input data-of-billing-email type="email" placeholder="owner email" value="${esc(email)}" /></label>
        <div class="ofBillingActions">
          <button type="button" class="primary" data-of-refresh-billing>${state.loading ? 'Refreshing...' : 'Reload current plan'}</button>
          <button type="button" class="quiet" data-of-manage-billing ${state.stripeCustomerId || state.stripeSubscriptionId ? '' : 'disabled'}>Manage billing</button>
        </div>
        <small>Showing ${esc(meta.currency)}. Prices are monthly. ${meta.tax ? `${meta.taxName} is shown as an inclusive guide and handled by Stripe.` : 'Local tax may apply where required.'}</small>
      </section>
    </div>
    <section class="ofBillingFlow">
      <span><b>1. Choose plan</b><small>The boss chooses Start, Crew, Operator or Command.</small></span>
      <span><b>2. Stripe opens</b><small>Checkout is handled securely through the backend billing route.</small></span>
      <span><b>3. Churvox confirms</b><small>The return page verifies the session and refreshes this current-plan box.</small></span>
    </section>
    <div class="ofPlanGridLive">${PLANS.map((plan) => renderPlanCard(plan, country)).join('')}</div>
    <div class="ofAddonGridLive">${ADDONS.map((addon) => renderAddonCard(addon, country)).join('')}</div>
    <div class="ofPlanFinePrint">Pricing is locked: Start $39/month + GST, Crew $89/month + GST, Operator $149/month + GST, Command $299/month + GST. Command Growth Pack is $99/month + GST. Accounting Sync Add-on is $39/month + GST for non-Command tiers.</div>
  `;

  if (!state.loaded && !state.loading) loadBillingStatus();
}

function syncInputs() {
  const countryInput = document.querySelector('[data-of-country]');
  if (countryInput) {
    state.country = normalizeCountry(countryInput.value);
    localStorage.setItem(COUNTRY_STORE, state.country);
  }
  const emailInput = document.querySelector('[data-of-billing-email]');
  if (emailInput) {
    state.email = clean(emailInput.value);
    if (state.email) localStorage.setItem(EMAIL_STORE, state.email);
  }
}

function submitPlanForm(plan, button) {
  const selected = planConfig(plan);
  if (!selected) return;

  syncInputs();

  const authToken = token();
  if (!authToken) {
    const country = normalizeCountry(state.country || detectCountry());
    window.location.assign(`/signup?plan=${encodeURIComponent(selected.code)}&country=${encodeURIComponent(country)}`);
    return;
  }

  const oldText = button?.textContent || '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Opening Stripe...';
  }

  try {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = apiUrl('/billing/start-checkout-form');
    form.style.display = 'none';

    const fields = {
      token: authToken,
      plan: selected.key,
      ui_plan: selected.code,
      country: normalizeCountry(state.country || detectCountry()),
      email: state.email || localStorage.getItem(EMAIL_STORE) || '',
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = clean(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    toast('Opening Stripe Checkout', `${selected.name} ${money(selected.price, fields.country)}/month ${COUNTRIES[fields.country]?.tax || ''}.`);
    form.submit();
  } catch (error) {
    if (button) {
      button.disabled = false;
      button.textContent = oldText;
    }
    toast('Checkout could not open', error?.message || 'Could not submit checkout form.');
  }
}

async function openAddonCheckout(addonKey, button) {
  const addon = ADDONS.find((item) => item.key === addonKey);
  if (!addon) return;

  syncInputs();

  if (!token()) {
    window.location.assign(`/signup?country=${encodeURIComponent(normalizeCountry(state.country || detectCountry()))}`);
    return;
  }

  const availability = addonButton(addon);
  if (availability.disabled) {
    toast('Add-on not available yet', availability.label);
    return;
  }

  const oldText = button?.textContent || '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Opening Stripe...';
  }

  try {
    const country = normalizeCountry(state.country || detectCountry());
    const payload = {
      addon: addon.key,
      addon_key: addon.key,
      country,
      billing_country: country,
      quantity: addon.key === 'command_growth_pack' ? 1 : 1,
    };
    const body = await requestJson('/billing/create-addon-checkout-session', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const url = body?.url || body?.checkout_url || body?.session_url;
    if (!url) throw new Error('Stripe checkout URL missing');
    toast('Opening Stripe Checkout', addon.name);
    window.location.assign(url);
  } catch (error) {
    if (button) {
      button.disabled = false;
      button.textContent = oldText;
    }
    toast('Add-on checkout could not open', error?.message || 'The backend did not return a Stripe URL.');
  }
}

async function openBillingPortal(button) {
  if (!(state.stripeCustomerId || state.stripeSubscriptionId)) {
    toast('No Stripe account yet', 'Choose a plan first, then billing management becomes available.');
    return;
  }

  const oldText = button?.textContent || '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Opening billing...';
  }

  const endpoints = ['/billing/customer-portal', '/billing/portal', '/stripe/portal', '/create-portal-session'];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const body = await requestJson(endpoint, {
        method: 'POST',
        body: JSON.stringify({ return_url: `${window.location.origin}/plans` }),
      });
      const url = body?.url || body?.portal_url || body?.session_url;
      if (!url) throw new Error('Billing portal URL missing');
      window.location.assign(url);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  if (button) {
    button.disabled = false;
    button.textContent = oldText;
  }
  toast('Billing portal not ready', lastError?.message || 'No billing portal route returned a URL yet.');
}

function scheduleRender(forceStatus = false) {
  if (state.renderQueued) return;
  state.renderQueued = true;
  setTimeout(() => {
    renderPlans();
    if (forceStatus) loadBillingStatus(true);
    state.renderQueued = false;
  }, 80);
}

function handleClick(event) {
  const refresh = event.target.closest('[data-of-refresh-billing]');
  if (refresh) {
    event.preventDefault();
    loadBillingStatus(true);
    return;
  }

  const manage = event.target.closest('[data-of-manage-billing]');
  if (manage) {
    event.preventDefault();
    openBillingPortal(manage);
    return;
  }

  const planButton = event.target.closest('[data-of-plan-checkout]');
  if (planButton) {
    event.preventDefault();
    event.stopPropagation();
    submitPlanForm(planButton.dataset.ofPlanCheckout, planButton);
    return;
  }

  const addonButtonNode = event.target.closest('[data-of-addon-checkout]');
  if (addonButtonNode) {
    event.preventDefault();
    event.stopPropagation();
    openAddonCheckout(addonButtonNode.dataset.ofAddonCheckout, addonButtonNode);
    return;
  }

  if (event.target.closest('.churvoxOptionC .cocNav button')) {
    setTimeout(() => scheduleRender(), 120);
  }
}

function handleInput(event) {
  if (event.target.closest('[data-of-country]')) {
    syncInputs();
    scheduleRender();
  }
  if (event.target.closest('[data-of-billing-email]')) {
    syncInputs();
  }
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OPTION_F_PLANS_ACCOUNT_CENTER_V3__) {
  window.__CHURVOX_OPTION_F_PLANS_ACCOUNT_CENTER_V3__ = true;
  state.country = detectCountry();
  state.email = localStorage.getItem(EMAIL_STORE) || '';
  state.notice = hasCheckoutReturnNotice();

  window.addEventListener('load', () => scheduleRender(true));
  window.addEventListener('hashchange', () => scheduleRender(true));
  window.addEventListener('popstate', () => scheduleRender(true));
  window.addEventListener('churvox-auth-refresh', () => loadBillingStatus(true));

  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleInput, true);
  document.addEventListener('input', handleInput, true);
}

export {};
