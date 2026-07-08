import API_BASE from '../lib/apiBase';
import './churvoxOwnerPocketCommandRuntime.css';

const FLAG = '__CHURVOX_OWNER_POCKET_COMMAND_RUNTIME__';
const ROOT_ID = 'cvxPocketOwner';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
const MOBILE_QUERY = '(max-width: 780px)';
const tabs = ['Today', 'Command', 'Jobs', 'Money', 'More'];
let state = { tab: 'Today', loading: true, data: emptyData(), error: '' };
let refreshTimer = null;

function emptyData() {
  return { jobs: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {}, payments: {} };
}

function isWorkerRoute() {
  return (window.location.pathname || '').startsWith('/worker');
}

function isOwnerRoute() {
  const path = window.location.pathname || '';
  if (path.startsWith('/worker') || path.startsWith('/admin')) return false;
  return path === '/dashboard' || path === '/plans' || path === '/guide' || path === '/setup' || path === '/setup-guide' || path.startsWith('/dashboard');
}

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return clean(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function rows(payload, key) {
  const data = payload?.data?.data || payload?.data || payload || {};
  if (Array.isArray(data)) return data;
  if (Array.isArray(data[key])) return data[key];
  for (const name of ['items', 'records', 'results', 'jobs', 'team', 'workers', 'quotes', 'invoices', 'messages', 'actions', 'notifications', 'data']) {
    if (Array.isArray(data[name])) return data[name];
  }
  return [];
}

function idOf(row) {
  const raw = row?.id || row?._id || row?.job_id || row?.quote_id || row?.invoice_id || row?.action_id || row?.source_id || '';
  if (typeof raw === 'object') return clean(raw.$oid || raw.oid || raw.id || raw._id || '');
  return clean(raw);
}

function pick(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && clean(value)) return clean(value);
  }
  return '';
}

function money(row) {
  const raw = row?.amount || row?.total || row?.price || row?.invoice_total || row?.quote_total || row?.payment_due || 0;
  const num = Number(String(raw || '').replace(/[^0-9.]/g, ''));
  if (!num) return '';
  return `$${num.toFixed(num % 1 ? 2 : 0)}`;
}

function done(job) {
  return /complete|done|finished|paid|cancelled|archived/i.test(pick(job, 'status', 'job_status', 'workflow_status'));
}

function title(row, fallback = 'Record') {
  return pick(row, 'title', 'job_title', 'job_name', 'name', 'summary', 'record_title', 'invoice_number', 'number', 'subject') || fallback;
}

async function get(path) {
  const res = await fetch(`${API_ROOT}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${path} failed`);
  return res.json().catch(() => ({}));
}

