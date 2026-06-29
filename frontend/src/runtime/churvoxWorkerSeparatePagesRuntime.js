import './churvoxWorkerSeparatePages.css';

let queued = false;

function page() {
  const path = window.location.pathname;
  if (path === '/worker' || path === '/worker/today') return 'today';
  if (path === '/worker/jobs') return 'jobs';
  if (path === '/worker/ops') return 'proof';
  if (path === '/worker/help') return 'help';
  if (path === '/worker/settings') return 'me';
  if (/^\/worker\/jobs\//.test(path)) return 'job-detail';
  return '';
}

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }

function heading(text, subtext) {
  return `<section class="worker-page-title"><span>${text}</span>${subtext ? `<p>${subtext}</p>` : ''}</section>`;
}

function removeClutterByText() {
  const mode = page();
  if (!mode || mode === 'job-detail') return;
  document.querySelectorAll('section, article, .wc-card, .wc-alert, .tpPanel, .offlinePanel').forEach((node) => {
    const text = clean(node.innerText || '');
    if (!text) return;
    const explainers = /OFFLINE WORKER MODE|Work keeps going with bad signal|FIELD PROOF|Made for workers, not office clutter|Fair GPS|Proof safety|Offline aware|Less chasing|proof checks left/i.test(text);
    if (explainers && mode !== 'proof') node.setAttribute('data-worker-page-hidden', 'true');
  });
}

function setTitles() {
  const mode = page();
  const welcome = document.querySelector('.wc-welcome, .wc-welcome-compact');
  if (!welcome) return;
  if (mode === 'today') {
    welcome.innerHTML = '<span>Today</span><h1>Clock. Next job. Done.</h1><p>Keep this screen simple. Clock in, open the next job, then move on.</p>';
  }
  if (mode === 'jobs') {
    welcome.innerHTML = '<span>Jobs</span><h1>Your job list</h1><p>Only jobs live here. Open one job at a time.</p>';
  }
}

function addPageHeadings() {
  const mode = page();
  const main = document.querySelector('.wc-main');
  if (!main || document.querySelector('.worker-page-title')) return;
  if (mode === 'jobs') main.insertAdjacentHTML('afterbegin', heading('Jobs', 'Open the job you are working on. Clock and proof live on their own screens.'));
  if (mode === 'today') main.insertAdjacentHTML('afterbegin', heading('Today', 'Clock in and open your next job. Nothing else.'));
}

function run() {
  queued = false;
  const mode = page();
  document.documentElement.setAttribute('data-worker-page', mode);
  document.body?.setAttribute('data-worker-page', mode);
  setTitles();
  addPageHeadings();
  removeClutterByText();
}

function schedule() {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(run);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_SEPARATE_PAGES__) {
  window.__CHURVOX_WORKER_SEPARATE_PAGES__ = true;
  window.addEventListener('load', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  document.addEventListener('click', schedule, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

export {};
