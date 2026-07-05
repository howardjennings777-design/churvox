// Keeps the proper owner page layout visible while older cleanup runtimes remain loaded.

const STYLE_ID = 'churvox-owner-proper-page-shield-style';
const PROPER_ID = 'churvox-owner-proper-page-layout';
const OLD_IDS = ['churvox-owner-core-clean-layout', 'churvox-owner-lite-clean'];

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .churvoxOptionC[data-proper-pages="true"] .cocPage > #${PROPER_ID}[data-core-hidden="true"],
    .churvoxOptionC[data-proper-pages="true"] .cocPage > #${PROPER_ID}[data-lite-hidden="true"],
    .churvoxOptionC[data-proper-pages="true"] .cocPage > #${PROPER_ID}[data-proper-hidden="true"]{
      display:grid!important;visibility:visible!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;overflow:visible!important;opacity:1!important;
    }
    .churvoxOptionC[data-proper-pages="true"] #churvox-owner-core-clean-layout,
    .churvoxOptionC[data-proper-pages="true"] #churvox-owner-lite-clean{
      display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;opacity:0!important;
    }
  `;
  document.head.appendChild(style);
}

let lastSig = '';
function run() {
  installStyle();
  const proper = document.getElementById(PROPER_ID);
  const sig = [proper?.getAttribute('data-core-hidden') || '', proper?.getAttribute('data-lite-hidden') || '', proper?.getAttribute('data-proper-hidden') || '', ...OLD_IDS.map((id) => document.getElementById(id)?.getAttribute('aria-hidden') || '')].join('|');
  if (sig === lastSig) return;
  lastSig = sig;
  if (proper) {
    proper.removeAttribute('data-core-hidden');
    proper.removeAttribute('data-lite-hidden');
    proper.removeAttribute('data-proper-hidden');
  }
  OLD_IDS.forEach((id) => {
    const old = document.getElementById(id);
    if (old && old.getAttribute('aria-hidden') !== 'true') old.setAttribute('aria-hidden', 'true');
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_PROPER_PAGE_SHIELD__) {
  window.__CHURVOX_OWNER_PROPER_PAGE_SHIELD__ = true;
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('hashchange', () => setTimeout(run, 120));
  window.addEventListener('popstate', () => setTimeout(run, 120));
  setInterval(run, 5000);
  run();
}

export {};
