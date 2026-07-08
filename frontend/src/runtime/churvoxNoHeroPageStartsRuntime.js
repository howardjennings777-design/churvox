const STYLE_ID = 'churvox-no-hero-page-starts-style';
const FLAG = '__CHURVOX_NO_HERO_PAGE_STARTS_RUNTIME__';

const PAGES = {
  today: ['Today flow', 'Run sheet first. Owner checks stay beside the work.', 'Jobs ready', 'Owner checks', 'orange'],
  command: ['Approval desk', 'Approve, edit or park decisions without leaving Command.', 'Waiting', 'Safe actions', 'dark'],
  jobs: ['Run sheet', 'Schedule, assign and finish work from the job board.', 'Jobs', 'Forms', 'blue'],
  clients: ['Client file', 'Details, pricing, site notes and history stay together.', 'Memory', 'Import ready', 'orange'],
  workers: ['Field view', 'Worker status, proof, time and messages stay visible.', 'Status', 'Proof', 'blue'],
  messages: ['Inbox board', 'Reply, delete or turn a message into an owner check.', 'Unread', 'Threads', 'orange'],
  quotes: ['Quote pipeline', 'Draft, follow up and convert accepted work into jobs.', 'Drafts', 'Follow up', 'purple'],
  invoices: ['Money review', 'Draft, send, export and sync only when approved.', 'Drafts', 'Money watch', 'green'],
  team: ['Access control', 'People, roles and permissions without exposing owner tools.', 'Roles', 'Invites', 'blue'],
  payroll: ['Timesheet review', 'Review and export time records only.', 'Period', 'Export', 'green'],
  xero: ['Safe sync', 'Connect accounting and keep invoice handoff guarded.', 'Status', 'Sync', 'green'],
  settings: ['Business rules', 'Brand, GST, industry mode and account controls.', 'Profile', 'Security', 'slate'],
  plans: ['Billing view', 'Current plan, trial state and add-ons stay clear.', 'Plan', 'Trial', 'gold'],
  support: ['Support desk', 'Send help requests from inside Churvox with context.', 'Tickets', 'Setup', 'rose'],
};

const TONES = {
  orange: ['rgba(243,107,33,.18)', 'rgba(255,173,85,.12)'],
  dark: ['rgba(16,21,19,.16)', 'rgba(243,107,33,.10)'],
  blue: ['rgba(37,99,235,.13)', 'rgba(14,165,233,.10)'],
  purple: ['rgba(168,85,247,.13)', 'rgba(243,107,33,.09)'],
  green: ['rgba(22,163,74,.13)', 'rgba(16,185,129,.10)'],
  slate: ['rgba(100,116,139,.13)', 'rgba(243,107,33,.08)'],
  gold: ['rgba(245,158,11,.15)', 'rgba(243,107,33,.09)'],
  rose: ['rgba(244,63,94,.12)', 'rgba(243,107,33,.09)'],
};

const css = `
  body .cv3Product .cv3Hero,
  body .cv3Product.cvxCompactHeroDesign .cv3Hero,
  body .cv3Product.cvxAllPagesPolished .cv3Hero,
  body .cv3Product.cvxMessagesPolished .cv3Hero,
  body .cv3Product .cvxPageIntentNote,
  body .cv3Product .cvxMessageBoardNote,
  body .cv3Product .cvxHeroMiddleIntent {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .cv3Product.cvxNoHeroStarts .cv3Workspace { padding-top: 14px !important; }
  .cv3Product.cvxNoHeroStarts .cv3Page { gap: 14px !important; }
  .cvxPageStartRow { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(280px, 1fr) 170px 170px; gap: 12px; align-items: stretch; margin: 0; }
  .cvxPageStartMain, .cvxPageStartBox { position: relative; overflow: hidden; min-height: 72px; border: 1px solid rgba(16,21,19,.08); border-radius: 24px; box-shadow: 0 16px 34px rgba(37,28,17,.055), inset 0 1px 0 rgba(255,255,255,.72); }
  .cvxPageStartMain { display: grid; grid-template-columns: minmax(0,1fr); gap: 0; align-items: center; padding: 13px 16px; background: radial-gradient(circle at 100% 0%, var(--startAccent), transparent 38%), linear-gradient(135deg, rgba(255,255,255,.92), rgba(255,250,243,.74)); }
  .cvxPageStartBox { display: grid; align-content: center; gap: 4px; padding: 12px 13px; background: radial-gradient(circle at 98% 0%, var(--startSoft), transparent 40%), rgba(255,255,255,.74); }
  .cvxPageStartMain::after, .cvxPageStartBox::after { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .48; background: repeating-linear-gradient(135deg, rgba(16,21,19,.034) 0 1px, transparent 1px 17px); mask-image: linear-gradient(90deg, transparent 0%, #000 38%, #000 100%); }
  .cvxStartIcon { display: none !important; }
  .cvxPageStartText, .cvxPageStartBox b, .cvxPageStartBox span { position: relative; z-index: 1; }
  .cvxPageStartText b { display: block; color: #101513; font-size: 17px; line-height: 1.05; letter-spacing: -.03em; font-weight: 650; }
  .cvxPageStartText span { display: block; margin-top: 4px; color: #4f5b55; font-size: 12px; line-height: 1.28; font-weight: 560; white-space: normal; }
  .cvxPageStartBox b { color: #101513; font-size: 14px; line-height: 1.05; letter-spacing: -.02em; font-weight: 650; }
  .cvxPageStartBox span { color: #64716a; font-size: 10.5px; line-height: 1.25; font-weight: 560; }
  .cv3Product.cvxNoHeroStarts .cv3Toolbar { grid-column: 1 / -1; margin: -2px 0 0 !important; padding: 0 !important; }
  .cv3Product.cvxNoHeroStarts .cv3Toolbar button { min-height: 40px !important; border-radius: 999px !important; font-weight: 760 !important; }
  @media (max-width: 980px) { .cvxPageStartRow { grid-template-columns: 1fr 1fr; } .cvxPageStartMain { grid-column: 1 / -1; } }
  @media (max-width: 620px) { .cvxPageStartRow { grid-template-columns: 1fr; } .cvxPageStartMain, .cvxPageStartBox { min-height: 68px; border-radius: 20px; } }
`;

