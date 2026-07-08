const FLAG = '__CHURVOX_BUSINESS_SYSTEM_SUITE_RUNTIME_CLEAN__';
const OWNER_ID = 'churvox-business-system-suite-panel';
const HQ_ID = 'churvox-hq-tester-friction-panel';
const STYLE_ID = 'churvox-business-system-suite-style';

function path() {
  return window.location.pathname || '';
}

function isOwnerApp() {
  const p = path();
  return p === '/dashboard' || p.startsWith('/dashboard');
}

function removeOwnerPanel() {
  document.getElementById(OWNER_ID)?.remove();
  const anchor = document.getElementById('churvox-business-system-dashboard-anchor');
  if (anchor) anchor.remove();
}

function removeEmptyStyleWhenUnused() {
  if (!document.getElementById(OWNER_ID) && !document.getElementById(HQ_ID)) {
    document.getElementById(STYLE_ID)?.remove();
  }
}

function cleanOwnerDashboardChrome() {
  if (!isOwnerApp()) return;
  removeOwnerPanel();
  removeEmptyStyleWhenUnused();
}

function scheduleClean() {
  [0, 80, 250, 700, 1500, 3200, 6500, 12000, 22000, 45000].forEach((delay) => {
    window.setTimeout(cleanOwnerDashboardChrome, delay);
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  scheduleClean();
  window.addEventListener('load', scheduleClean);
  window.addEventListener('hashchange', scheduleClean);
  window.addEventListener('popstate', scheduleClean);
  window.addEventListener('churvox-owner-app-ready', scheduleClean);
  window.addEventListener('churvox:data-refresh', scheduleClean);
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {
      if (isOwnerApp() && (document.getElementById(OWNER_ID) || document.getElementById('churvox-business-system-dashboard-anchor'))) {
        window.setTimeout(cleanOwnerDashboardChrome, 40);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
}

export {};
