// CHURVOX_READINESS_ACTION_FIX_RUNTIME_20260629
// Kept as a tiny owner-only click helper. Do not import overlay runtimes from here.

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

if (typeof window !== 'undefined' && !window.__CHURVOX_READINESS_ACTION_FIX_RUNTIME__) {
  window.__CHURVOX_READINESS_ACTION_FIX_RUNTIME__ = true;
  document.addEventListener('click', handleClick, true);
}

export {};
