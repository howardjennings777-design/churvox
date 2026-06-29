import './churvoxWorkerOnsiteSignalRuntime';
import './churvoxWorkerOnsiteSignalHardRuntime';

// CHURVOX_WORKER_FIELD_FLOW_RUNTIME_20260629
// Keeps job-detail guidance, but the main worker app uses real separate pages.

const NAV_ID = 'churvox-worker-flow-nav';
const FALLBACK_BOTTOM_ID = 'churvox-worker-runtime-bottom-nav';
let queued = false;

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function isWorkerRoute() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/worker');
}

function setId(node, id) {
  if (node && !node.id && !document.getElementById(id)) node.id = id;
}

function textOf(node) {
  return lower(node?.textContent || '');
}

function labelForCard(card) {
  const span = card?.querySelector('.wc-section-head span, .px-hero__eyebrow, small');
  const h2 = card?.querySelector('.wc-section-head h2, h2, h3');
  return `${textOf(span)} ${textOf(h2)} ${textOf(card)}`;
}

function firstSection(pattern, id) {
  if (document.getElementById(id)) return;
  const match = Array.from(document.querySelectorAll('main, section, article, .wc-card')).find((node) => pattern.test(textOf(node)));
  setId(match, id);
}

function isWorkerListPage() {
  return ['/worker', '/worker/today', '/worker/jobs'].includes(window.location.pathname);
}

function annotateJobList() {
  setId(document.querySelector('.wc-clock-card'), 'clock');
  setId(document.querySelector('.wc-next-job'), 'today');
  setId(document.querySelector('.wc-ready-steps'), 'flow');
  setId(document.querySelector('.wc-quick-actions'), 'tools');
  setId(document.querySelector('.wc-list'), 'jobs');
  setId(document.querySelector('.wc-alert.need'), 'alerts');
}

function annotateJobDetail() {
  setId(document.querySelector('.wc-job-hero'), 'job-details');
  setId(document.querySelector('.wc-status-strip'), 'status');
  setId(document.querySelector('.wc-timer-card'), 'time');
  setId(document.querySelector('#worker-proof'), 'worker-proof');
  setId(document.querySelector('.wc-finish'), 'finish');

  document.querySelectorAll('.wc-job-screen .wc-card').forEach((card) => {
    const label = labelForCard(card);
    if (/where|address|directions/.test(label)) setId(card, 'directions');
    else if (/customer contact/.test(label)) setId(card, 'contact');
    else if (/instructions|what to do/.test(label)) setId(card, 'instructions');
    else if (/checklist/.test(label)) setId(card, 'checklist');
    else if (/proof|photos|message/.test(label)) setId(card, 'worker-proof');
    else if (/materials|parts|extras/.test(label)) setId(card, 'materials');
    else if (/daily wrap|wrap-up/.test(label)) setId(card, 'wrap');
    else if (/help|need help/.test(label)) setId(card, 'help');
  });
}

function annotateSettings() {
  const root = document.querySelector('#top');
  if (root && !root.id) root.id = 'top';
  setId(document.querySelector('#worker-help'), 'worker-help');
}

function annotateOps() {
  setId(document.querySelector('.worker-ops-page, [data-marker*="WORKER"], main'), 'proof');
  firstSection(/issue|blocked|cannot complete/, 'issues');
  firstSection(/materials|extras/, 'materials');
}

