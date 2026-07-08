// CHURVOX_NAV_BADGES_SAFE_OFF_20260708
// Badges are disabled until every count has a dedicated reliable unread/attention endpoint.
// This prevents wrong numbers showing beside nav labels.

const FLAG = '__CHURVOX_NAV_BADGES_SAFE_OFF__';

function clearAllBadges() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.cvxNavBadge,.cvxWorkerNavBadge').forEach((node) => node.remove());
  document.querySelectorAll('[data-cvx-has-badge]').forEach((node) => node.removeAttribute('data-cvx-has-badge'));
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  clearAllBadges();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', clearAllBadges, { once: true });
  window.addEventListener('load', clearAllBadges);
  window.addEventListener('hashchange', clearAllBadges);
  window.addEventListener('popstate', clearAllBadges);
  window.addEventListener('churvox:data-refresh', clearAllBadges);
  window.addEventListener('churvox-owner-app-ready', clearAllBadges);
  window.addEventListener('churvox-worker-app-ready', clearAllBadges);
  [80, 400, 1200, 2500, 6000].forEach((delay) => window.setTimeout(clearAllBadges, delay));
}

export {};
