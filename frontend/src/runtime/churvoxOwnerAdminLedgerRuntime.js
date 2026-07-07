function removeDuplicateCommandLanes() {
  document.querySelector('[data-churvox-command-ledger]')?.remove();
}

function start() {
  removeDuplicateCommandLanes();
  window.addEventListener('hashchange', removeDuplicateCommandLanes);
  window.addEventListener('popstate', removeDuplicateCommandLanes);
  window.addEventListener('churvox:data-refresh', removeDuplicateCommandLanes);
  window.addEventListener('churvox-owner-app-ready', removeDuplicateCommandLanes);
  const observer = new MutationObserver(removeDuplicateCommandLanes);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
