// Keeps the Churvox owner header/nav inside the viewport.
// Prevents horizontal spill on laptops, narrow windows and mobile.

const STYLE_ID = 'churvox-header-fit-runtime-style';

const css = `
  html,
  body,
  #root,
  .cvxProduct[data-product-version="v2"] {
    max-width: 100vw !important;
    overflow-x: clip !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxTop {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    grid-template-columns: minmax(150px, 210px) minmax(0, 1fr) minmax(96px, 150px) !important;
    gap: clamp(8px, 1.2vw, 16px) !important;
    padding-left: clamp(10px, 1.6vw, 22px) !important;
    padding-right: clamp(10px, 1.6vw, 22px) !important;
    overflow: hidden !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxTop > *,
  .cvxProduct[data-product-version="v2"] .cvxBrand,
  .cvxProduct[data-product-version="v2"] .cvxTitle,
  .cvxProduct[data-product-version="v2"] .cvxAccount {
    min-width: 0 !important;
    max-width: 100% !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand {
    overflow: hidden !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand b,
  .cvxProduct[data-product-version="v2"] .cvxBrand small,
  .cvxProduct[data-product-version="v2"] .cvxAccount b,
  .cvxProduct[data-product-version="v2"] .cvxAccount small,
  .cvxProduct[data-product-version="v2"] .cvxTitle h1,
  .cvxProduct[data-product-version="v2"] .cvxTitle p {
    max-width: 100% !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxTitle h1 {
    font-size: clamp(18px, 2vw, 25px) !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxTitle p {
    font-size: clamp(10px, 1.05vw, 12px) !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxNav {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    scrollbar-width: thin !important;
    padding-left: clamp(10px, 1.6vw, 22px) !important;
    padding-right: clamp(10px, 1.6vw, 22px) !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxNav button {
    flex: 0 0 auto !important;
    max-width: 150px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxWorkspace,
  .cvxProduct[data-product-version="v2"] .cvxPage,
  .cvxProduct[data-product-version="v2"] .cvxHero,
  .cvxProduct[data-product-version="v2"] .cvxToolbar,
  .cvxProduct[data-product-version="v2"] .cvxProductOpsStrip {
    max-width: 100% !important;
    min-width: 0 !important;
  }

  @media (max-width: 980px) {
    .cvxProduct[data-product-version="v2"] .cvxTop {
      grid-template-columns: minmax(130px, 180px) minmax(0, 1fr) !important;
      min-height: 68px !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxAccount {
      display: none !important;
    }
  }

  @media (max-width: 680px) {
    .cvxProduct[data-product-version="v2"] .cvxTop {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      min-height: auto !important;
      gap: 6px !important;
      padding-top: 10px !important;
      padding-bottom: 10px !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxBrand i {
      width: 30px !important;
      height: 30px !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxTitle h1 {
      font-size: 20px !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxTitle p {
      white-space: normal !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxNav {
      top: auto !important;
      padding-top: 8px !important;
      padding-bottom: 8px !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxNav button {
      max-width: 118px !important;
      min-height: 34px !important;
      padding: 7px 10px !important;
      font-size: 11px !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxWorkspace {
      padding-left: 10px !important;
      padding-right: 10px !important;
    }
  }
`;

function applyHeaderFit() {
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
  if (style.parentNode === document.head && document.head.lastElementChild !== style) {
    document.head.appendChild(style);
  }
}

if (typeof window !== 'undefined' && !window.__CHURVOX_HEADER_FIT_RUNTIME__) {
  window.__CHURVOX_HEADER_FIT_RUNTIME__ = true;
  applyHeaderFit();
  window.addEventListener('load', () => setTimeout(applyHeaderFit, 80));
  window.addEventListener('resize', () => setTimeout(applyHeaderFit, 40));
  window.addEventListener('hashchange', () => setTimeout(applyHeaderFit, 80));
  setTimeout(applyHeaderFit, 350);
  setTimeout(applyHeaderFit, 1200);
  setInterval(applyHeaderFit, 3000);
}

export {};