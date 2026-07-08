const FLAG = '__CHURVOX_WORKER_APP_CLEAN_RUNTIME__';

function isWorkerRoute() {
  return /^\/worker(?:\/|$)/i.test(window.location.pathname || '');
}

function isProfileRoute() {
  return /^\/worker\/(profile|settings)(?:\/|$)?/i.test(window.location.pathname || '');
}

function text(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function syncBodyClass() {
  if (!document?.body) return;
  const worker = isWorkerRoute();
  document.body.classList.toggle('churvoxWorkerCleanBody', worker);
  if (worker) {
    document.body.classList.remove('cvxPocketOwnerReady');
    document.getElementById('cvxPocketOwner')?.remove();
  }
}

function removeStrayLogout(workerRoot) {
  if (!isWorkerRoute() || isProfileRoute()) return;
  document.querySelectorAll('button,a').forEach((node) => {
    const copy = text(node).toLowerCase();
    if (copy === 'log out' || copy === 'logout') node.remove();
  });
  if (!workerRoot) return;
  workerRoot.querySelectorAll('button,a').forEach((node) => {
    const copy = text(node).toLowerCase();
    if (copy === 'log out' || copy === 'logout') node.remove();
  });
}

function removeDuplicateSplashes() {
  if (!isWorkerRoute()) return;
  [
    '#churvox-worker-pre-react-shell', '#churvox-launch-splash', '#churvox-loading-splash', '#launch-splash',
    '.churvoxLaunchSplash', '.launchSplash', '.appSplash', '.loadingSplash', '.workerSplash',
    '[data-churvox-splash]', '[data-churvox-worker-pre-react]', '[data-splash]', '[id*="splash"]', '[class*="Splash"]'
  ].forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (node.closest?.('.simpleWorkerApp')) return;
      node.remove();
    });
  });
}

function removeOwnerOverlays() {
  if (!isWorkerRoute()) return;
  const workerRoot = document.querySelector('.simpleWorkerApp');
  removeDuplicateSplashes();
  document.body.classList.remove('cvxPocketOwnerReady');
  document.getElementById('cvxPocketOwner')?.remove();
  const selectors = [
    '.cvxDrawerLayer', '.cvxDrawer', '.cvxModal', '.cvxSheet', '.cvxPanel', '.cvxRecordDrawer',
    '[data-cvx-drawer]', '[data-cvx-record]', '[data-churvox-command-ledger]', '[data-cvx-command-brain]',
    '.cocPanel', '.cvxPaymentPanel', '#churvox-xero-payments-panel', '.swLedger', '[data-churvox-worker-ledger]', '[data-churvox-worker-problems]',
    '.legacyWorkerShell', '.oldWorkerApp', '.workerAdminLedger', '.workerPremiumPatch'
  ];
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (workerRoot && workerRoot.contains(node) && node.classList?.contains('swNav')) return;
      node.remove();
    });
  });
  document.querySelectorAll('section,div,main,aside,form').forEach((node) => {
    if (workerRoot && workerRoot.contains(node)) return;
    const copy = text(node).toLowerCase();
    if (/new record|add job|job form|working job form|save record|payment not ready|take card payment|admin ledger|command lanes|loading your run sheet|opening owner command/.test(copy) && copy.length < 1500) node.remove();
  });
  removeStrayLogout(workerRoot);
}

function markWorkerReady() {
  if (!isWorkerRoute()) return;
  const root = document.querySelector('.simpleWorkerApp');
  if (root) {
    root.style.removeProperty('display');
    root.style.removeProperty('visibility');
    root.dataset.workerAppClean = 'true';
    window.dispatchEvent(new Event('churvox-worker-app-ready'));
  }
}

function cleanNow() {
  syncBodyClass();
  if (!isWorkerRoute()) return;
  removeDuplicateSplashes();
  removeOwnerOverlays();
  markWorkerReady();
}

function schedule() {
  syncBodyClass();
  if (!isWorkerRoute()) return;
  [0, 1, 10, 25, 40, 90, 160, 360, 800, 1500, 2800, 5000].forEach((delay) => {
    window.setTimeout(cleanNow, delay);
  });
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
  window.addEventListener('load', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox:data-refresh', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox-worker-app-ready', schedule);
  const observer = new MutationObserver(cleanNow);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
}

export {};
