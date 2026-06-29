// CHURVOX_WORKER_NO_FUSS_HARD_CLEAN_20260629
// Removes legacy worker proof/field panels from worker routes so the worker app stays a simple run sheet.

const STYLE_ID = 'churvox-worker-no-fuss-hard-clean-style';
const LEGACY_WORKER_COPY = /FIELD PROOF|Made for workers, not office clutter|6 proof checks left|Fair GPS|Proof safety|Offline aware|Less chasing|worker protection controls|photo safe queue|worker note becomes owner admin|photo thumbnails will show|route to command|Today, Jobs, Proof, Help and Me stay simple/i;

function isWorkerRoute() {
  return /^\/worker(?:\/|$)/i.test(window.location.pathname || '');
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html.churvox-worker-no-fuss-route .worker-flow-panel,
    html.churvox-worker-no-fuss-route .worker-readiness-card,
    html.churvox-worker-no-fuss-route .px-hero,
    html.churvox-worker-no-fuss-route [class*="worker-flow"],
    html.churvox-worker-no-fuss-route [class*="field-proof"],
    html.churvox-worker-no-fuss-route [class*="proof-passport"],
    html.churvox-worker-no-fuss-route [class*="photo-safe"] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    html.churvox-worker-no-fuss-route .simpleWorkerApp,
    html.churvox-worker-no-fuss-route .simpleWorkerApp * {
      visibility: visible !important;
    }
  `;
  document.head.appendChild(style);
}

function closestSafeRemoval(node) {
  if (!node || node === document.body || node.id === 'root') return null;
  if (node.closest?.('.simpleWorkerApp')) return null;
  const ownText = String(node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
  if (!LEGACY_WORKER_COPY.test(ownText)) return null;
  let current = node;
  while (current && current.parentElement && current.parentElement !== document.body && current.parentElement.id !== 'root' && !current.parentElement.querySelector?.('.simpleWorkerApp')) {
    const parentText = String(current.parentElement.innerText || current.parentElement.textContent || '').replace(/\s+/g, ' ').trim();
    if (LEGACY_WORKER_COPY.test(parentText)) current = current.parentElement;
    else break;
  }
  return current && current !== document.body && current.id !== 'root' ? current : node;
}

function cleanWorker() {
  if (!isWorkerRoute()) return;
  document.documentElement.classList.add('churvox-worker-no-fuss-route');
  installStyle();
  const root = document.getElementById('root') || document.body;
  const nodes = Array.from(root.querySelectorAll('section, article, header, aside, main, div'));
  for (const node of nodes) {
    const target = closestSafeRemoval(node);
    if (target && target.parentElement && !target.closest?.('.simpleWorkerApp')) {
      target.remove();
    }
  }
  const rootText = String(root.innerText || root.textContent || '').replace(/\s+/g, ' ').trim();
  if (LEGACY_WORKER_COPY.test(rootText)) {
    const simple = root.querySelector('.simpleWorkerApp');
    if (simple) {
      Array.from(root.children).forEach((child) => {
        if (child.contains(simple)) return;
        const text = String(child.innerText || child.textContent || '').replace(/\s+/g, ' ').trim();
        if (LEGACY_WORKER_COPY.test(text)) child.remove();
      });
    }
  }
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_NO_FUSS_HARD_CLEAN__) {
  window.__CHURVOX_WORKER_NO_FUSS_HARD_CLEAN__ = true;
  installStyle();
  window.addEventListener('load', cleanWorker);
  window.addEventListener('popstate', () => setTimeout(cleanWorker, 50));
  window.addEventListener('hashchange', () => setTimeout(cleanWorker, 50));
  document.addEventListener('click', () => setTimeout(cleanWorker, 30), true);
  const observer = new MutationObserver(() => cleanWorker());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(cleanWorker, 250);
}

export {};
