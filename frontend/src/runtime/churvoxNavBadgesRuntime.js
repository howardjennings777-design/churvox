import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_NAV_BADGES_RUNTIME__';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
const ZERO = { command: 0, jobs: 0, workers: 0, messages: 0, quotes: 0, invoices: 0 };
let lastRun = 0;
let cached = { owner: { ...ZERO }, worker: { jobs: 0, messages: 0 } };

function path() { return window.location.pathname || ''; }
function isOwnerApp() { const current = path(); return current === '/dashboard' || current === '/plans' || current === '/guide' || current === '/setup' || current === '/setup-guide' || current.startsWith('/dashboard'); }
function isWorkerApp() { return /^\/worker(?:\/|$)/i.test(path()); }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function key(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }

function rows(payload, preferred) {
  const data = payload?.data?.data ?? payload?.data ?? payload ?? {};
  if (Array.isArray(data)) return data;
  if (preferred && Array.isArray(data?.[preferred])) return data[preferred];
  for (const name of ['items', 'records', 'results', 'data', 'jobs', 'workers', 'team', 'quotes', 'invoices', 'messages', 'actions']) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function status(row) { return key(row?.status || row?.job_status || row?.workflow_status || row?.state || row?.priority || row?.app_status || row?.clock_status || ''); }
function isClosed(row) { return /complete|completed|done|finished|paid|converted|cancelled|canceled|archived|declined|parked|closed|sent/.test(status(row)); }
function hasMessageContent(row) { return Boolean(clean(row?.message || row?.body || row?.detail || row?.text || row?.subject || row?.title || row?.draft || row?.reply)); }
function messageType(row) { return key(row?.type || row?.kind || row?.event_type || row?.channel || row?.category || row?.source || ''); }
function isRealMessage(row) {
  if (!hasMessageContent(row)) return false;
  const t = messageType(row);
  if (/approval|command|invoice|quote|jobstarted|jobstart|jobpaused|jobpause|jobresumed|jobresume|jobcomplete|jobcompleted|payment|system|notification|action|smart/.test(t) && !/message|reply|chat|sms|email/.test(t)) return false;
  return /message|reply|chat|sms|email/.test(t) || Boolean(row?.message_id || row?.thread_id || row?.conversation_id || row?.drafted_reply || row?.reply);
}
function explicitlyUnread(row) {
  if (!isRealMessage(row)) return false;
  if (row?.read === true || row?.is_read === true || row?.seen === true || row?.opened === true || row?.acknowledged === true) return false;
  if (row?.unread === true || row?.is_unread === true) return true;
  return /unread|newmessage|newreply|replyneeded|needsreply|messagewaiting/.test(status(row));
}
function isOfficeToWorker(row) {
  const direction = key(row?.direction || row?.from_role || row?.source_role || '');
  if (/workertooffice/.test(direction)) return false;
  if (/officetoworker|ownertoworker|admintoworker/.test(direction)) return true;
  const from = key(row?.from || row?.sender || row?.source || '');
  return /office|owner|admin|command/.test(from);
}
function realCommandWaiting(row) {
  if (row?.auto_generated === true || row?.fake === true) return false;
  const t = messageType(row);
  if (/smartaction/.test(t) || /^smart/.test(key(row?.id))) return false;
  const s = status(row);
  if (isClosed(row)) return false;
  return row?.requires_owner_approval === true || /waitingowner|waitingownerreview|pending|needsapproval|ownerreview/.test(s);
}
function jobNeedsAttention(row) {
  if (isClosed(row)) return false;
  const s = status(row);
  const assigned = clean(row?.assigned_worker_name || row?.worker_name || row?.worker || row?.assigned_to);
  return /late|overdue|issue|problem|blocked|needscheck|missing|failed|cannot/.test(s) || /unassigned|no worker|none/i.test(assigned);
}
function workerNeedsAttention(row) {
  const hay = status(row) + key(row?.app_status) + key(row?.message_status) + key(row?.messages) + key(row?.clock_status);
  return /late|issue|problem|help|offline|blocked|noresponse|noupdate|failed|cannot/.test(hay);
}
function quoteNeedsAttention(row) {
  if (isClosed(row)) return false;
  return /needscheck|needsapproval|ownerreview|overdue|followup|viewed|waitingcustomer|problem|blocked/.test(status(row));
}
function invoiceNeedsAttention(row) {
  if (isClosed(row)) return false;
  return /overdue|unpaid|failed|needscheck|needsapproval|ownerreview|paymentissue|blocked/.test(status(row));
}

async function fetchJson(endpoint, timeout = 3500) {
  const headers = {};
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), timeout) : null;
  try {
    const res = await fetch(`${API_ROOT}${endpoint}`, { credentials: 'include', headers, signal: controller?.signal });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch { return null; }
  finally { if (timer) window.clearTimeout(timer); }
}

