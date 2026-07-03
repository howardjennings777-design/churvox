// CHURVOX_COMMAND_PREPARED_SLIPS_20260630
// Keeps the prepared-slips panel quiet until the backend route exists.

const PANEL_ID = 'churvox-command-prepared-slips';

function cleanupPreparedSlipsPanel() {
  try {
    document.getElementById(PANEL_ID)?.remove();
  } catch (_) {}
}

if (typeof window !== 'undefined' && !window.__CHURVOX_COMMAND_PREPARED_SLIPS__) {
  window.__CHURVOX_COMMAND_PREPARED_SLIPS__ = true;
  window.addEventListener('load', cleanupPreparedSlipsPanel);
  window.addEventListener('hashchange', cleanupPreparedSlipsPanel);
  window.addEventListener('popstate', cleanupPreparedSlipsPanel);
}

export {};
