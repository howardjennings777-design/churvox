// CHURVOX_DRAWER_CLICK_SAFETY_20260629
// Lets QA and real users recover cleanly when an old Command drawer stays open over controls.

function drawers() {
  return Array.from(document.querySelectorAll('.churvoxOptionC .cocDrawer'));
}

function hideDrawer(drawer) {
  if (!drawer) return;
  drawer.setAttribute('aria-hidden', 'true');
  drawer.dataset.churvoxDrawerClosed = 'true';
  drawer.style.pointerEvents = 'none';
  drawer.style.opacity = '0';
  drawer.style.transform = 'translateX(120%)';
}

function restoreDrawer(drawer) {
  if (!drawer || drawer.dataset.churvoxDrawerClosed !== 'true') return;
  delete drawer.dataset.churvoxDrawerClosed;
  drawer.style.pointerEvents = '';
  drawer.style.opacity = '';
  drawer.style.transform = '';
  drawer.removeAttribute('aria-hidden');
}

function closeAll() {
  drawers().forEach(hideDrawer);
}

function ensureCloseButtons() {
  for (const drawer of drawers()) {
    if (drawer.querySelector('[data-coc-close-drawer]')) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Close';
    button.setAttribute('aria-label', 'Close drawer');
    button.dataset.cocCloseDrawer = 'true';
    button.style.cssText = 'position:absolute;right:12px;top:12px;z-index:5;border:0;border-radius:999px;background:#111827;color:#fff;padding:8px 12px;font-weight:900;';
    button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); hideDrawer(drawer); });
    drawer.appendChild(button);
  }
}

function handleClick(event) {
  const target = event.target;
  if (target?.closest?.('.churvoxOptionC .cocDrawer')) return;
  if (drawers().some((drawer) => drawer.dataset.churvoxDrawerClosed !== 'true' && drawer.getBoundingClientRect().width > 0)) closeAll();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_DRAWER_CLICK_SAFETY__) {
  window.__CHURVOX_DRAWER_CLICK_SAFETY__ = true;
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeAll(); }, true);
  document.addEventListener('pointerdown', handleClick, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', (event) => {
    const opener = event.target?.closest?.('.cocRow, .depthRow, [data-hard-action], [data-xero]');
    if (opener) setTimeout(() => drawers().forEach(restoreDrawer), 50);
  }, true);
  const observer = new MutationObserver(ensureCloseButtons);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ensureCloseButtons();
}

export {};
