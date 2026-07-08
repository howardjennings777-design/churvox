import './churvoxIndustryIsolationRuntime';
import './churvoxBusinessSystemSuiteRuntime';
import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_NAV_BADGES_TRUSTED_COUNTS__';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
const OWNER_KEYS = ['command', 'jobs', 'workers', 'messages', 'quotes', 'invoices'];
const WORKER_KEYS = ['jobs', 'messages'];
let lastFetch = 0;
let cached = { owner: {}, worker: {} };

function path() { return window.location.pathname || ''; }
function isOwnerApp() { const current = path(); return current === '/dashboard' || current.startsWith('/dashboard') || current === '/plans' || current === '/guide' || current === '/setup' || current === '/setup-guide'; }
function isWorkerApp() { return /^\/worker(?:\/|$)/i.test(path()); }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function key(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function label(value) { const n = Number(value || 0); if (!Number.isFinite(n) || n <= 0) return ''; return n > 99 ? '99+' : String(n); }

const OWNER_ALIASES = {
  command: ['command', 'approvals', 'approvaldesk'],
  jobs: ['jobs', 'job', 'appointments', 'appointment', 'visits', 'visit', 'projects', 'project', 'bookings', 'booking', 'sessions', 'session'],
  workers: ['workers', 'worker', 'staff', 'crew', 'technicians', 'technician', 'cleaners', 'cleaner', 'artists', 'artist', 'groomers', 'groomer', 'practitioners', 'practitioner', 'coaches', 'coach', 'team'],
  messages: ['messages', 'message', 'replies', 'reply', 'inbox'],
  quotes: ['quotes', 'quote', 'estimates', 'estimate', 'consults', 'consult', 'proposals', 'proposal', 'plans', 'plan'],
  invoices: ['invoices', 'invoice', 'payments', 'payment'],
};

function aliasId(value, aliases) {
  const target = key(value);
  for (const [id, words] of Object.entries(aliases)) {
    if (words.includes(target)) return id;
  }
  return '';
}

function clearAllBadges() {
  document.querySelectorAll('.cvxNavBadge,.cvxWorkerNavBadge').forEach((node) => node.remove());
  document.querySelectorAll('[data-cvx-has-badge]').forEach((node) => node.removeAttribute('data-cvx-has-badge'));
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

async function getCounts(force = false) {
  const now = Date.now();
  if (!force && now - lastFetch < 12000) return cached;
  lastFetch = now;
  if (isOwnerApp()) {
    const payload = await fetchJson('/nav/attention-counts');
    if (payload?.success && payload?.source === 'trusted_nav_attention_counts') cached.owner = payload.owner || payload.counts || {};
    else cached.owner = {};
  }
  if (isWorkerApp()) {
    const payload = await fetchJson('/worker/nav/attention-counts');
    if (payload?.success && payload?.source === 'trusted_nav_attention_counts') cached.worker = payload.worker || {};
    else cached.worker = {};
  }
  return cached;
}

function ownerButtonId(button) {
  const labelNode = button.querySelector('b') || button;
  const original = labelNode.dataset.cvxOriginalLabel || button.dataset.cvxNavKey || labelNode.textContent || button.textContent;
  return aliasId(original, OWNER_ALIASES);
}

function workerLinkId(link) {
  return aliasId(link.dataset.cvxOriginalLabel || link.textContent, { jobs: OWNER_ALIASES.jobs, messages: OWNER_ALIASES.messages });
}

function putBadge(target, value, className) {
  const text = label(value);
  target.querySelector(':scope > .cvxNavBadge, :scope > .cvxWorkerNavBadge')?.remove();
  if (!text) {
    target.closest('button,a')?.removeAttribute('data-cvx-has-badge');
    return;
  }
  const badge = document.createElement('span');
  badge.className = className;
  badge.textContent = text;
  target.appendChild(badge);
  target.closest('button,a')?.setAttribute('data-cvx-has-badge', 'true');
}

function paintOwner(counts = cached.owner) {
  document.querySelectorAll('.cvxProduct .cvxNav button').forEach((button) => {
    const id = ownerButtonId(button);
    if (!OWNER_KEYS.includes(id)) return;
    const labelNode = button.querySelector('b') || button;
    putBadge(labelNode, counts[id], 'cvxNavBadge');
  });
}

function paintWorker(counts = cached.worker) {
  document.querySelectorAll('.simpleWorkerApp .swNav a').forEach((link) => {
    const id = workerLinkId(link);
    if (!WORKER_KEYS.includes(id)) return;
    putBadge(link, counts[id], 'cvxWorkerNavBadge');
  });
}

async function refresh(force = false) {
  if (!isOwnerApp() && !isWorkerApp()) { clearAllBadges(); return; }
  clearAllBadges();
  const counts = await getCounts(force);
  if (isOwnerApp()) paintOwner(counts.owner);
  if (isWorkerApp()) paintWorker(counts.worker);
}

function schedule(force = false) {
  [100, 700, 1800].forEach((delay, index) => window.setTimeout(() => refresh(force && index === 0), delay));
}

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
  window.addEventListener('churvox:industry-mode-change', () => schedule(true));
}

export {};
