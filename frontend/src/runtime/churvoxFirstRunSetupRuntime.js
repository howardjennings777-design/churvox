// CHURVOX_FIRST_RUN_SETUP_20260630
// A small owner setup checklist. No paragraphs across the app; this appears only during setup/onboarding.

const KEY = 'churvox_first_setup_pending';
const DONE_KEY = 'churvox:first-run-setup-dismissed';
const STYLE_ID = 'churvox-first-run-setup-style';
const ROOT_ID = 'churvox-first-run-setup';

const STEPS = [
  ['Business', '/dashboard#settings'],
  ['Client', '/dashboard#clients'],
  ['Job', '/dashboard#jobs'],
  ['Worker', '/dashboard#workers'],
  ['Quote or invoice', '/dashboard#quotes'],
  ['Command', '/dashboard#command'],
];

function shouldShow() {
  const path = String(window.location.pathname || '');
  const hash = String(window.location.hash || '');
  const search = String(window.location.search || '');
  if (localStorage.getItem(DONE_KEY) === 'true') return false;
  if (localStorage.getItem(KEY) === 'true') return true;
  if (/first_setup=1|checkout=saved|checkout=success/.test(search)) return true;
  if (path === '/setup' || path === '/setup-guide' || hash === '#firstrun') return true;
  return false;
}
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{position:fixed;right:18px;bottom:18px;z-index:2147483646;width:min(420px,calc(100vw - 36px));border:1px solid rgba(15,23,42,.10);border-radius:24px;background:#fff;box-shadow:0 28px 90px rgba(15,23,42,.24);padding:14px;font-family:Inter,system-ui,sans-serif;color:#111827}#${ROOT_ID} header{display:flex;justify-content:space-between;gap:12px;align-items:start}#${ROOT_ID} b{display:block;font-size:18px;line-height:1.05}#${ROOT_ID} small{display:block;margin-top:4px;color:#9a3412;font-weight:1000;text-transform:uppercase;letter-spacing:.10em}#${ROOT_ID} button{border:0;cursor:pointer;font-weight:1000}#${ROOT_ID} .close{width:34px;height:34px;border-radius:999px;background:#f1f5f9;color:#334155}#${ROOT_ID} .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}#${ROOT_ID} a{min-height:42px;display:grid;place-items:center;border-radius:16px;background:#111827;color:#fff;text-decoration:none;font-size:13px;font-weight:1000}#${ROOT_ID} a:first-child,#${ROOT_ID} a:last-child{background:#f97316;color:#111827}@media(max-width:620px){#${ROOT_ID}{right:10px;left:10px;bottom:88px;width:auto}.grid{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(style);
}
function close() {
  try { localStorage.setItem(DONE_KEY, 'true'); localStorage.removeItem(KEY); } catch {}
  document.getElementById(ROOT_ID)?.remove();
}
function render() {
  if (!shouldShow()) { document.getElementById(ROOT_ID)?.remove(); return; }
  ensureStyle();
  let node = document.getElementById(ROOT_ID);
  if (!node) {
    node = document.createElement('aside');
    node.id = ROOT_ID;
    document.body.appendChild(node);
  }
  node.innerHTML = `<header><div><small>Setup</small><b>Get Churvox ready</b></div><button class="close" type="button" aria-label="Close setup">×</button></header><div class="grid">${STEPS.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div>`;
  node.querySelector('.close')?.addEventListener('click', close, { once: true });
}

if (typeof window !== 'undefined' && !window.__CHURVOX_FIRST_RUN_SETUP__) {
  window.__CHURVOX_FIRST_RUN_SETUP__ = true;
  window.addEventListener('load', () => setTimeout(render, 700));
  window.addEventListener('hashchange', () => setTimeout(render, 180));
  window.addEventListener('popstate', () => setTimeout(render, 180));
  window.addEventListener('churvox-auth-refresh', () => setTimeout(render, 700));
  setInterval(render, 2200);
}

export {};
