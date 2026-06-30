import './optionFChurvoxOsV2Runtime';
import '../runtime/churvoxWorkerMessageBridgeRuntime';

// CHURVOX_OPTION_F_HIDE_HELPER_BUTTONS_20260630
// Keeps old helper/test controls out of the owner workspace.

const STYLE_ID = 'option-f-hide-helper-buttons-style';
const HIDDEN_CLASS = 'ofHelperButtonHidden';
const HELPERS = [
  'open command',
  'open command desk',
  'open command board',
  'run site checks',
  'run site check',
  'site checks',
];

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `.${HIDDEN_CLASS}{display:none!important;visibility:hidden!important;pointer-events:none!important}`;
  document.head.appendChild(style);
}

function labelOf(node) {
  return String(node?.textContent || node?.getAttribute?.('aria-label') || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function apply() {
  ensureStyle();
  if (!document.querySelector('.churvoxOptionC')) return;
  document.querySelectorAll('.churvoxOptionC button, .churvoxOptionC a').forEach((node) => {
    const label = labelOf(node);
    const hide = HELPERS.includes(label);
    node.classList.toggle(HIDDEN_CLASS, hide);
    if (hide) node.setAttribute('aria-hidden', 'true');
  });
}

if (typeof window !== 'undefined' && !window.__CHURVOX_HIDE_HELPER_BUTTONS__) {
  window.__CHURVOX_HIDE_HELPER_BUTTONS__ = true;
  window.addEventListener('load', () => setTimeout(apply, 300));
  window.addEventListener('hashchange', () => setTimeout(apply, 120));
  window.addEventListener('popstate', () => setTimeout(apply, 120));
  document.addEventListener('click', () => setTimeout(apply, 120), true);
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(apply, 1200);
}

export {};