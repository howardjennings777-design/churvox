// CHURVOX_WORKER_PAGE_SPLIT_20260629
// Keeps the worker app simple by making Today, Jobs, Proof, Help and Me real separate screens.

let queued = false;

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

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }

function hideClutterText() {
  const page = pageKey();
  if (!page || page === 'job-detail') return;
  document.querySelectorAll('[data-worker-page-hidden="true"]').forEach((node) => node.removeAttribute('data-worker-page-hidden'));
  document.querySelectorAll('section, article, .wc-card, .wc-alert, .tpPanel, .offlinePanel, .worker-panel').forEach((node) => {
    const text = clean(node.innerText || '');
    if (!text) return;
    const clutter = /OFFLINE WORKER MODE|Work keeps going with bad signal|FIELD PROOF|Made for workers, not office clutter|Fair GPS|Proof safety|Offline aware|Less chasing|proof checks left/i.test(text);
    if (clutter && page !== 'proof') node.setAttribute('data-worker-page-hidden', 'true');
  });
}

function applyTitles() {
  const page = pageKey();
  const welcome = document.querySelector('.wc-welcome, .wc-welcome-compact');
  if (!welcome) return;
  if (page === 'today') {
    const h1 = welcome.querySelector('h1');
    const span = welcome.querySelector('span');
    const p = welcome.querySelector('p');
    if (span) span.textContent = 'Today';
    if (h1) h1.textContent = 'Clock. Next job. Done.';
    if (p) p.textContent = 'Clock in, open the next job, then move on. Jobs and proof have their own pages.';
  }
  if (page === 'jobs') {
    const h1 = welcome.querySelector('h1');
    const span = welcome.querySelector('span');
    const p = welcome.querySelector('p');
    if (span) span.textContent = 'Jobs';
    if (h1) h1.textContent = 'Your job list';
    if (p) p.textContent = 'Only jobs live here. Open one job at a time.';
  }
}

function addPageTitle() {
  const page = pageKey();
  const main = document.querySelector('.wc-main');
  if (!main || document.querySelector('.worker-page-title')) return;
  if (page === 'jobs') {
    main.insertAdjacentHTML('afterbegin', '<section class="worker-page-title"><span>Jobs</span><p>Open the job you are working on. Clock and proof stay on their own pages.</p></section>');
  }
  if (page === 'today') {
    main.insertAdjacentHTML('afterbegin', '<section class="worker-page-title"><span>Today</span><p>Clock in and open your next job. Nothing else.</p></section>');
  }
}

function applyWorkerPageSplit() {
  const page = pageKey();
  if (!page) {
    document.documentElement.removeAttribute('data-worker-page');
    document.body?.removeAttribute('data-worker-page');
    return;
  }
  document.documentElement.setAttribute('data-worker-page', page);
  document.body?.setAttribute('data-worker-page', page);

  document.querySelectorAll('.worker-bottom-nav__item').forEach((button) => {
    const label = clean(button.textContent).toLowerCase();
    if (label === 'today') button.setAttribute('data-worker-nav-key', 'today');
    if (label === 'jobs') button.setAttribute('data-worker-nav-key', 'jobs');
    if (label === 'proof') button.setAttribute('data-worker-nav-key', 'proof');
    if (label === 'help') button.setAttribute('data-worker-nav-key', 'help');
    if (label === 'me') button.setAttribute('data-worker-nav-key', 'me');
  });

  document.getElementById('churvox-worker-flow-nav')?.remove();
  applyTitles();
  addPageTitle();
  hideClutterText();
}

function interceptOldHashNav(event) {
  const target = event.target.closest('button, a');
  if (!target) return;
  const text = clean(target.textContent).toLowerCase();
  if (!['today', 'jobs', 'proof', 'help', 'me'].includes(text)) return;
  const routes = { today: '/worker/today', jobs: '/worker/jobs', proof: '/worker/ops', help: '/worker/help', me: '/worker/settings' };
  event.preventDefault();
  event.stopPropagation();
  window.location.assign(routes[text]);
}

function schedule() {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(() => {
    queued = false;
    applyWorkerPageSplit();
  });
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_PAGE_SPLIT__) {
  window.__CHURVOX_WORKER_PAGE_SPLIT__ = true;
  window.addEventListener('load', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  document.addEventListener('click', interceptOldHashNav, true);
  document.addEventListener('click', schedule, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

export {};
