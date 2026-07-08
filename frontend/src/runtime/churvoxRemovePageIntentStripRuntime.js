const STYLE_ID = 'churvox-remove-page-intent-strip-style';
const FLAG = '__CHURVOX_REMOVE_PAGE_INTENT_STRIP_RUNTIME__';

const PAGE = {
  today: ['Run the day', 'Jobs, field updates and owner checks stay in one place.'],
  command: ['Approval desk', 'Approve, edit or park the admin Churvox prepares.'],
  jobs: ['Run sheet', 'Schedule, assign, repeat and invoice work from here.'],
  clients: ['Client memory', 'Access notes, pricing and history stay with the client file.'],
  workers: ['Field view', 'Worker status, proof, messages and time review stay together.'],
  messages: ['Inbox', 'Reply, delete or turn a message into an owner check.'],
  quotes: ['Quote pipeline', 'Draft, follow up and convert accepted work into jobs.'],
  invoices: ['Money review', 'Draft, export and sync invoices only when approved.'],
  team: ['Access control', 'Invite people and keep permissions clear.'],
  payroll: ['Review only', 'Check and export time. No tax filing or payout files.'],
  xero: ['Safe sync', 'Connect accounting and keep invoice handoff guarded.'],
  settings: ['Business rules', 'Brand, GST, industry mode and controls live here.'],
  plans: ['Billing', 'Plans, trial state and add-ons stay clear.'],
  support: ['Support', 'Send help requests from inside Churvox.'],
};

const css = `
  .cv3Product .cvxPageIntentNote,
  .cv3Product .cvxMessageBoardNote {
    display: none !important;
  }
  .cv3Product.cvxNoIntentStrip .cv3Workspace {
    padding-top: 12px !important;
  }
  .cv3Product.cvxNoIntentStrip .cv3Hero {
    margin-top: 0 !important;
  }
  .cvxHeroMiddleIntent {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    width: fit-content;
    max-width: 100%;
    margin-top: 13px;
    border: 1px solid rgba(243,107,33,.18);
    border-radius: 999px;
    padding: 8px 11px;
    background: rgba(255,255,255,.72);
    color: #101513;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
  }
  .cvxHeroMiddleIntent b {
    color: #101513;
    font-size: 12px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -.025em;
    white-space: nowrap;
  }
  .cvxHeroMiddleIntent span {
    color: #66736d;
    font-size: 12px;
    line-height: 1.2;
    font-weight: 820;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 820px) {
    .cvxHeroMiddleIntent {
      display: grid;
      justify-items: start;
      border-radius: 18px;
    }
    .cvxHeroMiddleIntent span { white-space: normal; }
  }
`;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function pageId() {
  const path = window.location.pathname || '';
  if (!(path === '/dashboard' || path.startsWith('/dashboard') || path === '/plans')) return '';
  const active = lower(document.querySelector('.cv3Nav button.active b')?.textContent || document.querySelector('.cv3TopCopy h1')?.textContent || '');
  if (active === 'today') return 'today';
  if (active.includes('command')) return 'command';
  if (active.includes('job')) return 'jobs';
  if (active.includes('client')) return 'clients';
  if (active.includes('worker')) return 'workers';
  if (active.includes('message')) return 'messages';
  if (active.includes('quote')) return 'quotes';
  if (active.includes('invoice')) return 'invoices';
  if (active.includes('team')) return 'team';
  if (active.includes('payroll')) return 'payroll';
  if (active.includes('xero')) return 'xero';
  if (active.includes('setting')) return 'settings';
  if (active.includes('plan')) return 'plans';
  if (active.includes('help') || active.includes('support')) return 'support';
  return '';
}
function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}
function removeStrips() {
  document.querySelectorAll('.cvxPageIntentNote,.cvxMessageBoardNote').forEach((node) => node.remove());
}
function upsertHeroPill(id) {
  const hero = document.querySelector('.cv3Hero');
  const first = hero?.querySelector(':scope > div:first-child');
  if (!hero || !first) return;
  const [title, text] = PAGE[id] || PAGE.today;
  let pill = first.querySelector('.cvxHeroMiddleIntent');
  if (!pill) {
    pill = document.createElement('div');
    pill.className = 'cvxHeroMiddleIntent';
    const copy = first.querySelector('p');
    if (copy) copy.insertAdjacentElement('afterend', pill);
    else first.appendChild(pill);
  }
  pill.innerHTML = `<b>${title}</b><span>${text}</span>`;
}
function run() {
  const product = document.querySelector('.cv3Product');
  const id = pageId();
  if (!product || !id) return;
  ensureStyle();
  product.classList.add('cvxNoIntentStrip');
  removeStrips();
  upsertHeroPill(id);
}
function schedule(delay = 100) { setTimeout(run, delay); }
if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  [80, 260, 700, 1400, 2800, 5200].forEach(schedule);
  window.addEventListener('load', () => schedule(160));
  window.addEventListener('hashchange', () => [80, 260, 700].forEach(schedule));
  window.addEventListener('popstate', () => [80, 260, 700].forEach(schedule));
  window.addEventListener('churvox:data-refresh', () => [100, 500].forEach(schedule));
  window.addEventListener('churvox-owner-app-ready', () => [100, 500].forEach(schedule));
  document.addEventListener('click', () => schedule(140), true);
}
export {};