function cap(value) { const n = Number(value || 0); if (!Number.isFinite(n) || n <= 0) return ''; return n > 99 ? '99+' : String(n); }
function upsertBadge(node, value) {
  if (!node) return;
  const label = cap(value);
  let badge = node.querySelector(':scope > .cvxNavBadge, :scope > .cvxWorkerNavBadge');
  if (!label) { badge?.remove(); node.removeAttribute('data-cvx-has-badge'); return; }
  if (!badge) { badge = document.createElement('span'); badge.className = node.matches('a') ? 'cvxWorkerNavBadge' : 'cvxNavBadge'; node.appendChild(badge); }
  badge.textContent = label;
  node.setAttribute('data-cvx-has-badge', 'true');
}
function ownerButtonId(button) { return ({ command: 'command', jobs: 'jobs', workers: 'workers', messages: 'messages', quotes: 'quotes', invoices: 'invoices' })[key(button.querySelector('b')?.textContent || button.textContent)] || ''; }
function workerLinkId(link) { return ({ jobs: 'jobs', messages: 'messages' })[key(link.textContent)] || ''; }
function paintOwner(counts = cached.owner) { document.querySelectorAll('.cvxProduct .cvxNav button').forEach((button) => { const id = ownerButtonId(button); if (id) upsertBadge(button, counts[id] || 0); }); }
function paintWorker(counts = cached.worker) { document.querySelectorAll('.simpleWorkerApp .swNav a').forEach((link) => { const id = workerLinkId(link); if (id) upsertBadge(link, counts[id] || 0); }); }
function clearAllBadges() { document.querySelectorAll('.cvxNavBadge,.cvxWorkerNavBadge').forEach((node) => node.remove()); document.querySelectorAll('[data-cvx-has-badge]').forEach((node) => node.removeAttribute('data-cvx-has-badge')); }

async function ownerCounts() {
  const [jobsRaw, workersRaw, quotesRaw, invoicesRaw, messagesRaw, commandRaw] = await Promise.allSettled([
    fetchJson('/jobs'), fetchJson('/team'), fetchJson('/quotes'), fetchJson('/invoices'), fetchJson('/messages'), fetchJson('/ai/actions'),
  ]);
  const jobs = rows(jobsRaw.value, 'jobs');
  const workers = rows(workersRaw.value, 'team');
  const quotes = rows(quotesRaw.value, 'quotes');
  const invoices = rows(invoicesRaw.value, 'invoices');
  const messages = rows(messagesRaw.value, 'messages');
  const command = rows(commandRaw.value, 'actions');
  return {
    command: command.filter(realCommandWaiting).length,
    jobs: jobs.filter(jobNeedsAttention).length,
    workers: workers.filter(workerNeedsAttention).length,
    messages: messages.filter(explicitlyUnread).length,
    quotes: quotes.filter(quoteNeedsAttention).length,
    invoices: invoices.filter(invoiceNeedsAttention).length,
  };
}

async function workerCounts() {
  const [jobsRaw, messagesRaw] = await Promise.allSettled([fetchJson('/worker/jobs'), fetchJson('/worker/messages')]);
  const jobs = rows(jobsRaw.value, 'jobs');
  const messages = rows(messagesRaw.value, 'messages');
  return {
    jobs: jobs.filter(jobNeedsAttention).length,
    messages: messages.filter((row) => isOfficeToWorker(row) && explicitlyUnread(row)).length,
  };
}

async function refreshBadges(force = false) {
  const now = Date.now();
  if (!force && now - lastRun < 12000) { if (isOwnerApp()) paintOwner(); if (isWorkerApp()) paintWorker(); return; }
  lastRun = now;
  if (isOwnerApp()) { cached.owner = await ownerCounts(); paintOwner(cached.owner); }
  if (isWorkerApp()) { cached.worker = await workerCounts(); paintWorker(cached.worker); }
}
function schedule(force = false) { if (!isOwnerApp() && !isWorkerApp()) return; clearAllBadges(); [120, 700, 1800].forEach((delay, index) => window.setTimeout(() => refreshBadges(force && index === 0), delay)); }

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => schedule(true), { once: true });
  else schedule(true);
  window.addEventListener('load', () => schedule(true));
  window.addEventListener('hashchange', () => schedule(true));
  window.addEventListener('popstate', () => schedule(true));
  window.addEventListener('churvox:data-refresh', () => schedule(true));
  window.addEventListener('churvox-owner-app-ready', () => schedule(true));
  window.addEventListener('churvox-worker-app-ready', () => schedule(true));
}

export {};
