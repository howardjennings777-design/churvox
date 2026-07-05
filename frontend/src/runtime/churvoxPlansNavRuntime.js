// Plans page duplicate guard + billing nav.
// Keeps the real billing/checkout page, hides duplicate product Plans, and adds a clear billing nav.

const STYLE_ID = 'churvox-plans-nav-runtime-style';
const BILLING_NAV_ID = 'churvox-billing-page-nav';

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

  .cvxBillingPageNav {
    position: sticky !important;
    top: 0 !important;
    z-index: 80 !important;
    display: flex !important;
    align-items: center !important;
    gap: 7px !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    margin: 0 0 10px !important;
    padding: 8px !important;
    border: 1px solid rgba(17, 21, 19, .1) !important;
    border-radius: 18px !important;
    background: rgba(255, 254, 250, .94) !important;
    box-shadow: 0 14px 34px rgba(17, 21, 19, .08) !important;
    backdrop-filter: blur(14px) !important;
    overflow-x: auto !important;
    scrollbar-width: thin !important;
  }

  .cvxBillingPageNav button {
    flex: 1 0 auto !important;
    min-width: max-content !important;
    min-height: 34px !important;
    border: 0 !important;
    border-radius: 999px !important;
    padding: 8px 12px !important;
    background: rgba(17, 21, 19, .07) !important;
    color: #111713 !important;
    font-size: 12px !important;
    font-weight: 1000 !important;
    white-space: nowrap !important;
    cursor: pointer !important;
  }

  .cvxBillingPageNav button:first-child,
  .cvxBillingPageNav button:hover {
    background: #111713 !important;
    color: #fff !important;
  }

  @media (max-width: 800px) {
    .cvxBillingPageNav button {
      flex: 0 0 auto !important;
      font-size: 11px !important;
      padding: 7px 10px !important;
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

function realBillingRoot() {
  const panels = [...document.querySelectorAll('.cvxProduct[data-product-version="v2"] .cvxPage > *, .cvxProduct[data-product-version="v2"] .cvxWorkspace > *, main > *, #root > *')];
  return panels.find((node) => /plans and billing|refresh billing|manage billing|live plan usage/i.test(node.textContent || '')) || document.querySelector('.cvxProduct[data-product-version="v2"] .cvxPage') || document.querySelector('#root');
}

function sectionByText(patterns) {
  const nodes = [...document.querySelectorAll('section, article, div')].filter((node) => node.id !== BILLING_NAV_ID && !node.closest(`#${BILLING_NAV_ID}`));
  return nodes.find((node) => patterns.some((pattern) => pattern.test(node.textContent || '')));
}

function scrollToBilling(kind) {
  const patterns = {
    overview: [/plans and billing/i, /no plan selected/i, /choose plan/i],
    usage: [/live plan usage/i, /clients/i, /jobs this month/i],
    plans: [/checkout: start/i, /start\s*\$39/i, /crew\s*\$89/i, /operator\s*\$149/i],
    addons: [/command growth pack/i, /accounting sync add-on/i, /add-ons/i],
    help: [/manage billing/i, /billing email/i, /pricing region/i],
  }[kind] || [];
  const target = sectionByText(patterns);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildBillingNav() {
  if (page() !== 'plans') {
    document.getElementById(BILLING_NAV_ID)?.remove();
    return;
  }
  if (document.getElementById(BILLING_NAV_ID)) return;
  const root = realBillingRoot();
  if (!root) return;

  const nav = document.createElement('nav');
  nav.id = BILLING_NAV_ID;
  nav.className = 'cvxBillingPageNav';
  nav.setAttribute('aria-label', 'Plans and billing navigation');
  nav.innerHTML = `
    <button type="button" data-cvx-billing-nav="overview">Overview</button>
    <button type="button" data-cvx-billing-nav="usage">Usage</button>
    <button type="button" data-cvx-billing-nav="plans">Plans</button>
    <button type="button" data-cvx-billing-nav="addons">Add-ons</button>
    <button type="button" data-cvx-billing-nav="help">Billing help</button>
  `;
  root.insertAdjacentElement('afterbegin', nav);
}

function run() {
  if (typeof document !== 'undefined') document.body.dataset.cvxOwnerPage = page();
  ensureStyle();
  removeDuplicateProductPlans();
  buildBillingNav();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PLANS_NAV_RUNTIME__) {
  window.__CHURVOX_PLANS_NAV_RUNTIME__ = true;
  run();
  window.addEventListener('load', () => setTimeout(run, 100));
  window.addEventListener('hashchange', () => setTimeout(run, 100));
  window.addEventListener('popstate', () => setTimeout(run, 100));
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cvx-billing-nav]');
    if (!button) return;
    event.preventDefault();
    scrollToBilling(button.getAttribute('data-cvx-billing-nav'));
  }, true);
  const observer = new MutationObserver(() => setTimeout(run, 80));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(run, 400);
  setInterval(run, 1500);
}

export {};