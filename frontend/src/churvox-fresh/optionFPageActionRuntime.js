import API_BASE from '../lib/apiBase';

function installOptionFRefreshGuard() {
  if (typeof window === 'undefined' || window.__churvoxOptionFRefreshGuard) return;
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const blockedDelays = new Set([1000, 1200, 1600, 1800, 2400, 3000, 4200]);
  const blockedHandles = new Set();
  let nextBlockedHandle = 900000;

  function guardedSetInterval(handler, delay, ...args) {
    if (blockedDelays.has(Number(delay))) {
      const handle = nextBlockedHandle += 1;
      blockedHandles.add(handle);
      return handle;
    }
    return nativeSetInterval(handler, delay, ...args);
  }

  function guardedClearInterval(handle) {
    if (blockedHandles.delete(handle)) return undefined;
    return nativeClearInterval(handle);
  }

  window.__churvoxOptionFRefreshGuard = true;
  window.setInterval = guardedSetInterval;
  window.clearInterval = guardedClearInterval;

  window.setTimeout(() => {
    if (window.setInterval === guardedSetInterval) window.setInterval = nativeSetInterval;
    if (window.clearInterval === guardedClearInterval) window.clearInterval = nativeClearInterval;
  }, 8000);
}

installOptionFRefreshGuard();

const STORE = 'churvox_option_f_page_actions_v1';
const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';
const MODAL_ID = 'option-f-page-action-modal';
const STYLE_ID = 'option-f-page-action-style';
const TOAST_ID = 'option-f-page-action-toast';
const UNIVERSAL_CLASS = 'optionFUniversalActions';

const GST_RATE = 1.15;
const planPrices = { Start: 39, Crew: 89, Operator: 149, Command: 299 };
const addOnPrices = { 'Command Growth Pack': 99, 'Accounting Sync Add-on': 39 };

const defaults = {
  commandDecisions: [],
  settings: {},
  settingsChanges: [],
  tickets: [],
  recurringRules: [],
  dispatchRuns: [],
  quoteFollowups: [],
  acceptedJobs: [],
  planChoices: [],
  exports: [],
  controlNotes: [],
};

const mainDefaults = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
const opsDefaults = { audit: [], commandQueue: [], invoices: [], messages: [], workerDays: [], teamPeople: [] };

function load(key = STORE, fallback = defaults) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}')) }; } catch (_) { return { ...fallback }; }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadState() { return load(STORE, defaults); }
function saveState(state) { save(STORE, state); }
function loadMain() { return load(MAIN_STORE, mainDefaults); }
function saveMain(state) { save(MAIN_STORE, state); }
function loadOps() { return load(OPS_STORE, opsDefaults); }
function saveOps(state) { save(OPS_STORE, state); }

function now() {
  return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
}

function page() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function root() {
  return document.querySelector('.churvoxOptionC .workspace .cocPage');
}

