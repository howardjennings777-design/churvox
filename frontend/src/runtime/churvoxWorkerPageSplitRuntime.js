// CHURVOX_WORKER_PAGE_SPLIT_20260629
// Keeps the worker app simple by making Today, Jobs, Proof, Help and Me feel like separate pages.

function pageKey() {
  const path = window.location.pathname;
  if (path === '/worker/today' || path === '/worker') return 'today';
  if (path === '/worker/jobs') return 'jobs';
  if (path.startsWith('/worker/jobs/')) return 'job-detail';
  if (path === '/worker/ops') return 'proof';
  if (path === '/worker/help') return 'help';
  if (path === '/worker/settings') return 'me';
  return '';
}

function applyWorkerPageSplit() {
  const page = pageKey();
  if (!page) {
    document.documentElement.removeAttribute('data-worker-page');
    return;
  }
  document.documentElement.setAttribute('data-worker-page', page);

  document.querySelectorAll('.worker-bottom-nav__item').forEach((button) => {
    const label = button.textContent.trim().toLowerCase();
    if (label === 'today') button.setAttribute('data-worker-nav-key', 'today');
    if (label === 'jobs') button.setAttribute('data-worker-nav-key', 'jobs');
    if (label === 'proof') button.setAttribute('data-worker-nav-key', 'proof');
    if (label === 'help') button.setAttribute('data-worker-nav-key', 'help');
    if (label === 'me') button.setAttribute('data-worker-nav-key', 'me');
  });

  if (page === 'today') {
    const welcome = document.querySelector('.wc-welcome h1');
    const copy = document.querySelector('.wc-welcome p');
    if (welcome) welcome.textContent = 'Today';
    if (copy) copy.textContent = 'Clock in, see the next job, then move on. Jobs and proof have their own pages.';
  }
  if (page === 'jobs') {
    const section = document.querySelector('.wc-list .wc-section-head h2');
    if (section) section.textContent = 'Your jobs';
  }
}

function interceptOldHashNav(event) {
  const target = event.target.closest('button, a');
  if (!target) return;
  const text = target.textContent.trim().toLowerCase();
  if (!['today', 'jobs', 'proof', 'help', 'me'].includes(text)) return;
  const routes = { today: '/worker/today', jobs: '/worker/jobs', proof: '/worker/ops', help: '/worker/help', me: '/worker/settings' };
  event.preventDefault();
  event.stopPropagation();
  window.location.assign(routes[text]);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_PAGE_SPLIT__) {
  window.__CHURVOX_WORKER_PAGE_SPLIT__ = true;
  window.addEventListener('load', applyWorkerPageSplit);
  window.addEventListener('popstate', applyWorkerPageSplit);
  window.addEventListener('hashchange', applyWorkerPageSplit);
  document.addEventListener('click', interceptOldHashNav, true);
  const observer = new MutationObserver(applyWorkerPageSplit);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
