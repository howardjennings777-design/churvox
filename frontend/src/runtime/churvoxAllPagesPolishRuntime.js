const STYLE_ID = 'churvox-all-pages-polish-style';
const FLAG = '__CHURVOX_ALL_PAGES_POLISH_RUNTIME__';

const PAGE = {
  today: {
    kicker: 'Control room',
    title: 'Today, lined up and ready.',
    copy: 'Jobs, field updates, invoices and owner checks sit together so the day is easy to run.',
    noteTitle: 'Start here when the day feels messy.',
    note: 'Open the thing that needs attention, approve what is safe, and leave the rest parked until you are ready.',
    action: 'Run the day',
    stats: ['jobs today', 'field team', 'owner checks', 'invoice value'],
  },
  command: {
    kicker: 'Owner approval',
    title: 'Decisions waiting for you.',
    copy: 'Churvox can prepare the admin, but the owner still approves, edits or parks anything risky.',
    noteTitle: 'Command is the approval desk.',
    note: 'Use this page when a quote, invoice, message or unusual change needs a clear owner decision.',
    action: 'Approve · edit · park',
    stats: ['waiting', 'approve', 'edit', 'park'],
  },
  jobs: {
    kicker: 'Run sheet',
    title: 'Jobs without the back-and-forth.',
    copy: 'Schedule, assign, price, repeat and review work from one practical job board.',
    noteTitle: 'This page should answer: what is happening next?',
    note: 'Recurring work stays in Jobs, field proof stays linked, and completed work can flow into invoice review.',
    action: 'Schedule · assign · invoice',
    stats: ['jobs', 'recurring', 'needs check', 'editable forms'],
  },
  clients: {
    kicker: 'Business memory',
    title: 'Client details you can trust.',
    copy: 'Contact details, site notes, prices and linked work history stay in one clean file.',
    noteTitle: 'Client memory saves retyping.',
    note: 'Keep access notes, usual service, pricing and history together so every new job starts with context.',
    action: 'Import · update · history',
    stats: ['clients', 'csv tools', 'site notes', 'linked history'],
  },
  workers: {
    kicker: 'Field status',
    title: 'Know what the team is doing.',
    copy: 'Worker status, proof, messages, location notes and timesheet review stay visible without crowding Jobs.',
    noteTitle: 'Field view stays simple.',
    note: 'This page is for worker readiness, proof, messages and time review — not a second jobs page.',
    action: 'Track · proof · review',
    stats: ['workers', 'active', 'proof', 'time review'],
  },
  messages: {
    kicker: 'Inbox',
    title: 'Messages that need an answer.',
    copy: 'Worker notes and customer replies stay attached to the right job, client and owner decision.',
    noteTitle: 'Message board, not a dumping ground.',
    note: 'Open a message, reply if needed, delete junk, or turn it into an owner check.',
    action: 'Reply · delete · review',
    stats: ['messages', 'unread', 'draft replies', 'linked threads'],
  },
  quotes: {
    kicker: 'Pipeline',
    title: 'Quotes ready to send or follow up.',
    copy: 'Scope, price, follow-up and job conversion stay together before anything goes out.',
    noteTitle: 'Quotes should move work forward.',
    note: 'Use this page to draft, check, send, follow up and convert accepted quotes into jobs.',
    action: 'Draft · send · convert',
    stats: ['quotes', 'accepted', 'follow up', 'convert'],
  },
  invoices: {
    kicker: 'Money review',
    title: 'Invoice money under control.',
    copy: 'Drafts, overdue work, exports and accounting handoff stay owner-reviewed before sending or syncing.',
    noteTitle: 'Money stays reviewed.',
    note: 'Draft invoices can be checked, exported and synced without Churvox automatically sending risky money changes.',
    action: 'Draft · export · sync',
    stats: ['ledger', 'overdue', 'draft sync', 'paid'],
  },
  team: {
    kicker: 'Access',
    title: 'People, roles and permissions.',
    copy: 'Workers, subcontractors, managers and payroll access stay tidy without exposing owner-only tools.',
    noteTitle: 'Access needs to be obvious.',
    note: 'Use Team to invite people, check app access, and keep worker permissions away from owner controls.',
    action: 'Invite · roles · access',
    stats: ['team', 'workers', 'roles', 'access'],
  },
  payroll: {
    kicker: 'Review only',
    title: 'Timesheets ready for review.',
    copy: 'Check time and export payroll records. No tax filing, no government submission and no bank payout files.',
    noteTitle: 'Payroll stays safe.',
    note: 'This is a review and export workspace only, built from job time and worker records.',
    action: 'Review · export only',
    stats: ['workers', 'timesheets', 'review', 'export'],
  },
  xero: {
    kicker: 'Accounting sync',
    title: 'Accounting handoff, kept guarded.',
    copy: 'Connect accounting when ready, sync drafts only, and keep invoice decisions owner-approved.',
    noteTitle: 'Sync should never feel risky.',
    note: 'This page shows connection state, ready drafts and the guardrails around accounting handoff.',
    action: 'Connect · review · sync',
    stats: ['status', 'drafts', 'owner approved', 'guardrails'],
  },
  settings: {
    kicker: 'Business rules',
    title: 'Controls that shape Churvox.',
    copy: 'Branding, GST, worker rules, industry mode, security and account controls stay in one practical place.',
    noteTitle: 'Settings should change how the app behaves.',
    note: 'Use this page for business profile, industry logic, billing rules, worker rules and account-level controls.',
    action: 'Brand · rules · security',
    stats: ['business', 'industry', 'gst', 'security'],
  },
  plans: {
    kicker: 'Billing',
    title: 'Plans, limits and add-ons.',
    copy: 'Locked pricing stays plain: Start, Crew, Operator, Command and separate add-ons.',
    noteTitle: 'Billing stays clear.',
    note: 'This page should show the current plan, trial state, checkout path and add-ons without changing prices.',
    action: 'Plan · trial · add-ons',
    stats: ['current plan', 'trial', 'no card', 'locked pricing'],
  },
  support: {
    kicker: 'Help desk',
    title: 'Support stays inside Churvox.',
    copy: 'Send a support request from inside the app and keep setup guidance close to the business context.',
    noteTitle: 'No email hunting.',
    note: 'Use the internal support form so page, account and setup context can stay attached to the ticket.',
    action: 'Ask · track · fix',
    stats: ['support', 'setup', 'tickets', 'guidance'],
  },
};

