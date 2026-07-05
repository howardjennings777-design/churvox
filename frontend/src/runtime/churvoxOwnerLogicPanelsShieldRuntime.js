// Keep owner logic panels visible above older page cleanup rules without constant repainting.

const STYLE_ID = 'churvox-owner-logic-panels-shield-style';
const IDS = ['churvox-owner-record-engine-panel', 'churvox-owner-workflow-automation-panel', 'churvox-owner-timeline-panel', 'churvox-owner-data-quality-panel'];

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = IDS.map((id) => `#${id}{display:grid!important;visibility:visible!important;opacity:1!important}`).join('\n');
  document.head.appendChild(style);
}

let last = '';
function run() {
  installStyle();
  const sig = IDS.map((id) => {
    const node = document.getElementById(id);
    return node ? `${id}:${node.getAttribute('data-proper-hidden') || ''}:${node.getAttribute('data-core-hidden') || ''}:${node.getAttribute('data-lite-hidden') || ''}` : `${id}:missing`;
  }).join('|');
  if (sig === last) return;
  last = sig;
  IDS.forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.removeAttribute('data-proper-hidden');
    node.removeAttribute('data-core-hidden');
    node.removeAttribute('data-lite-hidden');
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_LOGIC_PANELS_SHIELD__) {
  window.__CHURVOX_OWNER_LOGIC_PANELS_SHIELD__ = true;
  addEventListener('DOMContentLoaded', run);
  addEventListener('load', run);
  addEventListener('hashchange', () => setTimeout(run, 150));
  addEventListener('churvox:command-prepared', () => setTimeout(run, 150));
  addEventListener('churvox:owner-workflow-automation', () => setTimeout(run, 150));
  addEventListener('churvox:owner-data-quality', () => setTimeout(run, 150));
  document.addEventListener('click', () => setTimeout(run, 500), true);
  setInterval(run, 5000);
  run();
}

export {};
