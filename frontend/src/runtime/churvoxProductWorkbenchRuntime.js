// Churvox product workbench runtime.
// Makes the owner app feel like a working product: page command strip, quick actions, empty-state actions, and escape-to-close.

const STYLE_ID = 'churvox-product-workbench-runtime-style';
const STRIP_ID = 'churvox-product-ops-strip';

const PAGE_GOALS = {
  today: ['Run today', 'Jobs, approvals, workers, messages and money in one place.'],
  command: ['Owner decisions', 'Approve, edit or park prepared slips.'],
  jobs: ['Build the run sheet', 'Create, assign, price, schedule and repeat jobs.'],
  clients: ['Keep client memory', 'Contact, site, access, pricing and linked history.'],
  quotes: ['Win the work', 'Draft, follow up and convert accepted quotes.'],
  invoices: ['Control money', 'Draft, due, overdue, paid and accounting status.'],
  messages: ['Turn messages into actions', 'Worker notes and client replies stay organised.'],
  team: ['Manage people', 'Staff records, roles, access and payroll review.'],
  payroll: ['Review time safely', 'Timesheets and slips only. No tax or payout files.'],
  workers: ['See the field', 'GPS, proof, job status and worker messages.'],
  xero: ['Guard accounting', 'Draft sync only, owner approved.'],
  settings: ['Control the business', 'Branding, GST, exports, worker rules and security.'],
  plans: ['Manage plan', 'Locked pricing and checkout direction.'],
  support: ['Get help', 'Guides and direct support without dead buttons.'],
};

const PAGE_ACTIONS = {
  today: [['Add job', 'add-job'], ['Open Command', 'command'], ['Export today', 'export'], ['Import CSV', 'import']],
  command: [['Review first slip', 'open-first'], ['Export queue', 'export'], ['Jobs', 'jobs'], ['Invoices', 'invoices']],
  jobs: [['Add job', 'add-job'], ['Recurring job', 'recurring'], ['Assign worker', 'workers'], ['Export jobs', 'export']],
  clients: [['Add client', 'add-client'], ['CSV import', 'import'], ['Export clients', 'export'], ['Jobs', 'jobs']],
  quotes: [['New quote', 'new-quote'], ['Follow up', 'follow-up'], ['Create job', 'add-job'], ['Export quotes', 'export']],
  invoices: [['New invoice draft', 'new-invoice'], ['Review draft', 'review-draft'], ['Command', 'command'], ['Export invoices', 'export']],
  messages: [['Message note', 'message-note'], ['Open draft reply', 'open-first'], ['Command', 'command'], ['Export messages', 'export']],
  team: [['Add staff', 'add-worker'], ['Roles/access', 'open-first'], ['Payroll', 'payroll'], ['Export team', 'export']],
  payroll: [['Review first worker', 'open-first'], ['Export payroll', 'export'], ['Team', 'team'], ['Command', 'command']],
  workers: [['Open first worker', 'open-first'], ['Team', 'team'], ['Payroll', 'payroll'], ['Export workers', 'export']],
  xero: [['Review sync queue', 'open-first'], ['Command', 'command'], ['Export pack', 'export'], ['Invoices', 'invoices']],
  settings: [['Business branding', 'setting-brand'], ['GST', 'setting-gst'], ['CSV exports', 'setting-export'], ['Command', 'command']],
  plans: [['Choose Operator', 'choose-operator'], ['Owner Plans', 'plans'], ['Support', 'support'], ['Command', 'command']],
  support: [['Setup help', 'guide-setup'], ['CSV import', 'guide-csv'], ['Email support', 'email'], ['Command', 'command']],
};

