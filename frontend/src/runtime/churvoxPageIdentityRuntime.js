const PAGE_MAP = {
  today: 'cvxPageIsToday',
  command: 'cvxPageIsCommand',
  jobs: 'cvxPageIsJobs',
  clients: 'cvxPageIsClients',
  workers: 'cvxPageIsWorkers',
  messages: 'cvxPageIsMessages',
  quotes: 'cvxPageIsQuotes',
  invoices: 'cvxPageIsInvoices',
  team: 'cvxPageIsTeam',
  payroll: 'cvxPageIsPayroll',
  xero: 'cvxPageIsXero',
  settings: 'cvxPageIsSettings',
  plans: 'cvxPageIsPlans',
  help: 'cvxPageIsHelp',
};
const PAGE_CLASSES = Object.values(PAGE_MAP);

function pageKey() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  if (PAGE_MAP[hash]) return hash;
  const title = String(document.querySelector('.cvxTopTitle h1')?.textContent || document.querySelector('h1')?.textContent || '').trim().toLowerCase();
  if (/command/.test(title)) return 'command';
  if (/jobs?/.test(title)) return 'jobs';
  if (/clients?/.test(title)) return 'clients';
  if (/workers?/.test(title)) return 'workers';
  if (/messages?/.test(title)) return 'messages';
  if (/quotes?/.test(title)) return 'quotes';
  if (/invoices?/.test(title)) return 'invoices';
  if (/team/.test(title)) return 'team';
  if (/payroll/.test(title)) return 'payroll';
  if (/xero|accounting/.test(title)) return 'xero';
  if (/settings?/.test(title)) return 'settings';
  if (/plans?/.test(title)) return 'plans';
  if (/help|guide/.test(title)) return 'help';
  return 'today';
}

function applyPageIdentity() {
  if (typeof window === 'undefined') return;
  const page = document.querySelector('.cvxPage');
  if (!page) return;
  page.classList.remove(...PAGE_CLASSES);
  const className = PAGE_MAP[pageKey()];
  if (className) page.classList.add(className);
}

function schedulePageIdentity() {
  [0, 120, 350, 900, 1800].forEach((delay) => setTimeout(applyPageIdentity, delay));
}

schedulePageIdentity();
window.addEventListener('hashchange', schedulePageIdentity);
window.addEventListener('popstate', schedulePageIdentity);
window.addEventListener('churvox-owner-app-ready', schedulePageIdentity);
window.addEventListener('churvox:data-refresh', schedulePageIdentity);
