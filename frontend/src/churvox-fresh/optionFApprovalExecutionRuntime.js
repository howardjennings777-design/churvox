// CHURVOX_APPROVAL_EXECUTION_RUNTIME_20260629
// After owner approval, execute the approved result safely: email/invoice/quote/message/text/sync/internal record.

import API_BASE from '../lib/apiBase';

const INBOX_KEY = 'churvox:fresh-command-inbox:v1';
const OPS_KEY = 'churvox_option_f_operations_v1';
const EFFECT_KEY = 'churvox_approval_execution_effects_v1';
let busy = new Set();

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isOwnerRoute() {
  return typeof window !== 'undefined' && !window.location.pathname.startsWith('/worker');
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
  return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) };
}

async function request(method, path, payload) {
  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: headers(),
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    const error = new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body?.data?.data || body?.data || body;
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
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

function commandItems() {
  const inbox = readJson(INBOX_KEY, []);
  const ops = readJson(OPS_KEY, {});
  const queue = Array.isArray(ops.commandQueue) ? ops.commandQueue : [];
  const byId = new Map();
  [...(Array.isArray(inbox) ? inbox : []), ...queue].filter(Boolean).forEach((item) => byId.set(String(item.id || item.title), item));
  return Array.from(byId.values());
}

function findItem(id, button) {
  const target = String(id || '');
  const found = commandItems().find((item) => String(item.id || item.title || item.source_id) === target || String(item.source_id || '') === target);
  if (found) return found;
  const card = button?.closest('[data-rr-command-id], [data-command-id], [data-ten-job-id], article, li, .card');
  return {
    id: target || clean(card?.getAttribute('data-command-id') || card?.getAttribute('data-rr-command-id') || card?.getAttribute('data-ten-job-id')),
    title: clean(card?.querySelector('strong,h3,h2')?.textContent || button?.textContent || 'Approved Command item'),
    summary: clean(card?.querySelector('small,p')?.textContent || ''),
    source: 'command-ui',
  };
}

function inferKind(item, button) {
  const text = `${item?.kind || ''} ${item?.type || ''} ${item?.category || ''} ${item?.action || ''} ${item?.title || ''} ${item?.summary || ''} ${button?.textContent || ''}`.toLowerCase();
  if (/sms|txt|text message/.test(text)) return 'sms';
  if (/xero|myob|accounting|sync/.test(text)) return 'accounting_sync';
  if (/quote/.test(text)) return 'quote';
  if (/invoice/.test(text)) return 'invoice';
  if (/email|message|follow|update|customer/.test(text)) return 'email';
  if (/timesheet|payroll|worker slip/.test(text)) return 'internal_record';
  return 'command_record';
}

function canApproveThroughAiReview(item, id) {
  const key = String(id || item?.id || '');
  const objectIdish = /^[a-f0-9]{24}$/i.test(key);
  return Boolean(objectIdish || item?.preparedForApproval !== undefined || item?.action || item?.payload);
}

async function executeViaBackend(key, kind, item) {
  if (canApproveThroughAiReview(item, key)) {
    try {
      return await request('POST', `/ai-review-items/${encodeURIComponent(key)}/approve`, { note: item.owner_note || '', item });
    } catch (error) {
      if (![404, 405].includes(Number(error.status || 0))) throw error;
    }
  }
  return await request('POST', `/command/approvals/${encodeURIComponent(key)}/execute`, { action_id: key, kind, item });
}

function saveEffect(effect) {
  const list = readJson(EFFECT_KEY, []);
  writeJson(EFFECT_KEY, [{ ...effect, at: new Date().toISOString() }, ...(Array.isArray(list) ? list : [])].slice(0, 80));
}

function markLocal(id, result) {
  const update = (item) => {
    if (String(item?.id || item?.title || item?.source_id) !== String(id) && String(item?.source_id || '') !== String(id)) return item;
    return { ...item, execution_status: result?.result?.status || result?.status || result?.decision?.execution_status || 'executed', execution_kind: result?.kind, executed_at: new Date().toISOString() };
  };
  const inbox = readJson(INBOX_KEY, []);
  if (Array.isArray(inbox)) writeJson(INBOX_KEY, inbox.map(update));
  const ops = readJson(OPS_KEY, {});
  if (Array.isArray(ops.commandQueue)) writeJson(OPS_KEY, { ...ops, commandQueue: ops.commandQueue.map(update), updatedAt: new Date().toISOString() });
}

function isAuditControl(button) {
  return Boolean(button?.closest?.('[data-churvox-qa-control]') || button?.getAttribute?.('data-churvox-qa-control'));
}

function isApprovalButton(button) {
  const text = clean(button?.textContent).toLowerCase();
  const hasCommandContext = Boolean(
    button?.closest('[data-rr-command-id], [data-command-id], [data-ten-job-id], .rrCommandQueue, .tenReadinessPanel, .ofDecisionEffects') ||
    button?.dataset?.commandId ||
    button?.dataset?.brainApprove
  );
  if (!hasCommandContext) return false;
  return text === 'approve' || text === 'send' || text.includes('approved') || button?.getAttribute('data-rr-command-action') === 'approve' || button?.getAttribute('data-command-action') === 'approved' || Boolean(button?.dataset?.brainApprove);
}

function commandId(button) {
  const rr = button?.closest('[data-rr-command-id]')?.getAttribute('data-rr-command-id');
  const command = button?.dataset?.commandId || button?.closest('[data-command-id]')?.getAttribute('data-command-id');
  const brain = button?.dataset?.brainApprove;
  const ten = button?.closest('[data-ten-job-id]')?.getAttribute('data-ten-job-id');
  return rr || command || brain || ten || '';
}

async function execute(button) {
  if (!isOwnerRoute() || !token() || !isApprovalButton(button)) return;
  if (isAuditControl(button)) {
    button.textContent = 'Approval ready';
    return;
  }
  const id = commandId(button);
  if (!id) return;
  const item = findItem(id, button);
  const key = String(item.id || id);
  if (busy.has(key)) return;
  busy.add(key);
  const originalText = button.textContent;
  button.textContent = 'Executing...';
  try {
    const kind = inferKind(item, button);
    const result = await executeViaBackend(key, kind, item);
    markLocal(key, result);
    saveEffect({ id: key, kind, status: result?.result?.status || result?.status || 'executed', title: item.title || key });
    const status = result?.result?.status || result?.status || '';
    if (/sent/.test(status)) button.textContent = 'Sent';
    else if (/queued/.test(status)) button.textContent = 'Queued';
    else if (/approved/.test(status)) button.textContent = 'Approved';
    else button.textContent = 'Done';
    try { window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated')); } catch (_) {}
  } catch (_) {
    button.textContent = 'Retry approve';
  } finally {
    window.setTimeout(() => {
      busy.delete(key);
      if (button.textContent === 'Executing...') button.textContent = originalText;
    }, 900);
  }
}

function handleClick(event) {
  const button = event.target.closest('button');
  if (!button || !isOwnerRoute()) return;
  if (!isApprovalButton(button)) return;
  if (isAuditControl(button)) {
    event.preventDefault();
    event.stopPropagation();
    button.textContent = 'Approval ready';
    return;
  }
  window.setTimeout(() => execute(button), 260);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_APPROVAL_EXECUTION_RUNTIME__) {
  window.__CHURVOX_APPROVAL_EXECUTION_RUNTIME__ = true;
  document.addEventListener('click', handleClick, true);
}

export {};