const css = `
  .cvxProductOpsStrip {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    margin: 0 0 14px;
    padding: 12px 14px;
    border: 1px solid rgba(17,21,19,.08);
    border-radius: 20px;
    background: rgba(255,255,252,.76);
    box-shadow: 0 12px 30px rgba(17,21,19,.065);
    backdrop-filter: blur(14px);
  }

  .cvxProductOpsTitle {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .cvxProductOpsTitle small {
    color: #f36b21;
    font-size: 10px;
    font-weight: 1000;
    letter-spacing: .09em;
    text-transform: uppercase;
  }

  .cvxProductOpsTitle b {
    color: #111713;
    font-size: 18px;
    line-height: 1.05;
    font-weight: 1000;
    letter-spacing: -.045em;
  }

  .cvxProductOpsTitle span {
    color: #63706a;
    font-size: 12px;
    line-height: 1.3;
    font-weight: 760;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cvxProductOpsActions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 7px;
  }

  .cvxProductOpsActions button,
  .cvxProductEmptyAction {
    min-height: 34px;
    border: 0;
    border-radius: 999px;
    padding: 8px 11px;
    background: #111713;
    color: #fff;
    font: inherit;
    font-size: 12px;
    font-weight: 1000;
    cursor: pointer;
    box-shadow: 0 10px 22px rgba(17,21,19,.12);
  }

  .cvxProductOpsActions button:first-child,
  .cvxProductEmptyAction.primary {
    background: linear-gradient(135deg,#f36b21,#ffad5b);
    color: #211006;
  }

  .cvxProductOpsActions button:hover,
  .cvxProductEmptyAction:hover {
    transform: translateY(-1px);
  }

  .cvxProductEmptyActions {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 10px;
  }

  .cvxProductPageBadge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 6px 8px;
    background: rgba(17,21,19,.06);
    color: #39443f;
    font-size: 11px;
    font-weight: 900;
  }

  .cvxProductPageBadge:before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #16a34a;
  }

  @media(max-width: 900px) {
    .cvxProductOpsStrip { grid-template-columns: 1fr; }
    .cvxProductOpsActions { justify-content: flex-start; }
    .cvxProductOpsTitle span { white-space: normal; }
  }
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
}

function currentPage() {
  const raw = (window.location.hash || '#today').replace('#', '').toLowerCase();
  const key = raw.replace(/[^a-z0-9]/g, '');
  const aliases = { '': 'today', help: 'support', inbox: 'messages', dispatch: 'workers', calendar: 'workers', schedule: 'workers', reports: 'invoices' };
  return aliases[key] || key || 'today';
}

function route(page) {
  window.history.replaceState({}, document.title, `/dashboard#${page}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function findButton(patterns) {
  const list = Array.from(document.querySelectorAll('.cvxProduct button'));
  return list.find((button) => {
    const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return patterns.some((pattern) => pattern.test(text));
  });
}

function clickNative(patterns) {
  const button = findButton(patterns);
  if (button) {
    button.click();
    return true;
  }
  return false;
}

function toast(message) {
  let node = document.getElementById('churvox-product-workbench-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'churvox-product-workbench-toast';
    node.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:1000003;border-radius:999px;padding:11px 14px;background:#111713;color:#fff;box-shadow:0 18px 44px rgba(17,21,19,.22);font:900 13px Inter,system-ui,sans-serif;max-width:calc(100vw - 32px)';
    document.body.appendChild(node);
  }
  node.textContent = message;
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.remove(), 2100);
}

function runAction(action) {
  const page = currentPage();
  if (action === 'command') return route('command');
  if (action === 'jobs') return route('jobs');
  if (action === 'clients') return route('clients');
  if (action === 'quotes') return route('quotes');
  if (action === 'invoices') return route('invoices');
  if (action === 'workers') return route('workers');
  if (action === 'team') return route('team');
  if (action === 'payroll') return route('payroll');
  if (action === 'plans') return route('plans');
  if (action === 'support') return route('support');
  if (action === 'email') { window.location.href = 'mailto:hello@churvox.com'; return; }

  if (action === 'add-job' && clickNative([/^add job$/, /^create job$/])) return;
  if (action === 'recurring' && clickNative([/recurring job/])) return;
  if (action === 'add-client' && clickNative([/^add client$/])) return;
  if (action === 'new-quote' && clickNative([/^new quote$/])) return;
  if (action === 'new-invoice' && clickNative([/new invoice draft/])) return;
  if (action === 'add-worker' && clickNative([/^add staff$/, /^add worker$/])) return;
  if (action === 'message-note' && clickNative([/message note/])) return;
  if (action === 'review-draft' && clickNative([/review draft/])) return;
  if (action === 'follow-up' && clickNative([/follow up/])) return;
  if (action === 'open-first' && clickNative([/^open$|open slip|review|slip|open form/])) return;

  if (action === 'import' && clickNative([/csv import|import csv/])) return;
  if (action === 'export' && clickNative([/export/])) return;

  if (action === 'setting-brand' && clickNative([/business branding/])) return;
  if (action === 'setting-gst' && clickNative([/^gst$/])) return;
  if (action === 'setting-export' && clickNative([/csv exports/])) return;
  if (action === 'guide-setup' && clickNative([/setup help/])) return;
  if (action === 'guide-csv' && clickNative([/csv import/])) return;
  if (action === 'choose-operator' && clickNative([/choose operator|choose most popular/])) return;

  toast(`Use the ${PAGE_GOALS[page]?.[0] || 'page'} controls below.`);
}

