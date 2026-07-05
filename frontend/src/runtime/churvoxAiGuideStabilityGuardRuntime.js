// AI Guide stability guard.
// Prevents old AI Guide layout/recovery layers from flashing in and being cut out by cleanup runtimes.

const STYLE_ID = 'churvox-ai-guide-stability-guard-style';
const OLD_GUIDE_ID = 'churvox-guide-command-proper-layout';
const PROPER_ID = 'churvox-owner-proper-page-layout';
const KEEP_IDS = [
  'churvox-owner-proper-page-layout',
  'churvox-owner-record-engine-panel',
  'churvox-owner-workflow-automation-panel',
  'churvox-owner-timeline-panel',
  'churvox-owner-data-quality-panel',
  'churvox-paid-launch-readiness-panel',
  'churvox-page-checked-note',
  'churvox-owner-draft-memory-panel',
  'churvox-command-prepared-queue',
];

function pageKey() {
  const raw = String(location.hash || '').replace('#', '').toLowerCase() || 'aiguide';
  const aliases = { today:'aiguide', dashboard:'aiguide', setup:'aiguide', setupassistant:'aiguide', firstrun:'aiguide', guide:'aiguide', 'ai-guide':'aiguide', 'smart-hub':'aiguide' };
  return aliases[raw] || raw;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .churvoxOptionC[data-owner-page="aiguide"] #${OLD_GUIDE_ID}{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;opacity:0!important}
    .churvoxOptionC[data-owner-page="aiguide"] #${PROPER_ID}{display:grid!important;visibility:visible!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;overflow:visible!important;opacity:1!important}
    ${KEEP_IDS.map((id) => `.churvoxOptionC[data-owner-page="aiguide"] .cocPage>#${id}[data-proper-hidden="true"],.churvoxOptionC[data-owner-page="aiguide"] .cocPage>#${id}[data-core-hidden="true"],.churvoxOptionC[data-owner-page="aiguide"] .cocPage>#${id}[data-lite-hidden="true"]{display:grid!important;visibility:visible!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;padding:revert!important;border:revert!important;overflow:visible!important;opacity:1!important}`).join('\n')}
  `;
  document.head.appendChild(style);
}

let lastSig = '';
function run() {
  installStyle();
  if (pageKey() !== 'aiguide') return;
  const root = document.querySelector('.churvoxOptionC');
  const page = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root || !page) return;
  root.dataset.ownerPage = 'aiguide';
  const proper = document.getElementById(PROPER_ID);
  const old = document.getElementById(OLD_GUIDE_ID);
  const sig = `${!!proper}:${!!old}:${KEEP_IDS.map((id) => document.getElementById(id)?.getAttribute('data-proper-hidden') || '').join('|')}`;
  if (sig === lastSig) return;
  lastSig = sig;
  if (old) {
    old.setAttribute('aria-hidden', 'true');
    old.style.setProperty('display', 'none', 'important');
    old.style.setProperty('height', '0', 'important');
    old.style.setProperty('overflow', 'hidden', 'important');
  }
  KEEP_IDS.forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.removeAttribute('data-proper-hidden');
    node.removeAttribute('data-core-hidden');
    node.removeAttribute('data-lite-hidden');
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_AI_GUIDE_STABILITY_GUARD__) {
  window.__CHURVOX_AI_GUIDE_STABILITY_GUARD__ = true;
  addEventListener('DOMContentLoaded', run);
  addEventListener('load', run);
  addEventListener('hashchange', () => setTimeout(run, 60));
  addEventListener('popstate', () => setTimeout(run, 60));
  addEventListener('churvox:fresh-data-updated', () => setTimeout(run, 160));
  addEventListener('churvox:owner-record-api-synced', () => setTimeout(run, 160));
  document.addEventListener('click', () => setTimeout(run, 240), true);
  setInterval(run, 1200);
  run();
}

export {};
