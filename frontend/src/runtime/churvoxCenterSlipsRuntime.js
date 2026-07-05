import './churvoxProductControlsRuntime';
import './churvoxProductWorkbenchRuntime';
import './churvoxCommandRealSlipRuntime';
import './churvoxHeaderFitRuntime';
import './churvoxOwnerHeaderLogoRuntime';
import './churvoxSmartAdminAuditRuntime';
import './churvoxProductCopyCleanRuntime';

// Center Churvox slips and record drawers like proper review modals.
// Loaded last so approval slips do not open as side drawers.

const STYLE_ID = 'churvox-center-slips-runtime-style';

const css = `
  .cvxProduct[data-product-version="v2"] .cvxDrawerLayer,
  .churvoxOptionC .cocDrawerLayer,
  .churvoxOptionC .drawerLayer,
  .churvoxOptionC .properSlipLayer,
  .churvoxOptionC .properModalLayer,
  .churvoxOptionC .recordModalLayer,
  .recordWorkspacePopupOverlay,
  .recordWorkspacePopupBackdrop,
  #churvox-smart-admin-audit-slip,
  #churvox-product-control-modal,
  .cvxSmartAuditLayer,
  .cvxProductControlLayer {
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
    background: rgba(13,17,15,.52) !important;
    backdrop-filter: blur(9px) !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxDrawer,
  .churvoxOptionC .cocDrawer,
  .churvoxOptionC .properFormBox,
  .churvoxOptionC .properSlip,
  .churvoxOptionC .recordModal,
  .recordWorkspacePopup,
  .recordWorkspacePopupPanel,
  .cvxSmartAuditSlip,
  .cvxProductControlModal {
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
    border-radius: 30px !important;
    overflow: auto !important;
    transform: none !important;
    background: linear-gradient(180deg,#fffefa,#f7f2ea) !important;
    color: #111713 !important;
    box-shadow: 0 36px 110px rgba(10,14,12,.38) !important;
    animation: churvoxCenteredSlipIn .16s ease-out both !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxDrawer.approval,
  .churvoxOptionC .cocDrawer.approval,
  .churvoxOptionC .properSlip.approval,
  .churvoxOptionC .properFormBox.approval {
    width: min(820px, calc(100vw - 44px)) !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxDrawerClose,
  .churvoxOptionC .closeDrawer,
  .churvoxOptionC [data-proper-form-close],
  .cvxSmartAuditClose,
  .cvxProductControlClose,
  [data-cvx-smart-close],
  [data-cvx-close-control] {
    position: sticky !important;
    top: 0 !important;
    z-index: 6 !important;
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
    opacity: 1 !important;
    cursor: pointer !important;
  }

  .cvxSmartAuditSlipGrid,
  .cvxProductControlGrid,
  .cvxProduct[data-product-version="v2"] .cvxFormGrid {
    display: grid !important;
    grid-template-columns: repeat(2,minmax(0,1fr)) !important;
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

  @keyframes churvoxCenteredSlipIn {
    from { opacity: .86; transform: translateY(10px) scale(.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (max-width: 720px) {
    .cvxProduct[data-product-version="v2"] .cvxDrawerLayer,
    .churvoxOptionC .cocDrawerLayer,
    .churvoxOptionC .drawerLayer,
    .churvoxOptionC .properSlipLayer,
    .recordWorkspacePopupOverlay,
    .recordWorkspacePopupBackdrop,
    #churvox-smart-admin-audit-slip,
    #churvox-product-control-modal,
    .cvxSmartAuditLayer,
    .cvxProductControlLayer {
      padding: 10px !important;
      align-items: end !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxDrawer,
    .churvoxOptionC .cocDrawer,
    .churvoxOptionC .properFormBox,
    .churvoxOptionC .properSlip,
    .churvoxOptionC .recordModal,
    .recordWorkspacePopup,
    .recordWorkspacePopupPanel,
    .cvxSmartAuditSlip,
    .cvxProductControlModal {
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

function applyCenteredSlips() {
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
  document.querySelectorAll('.cvxSmartAuditClose,.cvxProductControlClose,[data-cvx-smart-close],[data-cvx-close-control]').forEach((button) => {
    if (!button.textContent.trim()) button.textContent = 'Close';
  });
}

if (typeof window !== 'undefined' && !window.__CHURVOX_CENTER_SLIPS_RUNTIME__) {
  window.__CHURVOX_CENTER_SLIPS_RUNTIME__ = true;
  applyCenteredSlips();
  window.addEventListener('load', () => setTimeout(applyCenteredSlips, 80));
  window.addEventListener('hashchange', () => setTimeout(applyCenteredSlips, 80));
  window.addEventListener('popstate', () => setTimeout(applyCenteredSlips, 80));
  document.addEventListener('click', () => setTimeout(applyCenteredSlips, 40), true);
  const observer = new MutationObserver(() => setTimeout(applyCenteredSlips, 40));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(applyCenteredSlips, 350);
  setTimeout(applyCenteredSlips, 1200);
  setInterval(applyCenteredSlips, 2500);
}

export {};