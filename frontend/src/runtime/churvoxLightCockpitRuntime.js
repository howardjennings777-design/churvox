import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_LIGHT_OWNER_COCKPIT_RUNTIME__';
const ROOT_ID = 'churvox-light-owner-cockpit';
const STYLE_ID = 'churvox-light-owner-cockpit-style';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const keyOf = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const money = (value) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(Number(value || 0));

function pageKey() {
  const path = keyOf((location.pathname || '').split('/')[1] || 'dashboard');
  const hash = keyOf(String(location.hash || '').replace(/^#/, '').split('?')[0]);
  const aliases = { dashboard: 'today', smarthub: 'today', home: 'today' };
  return aliases[hash] || aliases[path] || hash || path;
}

function isOwnerToday() {
  if (/worker|login|signup|privacy|terms/i.test(location.pathname || '')) return false;
  return pageKey() === 'today' && Boolean(document.querySelector('.cvxTop, .cvxNav, .cvxPage, main'));
}

function workspace() {
  return document.querySelector('.cvxPage, .cocPage, .workspace, main');
}

function rowsFrom(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  for (const name of ['items', 'records', 'results', 'data', 'jobs', 'clients', 'workers', 'team', 'quotes', 'invoices', 'messages', 'actions', 'notifications']) {
    if (Array.isArray(payload?.[name])) return payload[name];
  }
  return [];
}

function unwrap(payload) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function pick(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && clean(value)) return clean(value);
  }
  return '';
}

function num(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return Number(value) || 0;
  }
  return 0;
}

