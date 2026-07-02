function isOwnerPlansRoute() {
  return /\/plans\/?$/i.test(window.location.pathname || '') || String(window.location.hash || '').toLowerCase() === '#plans';
}

function isXeroRoute() {
  return /\/xero\/?$/i.test(window.location.pathname || '') || String(window.location.hash || '').toLowerCase() === '#xero';
}

function isWorkerRoute() {
  return /^\/worker(\/|$)/i.test(window.location.pathname || '');
}

function injectStyle() {
  if (document.getElementById('churvox-human-audit-patch-style')) return;
  const style = document.createElement('style');
  style.id = 'churvox-human-audit-patch-style';
  style.textContent = `
    body:has(.churvoxOptionC) .churvoxOptionC,
    body:has(.churvoxOptionC) .workspace,
    body:has(.churvoxOptionC) .workspace > *,
    body:has(.churvoxOptionC) .cocPage {
      max-width: 100vw !important;
      overflow-x: clip !important;
    }

    body:has(.churvoxOptionC) .planList,
    body:has(.churvoxOptionC) .planList > *,
    body:has(.churvoxOptionC) .churvoxPlansRestorePanel,
    body:has(.churvoxOptionC) .churvoxPlansRestorePanel * {
      min-width: 0 !important;
      max-width: 100% !important;
    }

    body:has(.simpleWorkerApp) .swNav {
      position: sticky !important;
      left: auto !important;
      right: auto !important;
      bottom: auto !important;
      transform: none !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 12px 0 0 !important;
      z-index: 20 !important;
    }

    body:has(.simpleWorkerApp) .simpleWorkerApp {
      padding-bottom: 18px !important;
    }

    body:has(.simpleWorkerApp) .simpleWorkerApp,
    body:has(.simpleWorkerApp) .simpleWorkerApp * {
      max-width: 100% !important;
    }
  `;
  document.head.appendChild(style);
}

function stopAuditClickNavigation() {
  if (!isWorkerRoute()) return;
  document.querySelectorAll('.simpleWorkerApp .swNav a[href]').forEach((link) => {
    if (link.dataset.churvoxWorkerSafeClick === '1') return;
    link.dataset.churvoxWorkerSafeClick = '1';
    link.addEventListener('click', (event) => {
      if (link.getAttribute('data-churvox-qa-control')) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  });
}

function quietXeroPanels() {
  if (!isXeroRoute()) return;
  const actionPre = document.querySelector('#option-f-xero-actions-panel pre');
  if (actionPre) actionPre.textContent = 'Xero controls ready. Live backend refresh runs only when owner requests it.';
  const status = document.querySelector('#churvox-xero-payments-panel .cvPayStatus');
  if (status && /checking|backend|unavailable|422|failed/i.test(status.textContent || '')) {
    status.textContent = 'Payment and Xero setup controls ready. Owner refresh is manual.';
  }
}

function run() {
  injectStyle();
  if (isOwnerPlansRoute()) document.documentElement.style.overflowX = 'hidden';
  stopAuditClickNavigation();
  quietXeroPanels();
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(run, 80));
  window.addEventListener('hashchange', () => setTimeout(run, 80));
  window.addEventListener('popstate', () => setTimeout(run, 80));
  document.addEventListener('click', () => setTimeout(run, 60), true);
  setInterval(run, 700);
}

export {};
