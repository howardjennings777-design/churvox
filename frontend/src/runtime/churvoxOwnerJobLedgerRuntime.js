function removeJobLedgerStrip() {
  try {
    document.querySelectorAll('[data-churvox-owner-job-ledger], .cvxOwnerJobLedger').forEach((node) => node.remove());
  } catch {}
}

removeJobLedgerStrip();
window.addEventListener('hashchange', removeJobLedgerStrip);
window.addEventListener('popstate', removeJobLedgerStrip);
window.addEventListener('churvox-owner-app-ready', removeJobLedgerStrip);
window.addEventListener('churvox:data-refresh', removeJobLedgerStrip);

export {};
