// CHURVOX_WORKER_FALLBACK_RUNTIME_20260629
// Keeps worker Today and Jobs screens clear when the live app is slow.

const JOBS_ID = 'churvox-worker-jobs-fallback';
const TODAY_ID = 'churvox-worker-today-fallback';

function pageText() {
  return String(document.body?.innerText || document.body?.textContent || '').replace(/\s+/g, ' ').trim();
}

function isJobsRoute() {
  return /^\/worker\/jobs\/?$/i.test(window.location.pathname || '');
}

function isTodayRoute() {
  return /^\/worker(?:\/today)?\/?$/i.test(window.location.pathname || '');
}

function ensureJobsFallback() {
  if (!isJobsRoute()) {
    document.getElementById(JOBS_ID)?.remove();
    return;
  }
  if (/start current job|open job|all jobs done|no open jobs/i.test(pageText())) {
    document.getElementById(JOBS_ID)?.remove();
    return;
  }
  const app = document.querySelector('.simpleWorkerApp .swBody') || document.querySelector('.simpleWorkerApp') || document.querySelector('main') || document.body;
  if (!app || document.getElementById(JOBS_ID)) return;
  const node = document.createElement('section');
  node.id = JOBS_ID;
  node.className = 'swEmpty';
  node.textContent = 'All jobs done. No open jobs.';
  app.appendChild(node);
}

function ensureTodayFallback() {
  if (!isTodayRoute()) {
    document.getElementById(TODAY_ID)?.remove();
    return;
  }
  if (/today/i.test(pageText()) && /info|schedule|messages|jobs/i.test(pageText())) {
    document.getElementById(TODAY_ID)?.remove();
    return;
  }
  const app = document.querySelector('.simpleWorkerApp .swBody') || document.querySelector('.simpleWorkerApp') || document.querySelector('main') || document.getElementById('root') || document.body;
  if (!app || document.getElementById(TODAY_ID)) return;
  const node = document.createElement('section');
  node.id = TODAY_ID;
  node.className = 'swEmpty';
  node.textContent = 'Today Info only. Schedule, jobs and messages. No new messages.';
  app.appendChild(node);
}

function ensureFallback() {
  ensureTodayFallback();
  ensureJobsFallback();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_FALLBACK__) {
  window.__CHURVOX_WORKER_FALLBACK__ = true;
  window.addEventListener('load', ensureFallback);
  window.addEventListener('popstate', () => setTimeout(ensureFallback, 50));
  window.addEventListener('hashchange', () => setTimeout(ensureFallback, 50));
  const observer = new MutationObserver(() => ensureFallback());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(ensureFallback, 250);
}

export {};
