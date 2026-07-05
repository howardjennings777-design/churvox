// Keeps Plans as one page.
// When the real billing desk is injected, hide the old ProductApp shell underneath it.

const STYLE_ID = 'churvox-plans-single-page-style';
const LAYER_ID = 'option-f-plans-pricing-desk';

const css = `
  body[data-cvx-plans-single="true"] .cvxProduct[data-product-version="v2"] > :not(#option-f-plans-pricing-desk) {
    display: none !important;
  }

  body[data-cvx-plans-single="true"] #option-f-plans-pricing-desk {
    width: min(1240px, calc(100vw - 32px)) !important;
    max-width: min(1240px, calc(100vw - 32px)) !important;
    margin: 0 auto !important;
    padding: 10px 0 28px !important;
    box-sizing: border-box !important;
  }

  body[data-cvx-plans-single="true"] {
    overflow-x: hidden !important;
  }
`;

function page() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  const path = String(window.location.pathname || '').toLowerCase();
  return hash === 'plans' || path === '/plans' || path.endsWith('/plans');
}

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  } else if (style.textContent !== css) {
    style.textContent = css;
  }
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
}

function unhideOldShell() {
  document.body.removeAttribute('data-cvx-plans-single');
  document.querySelectorAll('[data-cvx-plans-hidden-child="true"]').forEach((node) => {
    node.style.display = node.dataset.cvxPlansOldDisplay || '';
    delete node.dataset.cvxPlansOldDisplay;
    delete node.dataset.cvxPlansHiddenChild;
  });
}

function hideDuplicateShell() {
  ensureStyle();
  if (!page()) {
    unhideOldShell();
    return;
  }

  const layer = document.getElementById(LAYER_ID);
  if (!layer) return;
  const parent = layer.parentElement;
  if (!parent || !parent.matches?.('.cvxProduct[data-product-version="v2"]')) return;

  document.body.dataset.cvxPlansSingle = 'true';
  Array.from(parent.children).forEach((child) => {
    if (child === layer) return;
    if (!child.dataset.cvxPlansHiddenChild) {
      child.dataset.cvxPlansHiddenChild = 'true';
      child.dataset.cvxPlansOldDisplay = child.style.display || '';
    }
    child.style.display = 'none';
  });
}

function run() {
  hideDuplicateShell();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PLANS_SINGLE_PAGE_RUNTIME__) {
  window.__CHURVOX_PLANS_SINGLE_PAGE_RUNTIME__ = true;
  run();
  window.addEventListener('load', () => setTimeout(run, 120));
  window.addEventListener('hashchange', () => setTimeout(run, 120));
  window.addEventListener('popstate', () => setTimeout(run, 120));
  const observer = new MutationObserver(() => setTimeout(run, 80));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(run, 400);
  setInterval(run, 1200);
}

export {};