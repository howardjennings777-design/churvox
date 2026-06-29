// CHURVOX_OPTION_F_OLD_BACKEND_BRIDGE_RUNTIME_20260629
// Uses the recovered old backend intelligence routes without making a new noisy AI page.
// Today gets the brief. Command gets the approval queue. Plans already reads usage.

import API_BASE from '../lib/apiBase';

const STORE_KEY = 'churvox_old_backend_bridge_v1';
const INBOX_KEY = 'churvox:fresh-command-inbox:v1';
const OPS_KEY = 'churvox_option_f_operations_v1';
const PANEL_ID = 'option-f-old-backend-bridge-panel';
const STYLE_ID = 'option-f-old-backend-bridge-style';
let loading = false;
let lastLoaded = 0;
let queued = false;

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function apiUrl(path) {
  return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`;
}

function token() {
  try {
    return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || '';
  } catch (_) {
    return '';
  }
}

function headers() {
  const auth = token();
  return auth ? { Authorization: `Bearer ${auth}` } : {};
}

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '');
    return parsed ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function getPage() {
  const hash = lower((window.location.hash || '').replace('#', ''));
  if (hash) return hash;
  const path = lower(window.location.pathname || '');
  if (path.endsWith('/plans')) return 'plans';
  if (path.startsWith('/worker')) return 'worker';
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return lower(active?.textContent || 'today') || 'today';
}

function inOwnerApp() {
  return Boolean(document.querySelector('.churvoxOptionC .workspace .cocPage')) && !window.location.pathname.startsWith('/worker');
}

async function getJson(path) {
  const response = await fetch(apiUrl(path), { credentials: 'include', headers: headers() });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body?.data?.data || body?.data || body;
}

async function postJson(path, payload = {}) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers() },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body?.data?.data || body?.data || body;
}

function normalizeActions(snapshot) {
  const raw = snapshot?.actions || snapshot?.items || snapshot?.command_items || [];
  return Array.isArray(raw) ? raw.filter(Boolean) : [];
}

function currentData() {
  return readJson(STORE_KEY, {});
}

function mergeCommandInbox(actions) {
  if (!Array.isArray(actions) || !actions.length) return;
  const normalized = actions.map((item) => ({
    id: item.id || `${item.source || 'backend'}-${item.source_id || item.title || Date.now()}`,
    source: item.source || 'old-backend-bridge',
    category: item.category || 'Command',
    action: item.action || 'Review',
    title: item.title || 'Command item',
    summary: item.summary || item.found || 'Prepared by Churvox for owner review.',
    found: item.found || item.summary || '',
    prepared: item.prepared || 'Prepared for Command approval.',
    why: item.why || 'Owner approval keeps the business in control.',
    priority: item.priority || 'medium',
    details: item.details || {},
    created_at: item.created_at || new Date().toISOString(),
    backend_bridge: true,
  }));

  const inbox = readJson(INBOX_KEY, []);
  const list = Array.isArray(inbox) ? inbox : [];
  const byId = new Map(list.map((item) => [String(item.id || item.title), item]));
  normalized.forEach((item) => byId.set(String(item.id || item.title), { ...byId.get(String(item.id || item.title)), ...item }));
  writeJson(INBOX_KEY, Array.from(byId.values()).slice(0, 80));

  const ops = readJson(OPS_KEY, {});
  const queue = Array.isArray(ops.commandQueue) ? ops.commandQueue : [];
  const queueById = new Map(queue.map((item) => [String(item.id || item.title), item]));
  normalized.forEach((item) => queueById.set(String(item.id || item.title), { ...queueById.get(String(item.id || item.title)), ...item }));
  writeJson(OPS_KEY, { ...ops, commandQueue: Array.from(queueById.values()).slice(0, 80), updatedAt: new Date().toISOString() });

  try {
    window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated'));
  } catch (_) {}
}

async function loadBridge(force = false) {
  if (!token()) return;
  if (loading) return;
  if (!force && Date.now() - lastLoaded < 20000) return;
  loading = true;
  try {
    const [snapshot, setup, usage, billing] = await Promise.allSettled([
      getJson('/ai-operator/command-snapshot'),
      getJson('/ai-operator/setup-status'),
      getJson('/plan/usage'),
      getJson('/billing/status'),
    ]);
    const data = {
      at: new Date().toISOString(),
      snapshot: snapshot.status === 'fulfilled' ? snapshot.value : null,
      setup: setup.status === 'fulfilled' ? setup.value : null,
      usage: usage.status === 'fulfilled' ? usage.value : null,
      billing: billing.status === 'fulfilled' ? billing.value : null,
      errors: [snapshot, setup, usage, billing].filter((item) => item.status === 'rejected').map((item) => item.reason?.message || 'Backend bridge error'),
    };
    writeJson(STORE_KEY, data);
    mergeCommandInbox(normalizeActions(data.snapshot));
    lastLoaded = Date.now();
    renderPanel();
  } catch (_) {
    // Silent: this is a helpful bridge, not a blocker.
  } finally {
    loading = false;
  }
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID}{display:grid;gap:10px;grid-column:1/-1;border:1px solid rgba(16,21,19,.09);border-radius:18px;padding:14px;background:#fff;box-shadow:0 14px 34px rgba(16,21,19,.055);color:#111815}
    #${PANEL_ID} .obbTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
    #${PANEL_ID} h3{margin:0;font-size:18px;line-height:1;color:#111815}
    #${PANEL_ID} p{margin:4px 0 0;color:#52605a;font-size:12px;font-weight:850;line-height:1.35}
    #${PANEL_ID} .obbPills{display:flex;flex-wrap:wrap;gap:6px}
    #${PANEL_ID} .obbPills span{border-radius:999px;padding:6px 9px;background:#f8faf9;color:#111815;font-size:11px;font-weight:950;border:1px solid rgba(16,21,19,.07)}
    #${PANEL_ID} .obbList{display:grid;gap:7px}
    #${PANEL_ID} .obbItem{display:grid;gap:6px;padding:10px;border-radius:14px;background:#f8faf9;border:1px solid rgba(16,21,19,.07)}
    #${PANEL_ID} .obbItem strong{font-size:13px;color:#111815}
    #${PANEL_ID} .obbItem small{font-size:12px;color:#52605a;font-weight:850;line-height:1.35}
    #${PANEL_ID} .obbActions{display:flex;gap:6px;flex-wrap:wrap}
    #${PANEL_ID} button{border:0;border-radius:999px;min-height:34px;padding:8px 11px;background:#111815;color:#fff;font-size:11px;font-weight:950;cursor:pointer}
    #${PANEL_ID} button.primary{background:#ea580c;color:#111815}
    #${PANEL_ID} button.quiet{background:#eef2ed;color:#111815}
    @media(max-width:680px){#${PANEL_ID}{padding:12px;border-radius:16px}#${PANEL_ID} .obbTop{display:grid}}
  `;
  document.head.appendChild(style);
}

