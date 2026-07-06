const PAGE_CLASSES = ['cvxPageIsCommand', 'cvxPageIsJobs'];

function pageKey() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  const title = String(document.querySelector('.cvxTopTitle h1')?.textContent || document.querySelector('h1')?.textContent || '').trim().toLowerCase();
  if (hash === 'command' || (!hash && title === 'command')) return 'command';
  if (hash === 'jobs' || (!hash && /jobs?/.test(title))) return 'jobs';
  return '';
}

function applyPageIdentity() {
  if (typeof window === 'undefined') return;
  const page = document.querySelector('.cvxPage');
  if (!page) return;
  page.classList.remove(...PAGE_CLASSES);
  const key = pageKey();
  if (key === 'command') page.classList.add('cvxPageIsCommand');
  if (key === 'jobs') page.classList.add('cvxPageIsJobs');
}

function schedulePageIdentity() {
  [0, 120, 350, 900, 1800].forEach((delay) => setTimeout(applyPageIdentity, delay));
}

schedulePageIdentity();
window.addEventListener('hashchange', schedulePageIdentity);
window.addEventListener('popstate', schedulePageIdentity);
window.addEventListener('churvox-owner-app-ready', schedulePageIdentity);
window.addEventListener('churvox:data-refresh', schedulePageIdentity);
