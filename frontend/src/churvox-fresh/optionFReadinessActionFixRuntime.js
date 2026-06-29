// CHURVOX_READINESS_ACTION_FIX_RUNTIME_20260629
// Makes fallback readiness actions useful instead of dead buttons.

let cleanQueued = false;

function isOwnerRoute() {
  return typeof window !== 'undefined' && !window.location.pathname.startsWith('/worker');
}

function handleClick(event) {
  const button = event.target.closest('[data-ten-job-action]');
  if (!button || !isOwnerRoute()) return;
  const action = button.getAttribute('data-ten-job-action');
  if (action === 'view' || action === 'command') {
    event.preventDefault();
    window.location.hash = '#command';
    button.textContent = 'Opened Command';
    try { window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated')); } catch (_) {}
  }
}

function cleanVisibleCopy() {
  cleanQueued = false;
  const replacements = [
    ['Clear pricing guard', 'Plan clarity'],
    ['No sneaky lockouts.', 'Clear limits before upgrade.'],
    ['Less confusion, fewer support tickets.', 'Less confusion, fewer support headaches.'],
    ['Real review build layer', 'Field proof control'],
    ['Built from real complaints:', 'Churvox checks'],
    ['Built for rough coverage.', 'Ready for rough coverage.'],
    ['Built for workers', 'Made for workers'],
    ['build layer', 'control layer'],
    ['10 out of 10', 'ready'],
    ['10/10', 'ready'],
  ];
  const root = document.body || document.documentElement;
  if (!root) return;
  const walker = document.createTreeWalker(root, window.NodeFilter ? NodeFilter.SHOW_TEXT : 4);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    let next = node.nodeValue || '';
    replacements.forEach(([from, to]) => { next = next.replaceAll(from, to); });
    if (next !== node.nodeValue) node.nodeValue = next;
  });
}

function scheduleClean() {
  if (cleanQueued) return;
  cleanQueued = true;
  window.requestAnimationFrame(cleanVisibleCopy);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_READINESS_ACTION_FIX_RUNTIME__) {
  window.__CHURVOX_READINESS_ACTION_FIX_RUNTIME__ = true;
  document.addEventListener('click', handleClick, true);
  window.addEventListener('load', scheduleClean);
  window.addEventListener('hashchange', scheduleClean);
  window.addEventListener('churvox:fresh-data-updated', scheduleClean);
  const observer = new MutationObserver(scheduleClean);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

export {};