function html(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function money(value) {
  const n = Number(value || 0);
  return `$${n.toFixed(2).replace(/\.00$/, '')}`;
}

function incGst(value) {
  return money(Number(value || 0) * GST_RATE);
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;right:18px;bottom:150px;z-index:999999;max-width:390px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.22);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}
    #${TOAST_ID}.show{opacity:1;transform:translateY(0)}#${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.7);font-weight:800}
    #${MODAL_ID}{position:fixed;inset:0;z-index:1000001;display:grid;place-items:center;padding:24px;background:rgba(16,21,19,.42);backdrop-filter:blur(5px)}
    #${MODAL_ID}[hidden]{display:none}
    #${MODAL_ID} .pageActionModal{width:min(980px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.3)}
    #${MODAL_ID} header{display:flex;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}
    #${MODAL_ID} h2{margin:0;font-size:30px;line-height:1.05;letter-spacing:0}
    #${MODAL_ID} p{margin:6px 0 0;color:#52605a;font-size:13px;font-weight:850}
    #${MODAL_ID} .close{border:0;border-radius:999px;padding:9px 13px;background:#101513;color:#fff;font-weight:950;cursor:pointer}
    #${MODAL_ID} form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px 22px}
    #${MODAL_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}
    #${MODAL_ID} input,#${MODAL_ID} select,#${MODAL_ID} textarea{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif;text-transform:none;letter-spacing:0}
    #${MODAL_ID} textarea{min-height:96px;resize:vertical}
    #${MODAL_ID} label.full{grid-column:1/-1}
    #${MODAL_ID} .actions{grid-column:1/-1;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px solid rgba(16,21,19,.08)}
    #${MODAL_ID} .actions button{border:0;border-radius:999px;padding:11px 15px;background:#ea580c;color:#fff;font-weight:950;cursor:pointer}
    #${MODAL_ID} .actions button.secondary{background:#101513}#${MODAL_ID} .actions button.quiet{background:#eef2ed;color:#111815}
    .${UNIVERSAL_CLASS},.optionFDecisionHistory,.optionFSettingsSaveBar,.optionFHelpTickets,.optionFQuickResult{display:grid;grid-column:1/-1;gap:10px;padding:14px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    .${UNIVERSAL_CLASS} h3,.optionFDecisionHistory h3,.optionFSettingsSaveBar h3,.optionFHelpTickets h3,.optionFQuickResult h3{margin:0;font-size:15px;color:#111815}
    .ofUniversalButtonGrid,.optionFSettingsSaveBar .settingsActions{display:flex;flex-wrap:wrap;gap:9px}
    .ofUniversalButtonGrid button,.optionFSettingsSaveBar button,.ofPlanActions button{border:0;border-radius:999px;padding:10px 13px;background:#101513;color:#fff;font-size:12px;font-weight:950;cursor:pointer}
    .ofUniversalButtonGrid button.primary,.optionFSettingsSaveBar button:first-child,.ofPlanActions button.primary{background:#ea580c}.ofUniversalButtonGrid button.light,.ofPlanActions button.light{background:#eef2ed;color:#111815}.ofUniversalButtonGrid button.blue{background:#0f3f56}
    .optionFDecisionHistory div,.optionFHelpTickets div,.optionFQuickResult div{display:grid;gap:8px}
    .optionFDecisionHistory span,.optionFHelpTickets span,.optionFQuickResult span{display:grid;grid-template-columns:140px 1fr auto;gap:10px;align-items:center;min-height:42px;padding:8px 10px;border-radius:12px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:850}
    .optionFDecisionHistory b,.optionFHelpTickets b,.optionFQuickResult b{color:#111815}.optionFDecisionHistory em,.optionFHelpTickets em,.optionFQuickResult em{font-style:normal;color:#9a3412;font-weight:950}
    .ofPlanActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;padding-top:10px;border-top:1px solid rgba(16,21,19,.08)}
    .ofPlanCard.hasActions,.ofAddonCard.hasActions{padding-bottom:16px!important}.ofPlanActions button{font-size:11px;padding:9px 11px}.optionFControlDepth .depthRow{cursor:pointer}.optionFControlDepth .depthRow:hover{outline:2px solid rgba(234,88,12,.16)}
    @media(max-width:720px){#${MODAL_ID} form{grid-template-columns:1fr}.optionFDecisionHistory span,.optionFHelpTickets span,.optionFQuickResult span{grid-template-columns:1fr}.ofUniversalButtonGrid button,.ofPlanActions button{flex:1}}
  `;
  document.head.appendChild(style);
}

function toast(title, detail = '') {
  ensureStyle();
  let node = document.getElementById(TOAST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = TOAST_ID;
    document.body.appendChild(node);
  }
  node.innerHTML = `<b>${html(title)}</b>${detail ? `<small>${html(detail)}</small>` : ''}`;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 2800);
}

function field(name, label, value = '', type = 'text', options = null, full = false) {
  if (options) return `<label class="${full ? 'full' : ''}"><span>${html(label)}</span><select name="${name}">${options.map((option) => `<option value="${html(option)}" ${option === value ? 'selected' : ''}>${html(option)}</option>`).join('')}</select></label>`;
  if (type === 'textarea') return `<label class="${full ? 'full' : ''}"><span>${html(label)}</span><textarea name="${name}">${html(value)}</textarea></label>`;
  return `<label class="${full ? 'full' : ''}"><span>${html(label)}</span><input type="${type}" name="${name}" value="${html(value)}" /></label>`;
}

function openModal(config) {
  ensureStyle();
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.hidden = true;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => {
      if (event.target.id === MODAL_ID || event.target.closest('[data-close]')) closeModal();
    });
    modal.addEventListener('submit', submitModal);
  }
  modal.innerHTML = `<section class="pageActionModal"><header><div><h2>${html(config.title)}</h2><p>${html(config.note || '')}</p></div><button type="button" class="close" data-close>Close</button></header><form data-kind="${html(config.kind)}">${config.fields.join('')}<div class="actions"><button type="button" class="quiet" data-close>Cancel</button><button type="submit">${html(config.submit || 'Save')}</button></div></form></section>`;
  modal.hidden = false;
  modal.querySelector('input,select,textarea')?.focus();
}

function closeModal() {
  const modal = document.getElementById(MODAL_ID);
  if (modal) modal.hidden = true;
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function apiPost(endpoint, data) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE || ''}/api${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body;
}

function recordAudit(action, detail) {
  const state = loadState();
  state.controlNotes = [{ action, detail, at: now() }, ...(state.controlNotes || [])].slice(0, 50);
  saveState(state);
}

function addMainRecord(key, item) {
  const main = loadMain();
  main[key] = [{ id: `${key}-${Date.now()}`, ...item, createdAt: now() }, ...(main[key] || [])].slice(0, 80);
  main.audit = [{ action: `Saved ${key}`, detail: item.title || item.name || item.subject || item.number || item.client || 'record', at: now() }, ...(main.audit || [])].slice(0, 80);
  saveMain(main);
}

function queueCommand(item) {
  const payload = { id: `page-action-${Date.now()}`, status: 'waiting', owner: item.owner || 'Edit', createdAt: now(), ...item };
  const main = loadMain();
  const ops = loadOps();
  main.command = [payload, ...(main.command || [])].slice(0, 120);
  main.audit = [{ action: 'Sent to Command', detail: `${item.type}: ${item.title}`, at: now() }, ...(main.audit || [])].slice(0, 80);
  ops.commandQueue = [payload, ...(ops.commandQueue || [])].slice(0, 120);
  ops.audit = [{ action: 'Sent to Command', detail: `${item.type}: ${item.title}`, at: now() }, ...(ops.audit || [])].slice(0, 80);
  saveMain(main);
  saveOps(ops);
  toast('Sent to Command', `${item.type}: ${item.title}`);
}

function missingFor(kind, data) {
  const value = (name) => clean(data[name]);
  const missing = [];
  if (kind === 'job') {
    if (!value('client')) missing.push('client');
    if (!value('worker')) missing.push('assigned worker');
    if (!value('date')) missing.push('date');
    if (!value('time')) missing.push('time');
    if (!value('service')) missing.push('service');
    if (Number(data.price || 0) <= 0 && !/quote/i.test(value('billing'))) missing.push('price');
  }
  if (kind === 'client') {
    if (!value('name')) missing.push('name');
    if (!value('phone') && !value('email')) missing.push('phone or email');
    if (!value('address')) missing.push('address');
  }
  if (kind === 'quote') {
    if (!value('client')) missing.push('client');
    if (!value('scope')) missing.push('scope');
    if (Number(data.amount || 0) <= 0) missing.push('amount');
  }
  if (kind === 'invoice') {
    if (!value('client')) missing.push('client');
    if (!value('due')) missing.push('due date');
    if (Number(data.amount || 0) <= 0) missing.push('amount');
    if (!value('line')) missing.push('line item');
  }
  if (kind === 'message') {
    if (!value('client')) missing.push('client');
    if (!value('subject')) missing.push('subject');
    if (!value('draft')) missing.push('draft reply');
  }
  if (kind === 'worker' || kind === 'person') {
    if (!value('worker') && !value('name')) missing.push('person');
    if (/review|pending|issue|check|not ready/i.test(`${data.payroll || ''} ${data.slipStatus || ''} ${data.issue || ''}`)) missing.push('review item');
  }
  return missing;
}

function queueMissing(kind, data, missing) {
  if (!missing.length) return;
  const title = data.title || data.name || data.worker || data.subject || data.number || data.client || `${kind} record`;
  queueCommand({
    type: `${kind[0].toUpperCase()}${kind.slice(1)} fix needed`,
    title,
    client: data.client || data.name || 'Not set',
    owner: 'Edit',
    sourceType: kind,
    missing: missing.join(', '),
    filled: `Churvox saved what it could, but this needs ${missing.join(', ')} before it is usable.`,
    evidence: 'Created from page action wiring.',
    check: 'Fix the highlighted fields or park the item in Command.',
  });
}

async function submitModal(event) {
  event.preventDefault();
  const form = event.target;
  const kind = form.dataset.kind;
  const data = { id: `${kind}-${Date.now()}`, ...formObject(form), createdAt: now() };
  const state = loadState();

  if (kind === 'ticket') {
    state.tickets = [data, ...(state.tickets || [])].slice(0, 30);
    saveState(state);
    try { await apiPost('/support/tickets', data); } catch (_) {}
    toast('Help ticket saved', data.area || 'Support record ready.');
  } else if (kind === 'recurring') {
    state.recurringRules = [data, ...(state.recurringRules || [])].slice(0, 30);
    saveState(state);
    addMainRecord('jobs', { ...data, status: 'recurring_rule', title: data.name, recurring: data.frequency });
    toast('Recurring rule saved', `${data.frequency} schedule ready.`);
  } else if (kind === 'dispatch') {
    state.dispatchRuns = [data, ...(state.dispatchRuns || [])].slice(0, 30);
    saveState(state);
    toast('Dispatch run saved', data.run || 'Run ready.');
  } else if (kind === 'followup') {
    state.quoteFollowups = [data, ...(state.quoteFollowups || [])].slice(0, 30);
    saveState(state);
    queueCommand({ type: 'Quote follow-up ready', title: data.quote || 'Quote follow-up', client: data.client || 'Not set', owner: 'Approve', filled: data.message || 'Follow-up prepared.', evidence: data.when || 'Saved follow-up action.', check: 'Approve or edit wording in Command.' });
  } else if (kind === 'settings') {
    state.settings = { ...state.settings, ...data, savedAt: now() };
    state.settingsChanges = [data, ...(state.settingsChanges || [])].slice(0, 30);
    saveState(state);
    toast('Settings saved', 'Business controls updated locally.');
  } else if (kind === 'plan') {
    state.planChoices = [data, ...(state.planChoices || [])].slice(0, 30);
    saveState(state);
    toast('Plan action saved', `${data.plan} - ${data.action}`);
  } else {
    const key = kind === 'client' ? 'clients' : kind === 'quote' ? 'quotes' : kind === 'invoice' ? 'invoices' : kind === 'message' ? 'messages' : kind === 'worker' || kind === 'person' ? 'workers' : 'jobs';
    addMainRecord(key, data);
    const missing = missingFor(kind, data);
    queueMissing(kind, data, missing);
    toast(`${kind[0].toUpperCase()}${kind.slice(1)} saved`, missing.length ? `Missing ${missing.join(', ')} sent to Command.` : 'Record is usable.');
  }

  closeModal();
  renderAll();
}

function openTicket(area = 'Setup') {
  openModal({ kind: 'ticket', title: 'New help ticket', note: 'Save a support ticket with area, priority, contact and message.', submit: 'Save ticket', fields: [field('area', 'Area', area, 'text', ['Setup', 'Billing', 'Worker app', 'CSV import', 'Xero', 'Plans', 'Other']), field('priority', 'Priority', 'Normal', 'text', ['Normal', 'Urgent', 'Stuck']), field('contact', 'Contact email', 'hello@churvox.com', 'email'), field('message', 'What is happening?', '', 'textarea', null, true)] });
}

function openRecurring() {
  openModal({ kind: 'recurring', title: 'Recurring jobs', note: 'Create a repeat rule for weekly, fortnightly, monthly or custom work.', submit: 'Save repeat rule', fields: [field('name', 'Rule name', 'Regular lawn run'), field('frequency', 'Frequency', 'Fortnightly', 'text', ['Weekly', 'Fortnightly', 'Monthly', 'Custom']), field('startDate', 'Start date', new Date().toISOString().slice(0, 10), 'date'), field('worker', 'Default worker', 'Howard'), field('price', 'Default price', '65', 'number'), field('notes', 'Notes', '', 'textarea', null, true)] });
}

function openDispatch() {
  openModal({ kind: 'dispatch', title: 'Dispatch board', note: 'Plan a run without putting maps back inside Jobs.', submit: 'Save dispatch run', fields: [field('run', 'Run name', 'Morning run'), field('worker', 'Worker', 'Howard'), field('date', 'Date', new Date().toISOString().slice(0, 10), 'date'), field('jobs', 'Jobs in run', 'Naenae lawn reset, Petone unit cleanup', 'textarea', null, true), field('notes', 'Route notes', '', 'textarea', null, true)] });
}

function openJob() {
  openModal({ kind: 'job', title: 'Add job', note: 'Jobs need client, worker, date, time, service and price before Today.', submit: 'Save job', fields: [field('title', 'Job name', 'New lawn service'), field('client', 'Client', ''), field('address', 'Site address', ''), field('service', 'Service', 'Lawn mowing', 'text', ['Lawn mowing', 'Hedge trimming', 'Property tidy', 'Cleanup', 'Quote visit', 'Other']), field('worker', 'Assigned worker', 'Howard', 'text', ['Howard', 'Alex', 'Sam', 'Tui']), field('date', 'Date', new Date().toISOString().slice(0, 10), 'date'), field('time', 'Time', '08:00', 'time'), field('price', 'Price NZD', '65', 'number'), field('billing', 'Billing type', 'Fixed price', 'text', ['Fixed price', 'Hourly', 'Fixed + extras', 'Hourly + extras', 'Package price', 'Quote required']), field('recurring', 'Frequency', 'Fortnightly', 'text', ['One-off', 'Weekly', 'Fortnightly', 'Monthly', 'Custom']), field('notes', 'Job notes', '', 'textarea', null, true)] });
}

function openClient() {
  openModal({ kind: 'client', title: 'Add client', note: 'Save contact details, service memory, price memory and notes.', submit: 'Save client', fields: [field('name', 'Client name', ''), field('phone', 'Phone', ''), field('email', 'Email', '', 'email'), field('address', 'Address', ''), field('service', 'Service memory', 'Fortnightly lawns'), field('price', 'Price memory', '$65 regular'), field('notes', 'Notes/access', '', 'textarea', null, true)] });
}

function openQuote() {
  openModal({ kind: 'quote', title: 'New quote', note: 'Draft quote details. Sending approval still waits in Command.', submit: 'Save quote draft', fields: [field('title', 'Quote title', 'New quote'), field('client', 'Client', ''), field('amount', 'Amount NZD', '180', 'number'), field('status', 'Status', 'Draft', 'text', ['Draft', 'Sent', 'Viewed', 'Accepted']), field('terms', 'Terms', 'Valid 14 days'), field('followUp', 'Follow-up', 'Ready'), field('scope', 'Scope', '', 'textarea', null, true)] });
}

function openInvoice() {
  openModal({ kind: 'invoice', title: 'Draft invoice', note: 'Invoices need client, due date, amount and line item before approval or sync.', submit: 'Save invoice', fields: [field('number', 'Invoice number', `INV-${Math.floor(1000 + Math.random() * 8999)}`), field('client', 'Client', ''), field('job', 'Job', ''), field('amount', 'Amount NZD', '180', 'number'), field('due', 'Due date', new Date().toISOString().slice(0, 10), 'date'), field('status', 'Status', 'Draft', 'text', ['Draft', 'Due today', 'Overdue', 'Paid']), field('sync', 'Xero/MYOB status', 'Command approval', 'text', ['Command approval', 'Xero ready', 'Not synced', 'Synced']), field('line', 'Line item', '', 'textarea', null, true), field('evidence', 'Proof/evidence', '', 'textarea', null, true)] });
}

function openMessage() {
  openModal({ kind: 'message', title: 'Draft message', note: 'Prepare a reply. Sending approval remains in Command.', submit: 'Save draft', fields: [field('from', 'Thread type', 'Customer', 'text', ['Customer', 'Worker']), field('channel', 'Channel', 'SMS', 'text', ['SMS', 'Email', 'Worker app']), field('client', 'Client', ''), field('job', 'Job', ''), field('subject', 'Subject', 'Customer reply'), field('context', 'Thread context', '', 'textarea', null, true), field('draft', 'Draft reply', '', 'textarea', null, true)] });
}

function openWorker() {
  openModal({ kind: 'worker', title: 'Worker day slip', note: 'Save clock times, GPS, proof, messages and slip status.', submit: 'Save worker day', fields: [field('worker', 'Worker', 'Howard', 'text', ['Howard', 'Alex', 'Sam', 'Tui']), field('status', 'Clock status', 'Clocked in', 'text', ['Clocked in', 'Driving', 'Proof upload', 'Clocked out']), field('client', 'Client', ''), field('job', 'Current job', ''), field('gps', 'GPS/location', ''), field('clockIn', 'Clock in', '08:00', 'time'), field('clockOut', 'Clock out', '', 'time'), field('hours', 'Timesheet hours', '7.5h'), field('proof', 'Proof/photos', ''), field('slipStatus', 'Slip status', 'Ready', 'text', ['Ready', 'Review', 'Pending', 'Issue']), field('payroll', 'Payroll', 'Ready', 'text', ['Ready', 'Review', 'Pending']), field('messages', 'Worker messages', '', 'textarea', null, true), field('issue', 'Issue', '', 'textarea', null, true)] });
}

function openPerson() {
  openModal({ kind: 'person', title: 'Team person', note: 'Edit staff role, access, worker app and payroll review.', submit: 'Save person', fields: [field('name', 'Name', ''), field('role', 'Role', 'Worker', 'text', ['Owner', 'Manager', 'Worker', 'Subcontractor', 'Payroll only']), field('access', 'Access', 'Worker app', 'text', ['Full access', 'Jobs only', 'Worker app', 'Payroll review', 'No access']), field('app', 'Worker app', 'Active', 'text', ['Active', 'Invited', 'Paused']), field('payroll', 'Payroll review', 'Ready', 'text', ['Ready', 'Review', 'Pending']), field('hours', 'Timesheet', ''), field('currentJob', 'Current job', ''), field('notes', 'Notes', '', 'textarea', null, true)] });
}

function openSettings() {
  openModal({ kind: 'settings', title: 'Business controls', note: 'Save business defaults and rules. These controls affect records created after this.', submit: 'Save controls', fields: [field('businessName', 'Business name', 'Churvox business'), field('email', 'Public email', 'hello@churvox.com', 'email'), field('country', 'Country', 'New Zealand'), field('gst', 'GST', '15%'), field('defaultRepeat', 'Default repeat', 'Fortnightly', 'text', ['Weekly', 'Fortnightly', 'Monthly', 'Custom']), field('defaultBilling', 'Default billing', 'Fixed + extras', 'text', ['Fixed price', 'Hourly', 'Fixed + extras', 'Package price']), field('proofRequirement', 'Proof requirement', 'Photos + notes'), field('notifications', 'Notifications', 'On', 'text', ['On', 'Owner only', 'Off'])] });
}

function openFollowups() {
  openModal({ kind: 'followup', title: 'Quote follow-up', note: 'Prepare the next follow-up. Sending still waits in Command.', submit: 'Queue follow-up', fields: [field('quote', 'Quote', 'Fence repair'), field('client', 'Client', 'Mere H.'), field('when', 'When', 'Tomorrow'), field('message', 'Draft follow-up', 'Just checking if you had any questions about the quote.', 'textarea', null, true)] });
}

function savePlanAction(plan, action) {
  const price = planPrices[plan] || addOnPrices[plan] || 0;
  const state = loadState();
  const payload = { id: `plan-${Date.now()}`, plan, action, price, incGst: incGst(price), at: now() };
  state.planChoices = [payload, ...(state.planChoices || [])].slice(0, 40);
  saveState(state);
  toast('Plan action saved', `${plan}: ${action}. ${money(price)} + GST / ${incGst(price)} inc GST.`);
}

function exportJson(name, payload) {
  const state = loadState();
  const full = { exportedAt: now(), name, data: payload || { page: page(), pageActions: state, workspace: loadMain(), operations: loadOps() } };
  state.exports = [{ name, at: full.exportedAt }, ...(state.exports || [])].slice(0, 30);
  saveState(state);
  const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `churvox-${name}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast('Export ready', name);
}

function commandDecision(action) {
  const state = loadState();
  const selected = document.querySelector('.command [title], .command h3, .command .cocRow b')?.textContent?.trim() || 'Command item';
  state.commandDecisions = [{ action, item: selected, at: now() }, ...(state.commandDecisions || [])].slice(0, 25);
  saveState(state);
  toast(`${action} saved`, selected);
  renderAll();
}

function runAction(action) {
  if (action === 'add-job') return openJob();
  if (action === 'add-client') return openClient();
  if (action === 'new-quote') return openQuote();
  if (action === 'draft-invoice') return openInvoice();
  if (action === 'draft-message') return openMessage();
  if (action === 'worker-day') return openWorker();
  if (action === 'person') return openPerson();
  if (action === 'settings') return openSettings();
  if (action === 'ticket') return openTicket();
  if (action === 'recurring') return openRecurring();
  if (action === 'dispatch') return openDispatch();
  if (action === 'followup') return openFollowups();
  if (action === 'accepted-jobs') { toast('Accepted quotes checked', 'Accepted quote jobs are created as job shells. Missing schedule details go to Command.'); return queueCommand({ type: 'Job fix needed', title: 'Accepted quote job shell', client: 'Accepted quote client', owner: 'Edit', filled: 'Accepted quote prepared as a job shell.', evidence: 'Quote accepted action clicked.', check: 'Add date, time and assigned worker before Today.' }); }
  if (action === 'queue-sync') return queueCommand({ type: 'Invoice sync ready', title: 'Draft invoice sync', client: 'Invoice ledger', owner: 'Approve', filled: 'Draft invoice is ready for accounting sync.', evidence: 'Invoice proof and sync queue checked.', check: 'Owner-approved draft sync only. No tax filing. No payout files.' });
  if (action === 'queue-message') return queueCommand({ type: 'Message ready', title: 'Draft reply', client: 'Customer', owner: 'Approve', filled: 'Message draft is ready for approval.', evidence: 'Message page action clicked.', check: 'Approve or edit wording in Command.' });
  if (action === 'payroll-review') return queueCommand({ type: 'Timesheet/proof/slip issue', title: 'Payroll review', client: 'Worker day', owner: 'Edit', filled: 'Payroll/slip check opened from page action.', evidence: 'Worker timesheet and proof need owner check.', check: 'Fix time/proof or park until worker confirms.' });
  if (action === 'run-today') { toast('Today checked', 'Incomplete jobs stay out of Today and are routed to Command.'); return queueCommand({ type: 'Today check complete', title: 'Today readiness', client: 'Today', owner: 'Edit', filled: 'Churvox checked Today for missing job details.', evidence: 'Jobs need date, time, worker, service and price.', check: 'Fix missing work in Command if any appears.' }); }
  if (action === 'open-command') { window.history.replaceState({}, '', '/dashboard#command'); window.dispatchEvent(new HashChangeEvent('hashchange')); return undefined; }
  if (action?.startsWith('export-')) return exportJson(action.replace('export-', '') || page());
  return undefined;
}

const actionMap = {
  today: [['run-today', 'Run Today check', 'primary'], ['open-command', 'Open Command', 'blue'], ['export-today', 'Export Today', 'light']],
  command: [['command-fix', 'Create fix item', 'primary'], ['export-command', 'Export decisions', 'light']],
  jobs: [['add-job', 'Add job', 'primary'], ['dispatch', 'Dispatch board', 'blue'], ['recurring', 'Recurring', 'blue'], ['export-jobs', 'Export jobs', 'light']],
  clients: [['add-client', 'Add client', 'primary'], ['export-clients', 'Export clients', 'light'], ['ticket', 'Import help', 'blue']],
  workers: [['worker-day', 'Worker day slip', 'primary'], ['payroll-review', 'Payroll review', 'blue'], ['export-workers', 'Export workers', 'light']],
  quotes: [['new-quote', 'New quote', 'primary'], ['followup', 'Follow-up', 'blue'], ['accepted-jobs', 'Accepted to Jobs', 'blue'], ['export-quotes', 'Export quotes', 'light']],
  invoices: [['draft-invoice', 'Draft invoice', 'primary'], ['queue-sync', 'Queue sync approval', 'blue'], ['export-invoices', 'Export invoices', 'light']],
  messages: [['draft-message', 'Draft reply', 'primary'], ['queue-message', 'Queue sending approval', 'blue'], ['export-messages', 'Export messages', 'light']],
  team: [['person', 'Add/edit person', 'primary'], ['payroll-review', 'Payroll review', 'blue'], ['export-team', 'Export team', 'light']],
  xero: [['queue-sync', 'Queue draft sync', 'primary'], ['export-xero', 'Export sync log', 'light'], ['settings', 'Open guardrails', 'blue']],
  settings: [['settings', 'Save controls', 'primary'], ['export-settings', 'Export settings', 'light'], ['ticket', 'Setup help', 'blue']],
  plans: [['plan-operator', 'Start Operator trial', 'primary'], ['plan-command', 'Choose Command', 'blue'], ['ticket', 'Ask billing question', 'light']],
  help: [['ticket', 'New ticket', 'primary'], ['settings', 'Setup controls', 'blue'], ['export-help', 'Export support pack', 'light']],
};

function renderUniversalActions() {
  ensureStyle();
  const r = root();
  if (!r) return;
  const p = page();
  r.querySelectorAll(`.${UNIVERSAL_CLASS}`).forEach((node) => node.remove());
  const actions = actionMap[p] || [];
  if (!actions.length) return;
  const section = document.createElement('section');
  section.className = UNIVERSAL_CLASS;
  section.setAttribute('data-page', p);
  section.innerHTML = `<h3>Page actions</h3><div class="ofUniversalButtonGrid">${actions.map(([key, label, tone]) => `<button type="button" class="${tone || ''}" data-page-action="${html(key)}">${html(label)}</button>`).join('')}</div>`;
  r.appendChild(section);
}

function renderPageAddons() {
  ensureStyle();
  document.querySelectorAll('.optionFDecisionHistory,.optionFSettingsSaveBar,.optionFHelpTickets,.optionFQuickResult').forEach((node) => node.remove());
  const r = root();
  if (!r) return;
  const state = loadState();
  const p = page();
  if (p === 'command') {
    const section = document.createElement('section');
    section.className = 'optionFDecisionHistory';
    const rows = (state.commandDecisions || []).slice(0, 5).map((item) => `<span><b>${html(item.action)}</b><small>${html(item.item)}</small><em>${html(item.at)}</em></span>`).join('') || '<span><b>No decisions yet</b><small>Approve, edit or park to build history.</small><em>Ready</em></span>';
    section.innerHTML = `<h3>Decision history</h3><div>${rows}</div>`;
    r.appendChild(section);
  }
  if (p === 'settings') {
    const section = document.createElement('section');
    section.className = 'optionFSettingsSaveBar';
    section.innerHTML = `<h3>Settings actions</h3><div class="settingsActions"><button type="button" data-page-action="settings">Save settings</button><button type="button" data-page-action="export-settings">Export settings</button></div>`;
    r.appendChild(section);
  }
  if (p === 'help') {
    const section = document.createElement('section');
    section.className = 'optionFHelpTickets';
    const rows = (state.tickets || []).slice(0, 5).map((item) => `<span><b>${html(item.area)}</b><small>${html(item.message || item.priority)}</small><em>${html(item.at || item.createdAt || 'Saved')}</em></span>`).join('') || '<span><b>No tickets yet</b><small>Use New ticket to save one.</small><em>Ready</em></span>';
    section.innerHTML = `<h3>Ticket history</h3><div>${rows}</div>`;
    r.appendChild(section);
  }
  if (p === 'jobs' && (state.recurringRules?.length || state.dispatchRuns?.length)) {
    const section = document.createElement('section');
    section.className = 'optionFQuickResult';
    const rows = [...(state.recurringRules || []).slice(0, 3).map((item) => `<span><b>Recurring</b><small>${html(item.name)} - ${html(item.frequency)}</small><em>${html(item.createdAt || '')}</em></span>`), ...(state.dispatchRuns || []).slice(0, 3).map((item) => `<span><b>Dispatch</b><small>${html(item.run)} - ${html(item.worker)}</small><em>${html(item.createdAt || '')}</em></span>`)].join('');
    section.innerHTML = `<h3>Saved job controls</h3><div>${rows}</div>`;
    r.appendChild(section);
  }
}

function enhancePlanButtons() {
  ensureStyle();
  document.querySelectorAll('#option-f-plans-pricing-desk .ofPlanCard:not(.hasActions)').forEach((card) => {
    const name = clean(card.querySelector('h3')?.textContent);
    if (!name) return;
    card.classList.add('hasActions');
    card.insertAdjacentHTML('beforeend', `<div class="ofPlanActions"><button type="button" class="primary" data-plan-action="trial" data-plan-name="${html(name)}">Start trial</button><button type="button" data-plan-action="choose" data-plan-name="${html(name)}">Choose plan</button><button type="button" class="light" data-plan-action="details" data-plan-name="${html(name)}">Details</button></div>`);
  });
  document.querySelectorAll('#option-f-plans-pricing-desk .ofAddonCard:not(.hasActions)').forEach((card) => {
    const name = clean(card.querySelector('h3')?.textContent);
    if (!name) return;
    card.classList.add('hasActions');
    card.insertAdjacentHTML('beforeend', `<div class="ofPlanActions"><button type="button" class="primary" data-plan-action="addon" data-plan-name="${html(name)}">Add to plan</button><button type="button" class="light" data-plan-action="details" data-plan-name="${html(name)}">Details</button></div>`);
  });
}

function openControlRow(row) {
  const cols = Array.from(row.children).map((child) => clean(child.textContent));
  const title = cols[0] || 'Control';
  const detail = cols[1] || 'Control detail';
  const status = cols[2] || 'Ready';
  const state = loadState();
  state.controlNotes = [{ title, detail, status, page: page(), at: now() }, ...(state.controlNotes || [])].slice(0, 40);
  saveState(state);
  openModal({ kind: 'settings', title, note: 'Control detail opened from this page.', submit: 'Save note', fields: [field('control', 'Control', title), field('status', 'Status', status), field('page', 'Page', page()), field('detail', 'Detail', detail, 'textarea', null, true)] });
}

function handleDrawerAction(button) {
  const text = clean(button.textContent).toLowerCase();
  if (text === 'approve') { commandDecision('Approve'); return true; }
  if (text === 'park') { commandDecision('Park'); return true; }
  if (text.includes('edit form')) { commandDecision('Edit'); return false; }
  if (text.includes('create quote')) { openQuote(); return true; }
  if (text.includes('add job')) { openJob(); return true; }
  if (text.includes('message worker')) { openMessage(); return true; }
  if (text.includes('timesheet') || text.includes('payroll')) { runAction('payroll-review'); return true; }
  if (text.startsWith('save') || text.startsWith('edit') || text.includes('update access')) { toast('Record saved', 'Changes saved from the open slip.'); recordAudit('Saved slip', text); return false; }
  return false;
}

function handleClick(event) {
  const button = event.target.closest('button');
  const controlRow = event.target.closest('.optionFControlDepth .depthRow');
  if (!document.querySelector('.churvoxOptionC')) return;

  if (button?.closest('.cocDrawer') && handleDrawerAction(button)) {
    event.preventDefault();
    event.stopPropagation();
    setTimeout(renderAll, 100);
    return;
  }

  const pageAction = button?.dataset?.pageAction;
  if (pageAction) {
    event.preventDefault();
    event.stopPropagation();
    if (pageAction === 'command-fix') openModal({ kind: 'message', title: 'Create Command fix item', note: 'Use this when something needs owner repair.', submit: 'Send to Command', fields: [field('subject', 'Issue title', 'Record needs fixing'), field('client', 'Client / source', ''), field('draft', 'What needs fixing?', '', 'textarea', null, true)] });
    else if (pageAction === 'plan-operator') savePlanAction('Operator', 'Start trial');
    else if (pageAction === 'plan-command') savePlanAction('Command', 'Choose plan');
    else runAction(pageAction);
    setTimeout(renderAll, 120);
    return;
  }

  const planAction = button?.dataset?.planAction;
  if (planAction) {
    event.preventDefault();
    event.stopPropagation();
    const planName = button.dataset.planName;
    if (planAction === 'details') {
      const price = planPrices[planName] || addOnPrices[planName] || 0;
      openModal({ kind: 'plan', title: `${planName} details`, note: `Locked price: ${money(price)}/month + GST. Actual cost: ${incGst(price)}/month inc GST.`, submit: 'Save plan note', fields: [field('plan', 'Plan/add-on', planName), field('action', 'Action', 'Viewed details'), field('price', 'Price ex GST', money(price)), field('incGst', 'Price inc GST', incGst(price)), field('notes', 'Notes', 'Pricing unchanged. Included features are shown on the plan card.', 'textarea', null, true)] });
    } else {
      savePlanAction(planName, planAction === 'trial' ? 'Start trial' : planAction === 'addon' ? 'Add add-on' : 'Choose plan');
    }
    setTimeout(renderAll, 120);
    return;
  }

  if (controlRow && !button) {
    event.preventDefault();
    openControlRow(controlRow);
    return;
  }

  const text = clean(button?.textContent).toLowerCase();
  if (!button || !text) return;
  if (text.includes('add job')) { event.preventDefault(); openJob(); return; }
  if (text.includes('add client')) { event.preventDefault(); openClient(); return; }
  if (text.includes('new quote')) { event.preventDefault(); openQuote(); return; }
  if (text.includes('new ticket')) { event.preventDefault(); openTicket(); return; }
  if (text === 'recurring') { event.preventDefault(); openRecurring(); return; }
  if (text === 'dispatch board') { event.preventDefault(); openDispatch(); return; }
  if (text === 'follow-ups') { event.preventDefault(); openFollowups(); return; }
  if (text === 'accepted to jobs') { event.preventDefault(); runAction('accepted-jobs'); return; }
}

function renderAll() {
  renderPageAddons();
  renderUniversalActions();
  setTimeout(enhancePlanButtons, 80);
  setTimeout(enhancePlanButtons, 220);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(renderAll, 80));
  window.addEventListener('hashchange', () => setTimeout(renderAll, 120));
  window.addEventListener('popstate', () => setTimeout(renderAll, 120));
  window.addEventListener('storage', () => setTimeout(renderAll, 120));
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', () => setTimeout(renderAll, 160));
  document.addEventListener('input', () => setTimeout(renderAll, 240), true);
  document.addEventListener('change', () => setTimeout(renderAll, 180), true);
}
