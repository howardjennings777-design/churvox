const FLAG = '__CHURVOX_HQ_LOAD_DRAFTS_VISIBILITY_RUNTIME__';
const LOAD_BUTTON_ID = 'churvox-hq-load-next-five-button';
const OUTREACH_BUTTON_ID = 'churvox-hq-tester-outreach-button';
const HIDDEN_ANCHOR_ID = 'churvox-hq-outreach-hidden-anchor';
const VERSION = 'churvox-hq-load-drafts-visible-v1-20260715';

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage', '/admin/qa-auditor', '/platform'].includes(path);
}

function hqNav() {
  return document.querySelector('.hq2Side nav');
}

function hasOutreachButton(nav) {
  return Array.from(nav?.querySelectorAll('button') || []).some((button) =>
    String(button.textContent || '').trim().toLowerCase().startsWith('outreach')
  );
}

function ensureHiddenOutreachAnchor(nav) {
  if (!nav || hasOutreachButton(nav)) return null;
  let anchor = document.getElementById(HIDDEN_ANCHOR_ID);
  if (anchor) return anchor;

  anchor = document.createElement('button');
  anchor.id = HIDDEN_ANCHOR_ID;
  anchor.type = 'button';
  anchor.textContent = 'Outreach';
  anchor.tabIndex = -1;
  anchor.setAttribute('aria-hidden', 'true');
  anchor.style.display = 'none';

  const testers = Array.from(nav.querySelectorAll('button')).find((button) =>
    String(button.textContent || '').trim().toLowerCase().startsWith('testers')
  );
  if (testers?.nextSibling) nav.insertBefore(anchor, testers.nextSibling);
  else nav.appendChild(anchor);
  return anchor;
}

function makeLoadButtonVisible() {
  const button = document.getElementById(LOAD_BUTTON_ID);
  if (!button) return false;
  button.hidden = false;
  button.removeAttribute('aria-hidden');
  button.style.removeProperty('display');
  button.style.removeProperty('visibility');
  button.style.removeProperty('opacity');
  button.dataset.churvoxVisibilityGuard = VERSION;
  return true;
}

let lastNudgeAt = 0;
function nudgeLoadRuntime() {
  if (!isHqPath()) return;
  const nav = hqNav();
  if (!nav) return;

  ensureHiddenOutreachAnchor(nav);
  makeLoadButtonVisible();

  const now = Date.now();
  if (now - lastNudgeAt > 250) {
    lastNudgeAt = now;
    window.dispatchEvent(new Event('churvox-owner-app-ready'));
  }

  window.setTimeout(() => {
    makeLoadButtonVisible();
    const realOutreach = document.getElementById(OUTREACH_BUTTON_ID);
    if (realOutreach) document.getElementById(HIDDEN_ANCHOR_ID)?.remove();
  }, 120);
}

function schedule() {
  if (!isHqPath()) return;
  [0, 120, 400, 900, 1800, 3500, 7000].forEach((delay) =>
    window.setTimeout(nudgeLoadRuntime, delay)
  );
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = VERSION;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-auth-state', schedule);

  const observer = new MutationObserver(() => {
    if (isHqPath() && (!document.getElementById(LOAD_BUTTON_ID) || document.getElementById(LOAD_BUTTON_ID)?.offsetParent === null)) {
      nudgeLoadRuntime();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(nudgeLoadRuntime, 15000);
}

export {};
