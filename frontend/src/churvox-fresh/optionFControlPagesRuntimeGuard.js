const CONTROL_LAYER_CLASS = 'optionFControlDepth';
const CONTROL_PAGES = new Set(['xero', 'settings', 'plans', 'help']);

function activeControlPage() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (CONTROL_PAGES.has(hash)) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  const label = active ? active.textContent.trim().toLowerCase() : '';
  return CONTROL_PAGES.has(label) ? label : '';
}

function cleanupControlDepth() {
  if (activeControlPage()) return;
  document.querySelectorAll(`.${CONTROL_LAYER_CLASS}`).forEach((node) => node.remove());
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => setTimeout(cleanupControlDepth, 120));
  window.addEventListener('popstate', () => setTimeout(cleanupControlDepth, 120));
  document.addEventListener('click', () => setTimeout(cleanupControlDepth, 160));
  setInterval(cleanupControlDepth, 1500);
}
