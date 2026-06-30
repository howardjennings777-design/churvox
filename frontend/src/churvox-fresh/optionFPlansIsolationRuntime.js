// CHURVOX_OPTION_F_PLANS_ISOLATION_RUNTIME_20260629
// Keeps the account billing Plans page from being polluted by generic workspace wiring panels.

import API_BASE from '../lib/apiBase';

const LAYER_ID = 'option-f-plans-pricing-desk';
const TOAST_ID = 'option-f-plans-smart-toast';
const COUNTRY_STORE = 'churvox:billing-country';
const EMAIL_STORE = 'churvox:billing-email';

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
const PLAN_CODES = { solo: 'start', team: 'crew', pro: 'operator', enterprise: 'command' };
const PLAN_NAMES = { solo: 'Start', team: 'Crew', pro: 'Operator', enterprise: 'Command' };

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
function clean(value) {
  return text(value).toLowerCase();
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}
function apiUrl(path) {
  return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`;
}
function token() {
  try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; }
}
function headers() {
  const auth = token();
  return auth ? { Authorization: `Bearer ${auth}` } : {};
}
function planKey(value) {
  const raw = clean(value);
  return PLAN_ALIASES[raw] || raw;
}
function isValidPlan(value) {
  return ['solo', 'team', 'pro', 'enterprise'].includes(planKey(value));
}
function country() {
  try {
    const selected = document.querySelector('#option-f-plans-pricing-desk [data-of-country]')?.value;
    if (selected) return String(selected).toUpperCase();
    const saved = localStorage.getItem(COUNTRY_STORE);
    if (saved) return String(saved).toUpperCase();
  } catch (_) {}
  return 'NZ';
}
function email() {
  try {
    return text(document.querySelector('#option-f-plans-pricing-desk [data-of-billing-email]')?.value || localStorage.getItem(EMAIL_STORE) || '');
  } catch (_) {
    return '';
  }
}
function isPlansPage() {
  const path = clean(window.location.pathname || '');
  const hash = clean((window.location.hash || '').replace('#', ''));
  if (path === '/plans' || path.endsWith('/plans') || hash === 'plans') return true;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return clean(active?.textContent) === 'plans';
}
function toast(title, detail = '') {
  let node = document.getElementById(TOAST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = TOAST_ID;
    node.style.cssText = 'position:fixed;right:18px;bottom:84px;z-index:1000012;max-width:420px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none';
    document.body.appendChild(node);
  }
  node.innerHTML = `<b>${esc(title)}</b>${detail ? `<small style="display:block;margin-top:4px;color:rgba(255,255,255,.72);font-weight:800">${esc(detail)}</small>` : ''}`;
  node.style.opacity = '1';
  node.style.transform = 'translateY(0)';
  clearTimeout(node._timer);
  node._timer = setTimeout(() => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(12px)';
  }, 3300);
}
async function json(path, body = null) {
  const response = await fetch(apiUrl(path), {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) throw new Error(payload?.detail || payload?.error || payload?.message || `HTTP ${response.status}`);
  return payload?.data?.data || payload?.data || payload;
}
async function currentBillingPlan() {
  try {
    const [status, me] = await Promise.allSettled([json('/billing/subscription-status'), json('/auth/me')]);
    const statusData = status.status === 'fulfilled' ? status.value : {};
    const meData = me.status === 'fulfilled' ? (me.value?.user || me.value) : {};
    return planKey(statusData.plan || statusData.plan_name || meData.plan || meData.current_plan || '');
  } catch (_) {
    return '';
  }
}
function postDirectForm(plan) {
  const auth = token();
  if (!auth) {
    window.location.assign(`/signup?plan=${encodeURIComponent(PLAN_CODES[plan] || plan)}&country=${encodeURIComponent(country())}`);
    return;
  }
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = apiUrl('/billing/start-checkout-form');
  form.style.display = 'none';
  const fields = { token: auth, plan, ui_plan: PLAN_CODES[plan] || plan, country: country(), email: email() };
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = text(value);
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}
async function openSmartPlan(plan, button) {
  if (button?.closest?.('[data-churvox-qa-control]') || button?.getAttribute?.('data-churvox-qa-control')) {
    toast('Checkout control ready', 'Smart checkout skipped for audit.');
    return;
  }
  const key = planKey(plan);
  if (!isValidPlan(key)) return;
  if (!token()) return postDirectForm(key);

  const oldText = button?.textContent || '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Opening Stripe...';
  }

  const current = await currentBillingPlan();
  if (!isValidPlan(current)) {
    toast('Opening Stripe trial', `${PLAN_NAMES[key] || key} plan selected.`);
    postDirectForm(key);
    return;
  }

  try {
    toast('Opening Stripe checkout', `${PLAN_NAMES[key] || key} plan selected.`);
    const payload = { plan: key, country: country(), billing_country: country() };
    const body = await json('/billing/create-checkout-session', payload);
    const url = body?.url || body?.checkout_url || body?.session_url;
    if (!url) throw new Error('Stripe checkout URL missing');
    window.location.assign(url);
  } catch (error) {
    toast('Using direct Stripe checkout', error?.message || 'Checkout session route did not return a URL.');
    postDirectForm(key);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = oldText;
    }
  }
}

function isolatePlans() {
  if (!isPlansPage()) return;
  const account = document.getElementById(LAYER_ID);
  if (!account) return;
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;

  root.querySelectorAll('.ofHardActions,.ofHardSaved,.ofHardAudit,.ofPlanActions,.ofPlanIncluded,.ofPlanGst,.churvoxStripeLiveStatus,.churvoxStripeLiveDetails').forEach((node) => {
    if (!account.contains(node)) node.remove();
  });

  root.querySelectorAll('[data-plan-action],[data-hard-action="plan-operator"],[data-hard-action="plan-command"],[data-stripe-live-plan],[data-stripe-plan]').forEach((node) => {
    if (!account.contains(node)) node.removeAttribute('data-plan-action');
  });
}

function schedule() {
  window.setTimeout(isolatePlans, 40);
  window.setTimeout(isolatePlans, 180);
}
function clickHandler(event) {
  const button = event.target.closest('[data-of-smart-plan-checkout]');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  openSmartPlan(button.getAttribute('data-of-smart-plan-checkout'), button);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OPTION_F_PLANS_ISOLATION__) {
  window.__CHURVOX_OPTION_F_PLANS_ISOLATION__ = true;
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  document.addEventListener('click', clickHandler, true);
  document.addEventListener('click', schedule, true);
  document.addEventListener('change', schedule, true);
  const observer = new MutationObserver(() => {
    if (isPlansPage()) schedule();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};