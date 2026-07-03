// CHURVOX_TRIAL_EXPIRY_REDIRECT_20260704_NAV_SAFE
// Only redirects on a confirmed expired/payment-required owner account.
// It must not block normal navigation from stale or incomplete cached session data.

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__CHURVOX_TRIAL_EXPIRY_REDIRECT_NAV_SAFE__) return;
  window.__CHURVOX_TRIAL_EXPIRY_REDIRECT_NAV_SAFE__ = true;

  const SESSION_CACHE_KEY = 'churvox_last_valid_user';

  function clean(value) { return String(value || '').trim().toLowerCase(); }
  function cachedUser() {
    try {
      const raw = localStorage.getItem(SESSION_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.user || parsed || null;
    } catch { return null; }
  }
  function isWorkerLike(user) {
    const role = clean(user?.role || user?.user_role || user?.account_role);
    return ['worker', 'payroll', 'payroll_user'].includes(role) || user?.is_worker === true || Boolean(user?.worker_id);
  }
  function isConfirmedExpired(user) {
    if (!user || isWorkerLike(user)) return false;
    const status = clean(user.subscription_status || user.billing_status || user.stripe_status);
    if (status === 'payment_required') return true;
    if (!user.trial_ends_at) return false;
    if (['active', 'paid'].includes(status)) return false;
    try { return new Date(user.trial_ends_at) < new Date(); } catch { return false; }
  }
  function check() {
    const path = window.location.pathname || '';
    if (!path.startsWith('/dashboard')) return;
    const hash = clean((window.location.hash || '').replace('#', ''));
    if (['plans', 'support', 'help', 'setupassistant', 'firstrun'].includes(hash)) return;
    const user = cachedUser();
    if (isConfirmedExpired(user)) {
      window.history.replaceState({}, '', '/plans?trial=expired&payment_required=1');
      window.dispatchEvent(new Event('hashchange'));
    }
  }

  window.addEventListener('load', () => setTimeout(check, 800));
  window.addEventListener('hashchange', () => setTimeout(check, 100));
  window.addEventListener('storage', () => setTimeout(check, 100));
  setInterval(check, 3000);
})();

export {};
