import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_NAV_BADGES_RUNTIME__';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
const ZERO = { command: 0, jobs: 0, workers: 0, messages: 0, quotes: 0, invoices: 0 };
let lastRun = 0;
let cached = { owner: { ...ZERO }, worker: { jobs: 0, messages: 0 } };

function path() {
  return window.location.pathname || '';
}

function isOwnerApp() {
  const current = path();
  return current === '/dashboard' || current === '/plans' || current === '/guide' || current === '/setup' || current === '/setup-guide' || current.startsWith('/dashboard');
}

function isWorkerApp() {
  return /^\/worker(?:\/|$)/i.test(path());
}

function token() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function key(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function rows(payload, preferred) {
  const data = payload?.data?.data ?? payload?.data ?? payload ?? {};
  if (Array.isArray(data)) return data;
  if (preferred && Array.isArray(data?.[preferred])) return data[preferred];
  for (const name of ['items', 'records', 'results', 'data', 'jobs', 'workers', 'team', 'quotes', 'invoices', 'messages', 'actions', 'notifications']) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function status(row) {
  return key(row?.status || row?.job_status || row?.workflow_status || row?.state || row?.priority || row?.app_status || row?.clock_status || '');
}

function isDone(row) {
  return /complete|completed|done|finished|paid|converted|cancelled|canceled|archived|declined/.test(status(row));
}

function hasMessageContent(row) {
  return Boolean(clean(row?.message || row?.body || row?.detail || row?.text || row?.subject || row?.title || row?.draft || row?.reply));
}

function isCommandNotification(row) {
  const type = key(row?.type || row?.kind || row?.event_type || row?.source || row?.channel || row?.category || '');
  return /approval|command|invoice|quote|job|payment|system|notification|ai|action/.test(type) && !/message|reply|sms|email|chat/.test(type);
}

function unread(row) {
  if (!hasMessageContent(row) || isCommandNotification(row)) return false;
  if (row?.read === true || row?.is_read === true || row?.seen === true || row?.opened === true || row?.acknowledged === true) return false;
  if (row?.unread === true || row?.is_unread === true || row?.read === false || row?.is_read === false || row?.seen === false) return true;
  const s = status(row);
  return /unread|newmessage|newreply|replyneeded|needsreply|messagewaiting/.test(s);
}

function isOfficeToWorker(row) {
  const direction = key(row?.direction || row?.from_role || row?.source_role || '');
  if (/workertooffice|worker/.test(direction) && !/office|owner|admin/.test(direction)) return false;
  if (/officetoworker|ownertoworker|admintoworker|office|owner|admin/.test(direction)) return true;
  const from = key(row?.from || row?.sender || row?.source || '');
  return /office|owner|admin|command/.test(from);
}

async function fetchJson(endpoint, timeout = 4500) {
  const headers = {};
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), timeout) : null;
  try {
    const res = await fetch(`${API_ROOT}${endpoint}`, { credentials: 'include', headers, signal: controller?.signal });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

function cap(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n > 99 ? '99+' : String(n);
}

function upsertBadge(node, value) {
  if (!node) return;
  const label = cap(value);
  let badge = node.querySelector(':scope > .cvxNavBadge, :scope > .cvxWorkerNavBadge');
  if (!label) {
    badge?.remove();
    node.removeAttribute('data-cvx-has-badge');
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = node.matches('a') ? 'cvxWorkerNavBadge' : 'cvxNavBadge';
    node.appendChild(badge);
  }
  badge.textContent = label;
  node.setAttribute('data-cvx-has-badge', 'true');
}

function ownerButtonId(button) {
  const label = key(button.querySelector('b')?.textContent || button.textContent);
  const map = { command: 'command', jobs: 'jobs', workers: 'workers', messages: 'messages', quotes: 'quotes', invoices: 'invoices' };
  return map[label] || '';
}

function workerLinkId(link) {
  const label = key(link.textContent);
  const map = { jobs: 'jobs', messages: 'messages' };
  return map[label] || '';
}

function paintOwner(counts = cached.owner) {
  document.querySelectorAll('.cvxProduct .cvxNav button').forEach((button) => {
    const id = ownerButtonId(button);
    if (!id) return;
    upsertBadge(button, counts[id] || 0);
  });
}

function paintWorker(counts = cached.worker) {
  document.querySelectorAll('.simpleWorkerApp .swNav a').forEach((link) => {
    const id = workerLinkId(link);
    if (!id) return;
    upsertBadge(link, counts[id] || 0);
  });
}

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
    command: command.filter((row) => !isDone(row)).length,
    jobs: jobs.filter((row) => !isDone(row) && (/new|assigned|late|overdue|issue|problem|check|missing|unassigned|blocked/.test(status(row)) || !clean(row?.assigned_worker_name || row?.worker_name || row?.worker))).length,
    workers: workers.filter((row) => /late|issue|problem|help|offline|blocked|noresponse|noupdate|notinvited/.test(status(row) + key(row?.app_status) + key(row?.messages))).length,
    messages: messages.filter(unread).length,
    quotes: quotes.filter((row) => /draft|ready|sent|viewed|follow|check|waiting|pending/.test(status(row)) && !isDone(row)).length,
    invoices: invoices.filter((row) => /draft|due|overdue|unpaid|waiting|check|pending/.test(status(row)) && !isDone(row)).length,
  };
}

async function workerCounts() {
  const [jobsRaw, messagesRaw] = await Promise.allSettled([
    fetchJson('/worker/jobs'), fetchJson('/worker/messages'),
  ]);
  const jobs = rows(jobsRaw.value, 'jobs');
  const messages = rows(messagesRaw.value, 'messages');
  return {
    jobs: jobs.filter((row) => !isDone(row)).length,
    messages: messages.filter((row) => isOfficeToWorker(row) && unread(row)).length,
  };
}

async function refreshBadges(force = false) {
  const now = Date.now();
  if (!force && now - lastRun < 9000) {
    if (isOwnerApp()) paintOwner();
    if (isWorkerApp()) paintWorker();
    return;
  }
  lastRun = now;

  if (isOwnerApp()) {
    paintOwner();
    cached.owner = await ownerCounts();
    paintOwner(cached.owner);
  }
  if (isWorkerApp()) {
    paintWorker();
    cached.worker = await workerCounts();
    paintWorker(cached.worker);
  }
}

function schedule(force = false) {
  if (!isOwnerApp() && !isWorkerApp()) return;
  [80, 450, 1200, 3200].forEach((delay, index) => window.setTimeout(() => refreshBadges(force && index === 0), delay));
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => schedule(true), { once: true });
  else schedule(true);
  window.addEventListener('load', () => schedule(true));
  window.addEventListener('hashchange', () => schedule(false));
  window.addEventListener('popstate', () => schedule(false));
  window.addEventListener('churvox:data-refresh', () => schedule(true));
  window.addEventListener('churvox-owner-app-ready', () => schedule(true));
  window.addEventListener('churvox-worker-app-ready', () => schedule(true));
}

export {};
