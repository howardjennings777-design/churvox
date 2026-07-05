// Keep owner logic panels stable without fighting page cleanup every few hundred ms.

const STYLE_ID = 'churvox-owner-logic-panels-shield-style';
const IDS = [
  'churvox-owner-record-engine-panel',
  'churvox-owner-workflow-automation-panel',
  'churvox-owner-timeline-panel',
  'churvox-owner-data-quality-panel',
  'churvox-paid-launch-readiness-panel',
];
const PROTECTED_ATTRS = new Set(['data-proper-hidden', 'data-core-hidden', 'data-lite-hidden', 'hidden', 'aria-hidden']);

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = IDS.map((id) => `
    .churvoxOptionC[data-proper-pages="true"] .cocPage > #${id},
    .churvoxOptionC[data-proper-pages="true"] .cocPage > #${id}[data-proper-hidden="true"],
    .churvoxOptionC[data-proper-pages="true"] .cocPage > #${id}[data-core-hidden="true"],
    .churvoxOptionC[data-proper-pages="true"] .cocPage > #${id}[data-lite-hidden="true"]{
      display:grid!important;visibility:visible!important;opacity:1!important;height:auto!important;min-height:0!important;max-height:none!important;margin-top:0!important;overflow:visible!important;
    }`).join('\n');
  document.head.appendChild(style);
}

function protectSetAttribute() {
  if (window.__CHURVOX_OWNER_LOGIC_PANEL_SETATTR_GUARD__) return;
  window.__CHURVOX_OWNER_LOGIC_PANEL_SETATTR_GUARD__ = true;
  const original = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function guardedSetAttribute(name, value) {
    try {
      const attr = String(name || '').toLowerCase();
      if (this?.id && IDS.includes(this.id) && PROTECTED_ATTRS.has(attr)) return undefined;
    } catch (_) {}
    return original.call(this, name, value);
  };
}

function unhide(node) {
  if (!node) return false;
  let changed = false;
  PROTECTED_ATTRS.forEach((attr) => {
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
  protectSetAttribute();
  const sig = IDS.map((id) => {
    const node = document.getElementById(id);
    return node ? `${id}:${node.getAttribute('data-proper-hidden') || ''}:${node.getAttribute('data-core-hidden') || ''}:${node.getAttribute('data-lite-hidden') || ''}:${node.getAttribute('hidden') || ''}:${node.getAttribute('aria-hidden') || ''}:${node.style.display || ''}:${node.style.visibility || ''}:${node.style.opacity || ''}` : `${id}:missing`;
  }).join('|');
  if (sig === last) return;
  last = sig;
  IDS.forEach((id) => unhide(document.getElementById(id)));
}

function schedule(ms = 80) { setTimeout(run, ms); }

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_LOGIC_PANELS_SHIELD__) {
  window.__CHURVOX_OWNER_LOGIC_PANELS_SHIELD__ = true;
  protectSetAttribute();
  addEventListener('DOMContentLoaded', run);
  addEventListener('load', run);
  addEventListener('hashchange', () => schedule(120));
  addEventListener('popstate', () => schedule(120));
  addEventListener('churvox:command-prepared', () => schedule(180));
  addEventListener('churvox:owner-workflow-automation', () => schedule(180));
  addEventListener('churvox:owner-data-quality', () => schedule(180));
  addEventListener('churvox:owner-record-api-synced', () => schedule(180));
  addEventListener('churvox:owner-backend-hydrated', () => schedule(180));
  document.addEventListener('click', () => schedule(220), true);
  setInterval(run, 4000);
  run();
}

export {};
