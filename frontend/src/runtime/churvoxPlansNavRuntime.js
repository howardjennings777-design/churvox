// Plans & billing page navigation.
// Keeps Plans as a clean billing workspace.

const STYLE_ID = 'churvox-plans-nav-runtime-style';
const NAV_ID = 'churvox-plans-page-nav';

const css = `
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxWorkspace {
    overflow-x: hidden !important;
  }

  body[data-cvx-owner-page="plans"] #churvox-product-ops-strip,
  body[data-cvx-owner-page="plans"] .cvxProductOpsStrip,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxToolbar {
    display: none !important;
  }

  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPage {
    gap: 10px !important;
    padding-top: 12px !important;
  }

  .cvxPlansPageNav {
    grid-column: 1 / -1;
    position: sticky;
    top: 92px;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0 0 10px;
    padding: 8px;
    border: 1px solid rgba(17, 21, 19, .09);
    border-radius: 20px;
    background: rgba(255, 254, 250, .92);
    box-shadow: 0 16px 38px rgba(17, 21, 19, .08);
    backdrop-filter: blur(14px);
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .cvxPlansPageNav button {
    flex: 1 0 auto;
    min-width: max-content;
    min-height: 34px;
    border: 0;
    border-radius: 999px;
    padding: 8px 12px;
    background: rgba(17, 21, 19, .07);
    color: #111713;
    font-size: 12px;
    font-weight: 1000;
    white-space: nowrap;
    cursor: pointer;
  }

  .cvxPlansPageNav button:first-child,
  .cvxPlansPageNav button:hover {
    background: #111713;
    color: #fff;
  }

  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlans {
    scroll-margin-top: 150px;
  }

  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPanel,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxHero,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlans,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxKpis {
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlans,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlanGrid,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPricingGrid {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 10px !important;
    width: 100% !important;
  }

  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlan,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlanCard,
  body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPricingCard {
    min-width: 0 !important;
    max-width: 100% !important;
    border-radius: 18px !important;
    padding: 14px !important;
  }

  @media (max-width: 980px) {
    .cvxPlansPageNav {
      top: 112px;
      border-radius: 16px;
      padding: 7px;
    }

    .cvxPlansPageNav button {
      flex: 0 0 auto;
      font-size: 11px;
      padding: 7px 10px;
    }

    body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlans,
    body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlanGrid,
    body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPricingGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 620px) {
    body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlans,
    body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPlanGrid,
    body[data-cvx-owner-page="plans"] .cvxProduct[data-product-version="v2"] .cvxPricingGrid {
      grid-template-columns: 1fr !important;
    }
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

function findByText(patterns) {
  const nodes = [...document.querySelectorAll('.cvxProduct[data-product-version="v2"] .cvxPanel, .cvxProduct[data-product-version="v2"] .cvxHero, .cvxProduct[data-product-version="v2"] .cvxPlans, .cvxProduct[data-product-version="v2"] .cvxKpis')];
  return nodes.find((node) => patterns.some((pattern) => pattern.test(node.textContent || '')));
}

function scrollToSection(kind) {
  const targets = {
    current: [/current plan/i, /no plan selected/i, /billing status/i, /plans and billing/i],
    usage: [/live plan usage/i, /clients/i, /jobs this month/i, /active team/i, /usage/i],
    plans: [/start/i, /crew/i, /operator/i, /command/i],
    addons: [/add-ons/i, /growth pack/i, /accounting sync/i],
    help: [/manage billing/i, /refresh billing/i, /billing email/i, /support/i],
  }[kind] || [];
  const target = findByText(targets);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function removeWrongPlansStrip() {
  if (page() !== 'plans') return;
  document.querySelectorAll('#churvox-product-ops-strip,.cvxProductOpsStrip').forEach((node) => node.remove());
}

function buildNav() {
  if (page() !== 'plans') {
    document.getElementById(NAV_ID)?.remove();
    return;
  }
  const workspace = document.querySelector('.cvxProduct[data-product-version="v2"] .cvxPage');
  if (!workspace || document.getElementById(NAV_ID)) return;
  const nav = document.createElement('nav');
  nav.id = NAV_ID;
  nav.className = 'cvxPlansPageNav';
  nav.setAttribute('aria-label', 'Plans and billing navigation');
  nav.innerHTML = `
    <button type="button" data-cvx-plans-nav="current">Current plan</button>
    <button type="button" data-cvx-plans-nav="usage">Usage</button>
    <button type="button" data-cvx-plans-nav="plans">Plans</button>
    <button type="button" data-cvx-plans-nav="addons">Add-ons</button>
    <button type="button" data-cvx-plans-nav="help">Billing help</button>
  `;
  workspace.prepend(nav);
}

function run() {
  if (typeof document !== 'undefined') document.body.dataset.cvxOwnerPage = page();
  ensureStyle();
  removeWrongPlansStrip();
  buildNav();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PLANS_NAV_RUNTIME__) {
  window.__CHURVOX_PLANS_NAV_RUNTIME__ = true;
  run();
  window.addEventListener('load', () => setTimeout(run, 100));
  window.addEventListener('hashchange', () => setTimeout(run, 100));
  window.addEventListener('popstate', () => setTimeout(run, 100));
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cvx-plans-nav]');
    if (!button) return;
    event.preventDefault();
    scrollToSection(button.getAttribute('data-cvx-plans-nav'));
  }, true);
  const observer = new MutationObserver(() => setTimeout(run, 80));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(run, 400);
  setInterval(run, 1500);
}

export {};