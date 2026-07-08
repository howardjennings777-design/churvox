const FLAG = '__CHURVOX_WORKER_BODY_STATE_RUNTIME__';

function isWorkerRoute() {
  return /^\/worker(?:\/|$)/i.test(window.location.pathname || '');
}

function syncWorkerBodyState() {
  if (typeof document === 'undefined' || !document.body) return;
  const worker = isWorkerRoute();
  document.body.classList.toggle('churvoxWorkerCleanBody', worker);
  if (worker) {
    document.body.classList.remove('cvxPocketOwnerReady');
    const pocket = document.getElementById('cvxPocketOwner');
    if (pocket) pocket.innerHTML = '';
  }
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncWorkerBodyState, { once: true });
  else syncWorkerBodyState();
  window.addEventListener('load', syncWorkerBodyState);
  window.addEventListener('popstate', syncWorkerBodyState);
  window.addEventListener('hashchange', syncWorkerBodyState);
  window.addEventListener('churvox-worker-app-ready', syncWorkerBodyState);
  [50, 200, 700, 1600].forEach((delay) => window.setTimeout(syncWorkerBodyState, delay));
}

export {};
