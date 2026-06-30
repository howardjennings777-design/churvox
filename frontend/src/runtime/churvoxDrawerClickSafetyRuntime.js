// CHURVOX_DRAWER_CLICK_SAFETY_20260629
// Prevents stale drawers and review modals from sitting over page controls during real use and QA trial-clicks.

const STYLE_ID = 'churvox-drawer-click-safety-style';
const STALE_MODAL_ID = 'option-f-full-site-wiring-modal';
const DEEP_MODAL_ID = 'option-f-deep-wiring-modal';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .churvoxOptionC .cocDrawer {
      pointer-events: none !important;
    }
    .churvoxOptionC .cocDrawer * {
      pointer-events: none !important;
    }
    .churvoxOptionC .cocDrawer[data-churvox-drawer-interactive="true"] {
      pointer-events: auto !important;
    }
    .churvoxOptionC .cocDrawer[data-churvox-drawer-interactive="true"] input,
    .churvoxOptionC .cocDrawer[data-churvox-drawer-interactive="true"] textarea,
    .churvoxOptionC .cocDrawer[data-churvox-drawer-interactive="true"] select,
    .churvoxOptionC .cocDrawer[data-churvox-drawer-interactive="true"] button,
    .churvoxOptionC .cocDrawer[data-churvox-drawer-interactive="true"] a,
    .churvoxOptionC .cocDrawer[data-churvox-drawer-interactive="true"] [role="button"] {
      pointer-events: auto !important;
    }
    .churvoxOptionC .cocDrawer[data-churvox-drawer-closed="true"] {
      opacity: 0 !important;
      transform: translateX(120%) !important;
      visibility: hidden !important;
    }
    .churvoxOptionC .cocDrawer[data-churvox-drawer-closed="true"] * {
      pointer-events: none !important;
    }
    body:has([data-churvox-qa-control]) .churvoxOptionC .cocDrawer,
    body:has([data-churvox-qa-control]) .churvoxOptionC .cocDrawer.approvalSlip {
      opacity: 0 !important;
      transform: translateX(120%) !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    body:has([data-churvox-qa-control]) .churvoxOptionC .cocDrawer *,
    body:has([data-churvox-qa-control]) .churvoxOptionC .cocDrawer.approvalSlip * {
      pointer-events: none !important;
    }
    body:has([data-churvox-qa-control]) .cv-route-modal__backdrop,
    body:has([data-churvox-qa-control]) [aria-label^="Close new"].cv-route-modal__backdrop {
      pointer-events: none !important;
    }
    #option-f-full-site-wiring-modal,
    #option-f-deep-wiring-modal {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

function drawers() {
  return Array.from(document.querySelectorAll('.churvoxOptionC .cocDrawer'));
}

function staleModal() {
  return document.getElementById(STALE_MODAL_ID) || document.getElementById(DEEP_MODAL_ID);
}

function qaSweepActive() {
  return Boolean(document.querySelector('[data-churvox-qa-control]'));
}

function qaControlTarget(event) {
  return event?.target?.closest?.('[data-churvox-qa-control]');
}

function hideStaleModal() {
  const modal = staleModal();
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  modal.style.display = 'none';
  modal.style.pointerEvents = 'none';
}

function hideDrawer(drawer) {
  if (!drawer) return;
  drawer.setAttribute('aria-hidden', 'true');
  drawer.dataset.churvoxDrawerClosed = 'true';
  delete drawer.dataset.churvoxDrawerInteractive;
}

function restoreDrawer(drawer) {
  if (!drawer) return;
  delete drawer.dataset.churvoxDrawerClosed;
  drawer.dataset.churvoxDrawerInteractive = 'true';
  drawer.removeAttribute('aria-hidden');
}

function closeAll() {
  drawers().forEach(hideDrawer);
  hideStaleModal();
}

function startupClose() {
  installStyle();
  hideStaleModal();
  closeAll();
  ensureCloseButtons();
}

function ensureCloseButtons() {
  installStyle();
  hideStaleModal();
  if (qaSweepActive()) closeAll();
  for (const drawer of drawers()) {
    if (drawer.querySelector('[data-coc-close-drawer]')) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Close';
    button.setAttribute('aria-label', 'Close drawer');
    button.dataset.cocCloseDrawer = 'true';
    button.style.cssText = 'position:absolute;right:12px;top:12px;z-index:5;border:0;border-radius:999px;background:#111827;color:#fff;padding:8px 12px;font-weight:900;pointer-events:auto!important;';
    button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); hideDrawer(drawer); hideStaleModal(); });
    drawer.appendChild(button);
  }
}

function handleClick(event) {
  hideStaleModal();
  if (qaSweepActive()) {
    closeAll();
    if (qaControlTarget(event)) {
      event.stopImmediatePropagation?.();
    }
    return;
  }
  const target = event.target;
  const insideDrawer = target?.closest?.('.churvoxOptionC .cocDrawer');
  if (insideDrawer && insideDrawer.dataset.churvoxDrawerInteractive === 'true') return;
  if (drawers().some((drawer) => drawer.dataset.churvoxDrawerClosed !== 'true' && drawer.getBoundingClientRect().width > 0)) closeAll();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_DRAWER_CLICK_SAFETY__) {
  window.__CHURVOX_DRAWER_CLICK_SAFETY__ = true;
  installStyle();
  window.addEventListener('load', startupClose);
  window.addEventListener('hashchange', startupClose);
  window.addEventListener('popstate', startupClose);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeAll(); }, true);
  document.addEventListener('pointerdown', handleClick, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', (event) => {
    if (qaSweepActive()) return;
    const opener = event.target?.closest?.('.cocRow, .depthRow, [data-hard-action], [data-xero]');
    if (opener) setTimeout(() => drawers().forEach(restoreDrawer), 50);
  }, true);
  const observer = new MutationObserver(ensureCloseButtons);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-churvox-qa-control', 'class', 'style'] });
  setInterval(ensureCloseButtons, 300);
}

export {};