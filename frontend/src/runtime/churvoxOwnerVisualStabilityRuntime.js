// Owner visual stability runtime.
// Stops internal workspace jump caused by late-mounted panels, scroll anchoring and focus auto-scroll.

const STYLE_ID = 'churvox-owner-visual-stability-style';
const OWNER_ROOT = '.churvoxOptionC';
const WATCH_SELECTORS = [
  '.churvoxOptionC .workspace',
  '.churvoxOptionC .cocPage',
  '#churvox-owner-proper-page-layout',
  '#churvox-owner-record-engine-panel',
  '#churvox-owner-workflow-automation-panel',
  '#churvox-owner-timeline-panel',
  '#churvox-owner-data-quality-panel',
  '#churvox-paid-launch-readiness-panel',
];

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ${OWNER_ROOT},
    ${OWNER_ROOT} .workspace,
    ${OWNER_ROOT} .cocPage,
    ${OWNER_ROOT} .cocPage *,
    #churvox-owner-proper-page-layout,
    #churvox-owner-record-engine-panel,
    #churvox-owner-workflow-automation-panel,
    #churvox-owner-timeline-panel,
    #churvox-owner-data-quality-panel,
    #churvox-paid-launch-readiness-panel{
      overflow-anchor:none!important;
      scroll-behavior:auto!important;
    }
    ${OWNER_ROOT} .workspace{
      overscroll-behavior:contain!important;
      scrollbar-gutter:stable both-edges!important;
      min-height:0!important;
    }
    ${OWNER_ROOT} .cocPage{
      min-height:calc(100vh - 190px)!important;
      align-content:start!important;
    }
    #churvox-owner-proper-page-layout,
    #churvox-owner-record-engine-panel,
    #churvox-owner-workflow-automation-panel,
    #churvox-owner-timeline-panel,
    #churvox-owner-data-quality-panel,
    #churvox-paid-launch-readiness-panel{
      transform:translateZ(0)!important;
      backface-visibility:hidden!important;
      contain:layout paint!important;
    }
  `;
  document.head.appendChild(style);
}

function isOwnerApp() {
  return Boolean(document.querySelector(OWNER_ROOT));
}

function scrollContainers() {
  const nodes = Array.from(document.querySelectorAll(`${OWNER_ROOT} .workspace, ${OWNER_ROOT} .cocPage, ${OWNER_ROOT} .cocRows, ${OWNER_ROOT} .scroll, ${OWNER_ROOT} .ledgerList, ${OWNER_ROOT} .jobCards, ${OWNER_ROOT} .workerCards, ${OWNER_ROOT} .workCards`));
  return nodes.filter((el) => el && el.scrollHeight > el.clientHeight + 2);
}

let userScrollingUntil = 0;
function markUserScroll() {
  userScrollingUntil = Date.now() + 450;
}

function snapshot() {
  return scrollContainers().map((el) => ({ el, top: el.scrollTop, left: el.scrollLeft }));
}

function restore(items) {
  if (Date.now() < userScrollingUntil) return;
  items.forEach(({ el, top, left }) => {
    if (!el || !el.isConnected) return;
    if (Math.abs(el.scrollTop - top) > 4) el.scrollTop = top;
    if (Math.abs(el.scrollLeft - left) > 4) el.scrollLeft = left;
  });
}

function guardedMutation() {
  if (!isOwnerApp()) return;
  const before = snapshot();
  requestAnimationFrame(() => restore(before));
  setTimeout(() => restore(before), 60);
  setTimeout(() => restore(before), 180);
}

function installFocusGuard() {
  if (window.__CHURVOX_OWNER_FOCUS_PREVENT_SCROLL_GUARD__) return;
  window.__CHURVOX_OWNER_FOCUS_PREVENT_SCROLL_GUARD__ = true;
  const original = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function churvoxFocus(options) {
    try {
      if (this?.closest?.(OWNER_ROOT)) {
        if (options && typeof options === 'object') return original.call(this, { ...options, preventScroll: options.preventScroll !== false });
        return original.call(this, { preventScroll: true });
      }
    } catch (_) {}
    return original.call(this, options);
  };
}

function run() {
  installStyle();
  installFocusGuard();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_VISUAL_STABILITY__) {
  window.__CHURVOX_OWNER_VISUAL_STABILITY__ = true;
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('hashchange', () => setTimeout(run, 80));
  window.addEventListener('popstate', () => setTimeout(run, 80));
  document.addEventListener('wheel', markUserScroll, { passive: true, capture: true });
  document.addEventListener('touchmove', markUserScroll, { passive: true, capture: true });
  document.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', 'Space'].includes(event.key)) markUserScroll();
  }, true);
  try {
    const observer = new MutationObserver((records) => {
      if (!isOwnerApp()) return;
      const relevant = records.some((record) => {
        const target = record.target;
        if (!target?.closest?.(OWNER_ROOT) && !target?.matches?.(OWNER_ROOT)) return false;
        if (record.type === 'attributes' && !['style', 'class', 'data-proper-hidden', 'data-core-hidden', 'data-lite-hidden', 'data-churvox-messages-hidden', 'hidden', 'aria-hidden'].includes(record.attributeName || '')) return false;
        return true;
      });
      if (relevant) guardedMutation();
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'data-proper-hidden', 'data-core-hidden', 'data-lite-hidden', 'data-churvox-messages-hidden', 'hidden', 'aria-hidden'] });
  } catch (_) {}
  setInterval(run, 5000);
  run();
}

export {};