async function post(path, body) {
  const res = await fetch(`${API_ROOT}${path}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.detail || data.error || `${path} failed`);
  return data;
}

async function loadData() {
  if (!isOwnerRoute() || !isMobile() || isWorkerRoute()) { releasePocket(); return; }
  state = { ...state, loading: true, error: '' };
  render();
  const calls = await Promise.allSettled([
    get('/jobs'), get('/team'), get('/quotes'), get('/invoices'), get('/messages'), get('/ai/actions'), get('/xero/status'), get('/payments/on-site/status'),
  ]);
  state = {
    ...state,
    loading: false,
    data: {
      jobs: rows(calls[0].value, 'jobs'),
      workers: rows(calls[1].value, 'team'),
      quotes: rows(calls[2].value, 'quotes'),
      invoices: rows(calls[3].value, 'invoices'),
      messages: rows(calls[4].value, 'messages'),
      command: rows(calls[5].value, 'actions'),
      xero: calls[6].value?.data || calls[6].value || {},
      payments: calls[7].value?.data || calls[7].value || {},
    },
    error: calls.some((item) => item.status === 'fulfilled') ? '' : 'Could not load owner mobile data.',
  };
  render();
}

function shell(titleText, subtitle, body) {
  return `<main class="cvxPocket" aria-label="Churvox owner mobile">
    <header class="cvxPocketTop"><div class="cvxPocketBrand"><span class="cvxPocketMark">CV</span><div><b>Churvox</b><small>Pocket Command</small></div></div><span class="cvxPocketLive">Live</span></header>
    <section class="cvxPocketHero"><span>${state.tab}</span><h1>${escapeHtml(titleText)}</h1><p>${escapeHtml(subtitle)}</p></section>
    <section class="cvxPocketBody">${body}</section>
    <nav class="cvxPocketBottom" aria-label="Owner mobile navigation">${tabs.map((tab) => `<button type="button" data-pocket-tab="${tab}" class="${state.tab === tab ? 'active' : ''}">${tab}</button>`).join('')}</nav>
  </main>`;
}

function empty(label, detail) {
  return `<section class="cvxPocketEmpty"><span>•</span><div><b>${escapeHtml(label)}</b><p>${escapeHtml(detail)}</p></div></section>`;
}

function statsHtml() {
  const { jobs, workers, invoices, command } = state.data;
  const openJobs = jobs.filter((job) => !done(job));
  const activeWorkers = workers.filter((worker) => /active|clock|progress|on|working/i.test(pick(worker, 'status', 'clock_status', 'app_status'))).length;
  const moneyWaiting = invoices.filter((invoice) => !/paid|complete/i.test(pick(invoice, 'status'))).length;
  return `<section class="cvxPocketStats"><span><b>${openJobs.length}</b><small>open jobs</small></span><span><b>${command.length}</b><small>owner checks</small></span><span><b>${activeWorkers}</b><small>workers active</small></span><span><b>${moneyWaiting}</b><small>money waiting</small></span></section>`;
}

function rowHtml(row, kind, buttons = '') {
  const client = pick(row, 'client_name', 'customer_name', 'client', 'from', 'sender') || kind;
  const rowStatus = pick(row, 'status', 'state', 'job_status', 'workflow_status') || 'Ready';
  const amount = money(row) || pick(row, 'amount', 'total') || '—';
  return `<article class="cvxPocketRow" data-pocket-id="${escapeHtml(idOf(row))}"><div class="cvxPocketRowTop"><b>${escapeHtml(title(row, kind))}</b><em>${escapeHtml(rowStatus)}</em></div><p>${escapeHtml(client)}</p><div class="cvxPocketMini"><span><b>Value</b>${escapeHtml(amount)}</span><span><b>Next</b>${escapeHtml(kind)}</span></div>${buttons}</article>`;
}

function todayHtml() {
  const openJobs = state.data.jobs.filter((job) => !done(job));
  const urgent = [...state.data.command, ...state.data.messages].slice(0, 3);
  return shell('Today control', 'Only what needs you while you are on the move.', `${state.loading ? empty('Loading', 'Checking jobs, Command and money.') : ''}${statsHtml()}${openJobs[0] ? `<section class="cvxPocketList"><span>Next job</span>${rowHtml(openJobs[0], 'Job', `<div class="cvxPocketActions two"><button class="cvxPocketBtn" data-go-hash="jobs">Open jobs</button><button class="cvxPocketGhost" data-go-hash="workers">Workers</button></div>`)}</section>` : empty('No open jobs', 'Nothing urgent in the job list right now.')}${urgent.length ? `<section class="cvxPocketList"><span>Needs you</span>${urgent.map((item) => rowHtml(item, 'Review', `<div class="cvxPocketActions"><button class="cvxPocketBtn" data-pocket-tab="Command">Review in Command</button></div>`)).join('')}</section>` : ''}<section class="cvxPocketCard cvxPocketNotice"><span>Mobile rule</span><h2>Approve and check here. Build on desktop.</h2><p>Phone view is for control: today, approvals, worker issues and money waiting.</p></section>`);
}

function commandHtml() {
  const actions = state.data.command.slice(0, 12);
  const rowsHtml = actions.map((item) => rowHtml(item, 'Command', `<div class="cvxPocketActions three"><button class="cvxPocketBtn" data-approve-id="${escapeHtml(idOf(item))}">Approve</button><button class="cvxPocketGhost" data-park-id="${escapeHtml(idOf(item))}">Park</button><button class="cvxPocketGhost" data-go-hash="command">Edit</button></div>`)).join('');
  return shell('Command', 'Approve, park or open the desktop edit when detail is unclear.', `${state.loading ? empty('Loading Command', 'Checking owner slips.') : ''}${actions.length ? `<section class="cvxPocketList"><span>Owner checks</span>${rowsHtml}</section>` : empty('No Command slips', 'Nothing is waiting for owner approval right now.')}`);
}

function jobsHtml() {
  const jobs = state.data.jobs.filter((job) => !done(job)).slice(0, 14);
  return shell('Jobs', 'Quick read-only job control for phone. Full editing stays on desktop.', `${jobs.length ? `<section class="cvxPocketList"><span>Open jobs</span>${jobs.map((job) => rowHtml(job, 'Job', `<div class="cvxPocketActions two"><button class="cvxPocketBtn" data-go-hash="jobs">Open desktop page</button><button class="cvxPocketGhost" data-go-hash="messages">Message</button></div>`)).join('')}</section>` : empty('No open jobs', 'Jobs are clear or not loaded yet.')}`);
}

function moneyHtml() {
  const invoices = state.data.invoices.filter((row) => !/paid|complete/i.test(pick(row, 'status'))).slice(0, 8);
  const quotes = state.data.quotes.filter((row) => !/accepted|converted|declined/i.test(pick(row, 'status'))).slice(0, 5);
  const xeroReady = state.data.xero?.connected || state.data.xero?.xero_connected;
  const payReady = state.data.payments?.terminal_ready || state.data.payments?.setup_complete;
  return shell('Money', 'Quotes, invoice drafts and payment setup — only the bits that need review.', `<section class="cvxPocketStats"><span><b>${invoices.length}</b><small>invoice checks</small></span><span><b>${quotes.length}</b><small>quote checks</small></span><span><b>${xeroReady ? 'On' : 'Off'}</b><small>Xero</small></span><span><b>${payReady ? 'On' : 'Off'}</b><small>payments</small></span></section>${invoices.length ? `<section class="cvxPocketList"><span>Invoices</span>${invoices.map((item) => rowHtml(item, 'Invoice', `<div class="cvxPocketActions"><button class="cvxPocketBtn" data-go-hash="invoices">Review invoices</button></div>`)).join('')}</section>` : ''}${quotes.length ? `<section class="cvxPocketList"><span>Quotes</span>${quotes.map((item) => rowHtml(item, 'Quote', `<div class="cvxPocketActions"><button class="cvxPocketBtn" data-go-hash="quotes">Review quotes</button></div>`)).join('')}</section>` : ''}`);
}

function moreHtml() {
  const links = [['Clients', 'clients'], ['Workers', 'workers'], ['Messages', 'messages'], ['Team', 'team'], ['Xero', 'xero'], ['Settings', 'settings'], ['Plans', 'plans'], ['Help', 'support']];
  return shell('More', 'Less-used admin pages stay tucked away. Best managed on desktop.', `<section class="cvxPocketCard"><span>Desktop-first areas</span><h2>Open only when needed.</h2><p>These pages are available, but the phone stays simple so it does not become admin chaos.</p><div class="cvxPocketMoreGrid">${links.map(([label, hash]) => `<button type="button" data-go-hash="${hash}">${label}</button>`).join('')}</div></section>`);
}

function currentHtml() {
  if (state.tab === 'Command') return commandHtml();
  if (state.tab === 'Jobs') return jobsHtml();
  if (state.tab === 'Money') return moneyHtml();
  if (state.tab === 'More') return moreHtml();
  return todayHtml();
}

function mountRoot() {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

function releasePocket() {
  document.body?.classList.remove('cvxPocketOwnerReady');
  const root = document.getElementById(ROOT_ID);
  if (root) root.innerHTML = '';
}

function render() {
  const active = isOwnerRoute() && isMobile() && !isWorkerRoute();
  if (!active) { releasePocket(); return; }
  document.body.classList.add('cvxPocketOwnerReady');
  const root = mountRoot();
  root.innerHTML = currentHtml();
  root.querySelectorAll('[data-pocket-tab]').forEach((button) => button.addEventListener('click', () => { state = { ...state, tab: button.dataset.pocketTab || 'Today' }; render(); }));
  root.querySelectorAll('[data-go-hash]').forEach((button) => button.addEventListener('click', () => { window.location.assign(`/dashboard#${button.dataset.goHash}`); }));
  root.querySelectorAll('[data-approve-id]').forEach((button) => button.addEventListener('click', () => decide(button.dataset.approveId, 'approve')));
  root.querySelectorAll('[data-park-id]').forEach((button) => button.addEventListener('click', () => decide(button.dataset.parkId, 'park')));
}

async function decide(id, action) {
  const item = state.data.command.find((row) => idOf(row) === id) || {};
  try {
    await post('/command/execute-approved', { action_id: id, action, decision: action, item });
    state.data.command = state.data.command.filter((row) => idOf(row) !== id);
    render();
  } catch (error) {
    alert(error.message || 'Could not save Command decision.');
  }
}

function scheduleLoad() {
  render();
  if (!isOwnerRoute() || !isMobile() || isWorkerRoute()) { releasePocket(); return; }
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(loadData, 80);
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleLoad);
  else scheduleLoad();
  window.addEventListener('load', scheduleLoad);
  window.addEventListener('resize', scheduleLoad);
  window.addEventListener('orientationchange', scheduleLoad);
  window.addEventListener('popstate', scheduleLoad);
  window.addEventListener('hashchange', scheduleLoad);
  window.addEventListener('churvox:data-refresh', loadData);
  window.addEventListener('churvox-auth-refresh', loadData);
  window.addEventListener('churvox-worker-app-ready', releasePocket);
  window.setInterval(() => { if (isOwnerRoute() && isMobile() && !isWorkerRoute()) loadData(); else releasePocket(); }, 5 * 60 * 1000);
}

export {};
