// Keep owner logic panels visible above older page cleanup rules.

const STYLE_ID = 'churvox-owner-logic-panels-shield-style';
const IDS = [
  'churvox-owner-record-engine-panel',
  'churvox-owner-workflow-automation-panel',
  'churvox-owner-timeline-panel',
  'churvox-owner-data-quality-panel',
  'churvox-paid-launch-readiness-panel',
];

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = IDS.map((id) => `#${id}{display:grid!important;visibility:visible!important;opacity:1!important}`).join('\n');
  document.head.appendChild(style);
}

function unhide(node) {
  if (!node) return false;
  let changed = false;
  ['data-proper-hidden', 'data-core-hidden', 'data-lite-hidden', 'hidden', 'aria-hidden'].forEach((attr) => {
    if (node.hasAttribute(attr)) { node.removeAttribute(attr); changed = true; }
  });
  if (node.style.display === 'none') { node.style.display = ''; changed = true; }
  if (node.style.visibility === 'hidden') { node.style.visibility = ''; changed = true; }
  if (node.style.opacity === '0') { node.style.opacity = ''; changed = true; }
  return changed;
}

let last = '';
function run() {
  installStyle();
  const sig = IDS.map((id) => {
    const node = document.getElementById(id);
    return node ? `${id}:${node.getAttribute('data-proper-hidden') || ''}:${node.getAttribute('data-core-hidden') || ''}:${node.getAttribute('data-lite-hidden') || ''}:${node.getAttribute('hidden') || ''}:${node.getAttribute('aria-hidden') || ''}:${node.style.display || ''}:${node.style.visibility || ''}` : `${id}:missing`;
  }).join('|');
  if (sig === last) return;
  last = sig;
  IDS.forEach((id) => unhide(document.getElementById(id)));
}

function schedule(ms = 60) { setTimeout(run, ms); }

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_LOGIC_PANELS_SHIELD__) {
  window.__CHURVOX_OWNER_LOGIC_PANELS_SHIELD__ = true;
  addEventListener('DOMContentLoaded', run);
  addEventListener('load', run);
  addEventListener('hashchange', () => schedule(80));
  addEventListener('popstate', () => schedule(80));
  addEventListener('churvox:command-prepared', () => schedule(80));
  addEventListener('churvox:owner-workflow-automation', () => schedule(80));
  addEventListener('churvox:owner-data-quality', () => schedule(80));
  addEventListener('churvox:owner-record-api-synced', () => schedule(80));
  addEventListener('churvox:owner-backend-hydrated', () => schedule(80));
  document.addEventListener('click', () => schedule(180), true);
  try {
    new MutationObserver(() => schedule(40)).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-proper-hidden', 'data-core-hidden', 'data-lite-hidden', 'hidden', 'aria-hidden', 'style'] });
  } catch (_) {}
  setInterval(run, 700);
  run();
}

export {};
