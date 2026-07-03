// CHURVOX_TIER_UI_GUARD_20260704
// Small visual/click guard for the fresh owner app. Backend still enforces the real locks.

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__CHURVOX_TIER_UI_GUARD__) return;
  window.__CHURVOX_TIER_UI_GUARD__ = true;

  const SESSION_CACHE_KEY = 'churvox_last_valid_user';
  const STYLE_ID = 'churvox-tier-ui-guard-style';
  const PLAN_ALIAS = { start: 'solo', solo: 'solo', crew: 'team', team: 'team', operator: 'pro', pro: 'pro', command: 'enterprise', enterprise: 'enterprise' };
  const RANK = { none: 0, '': 0, solo: 1, team: 2, pro: 3, enterprise: 4 };
  const LABELS = { solo: 'Start', team: 'Crew', pro: 'Operator', enterprise: 'Command', accounting: 'Accounting Sync Add-on or Command' };
  const NAV_REQUIREMENTS = {
    'AI Guide': 'solo',
    'Setup Guide': 'solo',
    Command: 'solo',
    Jobs: 'solo',
    Clients: 'solo',
    Quotes: 'solo',
    Invoices: 'solo',
    Team: 'team',
    Workers: 'team',
    Payroll: 'enterprise',
    Xero: 'accounting',
    Settings: 'solo',
    Plans: null,
    Support: null,
  };

  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function lower(value) { return clean(value).toLowerCase(); }
  function planKey(value) { const raw = lower(value); return PLAN_ALIAS[raw] || (raw in RANK ? raw : 'none'); }
  function userFromCache() {
    try {
      const raw = localStorage.getItem(SESSION_CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed?.user || parsed || {};
    } catch { return {}; }
  }
  function trialExpired(user) {
    if (!user?.trial_ends_at) return false;
    if (lower(user.subscription_status) === 'active' || lower(user.subscription_status) === 'paid') return false;
    try { return new Date(user.trial_ends_at) < new Date(); } catch { return false; }
  }
  function currentUser() {
    const user = userFromCache();
    const plan = planKey(user.plan || user.ui_plan || user.current_plan || user.subscription_plan || user.billing_plan || user.tier);
    const status = lower(user.subscription_status || user.billing_status || user.stripe_status);
    const accounting = user.xero_addon_active === true || user.accounting_sync_addon_active === true || user.accounting_sync_active === true;
    return { user, plan, status, accounting, expired: trialExpired(user) };
  }
  function hasAccess(required) {
    if (!required) return true;
    const { plan, status, accounting, expired } = currentUser();
    if (expired) return false;
    if (required === 'accounting') return plan === 'enterprise' || accounting;
    if (!['trialing', 'active', 'paid', 'tester_free'].includes(status)) return false;
    return (RANK[plan] || 0) >= (RANK[required] || 0);
  }
  function labelFor(required) { return LABELS[required] || required || 'plan'; }
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .churvoxOptionC .cocNav button.churvoxTierLocked{display:none!important}
      .churvox-tier-lock-notice{position:fixed;left:50%;bottom:24px;z-index:999999;transform:translateX(-50%);max-width:min(420px,calc(100vw - 24px));border-radius:16px;background:#111827;color:#fff;padding:12px 14px;box-shadow:0 18px 44px rgba(15,23,42,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;pointer-events:none;transition:.16s ease}.churvox-tier-lock-notice.show{opacity:1;bottom:34px}.churvox-tier-lock-notice small{display:block;margin-top:3px;color:rgba(255,255,255,.72)}
    `;
    document.head.appendChild(style);
  }
  function notice(title, detail) {
    ensureStyle();
    let node = document.querySelector('.churvox-tier-lock-notice');
    if (!node) { node = document.createElement('div'); node.className = 'churvox-tier-lock-notice'; document.body.appendChild(node); }
    node.innerHTML = `<b>${title}</b><small>${detail}</small>`;
    node.classList.add('show');
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.classList.remove('show'), 2600);
  }
  function guardNav() {
    const root = document.querySelector('.churvoxOptionC .cocNav');
    if (!root) return;
    ensureStyle();
    root.querySelectorAll('button').forEach((button) => {
      const text = clean(button.textContent);
      const required = NAV_REQUIREMENTS[text];
      const locked = required && !hasAccess(required);
      button.classList.toggle('churvoxTierLocked', Boolean(locked));
      if (locked) {
        button.setAttribute('aria-disabled', 'true');
        button.setAttribute('title', `${text} requires ${labelFor(required)}`);
        button.dataset.requiredPlan = required;
      } else {
        button.removeAttribute('aria-disabled');
        button.removeAttribute('title');
        delete button.dataset.requiredPlan;
      }
    });
    const hash = clean((window.location.hash || '').replace('#', ''));
    const match = Object.entries(NAV_REQUIREMENTS).find(([label]) => lower(label).replace(/\s+/g, '') === lower(hash));
    if (match && match[1] && !hasAccess(match[1])) {
      window.history.replaceState({}, '', '/dashboard#plans');
      notice('Plan locked', `${match[0]} requires ${labelFor(match[1])}.`);
    }
  }
  function handleClick(event) {
    const button = event.target?.closest?.('.churvoxOptionC .cocNav button');
    if (!button) return;
    const required = button.dataset.requiredPlan;
    if (!required) return;
    event.preventDefault();
    event.stopPropagation();
    notice('Plan locked', `${clean(button.textContent)} requires ${labelFor(required)}.`);
    window.history.replaceState({}, '', '/dashboard#plans');
    window.dispatchEvent(new Event('hashchange'));
  }

  document.addEventListener('click', handleClick, true);
  window.addEventListener('load', () => setTimeout(guardNav, 600));
  window.addEventListener('hashchange', () => setTimeout(guardNav, 100));
  window.addEventListener('storage', () => setTimeout(guardNav, 100));
  setInterval(guardNav, 1800);
})();

export {};
