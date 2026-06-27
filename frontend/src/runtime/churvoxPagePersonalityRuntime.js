const STYLE_ID = 'churvox-page-personality-runtime-style';
const PAGE_CLASSES = [
  'jobs',
  'clients',
  'quotes',
  'invoices',
  'team',
  'command',
  'workercommand',
  'payroll',
  'xero',
  'settings',
  'plans',
  'support',
  'messages',
  'dashboard',
];

const styleText = `
body[class*="cv-live-page-"] .freshPageScroll {
  transition: background .2s ease, outline-color .2s ease !important;
}

body.cv-live-page-jobs .freshMain {
  background: radial-gradient(circle at 14% 6%, rgba(249,115,22,.18), transparent 20rem), linear-gradient(180deg,#fff7ed 0%,#f2dfc8 100%) !important;
}
body.cv-live-page-clients .freshMain {
  background: radial-gradient(circle at 14% 6%, rgba(22,163,74,.18), transparent 20rem), linear-gradient(180deg,#ecfdf5 0%,#e8dfd0 100%) !important;
}
body.cv-live-page-quotes .freshMain {
  background: radial-gradient(circle at 14% 6%, rgba(245,178,27,.22), transparent 20rem), linear-gradient(180deg,#fffbeb 0%,#f1dfc4 100%) !important;
}
body.cv-live-page-invoices .freshMain {
  background: radial-gradient(circle at 14% 6%, rgba(16,185,129,.2), transparent 20rem), linear-gradient(180deg,#ecfdf5 0%,#dfebdd 100%) !important;
}
body.cv-live-page-team .freshMain {
  background: radial-gradient(circle at 14% 6%, rgba(37,99,235,.2), transparent 20rem), linear-gradient(180deg,#eff6ff 0%,#e4e8f2 100%) !important;
}
body.cv-live-page-command .freshMain {
  background: radial-gradient(circle at 14% 6%, rgba(249,115,22,.2), transparent 20rem), linear-gradient(180deg,#fff7ed 0%,#f4e7d6 100%) !important;
}
body.cv-live-page-workercommand .freshMain {
  background: radial-gradient(circle at 14% 6%, rgba(20,184,166,.2), transparent 20rem), linear-gradient(180deg,#f0fdfa 0%,#e3eee9 100%) !important;
}

body.cv-live-page-jobs .freshHero,
body.cv-live-page-jobs .freshJobsPage .freshHero {
  border-left: 14px solid #f97316 !important;
  min-height: 220px !important;
  background: linear-gradient(112deg,#07111f 0 55%,rgba(249,115,22,.42) 55% 100%), repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0 1px,transparent 1px 54px) !important;
}
body.cv-live-page-clients .freshHero,
body.cv-live-page-clients .freshClientsPage .freshHero {
  border-left: 14px solid #16a34a !important;
  min-height: 205px !important;
  background: radial-gradient(circle at 86% 44%,rgba(22,163,74,.38),transparent 13rem), linear-gradient(135deg,#061a12 0%,#123126 100%) !important;
}
body.cv-live-page-quotes .freshHero,
body.cv-live-page-quotes .freshQuotesPage .freshHero {
  border-left: 14px solid #f5b21b !important;
  min-height: 205px !important;
  background: radial-gradient(circle at 86% 44%,rgba(245,178,27,.42),transparent 13rem), linear-gradient(135deg,#1b1405 0%,#3a2507 100%) !important;
}
body.cv-live-page-invoices .freshHero,
body.cv-live-page-invoices .freshInvoicesPage .freshHero {
  border-left: 14px solid #10b981 !important;
  min-height: 205px !important;
  background: repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0 1px,transparent 1px 42px), linear-gradient(135deg,#052e22 0%,#083b2c 100%) !important;
}
body.cv-live-page-team .freshHero,
body.cv-live-page-team .freshPageScroll > section > .freshHero {
  border-left: 14px solid #2563eb !important;
  min-height: 205px !important;
  background: radial-gradient(circle at 86% 44%,rgba(37,99,235,.42),transparent 13rem), linear-gradient(135deg,#09162f 0%,#132e52 100%) !important;
}

body.cv-live-page-jobs .freshGrid,
body.cv-live-page-jobs .freshJobsPage .freshGrid {
  grid-template-columns: minmax(340px,.92fr) minmax(430px,1.16fr) minmax(220px,.58fr) !important;
  border: 2px solid rgba(249,115,22,.28) !important;
  background: linear-gradient(90deg,rgba(15,23,42,.04),rgba(249,115,22,.1)), repeating-linear-gradient(90deg,rgba(15,23,42,.06) 0 1px,transparent 1px 86px), #fff7ed !important;
}
body.cv-live-page-clients .freshGrid,
body.cv-live-page-clients .freshClientsPage .freshGrid {
  grid-template-columns: minmax(250px,.54fr) minmax(620px,1.62fr) minmax(250px,.7fr) !important;
  border: 2px solid rgba(22,163,74,.24) !important;
  background: linear-gradient(135deg,rgba(236,253,245,.96),rgba(255,250,241,.74)), repeating-linear-gradient(0deg,rgba(22,163,74,.07) 0 1px,transparent 1px 84px) !important;
}
body.cv-live-page-quotes .freshGrid,
body.cv-live-page-quotes .freshQuotesPage .freshGrid {
  grid-template-columns: minmax(280px,.74fr) minmax(560px,1.5fr) minmax(250px,.7fr) !important;
  border: 2px solid rgba(245,178,27,.3) !important;
  background: linear-gradient(135deg,rgba(255,251,235,.98),rgba(255,247,237,.78)), repeating-linear-gradient(90deg,rgba(146,64,14,.07) 0 1px,transparent 1px 110px) !important;
}
body.cv-live-page-invoices .freshGrid,
body.cv-live-page-invoices .freshInvoicesPage .freshGrid {
  grid-template-columns: minmax(260px,.72fr) minmax(580px,1.5fr) minmax(250px,.7fr) !important;
  border: 2px solid rgba(16,185,129,.28) !important;
  background: linear-gradient(135deg,rgba(236,253,245,.98),rgba(255,250,241,.74)), repeating-linear-gradient(0deg,rgba(6,78,59,.08) 0 1px,transparent 1px 52px) !important;
}
body.cv-live-page-team .freshGrid,
body.cv-live-page-team .freshPageScroll > section > .freshGrid {
  grid-template-columns: minmax(260px,.72fr) minmax(540px,1.48fr) minmax(260px,.7fr) !important;
  border: 2px solid rgba(37,99,235,.28) !important;
  background: linear-gradient(135deg,rgba(239,246,255,.98),rgba(255,250,241,.74)), repeating-linear-gradient(90deg,rgba(37,99,235,.07) 0 1px,transparent 1px 104px) !important;
}

body.cv-live-page-jobs .freshJobsListCard,
body.cv-live-page-jobs .freshJobsPage .freshJobsListCard {
  background: linear-gradient(180deg,#0f172a,#1f2937) !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}
body.cv-live-page-clients .freshClientsPage .freshJobsListCard,
body.cv-live-page-clients .freshJobsListCard {
  background: #ecfdf5 !important;
  border-left: 10px solid #16a34a !important;
}
body.cv-live-page-quotes .freshQuotesPage .freshJobsListCard,
body.cv-live-page-quotes .freshJobsListCard {
  background: #fffbeb !important;
  border-left: 10px solid #f5b21b !important;
}
body.cv-live-page-invoices .freshInvoicesPage .freshJobsListCard,
body.cv-live-page-invoices .freshJobsListCard {
  background: #ecfdf5 !important;
  border-left: 10px solid #10b981 !important;
}
body.cv-live-page-team .freshJobsListCard {
  background: #eff6ff !important;
  border-left: 10px solid #2563eb !important;
}

body.cv-live-page-clients .freshJobsActionsCard { background: linear-gradient(180deg,#14532d,#111827) !important; }
body.cv-live-page-quotes .freshJobsActionsCard,
body.cv-live-page-quotes .freshQuotesActionsCard { background: linear-gradient(180deg,#78350f,#111827) !important; }
body.cv-live-page-invoices .freshJobsActionsCard,
body.cv-live-page-invoices .freshInvoicesActionsCard { background: linear-gradient(180deg,#064e3b,#111827) !important; }
body.cv-live-page-team .freshJobsActionsCard { background: linear-gradient(180deg,#1e3a8a,#111827) !important; }

body.cv-live-page-command .freshCommandFixLayout {
  grid-template-columns: minmax(330px,.9fr) minmax(460px,1.18fr) minmax(280px,.74fr) !important;
  border: 2px solid rgba(249,115,22,.25) !important;
  background: radial-gradient(circle at 50% -20%,rgba(249,115,22,.18),transparent 20rem),linear-gradient(135deg,rgba(255,250,241,.98),rgba(255,255,255,.72)) !important;
}
body.cv-live-page-command .freshCommandQueuePanel {
  background: linear-gradient(180deg,#0f172a,#1f2937) !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}
body.cv-live-page-command .freshCommandFixItem {
  height: auto !important;
  min-height: 86px !important;
  max-height: none !important;
  overflow: visible !important;
  padding: 12px 14px !important;
}
body.cv-live-page-command .freshCommandFixItem * {
  overflow: visible !important;
  white-space: normal !important;
  text-overflow: clip !important;
}

body.cv-live-page-workercommand .freshWorkerNowPanel {
  grid-template-columns: minmax(250px,.56fr) minmax(650px,1.44fr) !important;
  border: 2px solid rgba(20,184,166,.26) !important;
  background: linear-gradient(135deg,rgba(240,253,250,.96),rgba(255,247,237,.72)), repeating-linear-gradient(90deg,rgba(20,184,166,.07) 0 1px,transparent 1px 58px), repeating-linear-gradient(0deg,rgba(20,184,166,.07) 0 1px,transparent 1px 58px) !important;
}
body.cv-live-page-workercommand .freshWorkerLiveMapCard {
  min-height: 340px !important;
  background: radial-gradient(circle at 50% 50%,rgba(249,115,22,.28),transparent 7rem), repeating-linear-gradient(90deg,rgba(15,23,42,.065) 0 1px,transparent 1px 44px), repeating-linear-gradient(0deg,rgba(15,23,42,.065) 0 1px,transparent 1px 44px), #f8fafc !important;
}

body.cv-live-page-jobs .freshPageScroll::before { content: 'DISPATCH BOARD'; background:#f97316; }
body.cv-live-page-clients .freshPageScroll::before { content: 'CUSTOMER MEMORY'; background:#16a34a; }
body.cv-live-page-quotes .freshPageScroll::before { content: 'OFFER PIPELINE'; background:#f5b21b; color:#111827; }
body.cv-live-page-invoices .freshPageScroll::before { content: 'MONEY DESK'; background:#10b981; }
body.cv-live-page-team .freshPageScroll::before { content: 'PEOPLE + ACCESS'; background:#2563eb; }
body.cv-live-page-command .freshPageScroll::before { content: 'APPROVAL COCKPIT'; background:#111827; }
body.cv-live-page-workercommand .freshPageScroll::before { content: 'GPS FIELD COMMAND'; background:#0f766e; }
body[class*="cv-live-page-"] .freshPageScroll::before {
  display: inline-flex !important;
  width: fit-content !important;
  margin: 0 0 10px 2px !important;
  padding: 9px 13px !important;
  border-radius: 999px !important;
  color: #fff;
  font-size: 11px !important;
  font-weight: 1000 !important;
  letter-spacing: .1em !important;
  box-shadow: 0 14px 30px rgba(15,23,42,.14) !important;
}

@media (max-width: 1100px) {
  body.cv-live-page-jobs .freshGrid,
  body.cv-live-page-clients .freshGrid,
  body.cv-live-page-quotes .freshGrid,
  body.cv-live-page-invoices .freshGrid,
  body.cv-live-page-team .freshGrid,
  body.cv-live-page-command .freshCommandFixLayout,
  body.cv-live-page-workercommand .freshWorkerNowPanel {
    grid-template-columns: 1fr !important;
  }
}
`;

