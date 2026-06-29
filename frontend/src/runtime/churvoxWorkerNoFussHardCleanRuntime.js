// CHURVOX_WORKER_NO_FUSS_HARD_CLEAN_20260629
// Removes legacy worker proof/field panels from worker routes so the worker app stays a simple run sheet.

const LEGACY_WORKER_COPY = /FIELD PROOF|Made for workers, not office clutter|6 proof checks left|Fair GPS|Proof safety|Offline aware|Less chasing|worker protection controls|photo safe queue|worker note becomes owner admin|photo thumbnails will show|route to command/i;

function isWorkerRoute() {
  return /^\/worker(?:\/|$)/i.test(window.location.pathname || '');
}

function cleanNode(node) {
  if (!node || node === document.body || node.id === 'root') return false;
  if (node.closest?.('.simpleWorkerApp')) return false;
  const text = String(node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
  if (!LEGACY_WORKER_COPY.test(text)) return false;
  node.remove();
  return true;
}

function cleanWorker() {
  if (!isWorkerRoute()) return;
  document.documentElement.classList.add('churvox-worker-no-fuss-route');
  const selectors = [
    '.worker-flow-panel',
    '.worker-readiness-card',
    '.px-hero',
    '.px-empty',
    '[class*="worker-flow"]',
    '[class*="field-proof"]',
    '[class*="proof-passport"]',
    '[class*="photo-safe"]',
    'section',
    'article',
    'header',
    'div'
  ];
  const nodes = Array.from(document.querySelectorAll(selectors.join(',')));
  for (const node of nodes) cleanNode(node);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_NO_FUSS_HARD_CLEAN__) {
  window.__CHURVOX_WORKER_NO_FUSS_HARD_CLEAN__ = true;
  window.addEventListener('load', cleanWorker);
  window.addEventListener('popstate', () => setTimeout(cleanWorker, 50));
  window.addEventListener('hashchange', () => setTimeout(cleanWorker, 50));
  document.addEventListener('click', () => setTimeout(cleanWorker, 30), true);
  const observer = new MutationObserver(() => cleanWorker());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(cleanWorker, 750);
}

export {};
