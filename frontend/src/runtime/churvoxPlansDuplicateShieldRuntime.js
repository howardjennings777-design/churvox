// CSS-only duplicate Plans shield.
// Never removes DOM. It only hides the old product Plans shell when the real billing page is present.

const STYLE_ID = 'churvox-plans-duplicate-shield-style';

const css = `
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxTop,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxNav,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxToolbar,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxHero,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPlans,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPlanGrid,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxPricingGrid,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxKpis,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) .cvxProductOpsStrip,
  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) #churvox-product-ops-strip {
    display: none !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxPage:has(> #option-f-plans-pricing-desk) > *:not(#option-f-plans-pricing-desk) {
    display: none !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxPage:has(> #option-f-plans-pricing-desk) > #option-f-plans-pricing-desk {
    display: grid !important;
  }

  .cvxProduct[data-product-version="v2"]:has(#option-f-plans-pricing-desk) {
    min-height: auto !important;
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