// Plans page duplicate guard + billing nav.
// Loads directly on #plans and inserts a real billing nav into the visible billing page.

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
    position: relative !important;
    z-index: 80 !important;
    display: flex !important;
    align-items: center !important;
    gap: 7px !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    margin: 10px 0 12px !important;
    padding: 7px !important;
    border: 1px solid rgba(17, 21, 19, .08) !important;
    border-radius: 16px !important;
    background: rgba(255, 254, 250, .92) !important;
    box-shadow: 0 10px 24px rgba(17, 21, 19, .06) !important;
    backdrop-filter: blur(10px) !important;
    overflow-x: auto !important;
    scrollbar-width: thin !important;
  }

  .cvxBillingPageNav button {
    flex: 1 0 auto !important;
    min-width: max-content !important;
    min-height: 30px !important;
    border: 0 !important;
    border-radius: 999px !important;
    padding: 7px 11px !important;
    background: rgba(17, 21, 19, .06) !important;
    color: #111713 !important;
    font-size: 11px !important;
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
      font-size: 10.5px !important;
      padding: 7px 10px !important;
    }
  }
`;

function page() {
  return (window.location.hash || '#today').replace('#', '').toLowerCase() || 'today';
}

function onPlansPage() {
  return page() === 'plans' || window.location.pathname === '/plans';
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
  if (!onPlansPage()) return;
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

function visibleText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function candidates() {
  return [...document.querySelectorAll('main, section, article, div')].filter((node) => {
    if (!node || node.id === BILLING_NAV_ID || node.closest?.(`#${BILLING_NAV_ID}`)) return false;
    const rect = node.getBoundingClientRect?.();
    return !rect || rect.width > 80;
  });
}

function realBillingRoot() {
  return candidates().find((node) => /plans and billing/i.test(visibleText(node)) && /live plan usage|refresh billing|manage billing/i.test(visibleText(node))) ||
    document.querySelector('.cvxProduct[data-product-version="v2"] .cvxPage') ||
    document.querySelector('main') ||
    document.querySelector('#root');
}

function findSection(patterns) {
  return candidates().find((node) => patterns.some((pattern) => pattern.test(visibleText(node))));
}

function createNav() {
  let nav = document.getElementById(BILLING_NAV_ID);
  if (!nav) {
    nav = document.createElement('nav');
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
  }
  return nav;
}

function placeNav() {
  if (!onPlansPage()) {
    document.getElementById(BILLING_NAV_ID)?.remove();
    return;
  }

  const nav = createNav();
  const root = realBillingRoot();
  if (!root) return;

  const trialStrip = findSection([/1\.\s*trial/i, /stripe checkout/i, /command rules/i]);
  const usage = findSection([/live plan usage/i]);
  const topCard = findSection([/plans and billing/i, /refresh billing/i, /manage billing/i]);

  if (trialStrip && trialStrip.parentElement) {
    if (nav.previousElementSibling !== trialStrip) trialStrip.insertAdjacentElement('afterend', nav);
    return;
  }

  if (usage && usage.parentElement) {
    if (nav.nextElementSibling !== usage) usage.insertAdjacentElement('beforebegin', nav);
    return;
  }

  if (topCard && topCard.parentElement) {
    if (nav.previousElementSibling !== topCard) topCard.insertAdjacentElement('afterend', nav);
    return;
  }

  if (nav.parentElement !== root) root.insertAdjacentElement('afterbegin', nav);
}

function scrollToBilling(kind) {
  const patterns = {
    overview: [/plans and billing/i, /no plan selected/i, /choose plan/i],
    usage: [/live plan usage/i, /clients/i, /jobs this month/i],
    plans: [/checkout: start/i, /start\s*\$39/i, /crew\s*\$89/i, /operator\s*\$149/i],
    addons: [/command growth pack/i, /accounting sync add-on/i, /add-ons/i],
    help: [/manage billing/i, /billing email/i, /pricing region/i],
  }[kind] || [];
  const target = findSection(patterns);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function run() {
  if (typeof document !== 'undefined') document.body.dataset.cvxOwnerPage = page();
  ensureStyle();
  removeDuplicateProductPlans();
  placeNav();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PLANS_NAV_RUNTIME_V2__) {
  window.__CHURVOX_PLANS_NAV_RUNTIME_V2__ = true;
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
  setTimeout(run, 250);
  setTimeout(run, 600);
  setTimeout(run, 1200);
  setInterval(run, 1600);
}

export {};