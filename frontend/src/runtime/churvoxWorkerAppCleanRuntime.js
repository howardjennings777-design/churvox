const FLAG = '__CHURVOX_WORKER_APP_CLEAN_RUNTIME__';

function isWorkerRoute() {
  return /^\/worker(?:\/|$)/i.test(window.location.pathname || '');
}

function text(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function syncBodyClass() {
  if (!document?.body) return;
  document.body.classList.toggle('churvoxWorkerCleanBody', isWorkerRoute());
}

function removeOwnerOverlays() {
  if (!isWorkerRoute()) return;
  const workerRoot = document.querySelector('.simpleWorkerApp');
  const selectors = [
    '.cvxDrawerLayer', '.cvxDrawer', '.cvxModal', '.cvxSheet', '.cvxPanel', '.cvxRecordDrawer',
    '[data-cvx-drawer]', '[data-cvx-record]', '[data-churvox-command-ledger]', '[data-cvx-command-brain]',
    '.cocPanel', '.cvxPaymentPanel', '#churvox-xero-payments-panel', '.swLedger', '[data-churvox-worker-ledger]', '[data-churvox-worker-problems]'
  ];
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      if (workerRoot && workerRoot.contains(node) && node.classList?.contains('swNav')) return;
      node.remove();
    });
  });
  document.querySelectorAll('section,div,main,aside').forEach((node) => {
    if (workerRoot && workerRoot.contains(node)) return;
    const copy = text(node).toLowerCase();
    if (/new record|job form|working job form|save record|payment not ready|take card payment/.test(copy) && copy.length < 900) node.remove();
  });
}

function markWorkerReady() {
  if (!isWorkerRoute()) return;
  const root = document.querySelector('.simpleWorkerApp');
  if (root) {
    root.dataset.workerAppClean = 'true';
    window.dispatchEvent(new Event('churvox-worker-app-ready'));
  }
}

function cleanNow() {
  syncBodyClass();
  if (!isWorkerRoute()) return;
  removeOwnerOverlays();
  markWorkerReady();
}

function schedule() {
  syncBodyClass();
  if (!isWorkerRoute()) return;
  [0, 60, 160, 360, 800, 1500, 2800, 5000].forEach((delay) => {
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
  const observer = new MutationObserver(cleanNow);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
