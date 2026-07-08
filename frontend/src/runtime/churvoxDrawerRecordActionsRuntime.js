import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-drawer-record-actions-style';
const MARK = 'data-churvox-drawer-record-actions';
let busy = false;

const css = `
  .cvxDrawerExtraActions {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    align-items: center;
    justify-content: flex-start;
    margin: 10px 0 0;
    padding-top: 12px;
    border-top: 1px solid rgba(16, 21, 19, 0.08);
  }
  .cvxDrawerExtraActions button {
    border: 0;
    border-radius: 999px;
    padding: 10px 13px;
    color: #101513;
    background: rgba(16, 21, 19, 0.08);
    font-size: 12px;
    font-weight: 1000;
    cursor: pointer;
  }
  .cvxDrawerExtraActions button.cvxDeleteRecord {
    color: #fff;
    background: linear-gradient(135deg, #dc2626, #991b1b);
  }
  .cvxDrawerExtraActions button.cvxReplyRecord {
    color: #fff;
    background: linear-gradient(135deg, #101513, #303832);
  }
  .cvxDrawerExtraActions span {
    color: #5e6862;
    font-size: 12px;
    font-weight: 850;
  }
  .cvxDrawerReplyBox {
    display: grid;
    gap: 8px;
    width: 100%;
    margin-top: 8px;
    padding: 12px;
    border: 1px solid rgba(16, 21, 19, 0.09);
    border-radius: 18px;
    background: rgba(255,255,255,.72);
  }
  .cvxDrawerReplyBox textarea {
    width: 100%;
    min-height: 96px;
    resize: vertical;
    border: 1px solid rgba(16,21,19,.12);
    border-radius: 14px;
    padding: 11px;
    color: #101513;
    background: #fff;
    font-size: 14px;
    font-weight: 850;
  }
  .cvxDrawerReplyBox div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .cvxDrawerReplyBox button {
    color: #fff;
    background: #101513;
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
  } else if (style.textContent !== css) style.textContent = css;
}

function isOwnerApp() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '';
  return path === '/dashboard' || path.startsWith('/dashboard') || path === '/plans' || path === '/guide' || path === '/setup' || path === '/setup-guide';
}

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function key(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function apiRoot() { return `${String(API_BASE || '').replace(/\/$/, '')}/api`; }
function idOf(row = {}) {
  const raw = row.id || row._id || row.job_id || row.client_id || row.quote_id || row.invoice_id || row.user_id || row.message_id || row.notification_id || row.action_id || row.approval_id || row.source_id || row.ticket_id || '';
  if (raw && typeof raw === 'object') return clean(raw.$oid || raw.oid || raw.id || raw._id || '');
  return clean(raw);
}
function escapeHtml(value) { return String(value || '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char])); }

function reactFiber(node) {
  if (!node) return null;
  const keyName = Object.keys(node).find((name) => name.startsWith('__reactFiber$') || name.startsWith('__reactInternalInstance$'));
  return keyName ? node[keyName] : null;
}

function fiberBundle(drawer) {
  let fiber = reactFiber(drawer) || reactFiber(drawer?.parentElement);
  let guard = 0;
  while (fiber && guard < 60) {
    const props = fiber.memoizedProps || fiber.pendingProps || {};
    if (props.record && props.data) return props;
    fiber = fiber.return;
    guard += 1;
  }
  return null;
}

function typeFromDrawer(drawer, record = {}) {
  const raw = record.type || drawer.querySelector('small')?.textContent || '';
  const t = key(raw);
  if (t.includes('approval') || t.includes('command')) return 'approval';
  if (t.includes('client')) return 'client';
  if (t.includes('quote')) return 'quote';
  if (t.includes('invoice')) return 'invoice';
  if (t.includes('worker') || t.includes('staff') || t.includes('cleaner') || t.includes('technician')) return 'worker';
  if (t.includes('message') || t.includes('reply')) return 'message';
  if (t.includes('support') || t.includes('ticket')) return 'support_ticket';
  if (t.includes('job') || t.includes('appointment') || t.includes('visit')) return 'job';
  return record.type || 'record';
}

function deleteEndpoints(type, id) {
  const encoded = encodeURIComponent(id);
  if (type === 'job') return [`/jobs/${encoded}`];
  if (type === 'client') return [`/clients/${encoded}`];
  if (type === 'quote') return [`/quotes/${encoded}`];
  if (type === 'invoice') return [`/invoices/${encoded}`];
  if (type === 'worker') return [`/team/workers/${encoded}`, `/team/${encoded}`, `/workers/${encoded}`];
  if (type === 'message') return [`/messages/${encoded}`, `/approved-notifications/${encoded}`];
  if (type === 'approval') return [`/ai/actions/${encoded}`, `/command/approvals/${encoded}`];
  if (type === 'support_ticket') return [`/support/tickets/${encoded}`, `/admin/owner/support-tickets/${encoded}`];
  return [];
}

async function apiCall(method, endpoint, body = null) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  const auth = token();
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const response = await fetch(`${apiRoot()}${endpoint}`, {
    method,
    credentials: 'include',
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false) throw new Error(json?.detail || json?.message || json?.error || `${method} ${endpoint} failed`);
  return json;
}

async function firstGoodDelete(endpoints) {
  let last = '';
  for (const endpoint of endpoints) {
    try {
      const result = await apiCall('DELETE', endpoint);
      if (result?.success !== false) return result;
      last = result?.message || result?.error || last;
    } catch (error) {
      last = error?.message || last;
    }
  }
  throw new Error(last || 'Could not delete this record');
}

function closeDrawer(drawer, bundle) {
  try { bundle?.close?.(); return; } catch {}
  try { drawer.querySelector('.cv3Close')?.click(); } catch {}
}

function refreshPage(bundle) {
  try { bundle?.refresh?.(); } catch {}
  try { window.dispatchEvent(new Event('churvox:data-refresh')); } catch {}
  try { window.dispatchEvent(new Event('churvox-owner-app-ready')); } catch {}
}

function notify(bundle, title, text, tone = 'good') {
  try { bundle?.notify?.({ title, text, tone }); return; } catch {}
  console.log(`[Churvox] ${title}: ${text}`);
}

function showReplyBox(container, drawer, bundle, record, id) {
  let box = container.querySelector('.cvxDrawerReplyBox');
  if (box) { box.remove(); return; }
  const to = clean(record.from || record.sender || record.client || record.worker || 'recipient');
  box = document.createElement('div');
  box.className = 'cvxDrawerReplyBox';
  box.innerHTML = `<textarea placeholder="Reply to ${escapeHtml(to)} inside Churvox..."></textarea><div><button type="button" class="cvxSendReply">Send reply</button><span class="cvxReplyStatus">Saved to the message thread.</span></div>`;
  container.appendChild(box);
  const textarea = box.querySelector('textarea');
  const status = box.querySelector('.cvxReplyStatus');
  box.querySelector('.cvxSendReply')?.addEventListener('click', async () => {
    if (busy) return;
    const reply = clean(textarea.value);
    if (!reply) { status.textContent = 'Write a reply first.'; return; }
    busy = true;
    status.textContent = 'Sending reply...';
    try {
      await apiCall('POST', `/messages/${encodeURIComponent(id)}/reply`, { reply, subject: record.subject || record.title, to, channel: record.channel || 'Inside Churvox' });
      status.textContent = 'Reply saved inside Churvox.';
      textarea.value = '';
      refreshPage(bundle);
      notify(bundle, 'Reply saved', 'The message thread has been updated.', 'good');
    } catch (error) {
      status.textContent = error?.message || 'Could not send reply.';
      notify(bundle, 'Reply failed', status.textContent, 'bad');
    } finally {
      busy = false;
    }
  });
}

function inject(drawer) {
  if (!drawer || drawer.getAttribute(MARK) === 'true') return;
  const bundle = fiberBundle(drawer);
  const record = bundle?.record || {};
  const id = idOf(record);
  const type = typeFromDrawer(drawer, record);
  const isNew = Boolean(record.__new) || !id;
  const actions = drawer.querySelector('.cv3DrawerActions');
  if (!actions) return;
  drawer.setAttribute(MARK, 'true');
  const extra = document.createElement('div');
  extra.className = 'cvxDrawerExtraActions';
  const canDelete = !isNew && deleteEndpoints(type, id).length > 0;
  const canReply = !isNew && type === 'message';
  if (!canDelete && !canReply) return;
  if (canReply) {
    const reply = document.createElement('button');
    reply.type = 'button';
    reply.className = 'cvxReplyRecord';
    reply.textContent = 'Reply';
    reply.addEventListener('click', () => showReplyBox(extra, drawer, bundle, record, id));
    extra.appendChild(reply);
  }
  if (canDelete) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'cvxDeleteRecord';
    del.textContent = `Delete ${type.replace('_', ' ')}`;
    del.addEventListener('click', async () => {
      if (busy) return;
      const label = record.subject || record.title || record.name || record.number || type;
      if (!window.confirm(`Delete ${label}? This removes the record from Churvox.`)) return;
      busy = true;
      del.disabled = true;
      del.textContent = 'Deleting...';
      try {
        const result = await firstGoodDelete(deleteEndpoints(type, id));
        refreshPage(bundle);
        notify(bundle, 'Record deleted', result?.message || 'The record has been removed.', 'good');
        closeDrawer(drawer, bundle);
      } catch (error) {
        del.disabled = false;
        del.textContent = `Delete ${type.replace('_', ' ')}`;
        notify(bundle, 'Could not delete', error?.message || 'Please refresh and try again.', 'bad');
      } finally {
        busy = false;
      }
    });
    extra.appendChild(del);
  }
  const note = document.createElement('span');
  note.textContent = 'Deletes ask first. Replies stay inside Churvox.';
  extra.appendChild(note);
  actions.insertAdjacentElement('afterend', extra);
}

function run() {
  if (!isOwnerApp()) return;
  ensureStyle();
  document.querySelectorAll('.cv3Drawer').forEach(inject);
}

function schedule(delay = 80) { setTimeout(run, delay); }

if (typeof window !== 'undefined' && !window.__CHURVOX_DRAWER_RECORD_ACTIONS__) {
  window.__CHURVOX_DRAWER_RECORD_ACTIONS__ = true;
  [100, 400, 900, 1800].forEach(schedule);
  window.addEventListener('load', () => schedule(200));
  window.addEventListener('hashchange', () => schedule(200));
  window.addEventListener('popstate', () => schedule(200));
  window.addEventListener('churvox:data-refresh', () => schedule(220));
  document.addEventListener('click', () => schedule(120), true);
}

export {};
