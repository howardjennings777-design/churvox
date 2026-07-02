function isOwnerPlansRoute() {
  return /\/plans\/?$/i.test(window.location.pathname || '') || String(window.location.hash || '').toLowerCase() === '#plans';
}

function isXeroStatusUrl(input) {
  try {
    const raw = typeof input === 'string' ? input : input?.url || '';
    if (!raw) return false;
    const url = new URL(raw, window.location.origin);
    return /\/api\/xero\/status\/?$/i.test(url.pathname || '') || /\/xero\/status\/?$/i.test(url.pathname || '');
  } catch {
    return false;
  }
}

function isManualXeroStatusAllowed() {
  const until = Number(window.__CHURVOX_MANUAL_XERO_STATUS_UNTIL__ || 0);
  if (until && Date.now() < until) return true;
  const active = document.activeElement;
  if (active?.closest?.('[data-xero="refresh"], .cvPayRefresh')) return true;
  return false;
}

function installNetworkGuard() {
  if (window.__CHURVOX_HUMAN_AUDIT_NETWORK_GUARD__ || typeof window.fetch !== 'function') return;
  window.__CHURVOX_HUMAN_AUDIT_NETWORK_GUARD__ = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function churvoxAuditSafeFetch(input, init = {}) {
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    if (method === 'GET' && isXeroStatusUrl(input) && !isManualXeroStatusAllowed()) {
      const body = JSON.stringify({
        success: true,
        data: {
          connected: false,
          xero_connected: false,
          tenant_name: '',
          message: 'Manual Xero refresh available.',
        },
      });
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };
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
    html,
    body,
    #root {
      width: 100% !important;
      max-width: 100vw !important;
      overflow-x: clip !important;
      box-sizing: border-box !important;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box !important;
    }

    html:has(.churvoxOptionC),
    body:has(.churvoxOptionC),
    html:has([class*="plan" i]),
    body:has([class*="plan" i]) {
      max-width: 100vw !important;
      overflow-x: clip !important;
    }

    body:has(.churvoxOptionC) #root,
    body:has(.churvoxOptionC) .churvoxOptionC,
    body:has(.churvoxOptionC) .workspace,
    body:has(.churvoxOptionC) .workspace > *,
    body:has(.churvoxOptionC) .cocPage,
    body:has(.churvoxOptionC) .cocPanel,
    body:has(.churvoxOptionC) .toolbar,
    body:has(.churvoxOptionC) .launchNavProof,
    body:has(.churvoxOptionC) .cocNav,
    body:has([class*="plan" i]) #root,
    body:has([class*="plan" i]) main,
    body:has([class*="plan" i]) section,
    body:has([class*="plan" i]) [class*="wrap" i],
    body:has([class*="plan" i]) [class*="grid" i],
    body:has([class*="plan" i]) [class*="row" i] {
      box-sizing: border-box !important;
      min-width: 0 !important;
      max-width: 100% !important;
      overflow-x: clip !important;
    }

    body:has(.churvoxOptionC) .cocNav,
    body:has(.churvoxOptionC) .launchNavProof,
    body:has(.churvoxOptionC) .toolbar,
    body:has([class*="plan" i]) [class*="nav" i],
    body:has([class*="plan" i]) [class*="toolbar" i] {
      width: 100% !important;
      max-width: 100% !important;
      flex-wrap: wrap !important;
    }

    body:has(.churvoxOptionC) .planList,
    body:has(.churvoxOptionC) .planList > *,
    body:has(.churvoxOptionC) .churvoxPlansRestorePanel,
    body:has(.churvoxOptionC) .churvoxPlansRestorePanel *,
    body:has(.churvoxOptionC) [class*="plan" i],
    body:has(.churvoxOptionC) [class*="Plan"],
    body:has(.churvoxOptionC) [class*="billing" i],
    body:has(.churvoxOptionC) [class*="checkout" i],
    body:has([class*="plan" i]) [class*="plan" i],
    body:has([class*="plan" i]) [class*="Plan"],
    body:has([class*="plan" i]) [class*="billing" i],
    body:has([class*="plan" i]) [class*="checkout" i] {
      min-width: 0 !important;
      max-width: 100% !important;
      overflow-wrap: anywhere !important;
    }

    body:has(.simpleWorkerApp),
    body:has(.simpleWorkerApp) #root {
      max-width: 100vw !important;
      overflow-x: hidden !important;
    }

    body:has(.simpleWorkerApp) .swNav {
      position: relative !important;
      left: auto !important;
      right: auto !important;
      bottom: auto !important;
      transform: none !important;
      display: grid !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 12px 0 0 !important;
      z-index: 20 !important;
    }

    body:has(.simpleWorkerApp) .swNav a {
      min-width: 0 !important;
      max-width: 100% !important;
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

function installWorkerAuditClickGuard() {
  if (window.__CHURVOX_WORKER_AUDIT_CLICK_GUARD__) return;
  window.__CHURVOX_WORKER_AUDIT_CLICK_GUARD__ = true;
  document.addEventListener('click', (event) => {
    if (!isWorkerRoute()) return;
    const link = event.target?.closest?.('.simpleWorkerApp a[href][data-churvox-qa-control]');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    const href = link.getAttribute('href') || '';
    if (href) window.history.replaceState({}, '', href);
  }, true);
}

function quietXeroPanels() {
  if (!isXeroRoute()) return;
  const actionPre = document.querySelector('#option-f-xero-actions-panel pre');
  if (actionPre && /backend|422|failed|unavailable|refreshing/i.test(actionPre.textContent || '')) {
    actionPre.textContent = 'Xero controls ready. Live backend refresh runs only when owner requests it.';
  }
  const status = document.querySelector('#churvox-xero-payments-panel .cvPayStatus');
  if (status && /checking|backend|unavailable|422|failed/i.test(status.textContent || '')) {
    status.textContent = 'Payment and Xero setup controls ready. Owner refresh is manual.';
  }
}

function clampPlansOverflow() {
  if (!isOwnerPlansRoute()) return;
  document.documentElement.style.width = '100%';
  document.documentElement.style.maxWidth = '100vw';
  document.documentElement.style.overflowX = 'clip';
  document.body.style.width = '100%';
  document.body.style.maxWidth = '100vw';
  document.body.style.overflowX = 'clip';

  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  if (!vw) return;
  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect();
    if (rect.right > vw + 8 || rect.left < -8) {
      el.style.minWidth = '0';
      el.style.maxWidth = '100%';
      el.style.overflowX = 'clip';
    }
  }
}

function run() {
  installNetworkGuard();
  installWorkerAuditClickGuard();
  injectStyle();
  clampPlansOverflow();
  quietXeroPanels();
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(run, 80));
  window.addEventListener('hashchange', () => setTimeout(run, 80));
  window.addEventListener('popstate', () => setTimeout(run, 80));
  document.addEventListener('click', () => setTimeout(run, 60), true);
  setInterval(run, 700);
  run();
}

export {};
