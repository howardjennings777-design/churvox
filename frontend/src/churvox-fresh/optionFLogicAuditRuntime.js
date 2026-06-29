// CHURVOX_LOGIC_AUDIT_RUNTIME_20260629
// Hard-wires the base Command buttons and keeps product language aligned to real Churvox flow.

import API_BASE from '../lib/apiBase';

let queued = false;
let busy = false;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function apiUrl(path) { return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`; }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; } }
function headers() { const auth = token(); return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }; }
async function request(method, path, payload) {
  const response = await fetch(apiUrl(path), { method, credentials: 'include', headers: headers(), body: payload === undefined ? undefined : JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body?.data?.data || body?.data || body;
}
function isOwnerApp() { return Boolean(document.querySelector('.churvoxOptionC')) && !window.location.pathname.startsWith('/worker'); }
function activePage() {
  const hash = lower((window.location.hash || '').replace('#', ''));
  if (hash) return hash;
  return lower(document.querySelector('.churvoxOptionC .cocNav button.active')?.textContent || 'today');
}
function textNearCommand() {
  const commandPage = document.querySelector('.cocPage.command') || document.querySelector('.approvalSlip') || document.querySelector('.cocDrawer');
  const text = commandPage?.innerText || '';
  const find = (label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`${escaped}\\s*\\n?\\s*([^\\n]+)`, 'i'));
    return clean(match?.[1] || '');
  };
  const title = clean(document.querySelector('.cocPage.command .wide h3')?.textContent || find('Record') || find('Approval type') || document.querySelector('.approvalSlip h2')?.textContent || 'Command item');
  const body = clean(document.querySelector('.cocPage.command .wide p')?.textContent || text);
  const kindText = `${find('Approval type')} ${title} ${body}`;
  let kind = 'command_record';
  if (/invoice/i.test(kindText)) kind = 'invoice';
  else if (/quote/i.test(kindText)) kind = 'quote';
  else if (/sms|txt|text/i.test(kindText)) kind = 'sms';
  else if (/xero|myob|accounting|sync/i.test(kindText)) kind = 'accounting_sync';
  else if (/message|reply|email|customer/i.test(kindText)) kind = 'email';
  else if (/timesheet|proof|slip|payroll/i.test(kindText)) kind = 'internal_record';
  return {
    id: clean(title || `command-${Date.now()}`),
    kind,
    type: find('Approval type') || kind,
    title,
    record: find('Record') || title,
    client: find('Client'),
    amount: find('Amount'),
    status: find('Prepared status'),
    summary: body,
    filled: find('What Churvox filled'),
    evidence: find('Evidence checked'),
    source: 'base_command_ui',
  };
}
function commandButtonAction(button) {
  const text = lower(button?.textContent);
  if (text === 'approve' || text.includes('approve') || text.includes('send')) return 'approve';
  if (text.includes('edit')) return 'edit';
  if (text.includes('park')) return 'park';
  return '';
}
function isBaseCommandButton(button) {
  if (!button || !isOwnerApp()) return false;
  const action = commandButtonAction(button);
  if (!action) return false;
  return Boolean(button.closest('.cocPage.command .ownerActions') || button.closest('.approvalSlip .approvalActions'));
}
async function hardWireCommand(button) {
  if (busy || !token()) return;
  const action = commandButtonAction(button);
  const item = textNearCommand();
  if (!action || !item.title) return;
  busy = true;
  const original = button.textContent;
  button.textContent = action === 'approve' ? 'Executing...' : action === 'edit' ? 'Saved for edit...' : 'Parking...';
  try {
    const res = await request('POST', '/command/manual-decision', { decision: action, action_id: item.id, item });
    const resultStatus = clean(res?.result?.status || res?.decision?.decision || res?.decision?.execution_status || 'done');
    if (action === 'approve') button.textContent = /sent/i.test(resultStatus) ? 'Sent' : /queued/i.test(resultStatus) ? 'Queued' : 'Approved';
    else button.textContent = action === 'edit' ? 'Ready to edit' : 'Parked';
    try { window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated')); } catch (_) {}
  } catch (_) {
    button.textContent = 'Try again';
  }
  window.setTimeout(() => { button.textContent = original; busy = false; }, 1700);
}
function hardenOnsiteAliases() {
  if (!isOwnerApp()) return;
  if (lower((window.location.hash || '').replace('#', '')) === 'onsite') {
    window.history.replaceState({}, '', '/dashboard#workers');
    try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (_) { window.dispatchEvent(new Event('hashchange')); }
  }
  document.querySelectorAll('.churvoxOptionC .cocNav button').forEach((button) => {
    if (lower(button.textContent) === 'workers') button.textContent = 'Onsite';
  });
}
function cleanVisibleProductCopy() {
  if (!isOwnerApp() || !document.body) return;
  const replacements = [
    ['Jobs, workers, money, messages and problems for today.', 'Jobs, onsite people, money, messages and problems for today.'],
    ['Clock-ins, GPS, current jobs, proof and timesheets.', 'Live map, onsite people, current jobs, proof and field warnings.'],
    ['Worker Day Summary', 'Onsite Summary'],
    ['Worker Cards', 'Onsite Cards'],
    ['Proof / Photos / Worker Messages', 'Proof / Photos / Site Messages'],
    ['Timesheets / Slips', 'Team timesheets / slips'],
    ['Worker GPS Google Maps', 'Onsite Google Maps'],
    ['Worker messages', 'Site messages'],
    ['Real review build layer', 'Field proof control'],
    ['build layer', 'control layer'],
    ['10 out of 10', 'ready'],
    ['10/10', 'ready'],
    ['demo', 'sample'],
    ['fake', 'sample'],
    ['placeholder', 'not set yet'],
  ];
  const showText = window.NodeFilter ? NodeFilter.SHOW_TEXT : 4;
  const walker = document.createTreeWalker(document.body, showText);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    let next = node.nodeValue || '';
    replacements.forEach(([from, to]) => { next = next.replaceAll(from, to); });
    if (next !== node.nodeValue) node.nodeValue = next;
  });
}
function separateTeamAndOnsite() {
  if (!isOwnerApp()) return;
  const page = activePage();
  if (page === 'team') {
    const subtitle = document.querySelector('.churvoxOptionC .title p');
    if (subtitle) subtitle.textContent = 'Staff records, roles, access, invites, payroll review and worker app setup.';
    document.querySelectorAll('.teamPage .workerCard span').forEach((node) => { node.textContent = 'Staff record · field status lives in Onsite'; });
    document.querySelectorAll('.teamPage .workerCard em').forEach((node) => { if (/proof|gps|job/i.test(node.textContent || '')) node.textContent = 'Payroll/admin record'; });
  }
  if (page === 'workers' || page === 'onsite') {
    const title = document.querySelector('.churvoxOptionC .title h1');
    const subtitle = document.querySelector('.churvoxOptionC .title p');
    if (title) title.textContent = 'Onsite';
    if (subtitle) subtitle.textContent = 'Live map, workers doing work, GPS, proof, messages and field warnings.';
  }
}
function handleClick(event) {
  const button = event.target.closest('button');
  if (!button || !isBaseCommandButton(button)) return;
  event.preventDefault();
  event.stopPropagation();
  hardWireCommand(button);
}
function runAuditPass() {
  queued = false;
  hardenOnsiteAliases();
  separateTeamAndOnsite();
  cleanVisibleProductCopy();
}
function schedule() {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(runAuditPass);
}
if (typeof window !== 'undefined' && !window.__CHURVOX_LOGIC_AUDIT_RUNTIME__) {
  window.__CHURVOX_LOGIC_AUDIT_RUNTIME__ = true;
  document.addEventListener('click', handleClick, true);
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox:fresh-data-updated', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

export {};
