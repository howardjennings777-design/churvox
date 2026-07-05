import './churvoxProductControlsRuntime';
import './churvoxProductWorkbenchRuntime';
import './churvoxCommandRealSlipRuntime';
import './churvoxHeaderFitRuntime';
import './churvoxSmartAdminAuditRuntime';

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
  .recordWorkspacePopupBackdrop {
    display: grid !important;
    place-items: center !important;
    align-items: center !important;
    justify-items: center !important;
    padding: 22px !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxDrawer,
  .churvoxOptionC .cocDrawer,
  .churvoxOptionC .properFormBox,
  .churvoxOptionC .properSlip,
  .churvoxOptionC .recordModal,
  .recordWorkspacePopup,
  .recordWorkspacePopupPanel {
    width: min(900px, calc(100vw - 44px)) !important;
    max-width: min(900px, calc(100vw - 44px)) !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: calc(100vh - 44px) !important;
    margin: 0 auto !important;
    border-radius: 30px !important;
    overflow: auto !important;
    transform: none !important;
    inset: auto !important;
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
  .churvoxOptionC [data-proper-form-close] {
    position: sticky !important;
    top: 0 !important;
    z-index: 4 !important;
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
    .recordWorkspacePopupBackdrop {
      padding: 10px !important;
      align-items: end !important;
    }

    .cvxProduct[data-product-version="v2"] .cvxDrawer,
    .churvoxOptionC .cocDrawer,
    .churvoxOptionC .properFormBox,
    .churvoxOptionC .properSlip,
    .churvoxOptionC .recordModal,
    .recordWorkspacePopup,
    .recordWorkspacePopupPanel {
      width: calc(100vw - 20px) !important;
      max-width: calc(100vw - 20px) !important;
      max-height: calc(100vh - 20px) !important;
      border-radius: 24px !important;
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
}

if (typeof window !== 'undefined' && !window.__CHURVOX_CENTER_SLIPS_RUNTIME__) {
  window.__CHURVOX_CENTER_SLIPS_RUNTIME__ = true;
  applyCenteredSlips();
  window.addEventListener('load', () => setTimeout(applyCenteredSlips, 80));
  window.addEventListener('hashchange', () => setTimeout(applyCenteredSlips, 80));
  window.addEventListener('popstate', () => setTimeout(applyCenteredSlips, 80));
  document.addEventListener('click', () => setTimeout(applyCenteredSlips, 40), true);
  setTimeout(applyCenteredSlips, 350);
  setTimeout(applyCenteredSlips, 1200);
  setInterval(applyCenteredSlips, 2500);
}

export {};