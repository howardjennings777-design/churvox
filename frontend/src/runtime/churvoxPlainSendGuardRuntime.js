import './churvoxWorkerCompleteRequestGuard';

// CHURVOX_PLAIN_SEND_GUARD_20260630
// Command should require explicit approval wording, not plain Send auto-execution.

function isPlainSendCommandButton(target) {
  const button = target?.closest?.('button');
  if (!button) return false;
  const label = String(button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (label !== 'send') return false;
  const explicit = button.getAttribute('data-rr-command-action') === 'approve' || button.getAttribute('data-command-action') === 'approved' || button.dataset?.brainApprove;
  if (explicit) return false;
  return Boolean(button.closest('[data-rr-command-id], [data-command-id], [data-ten-job-id], .rrCommandQueue, .tenReadinessPanel, .ofDecisionEffects'));
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PLAIN_SEND_GUARD__) {
  window.__CHURVOX_PLAIN_SEND_GUARD__ = true;
  document.addEventListener('click', (event) => {
    if (!isPlainSendCommandButton(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const button = event.target.closest('button');
    if (button) button.textContent = 'Approve first';
  }, true);
}

export {};