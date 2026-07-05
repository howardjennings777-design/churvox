// CSS-only duplicate Plans shield.
// Never removes DOM. Only hides known duplicate product-shell pieces when the real billing page is present.

const STYLE_ID = 'churvox-plans-duplicate-shield-style';

const css = `
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) > .cvxTop,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) > .cvxNav,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPage > .cvxToolbar,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPage > .cvxHero,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPage > .cvxPlans,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPage > .cvxPlanGrid,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPage > .cvxPricingGrid,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPage > .cvxKpis,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPage > .cvxProductOpsStrip,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPage > #churvox-product-ops-strip {
    display: none !important;
  }

  .cvxProduct[data-product-version="v2"] #option-f-plans-pricing-desk {
    display: grid !important;
    visibility: visible !important;
  }
`;

function apply() {
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
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PLANS_DUPLICATE_SHIELD__) {
  window.__CHURVOX_PLANS_DUPLICATE_SHIELD__ = true;
  apply();
  window.addEventListener('load', apply);
}

export {};