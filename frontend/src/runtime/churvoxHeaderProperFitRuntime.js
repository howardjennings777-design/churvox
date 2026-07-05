// Final owner header fit: compact two-row header with all tabs inside the screen.

const STYLE_ID = 'churvox-header-proper-fit-style';

const css = `
  html, body, #root,
  .cvxProduct[data-product-version="v2"] {
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: clip !important;
  }

  .cvxProduct[data-product-version="v2"] {
    --cvxHeaderPad: clamp(8px, 1.1vw, 16px);
  }

  .cvxProduct[data-product-version="v2"] .cvxTop {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    display: grid !important;
    grid-template-columns: minmax(142px, 178px) minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 10px !important;
    min-height: 52px !important;
    padding: 7px var(--cvxHeaderPad) !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxAccount {
    display: none !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand {
    min-width: 0 !important;
    max-width: 178px !important;
    display: grid !important;
    grid-template-columns: 34px minmax(0, 1fr) !important;
    gap: 7px !important;
    align-items: center !important;
    overflow: hidden !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand i,
  .cvxProduct[data-product-version="v2"] .cvxBrand i svg {
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    border-radius: 11px !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand b {
    font-size: 15px !important;
    line-height: .95 !important;
    max-width: 100% !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand small {
    font-size: 8px !important;
    line-height: 1 !important;
    letter-spacing: .08em !important;
    max-width: 100% !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxTitle {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxTitle h1 {
    margin: 0 !important;
    font-size: clamp(18px, 1.75vw, 24px) !important;
    line-height: .98 !important;
    letter-spacing: -.045em !important;
    max-width: 100% !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxTitle p {
    margin: 3px 0 0 !important;
    font-size: clamp(10px, .95vw, 12px) !important;
    line-height: 1.15 !important;
    max-width: 100% !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxNav {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    display: grid !important;
    grid-template-columns: repeat(14, minmax(0, 1fr)) !important;
    gap: 4px !important;
    padding: 5px var(--cvxHeaderPad) 7px !important;
    overflow: hidden !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxNav button {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    min-height: 30px !important;
    padding: 6px 4px !important;
    border-radius: 999px !important;
    font-size: clamp(9px, .78vw, 11px) !important;
    line-height: 1 !important;
    font-weight: 900 !important;
    text-align: center !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxWorkspace {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    padding-left: clamp(10px, 1.4vw, 20px) !important;
    padding-right: clamp(10px, 1.4vw, 20px) !important;
    overflow-x: hidden !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxPage,
  .cvxProduct[data-product-version="v2"] .cvxHero,
  .cvxProduct[data-product-version="v2"] .cvxToolbar,
  .cvxProduct[data-product-version="v2"] .cvxProductOpsStrip,
  .cvxProduct[data-product-version="v2"] .cvxSmartAuditPanel {
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }

  @media (max-width: 980px) {
    .cvxProduct[data-product-version="v2"] .cvxTop {
      grid-template-columns: minmax(128px, 160px) minmax(0, 1fr) !important;
      gap: 8px !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxBrand {
      max-width: 160px !important;
      grid-template-columns: 30px minmax(0, 1fr) !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxBrand i,
    .cvxProduct[data-product-version="v2"] .cvxBrand i svg {
      width: 30px !important;
      height: 30px !important;
      min-width: 30px !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxNav {
      grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
      gap: 5px !important;
    }
  }

  @media (max-width: 640px) {
    .cvxProduct[data-product-version="v2"] .cvxTop {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 5px !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxTitle p {
      white-space: normal !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxNav {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }
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
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_HEADER_PROPER_FIT_RUNTIME__) {
  window.__CHURVOX_HEADER_PROPER_FIT_RUNTIME__ = true;
  apply();
  window.addEventListener('load', () => setTimeout(apply, 80));
  window.addEventListener('resize', () => setTimeout(apply, 40));
  window.addEventListener('hashchange', () => setTimeout(apply, 80));
  window.addEventListener('popstate', () => setTimeout(apply, 80));
  setTimeout(apply, 350);
  setTimeout(apply, 1200);
  setInterval(apply, 2500);
}

export {};