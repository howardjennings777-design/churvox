const FLAG = '__CHURVOX_BUSINESS_SYSTEM_DASHBOARD_ANCHOR__';
const STYLE_ID = 'churvox-business-system-dashboard-anchor-style';
const ANCHOR_ID = 'churvox-business-system-dashboard-anchor';

function isDashboard() {
  return typeof window !== 'undefined' && (window.location.pathname === '/dashboard' || window.location.pathname.startsWith('/dashboard'));
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ANCHOR_ID}{margin:10px auto 0;max-width:1180px;padding:10px 14px;border:1px solid rgba(249,115,22,.22);border-radius:16px;background:linear-gradient(135deg,#111827,#1f2937 62%,#ea580c 180%);color:#fff;font:800 12px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 10px 28px rgba(15,23,42,.14)}
    #${ANCHOR_ID} b{display:block;font-size:13px;color:#fed7aa;margin-bottom:2px}
    @media(max-width:760px){#${ANCHOR_ID}{margin:8px 10px 0}}
  `;
  document.head.appendChild(style);
}

function ensureAnchor() {
  if (!isDashboard()) {
    document.getElementById(ANCHOR_ID)?.remove();
    return;
  }
  ensureStyle();
  let node = document.getElementById(ANCHOR_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = ANCHOR_ID;
    node.setAttribute('aria-label', 'Churvox business system');
    node.innerHTML = '<b>Churvox business system</b><span>Autopilot, Office live feed, Daily closeout, Proof pack and Client memory are live in the owner workspace.</span>';
  }
  const root = document.querySelector('.cvxProduct') || document.getElementById('root') || document.body;
  if (root && node.parentNode !== root) root.insertBefore(node, root.firstChild || null);
}

function schedule() {
  [0, 120, 400, 900, 1800, 3200, 6000, 10000, 20000, 45000, 75000].forEach((delay) => window.setTimeout(ensureAnchor, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox:data-refresh', schedule);
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {
      if (isDashboard() && !document.getElementById(ANCHOR_ID)) window.setTimeout(ensureAnchor, 80);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
}

export {};
