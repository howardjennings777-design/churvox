// Keep owner logic panels visible above older page cleanup rules.

const STYLE_ID = 'churvox-owner-logic-panels-shield-style';
const IDS = [
  'churvox-owner-record-engine-panel',
  'churvox-owner-workflow-automation-panel',
  'churvox-owner-timeline-panel',
];

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = IDS.map((id) => `.churvoxOptionC[data-proper-pages="true"] .cocPage > #${id}[data-proper-hidden="true"],.churvoxOptionC[data-proper-pages="true"] .cocPage > #${id}[data-core-hidden="true"],.churvoxOptionC[data-proper-pages="true"] .cocPage > #${id}[data-lite-hidden="true"]{display:grid!important;visibility:visible!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;overflow:visible!important;opacity:1!important}`).join('\n');
  document.head.appendChild(style);
}

function run() {
  installStyle();
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
  addEventListener('hashchange', () => setTimeout(run, 120));
  addEventListener('churvox:command-prepared', () => setTimeout(run, 120));
  addEventListener('churvox:owner-workflow-automation', () => setTimeout(run, 120));
  document.addEventListener('click', () => setTimeout(run, 300), true);
  setInterval(run, 350);
  run();
}

export {};