async function get(path) {
  if (!API_ROOT || API_ROOT === '/api') return null;
  const response = await fetch(`${API_ROOT}${path}`, { credentials: 'include' });
  const text = await response.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function loadCockpitData() {
  const [jobs, clients, workers, quotes, invoices, messages, command, xero] = await Promise.allSettled([
    get('/jobs'), get('/clients'), get('/team'), get('/quotes'), get('/invoices'), get('/messages'), get('/ai/actions'), get('/xero/status'),
  ]);
  const value = (result) => unwrap(result?.value) || {};
  return {
    jobs: rowsFrom(value(jobs), 'jobs'),
    clients: rowsFrom(value(clients), 'clients'),
    workers: rowsFrom(value(workers), 'team'),
    quotes: rowsFrom(value(quotes), 'quotes'),
    invoices: rowsFrom(value(invoices), 'invoices'),
    messages: rowsFrom(value(messages), 'messages'),
    command: rowsFrom(value(command), 'actions'),
    xero: value(xero),
    loadedAt: new Date(),
  };
}

function title(row, fallback) {
  return pick(row, 'title', 'job_title', 'job_name', 'name', 'client_name', 'customer_name', 'subject', 'invoice_number', 'quote_title', 'number') || fallback;
}

function status(row) {
  return pick(row, 'status', 'state', 'job_status', 'clock_status', 'sync', 'xero_sync_status') || 'Ready';
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{grid-column:1/-1;margin:0 0 18px;padding:0;color:#111827;font-family:inherit}
    #${ROOT_ID} *{box-sizing:border-box}
    .clcShell{position:relative;overflow:hidden;border:1px solid rgba(15,23,42,.1);border-radius:30px;background:linear-gradient(135deg,#fff 0%,#fff7ed 42%,#f8fafc 100%);box-shadow:0 24px 70px rgba(15,23,42,.1)}
    .clcShell:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 86% 12%,rgba(249,115,22,.18),transparent 28%),linear-gradient(90deg,rgba(15,23,42,.06) 1px,transparent 1px);background-size:auto,42px 42px;pointer-events:none}
    .clcInner{position:relative;display:grid;gap:16px;padding:22px}
    .clcTop{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start}
    .clcEyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.12em;color:#ea580c}
    .clcEyebrow:before{content:"";width:10px;height:10px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 5px rgba(34,197,94,.14)}
    .clcTop h2{margin:8px 0 6px;font-size:clamp(26px,3vw,42px);line-height:1;color:#0f172a;letter-spacing:-.045em}
    .clcTop p{margin:0;max-width:760px;color:#475569;font-size:15px;font-weight:750;line-height:1.5}
    .clcRefresh{display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
    .clcRefresh small{display:block;width:100%;text-align:right;color:#64748b;font-weight:800}
    .clcButton,.clcAction{border:1px solid rgba(15,23,42,.12);background:#fff;color:#111827;border-radius:16px;padding:11px 14px;font-weight:950;cursor:pointer;box-shadow:0 10px 22px rgba(15,23,42,.07)}
    .clcButton.primary,.clcAction.primary{background:linear-gradient(135deg,#f97316,#111827);border-color:transparent;color:#fff}
    .clcScore{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:10px}
    .clcScore span{min-height:96px;padding:14px;border:1px solid rgba(15,23,42,.1);border-radius:22px;background:rgba(255,255,255,.82);box-shadow:0 12px 28px rgba(15,23,42,.06)}
    .clcScore b{display:block;color:#0f172a;font-size:26px;line-height:1;font-weight:1000;letter-spacing:-.04em}
    .clcScore small{display:block;margin-top:8px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:950}
    .clcScore em{display:block;margin-top:8px;color:#334155;font-style:normal;font-size:12px;font-weight:800}
    .clcActions{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:10px}
    .clcAction{min-height:74px;text-align:left;display:grid;align-content:center;gap:4px}
    .clcAction small{color:#64748b;font-weight:800}
    .clcGrid{display:grid;grid-template-columns:1.25fr .9fr .9fr;gap:12px;align-items:start}
    .clcPanel{border:1px solid rgba(15,23,42,.1);border-radius:24px;background:rgba(255,255,255,.86);box-shadow:0 14px 32px rgba(15,23,42,.06);overflow:hidden}
    .clcPanel header{display:flex;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(15,23,42,.08)}
    .clcPanel h3{margin:0;color:#0f172a;font-size:16px;letter-spacing:-.02em}
    .clcPanel header small{color:#ea580c;font-weight:950;text-transform:uppercase;letter-spacing:.08em}
    .clcList{display:grid;gap:8px;padding:12px}
    .clcRow{width:100%;display:grid;grid-template-columns:1fr auto;gap:10px;text-align:left;border:1px solid rgba(15,23,42,.08);border-radius:18px;background:#fff;padding:12px;cursor:pointer}
    .clcRow b{display:block;color:#111827;font-size:14px;line-height:1.25}.clcRow small{display:block;margin-top:4px;color:#64748b;font-weight:750}.clcRow em{align-self:center;font-style:normal;font-size:11px;border-radius:999px;background:#fff7ed;color:#c2410c;padding:6px 9px;font-weight:950;white-space:nowrap}
    .clcEmpty{padding:18px;color:#64748b;font-weight:800}.clcEmpty b{display:block;color:#111827;margin-bottom:4px}
    .clcLoading{padding:18px;border-radius:22px;background:#fff;color:#334155;font-weight:950}
    @media(max-width:1100px){.clcScore,.clcActions{grid-template-columns:repeat(3,minmax(0,1fr))}.clcGrid{grid-template-columns:1fr}}
    @media(max-width:680px){.clcTop{grid-template-columns:1fr}.clcRefresh{justify-content:flex-start}.clcRefresh small{text-align:left}.clcScore,.clcActions{grid-template-columns:1fr 1fr}.clcInner{padding:16px}.clcScore span{min-height:82px}.clcAction{min-height:64px}}
  `;
  document.head.appendChild(style);
}

function routeTo(page, actionText = '') {
  location.hash = `#${page}`;
  setTimeout(() => {
    if (!actionText) return;
    const wanted = keyOf(actionText);
    const button = [...document.querySelectorAll('button')].find((item) => keyOf(item.textContent).includes(wanted));
    button?.click();
  }, 520);
}

function rowHtml(row, fallback, route, tag = '') {
  const label = title(row, fallback);
  const meta = [pick(row, 'client_name', 'customer_name', 'client', 'worker_name', 'assigned_worker_name'), status(row)].filter(Boolean).join(' · ') || 'Open record';
  return `<button type="button" class="clcRow" data-cockpit-route="${route}"><span><b>${escapeHtml(label)}</b><small>${escapeHtml(meta)}</small></span><em>${escapeHtml(tag || 'Open')}</em></button>`;
}

function escapeHtml(value) {
  return clean(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function panel(titleText, kicker, rowsHtml, emptyTitle, emptyText = 'Live records will show here.') {
  return `<section class="clcPanel"><header><h3>${escapeHtml(titleText)}</h3><small>${escapeHtml(kicker)}</small></header><div class="clcList">${rowsHtml || `<div class="clcEmpty"><b>${escapeHtml(emptyTitle)}</b><span>${escapeHtml(emptyText)}</span></div>`}</div></section>`;
}

function renderLoading(root) {
  root.innerHTML = '<div class="clcShell"><div class="clcInner"><div class="clcLoading">Loading the owner cockpit from live Churvox records…</div></div></div>';
}

function render(root, data) {
  const invoiceValue = data.invoices.reduce((sum, invoice) => sum + num(invoice, 'amount', 'total', 'subtotal'), 0);
  const overdue = data.invoices.filter((invoice) => /overdue/i.test(status(invoice))).length;
  const activeWorkers = data.workers.filter((worker) => !/inactive|disabled|not invited|not clocked/i.test(`${status(worker)} ${pick(worker, 'app_status', 'invite_status')}`)).length;
  const issueJobs = data.jobs.filter((job) => /needs|issue|hold|check|late|overdue/i.test(`${status(job)} ${pick(job, 'issue', 'problem', 'needs_attention')}`));
  const urgentMessages = data.messages.filter((message) => /urgent|high|important/i.test(`${pick(message, 'priority')} ${pick(message, 'subject', 'title')} ${pick(message, 'message', 'body')}`));
  const needsAttention = data.command.length + issueJobs.length + overdue + urgentMessages.length;
  const xeroConnected = Boolean(data.xero?.connected || data.xero?.xero_connected);

  const runSheet = data.jobs.slice(0, 5).map((job) => rowHtml(job, 'Job', 'jobs', pick(job, 'scheduled_time', 'time') || money(num(job, 'price', 'amount', 'total')))).join('');
  const attentionRows = [
    ...data.command.slice(0, 3).map((item) => rowHtml(item, 'Command check', 'command', 'Decision')),
    ...issueJobs.slice(0, 2).map((job) => rowHtml(job, 'Needs check', 'jobs', 'Check')),
    ...urgentMessages.slice(0, 2).map((message) => rowHtml(message, 'Message', 'messages', 'Reply')),
  ].join('');
  const moneyRows = data.invoices.slice(0, 5).map((invoice) => rowHtml(invoice, 'Invoice', 'invoices', money(num(invoice, 'amount', 'total')))).join('');

  root.innerHTML = `
    <div class="clcShell">
      <div class="clcInner">
        <div class="clcTop">
          <div>
            <span class="clcEyebrow">Owner cockpit live</span>
            <h2>Light control centre</h2>
            <p>One practical cockpit for the owner: today’s work, people, money, messages and approvals in one bright working view. No dark wall, no fake widgets, no dead controls.</p>
          </div>
          <div class="clcRefresh">
            <small>Updated ${data.loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            <button type="button" class="clcButton" data-cockpit-refresh="1">Refresh</button>
            <button type="button" class="clcButton primary" data-cockpit-route="command">Open Command</button>
          </div>
        </div>
        <div class="clcScore" aria-label="Owner cockpit live metrics">
          <span><b>${data.jobs.length}</b><small>Jobs loaded</small><em>Run sheet ready</em></span>
          <span><b>${activeWorkers}/${data.workers.length}</b><small>Workers active</small><em>Field view</em></span>
          <span><b>${needsAttention}</b><small>Needs attention</small><em>Owner checks</em></span>
          <span><b>${money(invoiceValue)}</b><small>Invoice value</small><em>Drafts and ledger</em></span>
          <span><b>${data.clients.length}</b><small>Clients</small><em>Service memory</em></span>
          <span><b>${xeroConnected ? 'On' : 'Off'}</b><small>Xero</small><em>${escapeHtml(pick(data.xero, 'tenant_name', 'tenantName', 'organisation_name') || 'Draft sync only')}</em></span>
        </div>
        <div class="clcActions" aria-label="Owner cockpit actions">
          <button type="button" class="clcAction primary" data-cockpit-route="jobs" data-cockpit-open="Add job"><b>Add job</b><small>Create work now</small></button>
          <button type="button" class="clcAction" data-cockpit-route="clients" data-cockpit-open="Add client"><b>Add client</b><small>Save customer/site</small></button>
          <button type="button" class="clcAction" data-cockpit-route="workers" data-cockpit-open="Add worker"><b>Add worker</b><small>Invite field user</small></button>
          <button type="button" class="clcAction" data-cockpit-route="quotes" data-cockpit-open="New quote"><b>New quote</b><small>Build price</small></button>
          <button type="button" class="clcAction" data-cockpit-route="invoices" data-cockpit-open="New invoice draft"><b>New invoice</b><small>Draft only</small></button>
          <button type="button" class="clcAction" data-cockpit-route="messages" data-cockpit-open="New message note"><b>Message note</b><small>Keep context</small></button>
        </div>
        <div class="clcGrid">
          ${panel('Today runway', 'work', runSheet, 'No jobs loaded', 'Add a job or refresh once records are available.')}
          ${panel('Owner attention', 'control', attentionRows, 'No owner checks', 'Command, urgent messages and job issues will surface here.')}
          ${panel('Money control', 'ledger', moneyRows, 'No invoices loaded', 'Draft, due and overdue invoices will show here.')}
        </div>
      </div>
    </div>`;
}

async function ensureCockpit() {
  installStyles();
  const host = workspace();
  if (!isOwnerToday() || !host) {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('section');
    root.id = ROOT_ID;
    const hero = host.querySelector('.cvxHero');
    host.insertBefore(root, hero || host.firstChild);
    root.addEventListener('click', (event) => {
      const refresh = event.target.closest('[data-cockpit-refresh]');
      if (refresh) { ensureCockpit(); return; }
      const route = event.target.closest('[data-cockpit-route]');
      if (route) routeTo(route.getAttribute('data-cockpit-route'), route.getAttribute('data-cockpit-open') || '');
    });
  }
  renderLoading(root);
  try {
    render(root, await loadCockpitData());
  } catch (error) {
    root.innerHTML = `<div class="clcShell"><div class="clcInner"><div class="clcLoading">Cockpit could not load yet. Use the page controls below, then refresh.</div></div></div>`;
  }
}

function scheduleCockpit() {
  [0, 160, 500, 1200, 2400].forEach((delay) => setTimeout(ensureCockpit, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  scheduleCockpit();
  window.addEventListener('hashchange', scheduleCockpit);
  window.addEventListener('popstate', scheduleCockpit);
  window.addEventListener('churvox-owner-app-ready', scheduleCockpit);
  window.addEventListener('churvox:data-refresh', scheduleCockpit);
}