function root() {
  return document.querySelector('.churvoxOptionC .workspace .cocPage');
}

function renderPanel() {
  if (!inOwnerApp()) return;
  const page = getPage();
  const shouldShow = ['today', 'smart hub', 'command', 'plans'].includes(page);
  let node = document.getElementById(PANEL_ID);
  if (!shouldShow) {
    node?.remove();
    return;
  }
  const data = currentData();
  const snapshot = data.snapshot || {};
  const usage = data.usage || {};
  const setup = data.setup || {};
  const billing = data.billing || {};
  const actions = normalizeActions(snapshot);
  const counts = snapshot.counts || {};
  const appRoot = root();
  if (!appRoot) return;
  ensureStyle();

  if (!node) {
    node = document.createElement('section');
    node.id = PANEL_ID;
    const firstPanel = appRoot.querySelector('.cocPanel, .optionFControlDepth, section');
    if (firstPanel) firstPanel.insertAdjacentElement('beforebegin', node);
    else appRoot.prepend(node);
  }

  const planName = billing.plan_name || usage.plan_name || usage.plan || 'Plan';
  const status = setup.operator_mode || snapshot.operator_mode || 'approval_first';
  const headline = page === 'plans' ? 'Backend billing and usage live' : page === 'command' ? 'Backend Command brain' : 'Today’s backend brief';
  const summary = snapshot.briefing?.summary || 'Churvox is checking jobs, invoices, quotes, worker proof, requests and timesheets.';
  const topItems = actions.slice(0, page === 'command' ? 6 : 3);

  node.innerHTML = `
    <div class="obbTop">
      <div><h3>${esc(headline)}</h3><p>${esc(summary)}</p></div>
      <div class="obbPills">
        <span>${esc(planName)}</span>
        <span>${esc(status)}</span>
        <span>${Number(counts.total || actions.length || 0)} item${Number(counts.total || actions.length || 0) === 1 ? '' : 's'}</span>
      </div>
    </div>
    ${topItems.length ? `<div class="obbList">${topItems.map((item) => `
      <article class="obbItem" data-obb-action-id="${esc(item.id)}">
        <strong>${esc(item.title || 'Command item')}</strong>
        <small>${esc(item.summary || item.found || 'Prepared for owner review.')}</small>
        ${page === 'command' ? `<div class="obbActions"><button class="primary" data-obb-decision="approve">Approve record</button><button class="quiet" data-obb-decision="park">Park</button><button data-obb-decision="reject">Reject</button></div>` : ''}
      </article>`).join('')}</div>` : `<p>No backend Command items waiting right now.</p>`}
    <div class="obbActions"><button type="button" class="quiet" data-obb-refresh>Refresh backend brain</button>${page !== 'command' ? '<button type="button" data-obb-open-command>Open Command</button>' : ''}</div>
  `;
}

