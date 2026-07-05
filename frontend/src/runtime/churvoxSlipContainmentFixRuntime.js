// Final containment for Churvox slips.
// Prevents smart-check and approval slips from taking over the page as a white full-screen document.

const STYLE_ID = 'churvox-slip-containment-fix-style';

const css = `
  #churvox-smart-admin-audit-slip,
  #churvox-product-control-modal,
  .cvxSmartAuditLayer,
  .cvxProductControlLayer,
  .cvxProduct[data-product-version="v2"] .cvxDrawerLayer,
  .recordWorkspacePopupOverlay,
  .recordWorkspacePopupBackdrop {
    position: fixed !important;
    inset: 0 !important;
    z-index: 1000006 !important;
    display: grid !important;
    place-items: center !important;
    align-items: center !important;
    justify-items: center !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    padding: 22px !important;
    overflow: hidden !important;
    background: rgba(13, 17, 15, .52) !important;
    backdrop-filter: blur(9px) !important;
  }

  #churvox-smart-admin-audit-slip .cvxSmartAuditSlip,
  #churvox-product-control-modal .cvxProductControlModal,
  .cvxSmartAuditSlip,
  .cvxProductControlModal,
  .cvxProduct[data-product-version="v2"] .cvxDrawer,
  .recordWorkspacePopup,
  .recordWorkspacePopupPanel {
    position: relative !important;
    inset: auto !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    bottom: auto !important;
    width: min(860px, calc(100vw - 44px)) !important;
    max-width: min(860px, calc(100vw - 44px)) !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: calc(100vh - 44px) !important;
    margin: 0 auto !important;
    overflow: auto !important;
    border-radius: 28px !important;
    background: linear-gradient(180deg, #fffefa, #f7f2ea) !important;
    color: #111713 !important;
    box-shadow: 0 36px 110px rgba(10, 14, 12, .38) !important;
    transform: none !important;
  }

  .cvxSmartAuditSlipHead,
  .cvxProductControlHead,
  .cvxProduct[data-product-version="v2"] .cvxDrawerHead {
    position: sticky !important;
    top: 0 !important;
    z-index: 5 !important;
    background: rgba(255, 254, 250, .96) !important;
    color: #111713 !important;
    backdrop-filter: blur(12px) !important;
  }

  .cvxSmartAuditClose,
  .cvxProductControlClose,
  .cvxProduct[data-product-version="v2"] .cvxDrawerClose,
  [data-cvx-smart-close],
  [data-cvx-close-control] {
    min-width: 64px !important;
    min-height: 38px !important;
    border: 0 !important;
    border-radius: 999px !important;
    padding: 9px 13px !important;
    background: #111713 !important;
    color: #ffffff !important;
    font-size: 12px !important;
    font-weight: 1000 !important;
    line-height: 1 !important;
    text-align: center !important;
    cursor: pointer !important;
    opacity: 1 !important;
  }

  .cvxSmartAuditSlipBody,
  .cvxProductControlBody,
  .cvxProduct[data-product-version="v2"] .cvxDrawerBody {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }

  .cvxSmartAuditSlipGrid,
  .cvxProductControlGrid,
  .cvxProduct[data-product-version="v2"] .cvxFormGrid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .cvxSmartAuditSlipGrid > *,
  .cvxProductControlGrid > *,
  .cvxProduct[data-product-version="v2"] .cvxFormGrid > * {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow-wrap: anywhere !important;
  }

  body:has(#churvox-smart-admin-audit-slip),
  body:has(#churvox-product-control-modal),
  body:has(.cvxProduct[data-product-version="v2"] .cvxDrawerLayer) {
    overflow: hidden !important;
  }

  @media (max-width: 720px) {
    #churvox-smart-admin-audit-slip,
    #churvox-product-control-modal,
    .cvxSmartAuditLayer,
    .cvxProductControlLayer,
    .cvxProduct[data-product-version="v2"] .cvxDrawerLayer,
    .recordWorkspacePopupOverlay,
    .recordWorkspacePopupBackdrop {
      padding: 10px !important;
      align-items: end !important;
    }

    #churvox-smart-admin-audit-slip .cvxSmartAuditSlip,
    #churvox-product-control-modal .cvxProductControlModal,
    .cvxSmartAuditSlip,
    .cvxProductControlModal,
    .cvxProduct[data-product-version="v2"] .cvxDrawer,
    .recordWorkspacePopup,
    .recordWorkspacePopupPanel {
      width: calc(100vw - 20px) !important;
      max-width: calc(100vw - 20px) !important;
      max-height: calc(100vh - 20px) !important;
      border-radius: 24px !important;
    }

    .cvxSmartAuditSlipGrid,
    .cvxProductControlGrid,
    .cvxProduct[data-product-version="v2"] .cvxFormGrid {
      grid-template-columns: 1fr !important;
    }
  }
`;

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

function fixCloseText() {
  document.querySelectorAll('.cvxSmartAuditClose, .cvxProductControlClose, [data-cvx-smart-close], [data-cvx-close-control]').forEach((button) => {
    if (!button.textContent.trim()) button.textContent = 'Close';
  });
}

function run() {
  ensureStyle();
  fixCloseText();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_SLIP_CONTAINMENT_FIX_RUNTIME__) {
  window.__CHURVOX_SLIP_CONTAINMENT_FIX_RUNTIME__ = true;
  run();
  window.addEventListener('load', () => setTimeout(run, 80));
  window.addEventListener('hashchange', () => setTimeout(run, 80));
  window.addEventListener('popstate', () => setTimeout(run, 80));
  document.addEventListener('click', () => setTimeout(run, 60), true);
  const observer = new MutationObserver(() => setTimeout(run, 40));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(run, 350);
  setTimeout(run, 1200);
  setInterval(run, 2500);
}

export {};