function renderOpsStrip() {
  const product = document.querySelector('.cvxProduct[data-product-version="v2"]');
  const workspace = product?.querySelector('.cvxWorkspace');
  if (!workspace) return;

  const page = currentPage();
  const [title, detail] = PAGE_GOALS[page] || PAGE_GOALS.today;
  const actions = PAGE_ACTIONS[page] || PAGE_ACTIONS.today;

  let strip = document.getElementById(STRIP_ID);
  if (!strip) {
    strip = document.createElement('section');
    strip.id = STRIP_ID;
    strip.className = 'cvxProductOpsStrip';
    workspace.prepend(strip);
  }

  strip.innerHTML = `
    <div class="cvxProductOpsTitle">
      <small>Product workbench</small>
      <b>${escapeHtml(title)}</b>
      <span>${escapeHtml(detail)}</span>
    </div>
    <div class="cvxProductOpsActions">
      ${actions.map(([label, action]) => `<button type="button" data-cvx-ops-action="${escapeHtml(action)}">${escapeHtml(label)}</button>`).join('')}
    </div>
  `;
}

function enrichEmptyStates() {
  const page = currentPage();
  document.querySelectorAll('.cvxProduct[data-product-version="v2"] .cvxEmpty').forEach((empty) => {
    if (empty.querySelector('.cvxProductEmptyActions')) return;
    const actions = document.createElement('div');
    actions.className = 'cvxProductEmptyActions';
    const primary = document.createElement('button');
    primary.type = 'button';
    primary.className = 'cvxProductEmptyAction primary';
    const secondary = document.createElement('button');
    secondary.type = 'button';
    secondary.className = 'cvxProductEmptyAction';

    if (page === 'clients') { primary.textContent = 'Add client'; primary.dataset.cvxOpsAction = 'add-client'; secondary.textContent = 'CSV import'; secondary.dataset.cvxOpsAction = 'import'; }
    else if (page === 'quotes') { primary.textContent = 'New quote'; primary.dataset.cvxOpsAction = 'new-quote'; secondary.textContent = 'Add client'; secondary.dataset.cvxOpsAction = 'clients'; }
    else if (page === 'invoices') { primary.textContent = 'New invoice'; primary.dataset.cvxOpsAction = 'new-invoice'; secondary.textContent = 'Open Command'; secondary.dataset.cvxOpsAction = 'command'; }
    else if (page === 'team' || page === 'workers' || page === 'payroll') { primary.textContent = 'Add staff'; primary.dataset.cvxOpsAction = 'add-worker'; secondary.textContent = 'Team'; secondary.dataset.cvxOpsAction = 'team'; }
    else if (page === 'messages') { primary.textContent = 'Message note'; primary.dataset.cvxOpsAction = 'message-note'; secondary.textContent = 'Command'; secondary.dataset.cvxOpsAction = 'command'; }
    else { primary.textContent = 'Add job'; primary.dataset.cvxOpsAction = 'add-job'; secondary.textContent = 'Open Command'; secondary.dataset.cvxOpsAction = 'command'; }

    actions.append(primary, secondary);
    empty.appendChild(actions);
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function closeTopModal() {
  const close = document.querySelector('[data-cvx-close-control], .cvxDrawerClose, .recordWorkspacePopupClose, .closeDrawer');
  if (close) close.click();
}

function runWorkbench() {
  ensureStyle();
  renderOpsStrip();
  enrichEmptyStates();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PRODUCT_WORKBENCH_RUNTIME__) {
  window.__CHURVOX_PRODUCT_WORKBENCH_RUNTIME__ = true;
  runWorkbench();
  window.addEventListener('load', () => setTimeout(runWorkbench, 120));
  window.addEventListener('hashchange', () => setTimeout(runWorkbench, 120));
  window.addEventListener('popstate', () => setTimeout(runWorkbench, 120));
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cvx-ops-action]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    runAction(button.getAttribute('data-cvx-ops-action'));
    setTimeout(runWorkbench, 120);
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeTopModal();
  });
  setInterval(runWorkbench, 3000);
}

export {};
