// CHURVOX_TRIAL_EXPIRY_REDIRECT_20260704
// Keeps expired/no-plan owner sessions on Plans instead of letting the shell look usable.

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__CHURVOX_TRIAL_EXPIRY_REDIRECT__) return;
  window.__CHURVOX_TRIAL_EXPIRY_REDIRECT__ = true;

  const SESSION_CACHE_KEY = 'churvox_last_valid_user';
  const PLAN_ALIAS = { start: 'solo', solo: 'solo', crew: 'team', team: 'team', operator: 'pro', pro: 'pro', command: 'enterprise', enterprise: 'enterprise' };

  function clean(value) { return String(value || '').trim().toLowerCase(); }
  function planKey(value) { const raw = clean(value); return PLAN_ALIAS[raw] || raw; }
  function cachedUser() {
    try {
      const raw = localStorage.getItem(SESSION_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.user || parsed || null;
    } catch { return null; }
  }
  function expired(user) {
    if (!user?.trial_ends_at) return false;
    if (['active', 'paid'].includes(clean(user.subscription_status || user.billing_status))) return false;
    try { return new Date(user.trial_ends_at) < new Date(); } catch { return false; }
  }
  function hasBaseAccess(user) {
    if (!user) return true;
    const role = clean(user.role || user.user_role || user.account_role);
    if (['worker', 'payroll', 'payroll_user'].includes(role) || user.is_worker === true || user.worker_id) return true;
    const plan = planKey(user.plan || user.ui_plan || user.current_plan || user.subscription_plan || user.billing_plan || user.tier);
    const status = clean(user.subscription_status || user.billing_status || user.stripe_status);
    if (!['solo', 'team', 'pro', 'enterprise'].includes(plan)) return false;
    if (expired(user)) return false;
    return ['trialing', 'active', 'paid', 'tester_free'].includes(status);
  }
  function check() {
    const path = window.location.pathname || '';
    if (!path.startsWith('/dashboard')) return;
    const hash = clean((window.location.hash || '').replace('#', ''));
    if (['plans', 'support', 'help', 'setupassistant', 'firstrun'].includes(hash)) return;
    const user = cachedUser();
    if (!hasBaseAccess(user)) {
      window.history.replaceState({}, '', expired(user) ? '/plans?trial=expired' : '/plans?choose_plan=1');
      window.dispatchEvent(new Event('hashchange'));
    }
  }

  window.addEventListener('load', () => setTimeout(check, 800));
  window.addEventListener('hashchange', () => setTimeout(check, 100));
  window.addEventListener('storage', () => setTimeout(check, 100));
  setInterval(check, 3000);
})();

export {};
