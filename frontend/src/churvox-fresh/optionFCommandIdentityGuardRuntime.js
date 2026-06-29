// CHURVOX_COMMAND_IDENTITY_GUARD_20260629
// Sends base Command decisions with a stronger stable identity before older click handlers run.

import API_BASE from '../lib/apiBase';

let busy = false;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function slug(value) { return lower(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90); }
function apiUrl(path) { return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`; }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; } }
function headers() { const auth = token(); return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }; }
async function request(method, path, payload) {
  const response = await fetch(apiUrl(path), { method, credentials: 'include', headers: headers(), body: JSON.stringify(payload || {}) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body?.data?.data || body?.data || body;
}
function ownerApp() { return Boolean(document.querySelector('.churvoxOptionC')) && !window.location.pathname.startsWith('/worker'); }
function commandAction(button) {
  const text = lower(button?.textContent);
  if (text === 'approve' || text.includes('approve') || text.includes('send')) return 'approve';
  if (text.includes('edit')) return 'edit';
  if (text.includes('park')) return 'park';
  return '';
}
function commandButton(button) {
  if (!button || !ownerApp()) return false;
  if (!commandAction(button)) return false;
  return Boolean(button.closest('.cocPage.command .ownerActions') || button.closest('.approvalSlip .approvalActions'));
}
function commandText() {
  const area = document.querySelector('.cocPage.command') || document.querySelector('.approvalSlip') || document.querySelector('.cocDrawer');
  return area?.innerText || '';
}
function field(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`${escaped}\\s*\\n?\\s*([^\\n]+)`, 'i'));
  return clean(match?.[1] || '');
}
function itemFromPage() {
  const text = commandText();
  const title = clean(document.querySelector('.cocPage.command .wide h3')?.textContent || field(text, 'Record') || field(text, 'Approval type') || 'Command item');
  const type = field(text, 'Approval type');
  const record = field(text, 'Record') || title;
  const client = field(text, 'Client');
  const amount = field(text, 'Amount');
  const status = field(text, 'Prepared status');
  const all = `${type} ${title} ${text}`;
  let kind = 'command_record';
  if (/invoice/i.test(all)) kind = 'invoice';
  else if (/quote/i.test(all)) kind = 'quote';
  else if (/sms|txt|text/i.test(all)) kind = 'sms';
  else if (/xero|myob|accounting|sync/i.test(all)) kind = 'accounting_sync';
  else if (/message|reply|email|customer/i.test(all)) kind = 'email';
  else if (/timesheet|proof|slip|payroll/i.test(all)) kind = 'internal_record';
  const idParts = [kind, type, record, client, amount, status].map(slug).filter(Boolean);
  const id = idParts.length ? `command-${idParts.join('-')}` : `command-${Date.now()}`;
  return { id, kind, type: type || kind, title, record, client, amount, status, summary: clean(text), source: 'command_identity_guard' };
}
async function decide(button) {
  if (busy || !token() || button.dataset.churvoxDone === 'true') return;
  const action = commandAction(button);
  const item = itemFromPage();
  if (!action || !item.id) return;
  busy = true;
  const original = button.textContent;
  button.textContent = action === 'approve' ? 'Executing...' : action === 'edit' ? 'Saving...' : 'Parking...';
  try {
    const res = await request('POST', '/command/manual-decision', { decision: action, action_id: item.id, item });
    const result = clean(res?.result?.status || res?.decision?.execution_status || res?.decision?.decision || 'done');
    if (action === 'approve') button.textContent = res?.duplicate_guard ? 'Already approved' : /sent/i.test(result) ? 'Sent' : /queued/i.test(result) ? 'Queued' : 'Approved';
    else button.textContent = action === 'edit' ? 'Ready to edit' : 'Parked';
    button.dataset.churvoxDone = 'true';
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated'));
  } catch (_) {
    button.textContent = 'Try again';
    window.setTimeout(() => { button.textContent = original; }, 1500);
  } finally {
    busy = false;
  }
}
function handleClick(event) {
  const button = event.target.closest('button');
  if (!commandButton(button)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  decide(button);
}
if (typeof window !== 'undefined' && !window.__CHURVOX_COMMAND_IDENTITY_GUARD__) {
  window.__CHURVOX_COMMAND_IDENTITY_GUARD__ = true;
  document.addEventListener('click', handleClick, true);
}

export {};
