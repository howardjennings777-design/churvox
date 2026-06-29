// CHURVOX_WORKER_NO_FUSS_HARD_CLEAN_20260629
// Removes legacy worker proof/field text from worker routes so the worker app stays a simple run sheet.

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
    html.churvox-worker-no-fuss-route [class*="photo-safe"],
    html.churvox-worker-no-fuss-route [class*="tenWorker"],
    html.churvox-worker-no-fuss-route #churvox-ten-worker-controls {
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

function textOf(node) {
  return String(node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function isCleanWorkerCore(node) {
  return Boolean(node?.matches?.('.simpleWorkerApp,.swHero,.swBody,.swNav,.swCard,.swJob,.swEmpty,.swPrimary,.swLight,.swBig') || node?.closest?.('.swHero,.swBody,.swNav,.swCard,.swJob,.swEmpty'));
}

function removeNode(node) {
  if (!node || node === document.body || node.id === 'root') return false;
  if (node.classList?.contains('simpleWorkerApp')) return false;
  node.remove();
  return true;
}

function removeLegacyTextNode(textNode) {
  let node = textNode?.parentElement;
  while (node && node !== document.body && node.id !== 'root') {
    if (node.classList?.contains('simpleWorkerApp')) break;
    if (['SECTION', 'ARTICLE', 'HEADER', 'ASIDE', 'DIV', 'MAIN'].includes(node.tagName)) break;
    node = node.parentElement;
  }
  if (!node || node === document.body || node.id === 'root') return false;
  if (node.classList?.contains('simpleWorkerApp')) {
    const children = Array.from(node.children);
    for (const child of children) {
      if (isCleanWorkerCore(child)) continue;
      if (LEGACY_WORKER_COPY.test(textOf(child))) child.remove();
    }
    return true;
  }
  if (isCleanWorkerCore(node) && !/^FIELD PROOF/i.test(textOf(node))) return false;
  return removeNode(node);
}

function cleanByText(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits = [];
  let current;
  while ((current = walker.nextNode())) {
    if (LEGACY_WORKER_COPY.test(String(current.nodeValue || ''))) hits.push(current);
  }
  for (const hit of hits) removeLegacyTextNode(hit);
}

function cleanWorker() {
  if (!isWorkerRoute()) return;
  document.documentElement.classList.add('churvox-worker-no-fuss-route');
  installStyle();
  const root = document.getElementById('root') || document.body;

  const selectors = [
    '#churvox-ten-worker-controls',
    '.tenWorkerPanel',
    '.worker-flow-panel',
    '.worker-readiness-card',
    '.px-hero',
    '[class*="worker-flow"]',
    '[class*="field-proof"]',
    '[class*="proof-passport"]',
    '[class*="photo-safe"]'
  ];
  for (const node of Array.from(root.querySelectorAll(selectors.join(',')))) removeNode(node);

  cleanByText(root);

  const simple = root.querySelector('.simpleWorkerApp');
  if (simple && LEGACY_WORKER_COPY.test(textOf(root))) {
    for (const child of Array.from(simple.children)) {
      if (isCleanWorkerCore(child)) continue;
      if (LEGACY_WORKER_COPY.test(textOf(child))) child.remove();
    }
    for (const child of Array.from(root.children)) {
      if (child.contains(simple)) continue;
      if (LEGACY_WORKER_COPY.test(textOf(child))) child.remove();
    }
  }
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_NO_FUSS_HARD_CLEAN__) {
  window.__CHURVOX_WORKER_NO_FUSS_HARD_CLEAN__ = true;
  installStyle();
  cleanWorker();
  window.addEventListener('load', cleanWorker);
  window.addEventListener('popstate', () => setTimeout(cleanWorker, 10));
  window.addEventListener('hashchange', () => setTimeout(cleanWorker, 10));
  document.addEventListener('DOMContentLoaded', cleanWorker);
  document.addEventListener('click', () => setTimeout(cleanWorker, 10), true);
  const observer = new MutationObserver(() => cleanWorker());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(cleanWorker, 100);
}

export {};