const css = `
  .cv3Product.cvxAllPagesPolished .cv3Nav {
    top: 84px !important;
    width: calc(100% - 36px) !important;
    max-width: 1640px !important;
    margin: 12px auto 0 !important;
    border: 1px solid rgba(16,21,19,.09) !important;
    border-radius: 28px !important;
    padding: 10px !important;
    gap: 8px !important;
    background: linear-gradient(135deg, rgba(255,253,248,.92), rgba(246,239,228,.86)) !important;
    box-shadow: 0 18px 42px rgba(37,28,17,.08), inset 0 1px 0 rgba(255,255,255,.6) !important;
  }
  .cv3Product.cvxAllPagesPolished .cv3Nav button {
    min-width: 96px !important;
    min-height: 48px !important;
    border-radius: 999px !important;
    border: 1px solid rgba(16,21,19,.075) !important;
    background: rgba(255,255,255,.62) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.65) !important;
    text-align: center !important;
    justify-items: center !important;
  }
  .cv3Product.cvxAllPagesPolished .cv3Nav button b { font-size: 12px !important; }
  .cv3Product.cvxAllPagesPolished .cv3Nav button small { font-size: 8px !important; }
  .cv3Product.cvxAllPagesPolished .cv3Nav button.active {
    color: #fff !important;
    background: linear-gradient(135deg, #101513, #26312b 72%, #f36b21 220%) !important;
    border-color: rgba(16,21,19,.2) !important;
    box-shadow: 0 14px 30px rgba(16,21,19,.18) !important;
    transform: translateY(-1px) !important;
  }
  .cv3Product.cvxAllPagesPolished .cv3Workspace { padding-top: 14px !important; }
  .cv3Product.cvxAllPagesPolished .cv3Hero {
    min-height: 138px !important;
    grid-template-columns: minmax(0, .98fr) minmax(410px, .72fr) !important;
    border-radius: 30px !important;
    padding: 20px !important;
    background:
      radial-gradient(circle at 98% 0%, rgba(243,107,33,.14), transparent 35%),
      radial-gradient(circle at 0% 100%, rgba(16,21,19,.055), transparent 35%),
      linear-gradient(135deg, rgba(255,255,255,.97), rgba(255,248,239,.86)) !important;
  }
  .cv3Product.cvxAllPagesPolished .cv3Hero h2 {
    max-width: 690px !important;
    font-size: clamp(30px, 3.2vw, 50px) !important;
    line-height: .95 !important;
    letter-spacing: -.075em !important;
  }
  .cv3Product.cvxAllPagesPolished .cv3Hero p {
    max-width: 690px !important;
    font-size: 13px !important;
    line-height: 1.45 !important;
  }
  .cv3Product.cvxAllPagesPolished .cv3HeroStats {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 9px !important;
  }
  .cv3Product.cvxAllPagesPolished .cv3HeroStats span {
    min-height: 86px !important;
    border-radius: 22px !important;
    background: rgba(255,255,255,.82) !important;
  }
  .cv3Product.cvxAllPagesPolished .cv3HeroStats b { font-size: 26px !important; }
  .cv3Product.cvxAllPagesPolished .cv3HeroStats small { color: #6c7771 !important; }
  .cvxPageIntentNote {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0,1fr) auto;
    gap: 12px;
    align-items: center;
    border: 1px solid rgba(243,107,33,.18);
    border-radius: 26px;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(255,255,255,.86), rgba(255,245,235,.8));
    box-shadow: 0 16px 38px rgba(37,28,17,.07);
  }
  .cvxPageIntentNote b {
    display: block;
    font-size: 18px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -.045em;
    color: #101513;
  }
  .cvxPageIntentNote span {
    display: block;
    margin-top: 5px;
    color: #66736d;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 820;
  }
  .cvxPageIntentNote em {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 9px 12px;
    background: #101513;
    color: #fff;
    font-size: 11px;
    font-style: normal;
    font-weight: 1000;
    white-space: nowrap;
  }
  .cv3Product.cvxAllPagesPolished .cv3Toolbar { padding: 0 !important; }
  .cv3Product.cvxAllPagesPolished .cv3Toolbar button { min-height: 42px !important; border-radius: 999px !important; }
  .cv3Product.cvxAllPagesPolished .cv3Panel { border-radius: 28px !important; }
  .cv3Product.cvxAllPagesPolished .cv3Panel h3 { font-size: 17px !important; }
  .cv3Product.cvxAllPagesPolished .cv3Row { min-height: 70px !important; border-radius: 20px !important; }
  .cv3Product.cvxPage-command .cv3Hero, .cv3Product.cvxPage-invoices .cv3Hero { background: radial-gradient(circle at 98% 0%, rgba(16,21,19,.12), transparent 36%), linear-gradient(135deg, rgba(255,255,255,.96), rgba(255,245,235,.88)) !important; }
  .cv3Product.cvxPage-workers .cv3Hero, .cv3Product.cvxPage-jobs .cv3Hero { background: radial-gradient(circle at 98% 0%, rgba(37,99,235,.11), transparent 36%), linear-gradient(135deg, rgba(255,255,255,.96), rgba(240,247,255,.84)) !important; }
  .cv3Product.cvxPage-xero .cv3Hero, .cv3Product.cvxPage-payroll .cv3Hero { background: radial-gradient(circle at 98% 0%, rgba(22,163,74,.13), transparent 36%), linear-gradient(135deg, rgba(255,255,255,.96), rgba(239,253,244,.84)) !important; }
  @media (max-width: 980px) {
    .cv3Product.cvxAllPagesPolished .cv3Hero { grid-template-columns: 1fr !important; }
    .cv3Product.cvxAllPagesPolished .cv3HeroStats { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
  }
  @media (max-width: 720px) {
    .cv3Product.cvxAllPagesPolished .cv3Nav { width: calc(100% - 22px) !important; border-radius: 22px !important; }
    .cv3Product.cvxAllPagesPolished .cv3Hero h2 { font-size: 38px !important; }
    .cvxPageIntentNote { grid-template-columns: 1fr; }
    .cvxPageIntentNote em { justify-self: start; }
  }
`;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function pageId() {
  const path = window.location.pathname || '';
  if (!(path === '/dashboard' || path.startsWith('/dashboard') || path === '/plans')) return '';
  const active = document.querySelector('.cv3Nav button.active b')?.textContent;
  const title = document.querySelector('.cv3TopCopy h1')?.textContent || active || '';
  const key = lower(title);
  if (key === 'today') return 'today';
  if (key.includes('command')) return 'command';
  if (key.includes('job')) return 'jobs';
  if (key.includes('client')) return 'clients';
  if (key.includes('worker')) return 'workers';
  if (key.includes('message')) return 'messages';
  if (key.includes('quote')) return 'quotes';
  if (key.includes('invoice')) return 'invoices';
  if (key.includes('team')) return 'team';
  if (key.includes('payroll')) return 'payroll';
  if (key.includes('xero')) return 'xero';
  if (key.includes('setting')) return 'settings';
  if (key.includes('plan')) return 'plans';
  if (key.includes('help') || key.includes('support')) return 'support';
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
function numbersFromHero() {
  return Array.from(document.querySelectorAll('.cv3HeroStats span')).map((node) => clean(node.querySelector('b')?.textContent || node.textContent || ''));
}
function panelByTitle(text) {
  const needle = lower(text);
  return Array.from(document.querySelectorAll('.cv3Panel')).find((panel) => lower(panel.querySelector('h3')?.textContent).includes(needle));
}
function rowCount(title) { return panelByTitle(title)?.querySelectorAll('.cv3Row').length || 0; }
function unreadRows() { return Array.from(document.querySelectorAll('.cv3Panel .cv3Row')).filter((row) => /unread|new|reply/i.test(row.textContent || '')).length; }
function statValues(id) {
  const existing = numbersFromHero();
  if (id === 'messages') return [existing[0] || rowCount('message'), String(unreadRows()), existing[1] || '0', String(rowCount('worker') + rowCount('client'))];
  if (id === 'clients') return [existing[0] || String(rowCount('client')), existing[1] || 'CSV', existing[2] || 'Notes', existing[3] || 'History'];
  if (id === 'workers') return [existing[0] || String(rowCount('worker')), existing[1] || '0', existing[2] || 'Proof', existing[3] || 'Time'];
  if (id === 'team') return [String(rowCount('team') || rowCount('worker') || existing[0] || 0), existing[1] || 'Workers', existing[2] || 'Roles', existing[3] || 'Access'];
  if (id === 'support') return [existing[0] || 'Inside', existing[1] || 'Setup', existing[2] || 'Tickets', existing[3] || 'Guides'];
  return [existing[0] || 'Ready', existing[1] || 'Open', existing[2] || 'Review', existing[3] || 'Control'];
}
function updateHero(id, config) {
  const hero = document.querySelector('.cv3Hero');
  if (!hero) return;
  const kicker = hero.querySelector(':scope > div:first-child small');
  const heading = hero.querySelector('h2');
  const copy = hero.querySelector('p');
  if (kicker) kicker.textContent = config.kicker;
  if (heading) heading.textContent = config.title;
  if (copy) copy.textContent = config.copy;
  const stats = hero.querySelector('.cv3HeroStats');
  if (stats) {
    const values = statValues(id);
    stats.innerHTML = config.stats.slice(0, 4).map((label, index) => `<span><b>${values[index] ?? ''}</b><small>${label}</small></span>`).join('');
  }
}
function updateHeader(id, config) {
  const text = document.querySelector('.cv3TopCopy p');
  const small = document.querySelector('.cv3TopCopy small');
  if (small) small.textContent = 'Owner workspace';
  if (text) text.textContent = `${config.title} ${config.copy}`;
}
function updatePanels() {
  const labels = {
    'Worker messages': ['from the field', 'Worker inbox'],
    'Client messages': ['customers', 'Customer inbox'],
    'Drafted reply': ['reply ready', 'Owner reply'],
    'Field board': ['live field view', 'Worker status'],
    'Proof and location': ['outside proof', 'Proof board'],
    'Job board': ['run sheet', 'Job list'],
    'Client list': ['memory', 'Client records'],
    'Invoice ledger': ['money', 'Invoice ledger'],
    'Quote builder': ['scope and price', 'Quote workspace'],
    'Team access': ['permissions', 'Team access'],
    'Timesheet review': ['hours', 'Timesheet review'],
    'Accounting status': ['connection', 'Accounting connection'],
  };
  Object.entries(labels).forEach(([oldTitle, [kicker, title]]) => {
    const panel = panelByTitle(oldTitle);
    if (!panel) return;
    const small = panel.querySelector('header small');
    const h3 = panel.querySelector('h3');
    if (small) small.textContent = kicker;
    if (h3) h3.textContent = title;
  });
}
function insertIntent(config) {
  const page = document.querySelector('.cv3Page');
  if (!page) return;
  page.querySelectorAll('.cvxPageIntentNote').forEach((node, index) => { if (index > 0) node.remove(); });
  let note = page.querySelector('.cvxPageIntentNote');
  const toolbar = page.querySelector('.cv3Toolbar') || page.querySelector('.cv3Hero');
  if (!note) {
    note = document.createElement('section');
    note.className = 'cvxPageIntentNote';
    if (toolbar?.classList?.contains('cv3Hero')) toolbar.insertAdjacentElement('afterend', note);
    else toolbar?.insertAdjacentElement('afterend', note);
  }
  note.innerHTML = `<div><b>${config.noteTitle}</b><span>${config.note}</span></div><em>${config.action}</em>`;
}
function updateClass(product, id) {
  Object.keys(PAGE).forEach((page) => product.classList.remove(`cvxPage-${page}`));
  product.classList.add('cvxAllPagesPolished', `cvxPage-${id}`);
}
function run() {
  const id = pageId();
  const product = document.querySelector('.cv3Product');
  if (!product || !id || !PAGE[id]) {
    product?.classList?.remove('cvxAllPagesPolished');
    return;
  }
  ensureStyle();
  const config = PAGE[id];
  updateClass(product, id);
  updateHeader(id, config);
  updateHero(id, config);
  updatePanels(id);
  insertIntent(config);
}
function schedule(delay = 100) { setTimeout(run, delay); }
if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  [120, 500, 1200, 2600, 5200].forEach(schedule);
  window.addEventListener('load', () => schedule(220));
  window.addEventListener('hashchange', () => [80, 280, 900].forEach(schedule));
  window.addEventListener('popstate', () => [80, 280, 900].forEach(schedule));
  window.addEventListener('churvox:data-refresh', () => [120, 700].forEach(schedule));
  window.addEventListener('churvox-owner-app-ready', () => [120, 700].forEach(schedule));
  document.addEventListener('click', () => schedule(160), true);
}
export {};
