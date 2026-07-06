const FORM_LABEL_RUNTIME_FLAG = '__CHURVOX_EXACT_FORM_LABELS_RUNTIME__';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function visible(node) {
  if (!node) return false;
  const rect = node.getBoundingClientRect?.();
  const style = window.getComputedStyle?.(node);
  return Boolean(rect && rect.width > 0 && rect.height > 0 && style?.display !== 'none' && style?.visibility !== 'hidden');
}

function labelName(label) {
  return clean(label?.querySelector?.('span')?.textContent || label?.getAttribute?.('data-cvx-human-label') || label?.textContent || '');
}

function controlFor(label) {
  return label?.querySelector?.('input, textarea, select') || null;
}

function normaliseLabel(label) {
  const name = labelName(label);
  if (!name) return;
  const control = controlFor(label);
  if (!control) return;

  control.setAttribute('aria-label', name);
  control.setAttribute('name', name);

  if (!control.id) {
    control.id = `cvx-field-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 8)}`;
  }

  label.setAttribute('for', control.id);
  label.setAttribute('data-cvx-exact-label', name);
}

function normaliseForms() {
  document.querySelectorAll('.cvxDrawerLayer label, [role="dialog"] label, .cvxDrawer label, .cvxForm label').forEach((label) => {
    if (visible(label)) normaliseLabel(label);
  });
}

function removePaidLaunchFallbackDrawers() {
  document.querySelectorAll('[id^="churvox-paid-launch-fallback-"]').forEach((node) => node.remove());
  document.getElementById('churvox-paid-launch-client-form')?.remove();
}

function installFallbackOverlayStyles() {
  if (document.getElementById('churvox-exact-form-labels-nav-style')) return;
  const style = document.createElement('style');
  style.id = 'churvox-exact-form-labels-nav-style';
  style.textContent = `
    .cvxPaidLaunchFallbackForm{pointer-events:none}
    .cvxPaidLaunchFallbackForm .cvxDrawer{pointer-events:auto}
    .cvxPaidLaunchFallbackForm .cvxDrawer.cvxOwnerNavUnblocked{pointer-events:none}
  `;
  document.head.appendChild(style);
}

function eventIsInsideOwnerNav(event) {
  const nav = document.querySelector('.cvxNav');
  if (!nav) return false;
  const rect = nav.getBoundingClientRect();
  const x = Number(event.clientX || 0);
  const y = Number(event.clientY || 0);
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function unblockOwnerNav(event) {
  if (!eventIsInsideOwnerNav(event)) return;
  document.querySelectorAll('[id^="churvox-paid-launch-fallback-"] .cvxDrawer').forEach((drawer) => {
    drawer.classList.add('cvxOwnerNavUnblocked');
  });
  window.setTimeout(removePaidLaunchFallbackDrawers, 0);
  window.setTimeout(removePaidLaunchFallbackDrawers, 80);
}

function schedule() {
  [0, 50, 150, 350, 800, 1400].forEach((delay) => window.setTimeout(normaliseForms, delay));
}

if (typeof window !== 'undefined' && !window[FORM_LABEL_RUNTIME_FLAG]) {
  window[FORM_LABEL_RUNTIME_FLAG] = true;
  installFallbackOverlayStyles();
  schedule();
  document.addEventListener('pointerdown', unblockOwnerNav, true);
  document.addEventListener('mousedown', unblockOwnerNav, true);
  document.addEventListener('click', (event) => { unblockOwnerNav(event); schedule(); }, true);
  window.addEventListener('hashchange', () => { removePaidLaunchFallbackDrawers(); schedule(); });
  window.addEventListener('popstate', () => { removePaidLaunchFallbackDrawers(); schedule(); });
  window.addEventListener('churvox:data-refresh', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.setInterval(normaliseForms, 1200);
}
