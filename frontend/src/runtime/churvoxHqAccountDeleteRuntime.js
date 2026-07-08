import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-hq-account-delete-style';
const FLAG = '__CHURVOX_HQ_ACCOUNT_DELETE_RUNTIME__';
const OWNER_EMAILS = new Set(['hello@churvox.com', 'howardjennings77@gmail.com', 'howardjennings777@gmail.com']);
let busy = false;

const css = `
  .aomDeleteAccountBtn {
    border: 0 !important;
    border-radius: 999px !important;
    padding: 8px 10px !important;
    background: linear-gradient(135deg, #dc2626, #991b1b) !important;
    color: #fff !important;
    font-size: 11px !important;
    font-weight: 900 !important;
    cursor: pointer !important;
    white-space: nowrap !important;
  }
  .aomDeleteAccountBtn:disabled { opacity: .62 !important; cursor: wait !important; }
  .aomDeleteAccountNotice {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 100000;
    max-width: 340px;
    border-radius: 20px;
    padding: 13px 14px;
    background: #101513;
    color: #fff;
    box-shadow: 0 22px 60px rgba(0,0,0,.24);
    font-size: 13px;
    font-weight: 820;
  }
  .aomDeleteAccountNotice.bad { background: #991b1b; }
`;

function isHq() {
  const path = window.location.pathname || '';
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner'].includes(path);
}
function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function low(value) { return clean(value).toLowerCase(); }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function headers() { const t = token(); return { Accept: 'application/json', 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }; }
function emailFromText(text) { const match = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i); return match ? match[0].toLowerCase() : ''; }
function rowIdentifier(row) { return emailFromText(row?.innerText || '') || clean(row?.querySelector('button span, td span, td b, button b')?.textContent); }
function toast(message, bad = false) {
  document.querySelectorAll('.aomDeleteAccountNotice').forEach((node) => node.remove());
  const div = document.createElement('div');
  div.className = `aomDeleteAccountNotice ${bad ? 'bad' : ''}`;
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5200);
}
async function deleteAccount(identifier) {
  const response = await fetch(`${String(API_BASE || '').replace(/\/$/, '')}/api/admin/owner/delete-account`, {
    method: 'POST',
    credentials: 'include',
    headers: headers(),
    body: JSON.stringify({ identifier, email: identifier, confirm: 'DELETE' }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || body?.error || `Delete failed ${response.status}`);
  return body;
}
async function onDelete(button, identifier) {
  if (busy) return;
  const id = low(identifier);
  if (!id) return toast('No account email/id found for this row.', true);
  if (OWNER_EMAILS.has(id)) return toast('Owner account is protected and cannot be deleted.', true);
  const ok = window.confirm(`Delete account ${identifier}?\n\nThis removes the HQ account/login records and linked business profile records. This cannot be undone.`);
  if (!ok) return;
  busy = true;
  const old = button.textContent;
  button.disabled = true;
  button.textContent = 'Deleting...';
  try {
    const result = await deleteAccount(identifier);
    toast(result.message || 'Account deleted.');
    try { window.dispatchEvent(new Event('churvox-owner-app-ready')); } catch {}
    setTimeout(() => window.location.reload(), 850);
  } catch (error) {
    toast(error?.message || 'Could not delete account.', true);
    button.disabled = false;
    button.textContent = old;
  } finally {
    busy = false;
  }
}
function makeButton(identifier) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'aomDeleteAccountBtn';
  btn.textContent = 'Delete account';
  btn.setAttribute('data-aom-delete-account', 'true');
  btn.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); onDelete(btn, identifier); });
  return btn;
}
function injectTableRows() {
  document.querySelectorAll('.aomTable tbody tr').forEach((row) => {
    if (row.querySelector('[data-aom-delete-account="true"]')) return;
    const id = rowIdentifier(row);
    if (!id || OWNER_EMAILS.has(low(id))) return;
    const actions = row.querySelector('.aomTableActions') || row.querySelector('td:last-child div') || row.querySelector('td:last-child');
    if (!actions) return;
    actions.appendChild(makeButton(id));
  });
}
function injectModal() {
  const modal = document.querySelector('.aomModal section');
  if (!modal || modal.querySelector('[data-aom-delete-account="true"]')) return;
  const id = emailFromText(modal.innerText) || clean(modal.querySelector('h2')?.textContent);
  if (!id || OWNER_EMAILS.has(low(id))) return;
  const actions = modal.querySelector('.aomModalActions') || modal;
  actions.appendChild(makeButton(id));
}
function run() {
  if (!isHq()) return;
  ensureStyle();
  injectTableRows();
  injectModal();
}
function schedule(delay = 120) { setTimeout(run, delay); }
if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  [150, 500, 1200, 2600, 5200].forEach(schedule);
  window.addEventListener('load', () => schedule(200));
  window.addEventListener('hashchange', () => [120, 500].forEach(schedule));
  window.addEventListener('popstate', () => [120, 500].forEach(schedule));
  window.addEventListener('churvox-owner-app-ready', () => [160, 700].forEach(schedule));
  document.addEventListener('click', () => schedule(180), true);
}
export {};
