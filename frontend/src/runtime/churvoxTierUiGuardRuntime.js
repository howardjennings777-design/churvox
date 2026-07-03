// CHURVOX_TIER_UI_GUARD_20260704_NAV_SAFE
// Shows plan/trial status on Plans only. Backend enforces the real tier locks.
// This file must never hide or intercept the owner nav.

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__CHURVOX_TIER_UI_GUARD_NAV_SAFE__) return;
  window.__CHURVOX_TIER_UI_GUARD_NAV_SAFE__ = true;

  const SESSION_CACHE_KEY = 'churvox_last_valid_user';
  const STYLE_ID = 'churvox-tier-ui-guard-style';
  const BANNER_ID = 'churvox-plan-trial-status-banner';
  const PLAN_ALIAS = { start: 'solo', solo: 'solo', crew: 'team', team: 'team', operator: 'pro', pro: 'pro', command: 'enterprise', enterprise: 'enterprise' };
  const LABELS = { solo: 'Start', team: 'Crew', pro: 'Operator', enterprise: 'Command', accounting: 'Accounting Sync Add-on or Command', none: 'No plan' };
  const LIMITS = {
    solo: { clients: 250, jobsPerMonth: 50, activeTeamMembers: 1 },
    team: { clients: 1000, jobsPerMonth: 150, activeTeamMembers: 5 },
    pro: { clients: 3000, jobsPerMonth: 500, activeTeamMembers: 15 },
    enterprise: { clients: 10000, jobsPerMonth: 1500, activeTeamMembers: 50 },
  };

  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function lower(value) { return clean(value).toLowerCase(); }
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
  function planKey(value) { const raw = lower(value); return PLAN_ALIAS[raw] || (raw in LIMITS ? raw : 'none'); }
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
    if (['active', 'paid'].includes(lower(user.subscription_status || user.billing_status))) return false;
    try { return new Date(user.trial_ends_at) < new Date(); } catch { return false; }
  }
  function trialDaysLeft(user) {
    if (Number.isFinite(Number(user?.trial_days_left))) return Number(user.trial_days_left);
    if (!user?.trial_ends_at) return null;
    try {
      const ms = new Date(user.trial_ends_at).getTime() - Date.now();
      if (!Number.isFinite(ms)) return null;
      return Math.max(0, Math.ceil(ms / 86400000));
    } catch { return null; }
  }
  function apiBase() {
    return String(window.__CHURVOX_API_BASE__ || process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
  }
  function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
  async function readBilling() {
    try {
      const t = token();
      const res = await fetch(`${apiBase()}/api/billing/subscription-status`, {
        credentials: 'include',
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .churvoxOptionC .cocNav button.churvoxTierLocked{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      #${BANNER_ID}{margin:0 0 12px;padding:13px 14px;border:1px solid rgba(249,115,22,.22);border-radius:20px;background:linear-gradient(135deg,#111827,#18212f 64%,#7c2d12);color:#fff;box-shadow:0 16px 36px rgba(15,23,42,.14);font-family:Inter,system-ui,sans-serif}
      #${BANNER_ID} .cvPlanTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      #${BANNER_ID} b{display:block;font-size:16px;font-weight:1000;line-height:1.08}
      #${BANNER_ID} span{display:block;margin-top:3px;color:rgba(255,255,255,.76);font-size:12px;font-weight:850;line-height:1.35}
      #${BANNER_ID} .cvPlanPill{display:inline-flex;border-radius:999px;background:rgba(249,115,22,.18);border:1px solid rgba(249,115,22,.26);padding:6px 9px;color:#fed7aa;font-size:11px;font-weight:1000}
      #${BANNER_ID} .cvPlanLimits{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      #${BANNER_ID} .cvPlanLimits i{font-style:normal;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);padding:5px 8px;color:rgba(255,255,255,.82);font-size:10px;font-weight:1000}
      @media(max-width:700px){#${BANNER_ID}{padding:11px;border-radius:16px}#${BANNER_ID} .cvPlanTop{display:grid}}
    `;
    document.head.appendChild(style);
  }
  function restoreNav() {
    document.querySelectorAll('.churvoxOptionC .cocNav button').forEach((button) => {
      button.classList.remove('churvoxTierLocked');
      button.removeAttribute('aria-disabled');
      button.removeAttribute('title');
      delete button.dataset.requiredPlan;
      button.style.pointerEvents = '';
      button.style.visibility = '';
      button.style.opacity = '';
      button.style.display = '';
    });
  }
  function planStatusCopy(data) {
    const user = { ...userFromCache(), ...(data || {}) };
    const plan = planKey(user.plan || user.ui_plan || user.current_plan || user.subscription_plan || user.billing_plan || user.tier);
    const status = lower(user.subscription_status || user.billing_status || user.stripe_status);
    const days = trialDaysLeft(user);
    const expired = trialExpired(user) || user.trial_expired === true || status === 'payment_required';
    if (!plan || plan === 'none') return { title: 'Choose a plan to start Churvox', detail: '14-day trial. No card upfront. Trial can only be used once per account.', pill: 'No plan yet', plan };
    if (expired) return { title: 'Trial ended — choose a paid plan to continue', detail: 'Your free trial cannot be restarted on this account. Pick a paid plan to unlock the owner app again.', pill: `${LABELS[plan] || plan} · payment required`, plan };
    if (status === 'trialing') return { title: `${LABELS[plan] || plan} trial active`, detail: `${days ?? 14} day${days === 1 ? '' : 's'} left. Important actions stay owner-approved in Command.`, pill: '14-day trial', plan };
    if (status === 'active' || status === 'paid') return { title: `${LABELS[plan] || plan} plan active`, detail: 'Billing is active. Backend tier locks control what Churvox allows.', pill: 'Paid account', plan };
    return { title: `${LABELS[plan] || plan} selected`, detail: 'Finish billing or trial setup to keep using Churvox.', pill: status || 'needs billing', plan };
  }
  async function renderPlanBanner() {
    const hash = lower((window.location.hash || '').replace('#', ''));
    const plansOpen = window.location.pathname === '/plans' || hash === 'plans' || Boolean(document.querySelector('.churvoxOptionC .plansPage'));
    if (!plansOpen) { document.getElementById(BANNER_ID)?.remove(); return; }
    const target = document.querySelector('.churvoxOptionC .plansPage') || document.querySelector('.churvoxOptionC .workspace .cocPage') || document.querySelector('.churvoxOptionC .workspace') || document.querySelector('.freshApp');
    if (!target) return;
    ensureStyle();
    const billing = await readBilling();
    const info = planStatusCopy(billing);
    const limits = billing?.limits || LIMITS[info.plan] || {};
    let node = document.getElementById(BANNER_ID);
    if (!node) { node = document.createElement('section'); node.id = BANNER_ID; target.prepend(node); }
    const html = `<div class="cvPlanTop"><div><b>${esc(info.title)}</b><span>${esc(info.detail)}</span></div><div class="cvPlanPill">${esc(info.pill)}</div></div><div class="cvPlanLimits"><i>${Number(limits.clients || 0).toLocaleString('en-NZ')} clients</i><i>${Number(limits.jobsPerMonth || 0).toLocaleString('en-NZ')} jobs/month</i><i>${Number(limits.activeTeamMembers || 0).toLocaleString('en-NZ')} active team</i></div>`;
    if (node.dataset.html !== html) { node.dataset.html = html; node.innerHTML = html; }
  }
  function refresh() {
    ensureStyle();
    restoreNav();
    renderPlanBanner();
  }

  window.addEventListener('load', () => setTimeout(refresh, 500));
  window.addEventListener('hashchange', () => setTimeout(refresh, 80));
  window.addEventListener('popstate', () => setTimeout(refresh, 80));
  window.addEventListener('storage', () => setTimeout(refresh, 80));
  setInterval(refresh, 1800);
})();

export {};