function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
function low(v) { return clean(v).toLowerCase(); }
function pageId() {
  const path = window.location.pathname || '';
  if (!(path === '/dashboard' || path.startsWith('/dashboard') || path === '/plans')) return '';
  const a = low(document.querySelector('.cv3Nav button.active b')?.textContent || document.querySelector('.cv3TopCopy h1')?.textContent || '');
  if (a === 'today') return 'today';
  if (a.includes('command')) return 'command';
  if (a.includes('job')) return 'jobs';
  if (a.includes('client')) return 'clients';
  if (a.includes('worker')) return 'workers';
  if (a.includes('message')) return 'messages';
  if (a.includes('quote')) return 'quotes';
  if (a.includes('invoice')) return 'invoices';
  if (a.includes('team')) return 'team';
  if (a.includes('payroll')) return 'payroll';
  if (a.includes('xero')) return 'xero';
  if (a.includes('setting')) return 'settings';
  if (a.includes('plan')) return 'plans';
  if (a.includes('help') || a.includes('support')) return 'support';
  return '';
}
function ensureStyle() { let s = document.getElementById(STYLE_ID); if (!s) { s = document.createElement('style'); s.id = STYLE_ID; document.head.appendChild(s); } if (s.textContent !== css) s.textContent = css; }
function statTexts() { return Array.from(document.querySelectorAll('.cv3HeroStats span')).map(n => clean(n.textContent)).filter(Boolean).slice(0, 2); }
function removeOld() { document.querySelectorAll('.cvxPageStartRow').forEach((n, i) => { if (i > 0) n.remove(); }); document.querySelectorAll('.cvxPageIntentNote,.cvxMessageBoardNote,.cvxHeroMiddleIntent').forEach(n => n.remove()); }
function upsert(page) {
  const pageNode = document.querySelector('.cv3Page');
  if (!pageNode) return;
  let row = pageNode.querySelector(':scope > .cvxPageStartRow');
  if (!row) { row = document.createElement('section'); row.className = 'cvxPageStartRow'; const toolbar = pageNode.querySelector(':scope > .cv3Toolbar'); if (toolbar) toolbar.insertAdjacentElement('beforebegin', row); else pageNode.insertAdjacentElement('afterbegin', row); }
  const tone = TONES[page[4]] || TONES.orange;
  const stats = statTexts();
  row.style.setProperty('--startAccent', tone[0]);
  row.style.setProperty('--startSoft', tone[1]);
  row.innerHTML = `<div class="cvxPageStartMain"><div class="cvxPageStartText"><b>${page[0]}</b><span>${page[1]}</span></div></div><div class="cvxPageStartBox"><b>${stats[0] || page[2]}</b><span>${page[2]}</span></div><div class="cvxPageStartBox"><b>${stats[1] || page[3]}</b><span>${page[3]}</span></div>`;
}
function run() { const product = document.querySelector('.cv3Product'); const id = pageId(); const page = PAGES[id]; if (!product || !page) return; ensureStyle(); product.classList.add('cvxNoHeroStarts'); removeOld(); upsert(page); }
function schedule(d = 100) { setTimeout(run, d); }
if (typeof window !== 'undefined' && !window[FLAG]) { window[FLAG] = true; [80, 240, 700, 1400, 2800, 5200].forEach(schedule); window.addEventListener('load', () => schedule(160)); window.addEventListener('hashchange', () => [80, 240, 700].forEach(schedule)); window.addEventListener('popstate', () => [80, 240, 700].forEach(schedule)); window.addEventListener('churvox:data-refresh', () => [100, 500].forEach(schedule)); window.addEventListener('churvox-owner-app-ready', () => [100, 500].forEach(schedule)); document.addEventListener('click', () => schedule(140), true); }
export {};