function pageFromLocation() {
  const path = window.location.pathname || '';
  const hash = (window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
  if (hash) return hash;
  if (path.includes('jobs')) return 'jobs';
  if (path.includes('clients')) return 'clients';
  if (path.includes('quotes')) return 'quotes';
  if (path.includes('invoices')) return 'invoices';
  if (path.includes('team')) return 'team';
  if (path.includes('plans')) return 'plans';
  if (path.includes('settings')) return 'settings';
  if (path.includes('support')) return 'support';
  if (path.includes('dashboard') || path.includes('setup-guide') || path.includes('guide')) return 'dashboard';
  return 'dashboard';
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = styleText;
  document.head.appendChild(style);
}

function syncPageClass() {
  installStyle();
  const page = pageFromLocation();
  PAGE_CLASSES.forEach((key) => {
    document.body.classList.toggle(`cv-live-page-${key}`, key === page);
  });
  document.body.dataset.churvoxLivePage = page;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_PAGE_PERSONALITY_RUNTIME__) {
  window.__CHURVOX_PAGE_PERSONALITY_RUNTIME__ = true;
  syncPageClass();
  window.addEventListener('hashchange', syncPageClass);
  window.addEventListener('popstate', syncPageClass);
  window.addEventListener('load', syncPageClass);
  document.addEventListener('click', () => window.setTimeout(syncPageClass, 50), true);
  const observer = new MutationObserver(syncPageClass);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  [50, 200, 600, 1200].forEach((delay) => window.setTimeout(syncPageClass, delay));
}
