// Keeps admin findings and owner-needed highlights in Command only.

const STYLE_ID = 'churvox-command-focus-runtime-style';

const css = `
  body:not([data-cvx-owner-page="command"]) #churvox-smart-admin-audit-panel,
  body:not([data-cvx-owner-page="command"]) .cvxSmartAuditPanel,
  body:not([data-cvx-owner-page="command"]) .cvxCantFixBanner,
  body:not([data-cvx-owner-page="command"]) .cvxCantFixPill {
    display: none !important;
  }

  body:not([data-cvx-owner-page="command"]) .cvxCantFixRow {
    box-shadow: none !important;
    background: inherit !important;
    border-color: rgba(17, 21, 19, .08) !important;
  }
`;

function page() {
  return (window.location.hash || '#today').replace('#', '').toLowerCase() || 'today';
}

function apply() {
  if (typeof document === 'undefined') return;
  document.body.dataset.cvxOwnerPage = page();
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
  if (page() !== 'command') document.querySelectorAll('#churvox-smart-admin-audit-panel,.cvxSmartAuditPanel').forEach((node) => node.remove());
}

if (typeof window !== 'undefined' && !window.__CHURVOX_COMMAND_FOCUS_RUNTIME__) {
  window.__CHURVOX_COMMAND_FOCUS_RUNTIME__ = true;
  apply();
  window.addEventListener('load', () => setTimeout(apply, 100));
  window.addEventListener('hashchange', () => setTimeout(apply, 80));
  window.addEventListener('popstate', () => setTimeout(apply, 80));
  const observer = new MutationObserver(() => setTimeout(apply, 60));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(apply, 1000);
}

export {};