function annotateSections() {
  if (!isWorkerRoute()) return;
  const path = window.location.pathname;
  if (isWorkerListPage()) annotateJobList();
  else if (/^\/worker\/jobs\//.test(path)) annotateJobDetail();
  else if (path === '/worker/settings' || path === '/worker/help') annotateSettings();
  else if (path === '/worker/ops') annotateOps();
}

function navItems() {
  const path = window.location.pathname;
  if (/^\/worker\/jobs\//.test(path)) {
    return [
      ['Details', '#job-details'],
      ['Status', '#status'],
      ['Time', '#time'],
      ['Proof', '#worker-proof'],
      ['Finish', '#finish'],
      ['Help', '#help'],
    ];
  }
  return [];
}

function samePageHref(href) {
  if (!href) return false;
  if (href.startsWith('#')) return true;
  try {
    const url = new URL(href, window.location.origin);
    return url.pathname === window.location.pathname;
  } catch (_) {
    return false;
  }
}

function scrollToHref(href) {
  const targetHash = href.startsWith('#') ? href : new URL(href, window.location.origin).hash;
  if (!targetHash) return false;
  const target = document.querySelector(targetHash);
  if (!target) return false;
  window.history.replaceState(null, '', `${window.location.pathname}${targetHash}`);
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

function navHtml(items) {
  return items.map(([label, href]) => `<button type="button" data-worker-flow-target="${href}">${label}</button>`).join('');
}

function insertFlowNav() {
  if (!isWorkerRoute()) {
    document.getElementById(NAV_ID)?.remove();
    document.getElementById(FALLBACK_BOTTOM_ID)?.remove();
    return;
  }

  annotateSections();

  if (isWorkerListPage()) {
    document.getElementById(NAV_ID)?.remove();
    ensureFallbackBottomNav();
    return;
  }

  const items = navItems();
  if (!items.length) {
    document.getElementById(NAV_ID)?.remove();
    ensureFallbackBottomNav();
    return;
  }
  const anchor = document.querySelector('.wc-topbar, .px-mobile-header, .worker-app-top, header');
  if (!anchor) return;

  let nav = document.getElementById(NAV_ID);
  if (!nav) {
    nav = document.createElement('nav');
    nav.id = NAV_ID;
    nav.className = 'worker-flow-nav';
    nav.setAttribute('aria-label', 'Worker field flow');
    anchor.insertAdjacentElement('afterend', nav);
  }
  const html = navHtml(items);
  if (nav.innerHTML !== html) nav.innerHTML = html;

  ensureFallbackBottomNav();
  markActiveByHash();
}

function ensureFallbackBottomNav() {
  if (document.querySelector('.worker-bottom-nav')) {
    document.getElementById(FALLBACK_BOTTOM_ID)?.remove();
    return;
  }
  if (!isWorkerRoute()) return;
  let nav = document.getElementById(FALLBACK_BOTTOM_ID);
  if (!nav) {
    nav = document.createElement('nav');
    nav.id = FALLBACK_BOTTOM_ID;
    nav.className = 'worker-runtime-bottom-nav';
    nav.setAttribute('aria-label', 'Worker app navigation');
    document.body.appendChild(nav);
  }
  const items = [
    ['Today', '/worker/today'],
    ['Jobs', '/worker/jobs'],
    ['Proof', '/worker/ops'],
    ['Help', '/worker/help'],
    ['Me', '/worker/settings'],
  ];
  nav.innerHTML = items.map(([label, href]) => `<button type="button" data-worker-runtime-target="${href}">${label}</button>`).join('');
}

function markActiveByHash() {
  const hash = window.location.hash || '';
  const buttons = Array.from(document.querySelectorAll('#churvox-worker-flow-nav button'));
  let matched = false;
  buttons.forEach((button) => {
    const href = button.getAttribute('data-worker-flow-target') || '';
    const buttonHash = href.startsWith('#') ? href : (() => {
      try { return new URL(href, window.location.origin).hash; } catch (_) { return ''; }
    })();
    const active = Boolean(hash && buttonHash === hash);
    if (active) matched = true;
    button.classList.toggle('active', active);
  });
  if (!matched && buttons[0]) buttons[0].classList.add('active');
}

function handleClick(event) {
  const flowButton = event.target.closest('[data-worker-flow-target]');
  const bottomButton = event.target.closest('[data-worker-runtime-target]');
  const button = flowButton || bottomButton;
  if (!button) return;
  const href = button.getAttribute(flowButton ? 'data-worker-flow-target' : 'data-worker-runtime-target') || '';
  event.preventDefault();
  event.stopPropagation();
  if (samePageHref(href) && scrollToHref(href)) {
    markActiveByHash();
    return;
  }
  window.location.assign(href);
}

function schedule() {
  if (queued) return;
  queued = true;
  window.setTimeout(() => {
    queued = false;
    insertFlowNav();
  }, 80);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_FIELD_FLOW_RUNTIME__) {
  window.__CHURVOX_WORKER_FIELD_FLOW_RUNTIME__ = true;
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', () => { schedule(); window.setTimeout(markActiveByHash, 80); });
  window.addEventListener('popstate', schedule);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', schedule, true);
  const observer = new MutationObserver(() => {
    if (isWorkerRoute()) schedule();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
