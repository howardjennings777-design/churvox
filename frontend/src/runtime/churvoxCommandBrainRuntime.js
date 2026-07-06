import './churvoxCommandBrainRuntime.css';

const API_BASE = (window.__CHURVOX_API_BASE__ || process.env.REACT_APP_API_BASE || '').replace(/\/$/, '');
const API = `${API_BASE}/api`;
const state = { loaded: false, data: null };

function tokenHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get(path) {
  try {
    const response = await fetch(`${API}${path}`, { credentials: 'include', headers: tokenHeaders() });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function rows(payload, keys = []) {
  const data = payload?.data?.data || payload?.data || payload;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, 'items', 'records', 'results', 'jobs', 'clients', 'workers', 'team', 'quotes', 'invoices', 'messages', 'actions', 'notifications', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const title = (item) => clean(item?.title || item?.name || item?.client_name || item?.customer_name || item?.job_title || item?.invoice_number || item?.number || item?.subject || item?.summary || 'Record');
const amount = (item) => Number(String(item?.amount || item?.total || item?.price || item?.invoice_total || 0).replace(/[^0-9.]/g, '')) || 0;
const status = (item) => clean(item?.status || item?.job_status || item?.state || '').toLowerCase();
const has = (item, ...keys) => keys.some((key) => clean(item?.[key]));

function pageKey() {
  const path = clean((window.location.pathname || '').split('/')[1] || 'dashboard').toLowerCase();
  const hash = clean((window.location.hash || '').replace(/^#/, '').split('?')[0]).toLowerCase();
  if (hash) return hash;
  if (path === 'dashboard') return 'today';
  return path || 'today';
}

function shouldShowBrain() {
  const path = window.location.pathname || '';
  return (path === '/dashboard' || path.startsWith('/dashboard')) && pageKey() === 'command';
}

function removePanel() {
  document.querySelector('[data-cvx-command-brain]')?.remove();
}

function push(list, tone, titleText, text, action = 'Open', target = 'command') {
  if (list.length >= 4) return;
  list.push({ tone, title: titleText, text, action, target });
}

function buildBrain(data) {
  const jobs = data.jobs || [];
  const clients = data.clients || [];
  const workers = data.workers || [];
  const quotes = data.quotes || [];
  const invoices = data.invoices || [];
  const command = data.command || [];
  const xero = data.xero || {};
  const payments = data.payments || {};

  const done = [];
  const waiting = [];
  const blocked = [];
  const missing = [];
  const next = [];

  push(done, 'ok', `${jobs.length} jobs loaded`, 'Run sheet is ready for owner and worker views.', 'Jobs', 'jobs');
  if (clients.length) push(done, 'ok', `${clients.length} client files`, 'Client memory is available for job forms and quotes.', 'Clients', 'clients');
  if (invoices.length) push(done, 'ok', `${invoices.length} invoice records`, 'Drafts and ledger records are visible.', 'Invoices', 'invoices');
  if (xero.connected || xero.xero_connected) push(done, 'ok', 'Accounting connected', `Tenant: ${clean(xero.tenant_name || xero.tenant || 'connected')}.`, 'Xero', 'xero');

  command.slice(0, 4).forEach((item) => push(waiting, 'blocked', title(item), clean(item.summary || item.detail || item.description || 'Owner approval needed.'), 'Open slip', 'command'));
  invoices.filter((item) => /draft|ready|due/.test(status(item))).slice(0, 2).forEach((item) => push(waiting, 'blocked', `Review invoice ${clean(item.invoice_number || item.number || '')}`, `${title(item)} · ${amount(item) ? `$${amount(item).toFixed(0)}` : 'no amount'}`, 'Invoices', 'invoices'));
  quotes.filter((item) => /ready|draft|sent/.test(status(item))).slice(0, 2).forEach((item) => push(waiting, 'blocked', 'Quote needs follow-up', `${title(item)} · ${clean(item.status || 'draft')}`, 'Quotes', 'quotes'));

  jobs.filter((job) => !amount(job)).slice(0, 2).forEach((job) => push(blocked, 'blocked', 'Cannot invoice yet', `${title(job)} has no price set.`, 'Fix price', 'jobs'));
  jobs.filter((job) => !has(job, 'assigned_worker_name', 'worker_name', 'worker')).slice(0, 2).forEach((job) => push(blocked, 'blocked', 'Cannot dispatch yet', `${title(job)} has no worker assigned.`, 'Assign worker', 'jobs'));
  clients.filter((client) => !has(client, 'email', 'phone', 'mobile')).slice(0, 2).forEach((client) => push(blocked, 'blocked', 'Cannot contact client', `${title(client)} has no email or phone saved.`, 'Fix client', 'clients'));
  if (!(xero.connected || xero.xero_connected)) push(blocked, 'blocked', 'Cannot sync accounting yet', 'Xero is not connected. Churvox will keep invoices as drafts until connected.', 'Connect', 'xero');
  if (!payments.terminal_ready) push(blocked, 'blocked', 'Cannot take card payments yet', payments.detail || payments.reason || 'Stripe Terminal is not confirmed ready for worker payments.', 'Plans / setup', 'plans');

  jobs.filter((job) => !has(job, 'address', 'site_address', 'service_address', 'location')).slice(0, 2).forEach((job) => push(missing, 'missing', 'Missing site address', `${title(job)} needs an address before routing.`, 'Open job', 'jobs'));
  jobs.filter((job) => !has(job, 'scheduled_date', 'date', 'start_date')).slice(0, 2).forEach((job) => push(missing, 'missing', 'Missing job date', `${title(job)} is not scheduled.`, 'Schedule', 'jobs'));
  workers.filter((worker) => !has(worker, 'email', 'phone', 'mobile')).slice(0, 2).forEach((worker) => push(missing, 'missing', 'Worker invite info missing', `${title(worker)} needs email or phone.`, 'Team', 'team'));

  if (blocked.length) push(next, 'missing', blocked[0].title, blocked[0].text, blocked[0].action, blocked[0].target);
  else if (waiting.length) push(next, 'blocked', waiting[0].title, waiting[0].text, 'Open Command', 'command');
  else if (!jobs.length) push(next, 'missing', 'Add first job', 'Create the first job with client, price, date and worker.', 'Add job', 'jobs');
  else push(next, 'ok', 'Keep running', 'No major blockers detected. Command is watching for the next owner decision.', 'Today', 'today');

  return { done, waiting, blocked, missing, next, counts: { done: done.length, waiting: waiting.length, blocked: blocked.length, missing: missing.length } };
}

async function loadData() {
  const [jobs, clients, workers, quotes, invoices, messages, command, xero, payments] = await Promise.all([
    get('/jobs'), get('/clients'), get('/team/workers'), get('/quotes'), get('/invoices'), get('/approved-notifications'), get('/ai/actions'), get('/xero/status'), get('/payments/on-site/status'),
  ]);
  return {
    jobs: rows(jobs, ['jobs']), clients: rows(clients, ['clients']), workers: rows(workers, ['workers', 'team']), quotes: rows(quotes, ['quotes']), invoices: rows(invoices, ['invoices']), messages: rows(messages, ['messages', 'notifications']), command: rows(command, ['actions']), xero: xero?.data || xero || {}, payments: payments?.data || payments || {},
  };
}

function go(target) {
  const page = target || 'command';
  const path = page === 'plans' ? '/plans' : '/dashboard';
  window.history.pushState({}, '', `${path}${page === 'today' || page === 'plans' ? '' : `#${page}`}`);
  window.dispatchEvent(new Event('hashchange'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function itemHtml(item) {
  return `<button type="button" class="cvxBrainItem ${item.tone || ''}" data-cvx-brain-target="${item.target || 'command'}"><b>${item.title}</b><span>${item.text}</span><em>${item.action || 'Open'}</em></button>`;
}

function lane(titleText, items) {
  return `<section class="cvxBrainLane"><h3>${titleText}</h3><div class="cvxBrainItems">${items.length ? items.map(itemHtml).join('') : '<p class="cvxBrainEmpty">Nothing here right now.</p>'}</div></section>`;
}

function render(brain) {
  if (!shouldShowBrain()) { removePanel(); return; }
  const root = document.querySelector('.cvxPage') || document.querySelector('.cvxWorkspace');
  if (!root) return;
  let panel = document.querySelector('[data-cvx-command-brain]');
  if (!panel) {
    panel = document.createElement('section');
    panel.dataset.cvxCommandBrain = 'true';
    panel.className = 'cvxCommandBrain';
    root.prepend(panel);
  }
  panel.innerHTML = `<header class="cvxBrainHead"><div><small>Approval desk</small><h2>Filled slips, owner decision, park unclear.</h2><p>Churvox prepares the admin. The owner approves, edits or parks anything risky, ready to send or missing information.</p></div><div class="cvxBrainScore"><span><b>${brain.counts.done}</b><small>handled</small></span><span><b>${brain.counts.waiting}</b><small>waiting</small></span><span><b>${brain.counts.blocked + brain.counts.missing}</b><small>blocked</small></span></div><button type="button" class="cvxBrainRefresh">Refresh</button></header><div class="cvxBrainGrid">${lane('Done', brain.done)}${lane('Waiting', brain.waiting)}${lane('Blocked', brain.blocked)}${lane('Missing', brain.missing)}${lane('Next move', brain.next)}</div>`;
  panel.querySelectorAll('[data-cvx-brain-target]').forEach((button) => button.addEventListener('click', () => go(button.dataset.cvxBrainTarget)));
  panel.querySelector('.cvxBrainRefresh')?.addEventListener('click', refresh);
}

async function refresh() {
  if (!shouldShowBrain()) { removePanel(); return; }
  state.data = await loadData();
  render(buildBrain(state.data));
}

function start() {
  if (state.loaded) return;
  state.loaded = true;
  setTimeout(refresh, 600);
  setTimeout(refresh, 1800);
  window.addEventListener('hashchange', () => setTimeout(refresh, 120));
  window.addEventListener('popstate', () => setTimeout(refresh, 120));
  window.addEventListener('churvox:data-refresh', () => setTimeout(refresh, 120));
  window.addEventListener('churvox-auth-refresh', () => setTimeout(refresh, 120));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
