// Plans page duplicate guard.
// Keeps the real billing/checkout page and hides the duplicate product Plans workspace underneath.

const STYLE_ID = 'churvox-plans-nav-runtime-style';

const css = `
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxWorkspace {
    overflow-x: hidden !important;
  }

  body[data-cvx-owner-page="plans"] #churvox-product-ops-strip,
  body[data-cvx-owner-page="plans"] .cvxProductOpsStrip,
  body[data-cvx-owner-page="plans"] #churvox-plans-page-nav,
  body[data-cvx-owner-page="plans"] .cvxPlansPageNav,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxToolbar,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxHero,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlans,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlanGrid,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPricingGrid,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxKpis {
    display: none !important;
  }

  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPage {
    gap: 0 !important;
    padding-top: 0 !important;
  }
`;

function page() {
  return (window.location.hash || '#today').replace('#', '').toLowerCase() || 'today';
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

function removeDuplicateProductPlans() {
  if (page() !== 'plans') return;
  document.querySelectorAll('#churvox-product-ops-strip,.cvxProductOpsStrip,#churvox-plans-page-nav,.cvxPlansPageNav').forEach((node) => node.remove());

  document.querySelectorAll('.cvxProduct[data-product-version="v2"] .cvxHero').forEach((hero) => {
    const text = String(hero.textContent || '').toLowerCase();
    if (text.includes('locked churvox pricing') || text.includes('plans stay clear')) hero.remove();
  });

  document.querySelectorAll('.cvxProduct[data-product-version="v2"] .cvxPlans').forEach((plans) => {
    const text = String(plans.textContent || '').toLowerCase();
    if (text.includes('choose start') || text.includes('choose crew') || text.includes('choose command') || text.includes('$39')) plans.remove();
  });
}

function run() {
  if (typeof document !== 'undefined') document.body.dataset.cvxOwnerPage = page();
  ensureStyle();
  removeDuplicateProductPlans();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PLANS_NAV_RUNTIME__) {
  window.__CHURVOX_PLANS_NAV_RUNTIME__ = true;
  run();
  window.addEventListener('load', () => setTimeout(run, 100));
  window.addEventListener('hashchange', () => setTimeout(run, 100));
  window.addEventListener('popstate', () => setTimeout(run, 100));
  const observer = new MutationObserver(() => setTimeout(run, 80));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(run, 400);
  setInterval(run, 1500);
}

export {};