async function decide(actionId, decision, button) {
  const old = button?.textContent || '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Saving...';
  }
  try {
    const pathDecision = decision === 'approve' ? 'approve' : decision;
    await postJson(`/ai-operator/actions/${encodeURIComponent(actionId)}/${pathDecision}`, { source: 'option_f_command_panel' });
    await loadBridge(true);
  } catch (error) {
    if (button) button.textContent = error?.message || 'Failed';
    window.setTimeout(() => {
      if (button) {
        button.disabled = false;
        button.textContent = old;
      }
    }, 1400);
  }
}

function handleClick(event) {
  const refresh = event.target.closest('[data-obb-refresh]');
  if (refresh) {
    event.preventDefault();
    loadBridge(true);
    return;
  }
  const openCommand = event.target.closest('[data-obb-open-command]');
  if (openCommand) {
    event.preventDefault();
    window.location.hash = '#command';
    schedule(true);
    return;
  }
  const decision = event.target.closest('[data-obb-decision]');
  if (decision) {
    const item = decision.closest('[data-obb-action-id]');
    const id = item?.getAttribute('data-obb-action-id') || '';
    if (!id) return;
    event.preventDefault();
    decide(id, decision.getAttribute('data-obb-decision') || 'park', decision);
    return;
  }
  if (event.target.closest('.churvoxOptionC .cocNav button')) {
    schedule(false);
  }
}

function schedule(force = false) {
  if (queued) return;
  queued = true;
  window.setTimeout(() => {
    queued = false;
    renderPanel();
    loadBridge(force);
  }, 120);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OPTION_F_OLD_BACKEND_BRIDGE__) {
  window.__CHURVOX_OPTION_F_OLD_BACKEND_BRIDGE__ = true;
  window.addEventListener('load', () => schedule(true));
  window.addEventListener('hashchange', () => schedule(true));
  window.addEventListener('popstate', () => schedule(true));
  window.addEventListener('churvox-auth-refresh', () => loadBridge(true));
  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', () => schedule(false), true);
}

export {};
