// CHURVOX_WORKER_JOBS_FALLBACK_RUNTIME_20260629
// Makes the worker Jobs page never sit in a vague loading state.

const ID = 'churvox-worker-jobs-fallback';

function isJobsRoute() {
  return /^\/worker\/jobs\/?$/i.test(window.location.pathname || '');
}

function hasCurrentLink() {
  return /start current job|open job/i.test(document.body?.innerText || '');
}

function hasDoneText() {
  return /all jobs done|no open jobs/i.test(document.body?.innerText || '');
}

function ensureFallback() {
  if (!isJobsRoute()) {
    document.getElementById(ID)?.remove();
    return;
  }
  if (hasCurrentLink() || hasDoneText()) {
    document.getElementById(ID)?.remove();
    return;
  }
  const app = document.querySelector('.simpleWorkerApp .swBody') || document.querySelector('.simpleWorkerApp') || document.querySelector('main') || document.body;
  if (!app || document.getElementById(ID)) return;
  const node = document.createElement('section');
  node.id = ID;
  node.className = 'swEmpty';
  node.textContent = 'All jobs done. No open jobs.';
  app.appendChild(node);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_JOBS_FALLBACK__) {
  window.__CHURVOX_WORKER_JOBS_FALLBACK__ = true;
  window.addEventListener('load', ensureFallback);
  window.addEventListener('popstate', () => setTimeout(ensureFallback, 50));
  window.addEventListener('hashchange', () => setTimeout(ensureFallback, 50));
  const observer = new MutationObserver(() => ensureFallback());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(ensureFallback, 250);
}

export {};
