// CHURVOX_OPTION_F_HARD_WIRING_20260629
// One runtime for page actions, saved records, Command routing, plan actions and exports.

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

const PAGE_STORE = 'churvox_option_f_page_actions_v2';
const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';
const STYLE_ID = 'option-f-hard-wiring-style';
const MODAL_ID = 'option-f-hard-wiring-modal';
const TOAST_ID = 'option-f-hard-wiring-toast';
const GST_RATE = 1.15;

const pageDefaults = { tickets: [], settings: {}, planActions: [], exports: [], audit: [] };
const mainDefaults = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
const opsDefaults = { audit: [], commandQueue: [], invoices: [], messages: [], workerDays: [], teamPeople: [] };
const planPrices = { Start: 39, Crew: 89, Operator: 149, Command: 299, 'Command Growth Pack': 99, 'Accounting Sync Add-on': 39 };

function read(key, fallback) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}')) }; } catch (_) { return { ...fallback }; }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('storage'));
}

function pageState() { return read(PAGE_STORE, pageDefaults); }
function savePageState(state) { write(PAGE_STORE, state); }
function mainState() { return read(MAIN_STORE, mainDefaults); }
function saveMainState(state) { write(MAIN_STORE, state); }
function opsState() { return read(OPS_STORE, opsDefaults); }
function saveOpsState(state) { write(OPS_STORE, state); }

function now() { return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }); }
function id(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`; }
function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function html(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function dollars(value) { return `$${Number(value || 0).toFixed(2).replace(/\.00$/, '')}`; }
function incGst(value) { return dollars(Number(value || 0) * GST_RATE); }

function currentPage() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? lower(active.textContent) : 'today';
}

function workspace() { return document.querySelector('.churvoxOptionC .workspace .cocPage'); }

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;right:18px;bottom:154px;z-index:1000003;max-width:390px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.22);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${TOAST_ID}.show{opacity:1;transform:translateY(0)}#${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.72);font-weight:800}
    #${MODAL_ID}{position:fixed;inset:0;z-index:1000002;display:grid;place-items:center;padding:24px;background:rgba(16,21,19,.42);backdrop-filter:blur(5px)}#${MODAL_ID}[hidden]{display:none}#${MODAL_ID} .hardModal{width:min(980px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.3)}#${MODAL_ID} header{display:flex;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}#${MODAL_ID} h2{margin:0;font-size:30px;line-height:1.05;letter-spacing:0}#${MODAL_ID} p{margin:6px 0 0;color:#52605a;font-size:13px;font-weight:850}#${MODAL_ID} .close{border:0;border-radius:999px;padding:9px 13px;background:#101513;color:#fff;font-weight:950;cursor:pointer}#${MODAL_ID} form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px 22px}#${MODAL_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}#${MODAL_ID} input,#${MODAL_ID} select,#${MODAL_ID} textarea{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif}#${MODAL_ID} textarea{min-height:96px;resize:vertical}#${MODAL_ID} label.full{grid-column:1/-1}#${MODAL_ID} .actions{grid-column:1/-1;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px solid rgba(16,21,19,.08)}#${MODAL_ID} .actions button{border:0;border-radius:999px;padding:11px 15px;background:#ea580c;color:#fff;font-weight:950;cursor:pointer}#${MODAL_ID} .actions .quiet{background:#eef2ed;color:#111815}
    .ofHardActions,.ofHardSaved,.ofHardCommand{display:grid;grid-column:1/-1;gap:10px;padding:14px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}.ofHardActions h3,.ofHardSaved h3,.ofHardCommand h3{margin:0;color:#111815;font-size:15px}.ofHardButtonGrid,.ofPlanActions{display:flex;flex-wrap:wrap;gap:9px}.ofHardButtonGrid button,.ofPlanActions button,.ofHardRow button{border:0;border-radius:999px;padding:10px 13px;background:#101513;color:#fff;font-size:12px;font-weight:950;cursor:pointer}.ofHardButtonGrid .primary,.ofPlanActions .primary,.ofHardRow button:first-child{background:#ea580c}.ofHardButtonGrid .blue{background:#0f3f56}.ofHardButtonGrid .light,.ofPlanActions .light{background:#eef2ed;color:#111815}.ofHardRows{display:grid;gap:8px}.ofHardRow{display:grid;grid-template-columns:150px 1fr auto;gap:10px;align-items:center;min-height:44px;padding:9px 10px;border:1px solid rgba(16,21,19,.07);border-radius:12px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:850}.ofHardRow b{color:#111815}.ofHardRow em{font-style:normal;color:#9a3412;font-weight:950}.ofHardRow .rowActions{display:flex;flex-wrap:wrap;gap:6px}.ofHardRow[data-status="approved"],.ofHardRow[data-status="parked"]{opacity:.58}.ofHardRow.clickable{cursor:pointer}.ofHardRow.clickable:hover{outline:2px solid rgba(234,88,12,.16)}.ofPlanCard.hasActions,.ofAddonCard.hasActions{padding-bottom:16px!important}.ofPlanActions{margin-top:6px;padding-top:10px;border-top:1px solid rgba(16,21,19,.08)}.ofPlanActions button{font-size:11px;padding:9px 11px}.optionFControlDepth .depthRow{cursor:pointer}.optionFControlDepth .depthRow:hover{outline:2px solid rgba(234,88,12,.16)}
    @media(max-width:720px){#${MODAL_ID} form{grid-template-columns:1fr}.ofHardRow{grid-template-columns:1fr}.ofHardButtonGrid button,.ofPlanActions button{flex:1}}
  `;
  document.head.appendChild(style);
}

function toast(title, detail = '') {
  ensureStyle();
  let node = document.getElementById(TOAST_ID);
  if (!node) { node = document.createElement('div'); node.id = TOAST_ID; document.body.appendChild(node); }
  node.innerHTML = `<b>${html(title)}</b>${detail ? `<small>${html(detail)}</small>` : ''}`;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 2800);
}

function field(name, label, value = '', type = 'text', options = null, full = false) {
  if (options) return `<label class="${full ? 'full' : ''}"><span>${html(label)}</span><select name="${name}">${options.map((option) => `<option value="${html(option)}" ${clean(option) === clean(value) ? 'selected' : ''}>${html(option)}</option>`).join('')}</select></label>`;
  if (type === 'textarea') return `<label class="${full ? 'full' : ''}"><span>${html(label)}</span><textarea name="${name}">${html(value)}</textarea></label>`;
  return `<label class="${full ? 'full' : ''}"><span>${html(label)}</span><input name="${name}" type="${type}" value="${html(value)}" /></label>`;
}

const options = {
  worker: ['Howard', 'Alex', 'Sam', 'Tui'],
  frequency: ['One-off', 'Weekly', 'Fortnightly', 'Monthly', 'Custom'],
  billing: ['Fixed price', 'Hourly', 'Fixed + extras', 'Hourly + extras', 'Package price', 'Quote required'],
  service: ['Lawn mowing', 'Hedge trimming', 'Property tidy', 'Cleanup', 'Quote visit', 'Other'],
  quoteStatus: ['Draft', 'Sent', 'Viewed', 'Accepted'],
  invoiceStatus: ['Draft', 'Due today', 'Overdue', 'Paid'],
  sync: ['Command approval', 'Xero ready', 'Not synced', 'Synced'],
  role: ['Owner', 'Manager', 'Worker', 'Subcontractor', 'Payroll only'],
  access: ['Full access', 'Jobs only', 'Worker app', 'Payroll review', 'No access'],
  app: ['Active', 'Invited', 'Paused'],
};

function formFields(kind, record = {}) {
  if (kind === 'job') return [field('title', 'Job name', record.title || 'New job'), field('client', 'Client', record.client || ''), field('address', 'Site address', record.address || ''), field('service', 'Service', record.service || 'Lawn mowing', 'text', options.service), field('worker', 'Assigned worker', record.worker || 'Howard', 'text', options.worker), field('date', 'Date', record.date || new Date().toISOString().slice(0, 10), 'date'), field('time', 'Time', record.time || '08:00', 'time'), field('price', 'Price NZD', record.price || '65', 'number'), field('billing', 'Billing type', record.billing || 'Fixed price', 'text', options.billing), field('recurring', 'Frequency', record.recurring || 'Fortnightly', 'text', options.frequency), field('notes', 'Notes', record.notes || '', 'textarea', null, true)];
  if (kind === 'client') return [field('name', 'Client name', record.name || ''), field('phone', 'Phone', record.phone || ''), field('email', 'Email', record.email || '', 'email'), field('address', 'Address', record.address || ''), field('service', 'Service memory', record.service || 'Fortnightly lawns'), field('price', 'Price memory', record.price || '$65 regular'), field('notes', 'Notes/access', record.notes || '', 'textarea', null, true)];
  if (kind === 'quote') return [field('title', 'Quote title', record.title || 'New quote'), field('client', 'Client', record.client || ''), field('amount', 'Amount NZD', record.amount || '180', 'number'), field('status', 'Status', record.status || 'Draft', 'text', options.quoteStatus), field('terms', 'Terms', record.terms || 'Valid 14 days'), field('followUp', 'Follow-up', record.followUp || 'Ready'), field('scope', 'Scope', record.scope || '', 'textarea', null, true)];
  if (kind === 'invoice') return [field('number', 'Invoice number', record.number || `INV-${Math.floor(1000 + Math.random() * 8999)}`), field('client', 'Client', record.client || ''), field('job', 'Job', record.job || ''), field('amount', 'Amount NZD', record.amount || '180', 'number'), field('due', 'Due date', record.due || new Date().toISOString().slice(0, 10), 'date'), field('status', 'Status', record.status || 'Draft', 'text', options.invoiceStatus), field('sync', 'Xero/MYOB status', record.sync || 'Command approval', 'text', options.sync), field('line', 'Line item', record.line || '', 'textarea', null, true), field('evidence', 'Proof/evidence', record.evidence || '', 'textarea', null, true)];
  if (kind === 'message') return [field('from', 'Thread type', record.from || 'Customer', 'text', ['Customer', 'Worker']), field('channel', 'Channel', record.channel || 'SMS', 'text', ['SMS', 'Email', 'Worker app']), field('client', 'Client', record.client || ''), field('job', 'Job', record.job || ''), field('subject', 'Subject', record.subject || 'Customer reply'), field('context', 'Thread context', record.context || record.detail || '', 'textarea', null, true), field('draft', 'Draft reply', record.draft || '', 'textarea', null, true)];
  if (kind === 'worker') return [field('worker', 'Worker', record.worker || record.name || 'Howard', 'text', options.worker), field('status', 'Clock status', record.status || 'Clocked in', 'text', ['Clocked in', 'Driving', 'Proof upload', 'Clocked out']), field('client', 'Client', record.client || ''), field('job', 'Current job', record.job || ''), field('gps', 'GPS/location', record.gps || ''), field('clockIn', 'Clock in', record.clockIn || record.start || '08:00', 'time'), field('clockOut', 'Clock out', record.clockOut || record.end || '', 'time'), field('hours', 'Timesheet hours', record.hours || record.timesheet || '7.5h'), field('proof', 'Proof/photos', record.proof || ''), field('slipStatus', 'Slip status', record.slipStatus || record.slip || 'Ready', 'text', ['Ready', 'Review', 'Pending', 'Issue']), field('payroll', 'Payroll', record.payroll || 'Ready', 'text', ['Ready', 'Review', 'Pending']), field('messages', 'Worker messages', record.messages || '', 'textarea', null, true), field('issue', 'Issue', record.issue || '', 'textarea', null, true)];
  if (kind === 'person') return [field('name', 'Name', record.name || ''), field('role', 'Role', record.role || 'Worker', 'text', options.role), field('access', 'Access', record.access || 'Worker app', 'text', options.access), field('app', 'Worker app', record.app || 'Active', 'text', options.app), field('payroll', 'Payroll review', record.payroll || 'Ready', 'text', ['Ready', 'Review', 'Pending']), field('hours', 'Timesheet', record.hours || record.timesheet || ''), field('currentJob', 'Current job', record.currentJob || record.job || ''), field('notes', 'Notes', record.notes || '', 'textarea', null, true)];
  if (kind === 'settings') return [field('businessName', 'Business name', record.businessName || 'Churvox business'), field('email', 'Public email', record.email || 'hello@churvox.com', 'email'), field('country', 'Country', record.country || 'New Zealand'), field('gst', 'GST', record.gst || '15%'), field('defaultRepeat', 'Default repeat', record.defaultRepeat || 'Fortnightly', 'text', options.frequency.slice(1)), field('defaultBilling', 'Default billing', record.defaultBilling || 'Fixed + extras', 'text', options.billing), field('proofRequirement', 'Proof requirement', record.proofRequirement || 'Photos + notes'), field('notifications', 'Notifications', record.notifications || 'On', 'text', ['On', 'Owner only', 'Off'])];
  if (kind === 'ticket') return [field('area', 'Area', record.area || 'Setup', 'text', ['Setup', 'Billing', 'Worker app', 'CSV import', 'Xero', 'Plans', 'Other']), field('priority', 'Priority', record.priority || 'Normal', 'text', ['Normal', 'Urgent', 'Stuck']), field('contact', 'Contact email', record.contact || 'hello@churvox.com', 'email'), field('message', 'What is happening?', record.message || '', 'textarea', null, true)];
  if (kind === 'plan') return [field('plan', 'Plan/add-on', record.plan || 'Operator'), field('action', 'Action', record.action || 'Choose plan'), field('price', 'Price ex GST', record.price || ''), field('incGst', 'Price inc GST', record.incGst || ''), field('notes', 'Notes', record.notes || 'Pricing unchanged.', 'textarea', null, true)];
  return [field('title', 'Title', record.title || 'Record'), field('detail', 'Detail', record.detail || '', 'textarea', null, true)];
}

function openModal(kind, title, note, record = {}) {
  ensureStyle();
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.hidden = true;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target.id === MODAL_ID || event.target.closest('[data-close]')) closeModal(); });
    modal.addEventListener('submit', handleSubmit);
  }
  modal.innerHTML = `<section class="hardModal"><header><div><h2>${html(title)}</h2><p>${html(note || '')}</p></div><button type="button" class="close" data-close>Close</button></header><form data-kind="${html(kind)}">${formFields(kind, record).join('')}<div class="actions"><button type="button" class="quiet" data-close>Cancel</button><button type="submit">Save</button></div></form></section>`;
  modal.hidden = false;
  modal.querySelector('input,select,textarea')?.focus();
}

function closeModal() { const modal = document.getElementById(MODAL_ID); if (modal) modal.hidden = true; }
function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }

function missingFor(kind, data) {
  const missing = [];
  const value = (name) => clean(data[name]);
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

function listKey(kind) {
  if (kind === 'client') return 'clients';
  if (kind === 'quote') return 'quotes';
  if (kind === 'invoice') return 'invoices';
  if (kind === 'message') return 'messages';
  if (kind === 'worker' || kind === 'person') return 'workers';
  return 'jobs';
}

function queueCommand(item) {
  const payload = { id: id('command'), status: 'waiting', owner: item.owner || 'Edit', createdAt: now(), ...item };
  const main = mainState();
  const ops = opsState();
  main.command = [payload, ...(main.command || [])].slice(0, 140);
  main.audit = [{ action: 'Sent to Command', detail: `${payload.type}: ${payload.title}`, at: now() }, ...(main.audit || [])].slice(0, 90);
  ops.commandQueue = [payload, ...(ops.commandQueue || [])].slice(0, 140);
  ops.audit = [{ action: 'Sent to Command', detail: `${payload.type}: ${payload.title}`, at: now() }, ...(ops.audit || [])].slice(0, 90);
  saveMainState(main);
  saveOpsState(ops);
  toast('Sent to Command', `${payload.type}: ${payload.title}`);
}

function saveRecord(kind, data) {
  const main = mainState();
  const key = listKey(kind);
  const missing = missingFor(kind, data);
  const payload = { id: id(kind), ...data, createdAt: now(), _commandMissing: missing.join(', '), _blockedByCommand: Boolean(missing.length), _doNotShowToday: kind === 'job' && Boolean(missing.length) };
  main[key] = [payload, ...(main[key] || [])].slice(0, 90);
  main.audit = [{ action: `Saved ${kind}`, detail: data.title || data.name || data.subject || data.number || data.client || 'record', at: now() }, ...(main.audit || [])].slice(0, 90);
  saveMainState(main);

  if (missing.length) {
    queueCommand({ type: `${kind[0].toUpperCase()}${kind.slice(1)} fix needed`, title: data.title || data.name || data.subject || data.number || data.client || `${kind} record`, client: data.client || data.name || 'Not set', owner: 'Edit', sourceType: kind, sourceId: payload.id, missing: missing.join(', '), filled: `Churvox saved what it could. Missing ${missing.join(', ')} must be fixed before this is usable.`, evidence: 'Created from hard-wired page action.', check: 'Fix the missing fields or park this in Command.' });
  } else if (kind === 'quote') {
    queueCommand({ type: 'Quote ready', title: data.title || 'Quote', client: data.client, amount: data.amount, owner: 'Approve', sourceType: 'quote', sourceId: payload.id, filled: data.scope || 'Quote prepared.', evidence: data.terms || 'Quote details complete.', check: 'Approve or edit in Command before sending.' });
  } else if (kind === 'invoice') {
    queueCommand({ type: 'Invoice ready', title: data.number || data.job || 'Invoice', client: data.client, amount: data.amount, owner: 'Approve', sourceType: 'invoice', sourceId: payload.id, filled: data.line || 'Invoice draft prepared.', evidence: data.evidence || 'Invoice details complete.', check: 'Approve or edit in Command before sending/sync.' });
  } else if (kind === 'message') {
    queueCommand({ type: 'Message ready', title: data.subject || 'Draft reply', client: data.client, owner: 'Approve', sourceType: 'message', sourceId: payload.id, filled: data.draft || 'Message drafted.', evidence: data.context || data.channel || 'Message thread complete.', check: 'Approve or edit wording in Command before sending.' });
  } else if ((kind === 'worker' || kind === 'person') && /review|pending|issue|check/i.test(`${data.payroll || ''} ${data.slipStatus || ''} ${data.issue || ''}`)) {
    queueCommand({ type: 'Timesheet/proof/slip issue', title: data.worker || data.name || 'Worker day', client: data.client || 'Worker', owner: 'Edit', sourceType: kind, sourceId: payload.id, filled: data.issue || 'Worker record needs review.', evidence: `${data.hours || ''} ${data.proof || ''}`.trim(), check: 'Fix time/proof/slip or park until worker confirms.' });
  }

  toast(`${kind[0].toUpperCase()}${kind.slice(1)} saved`, missing.length ? `Missing ${missing.join(', ')} sent to Command.` : 'Record saved and routed to the next step.');
}

function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const kind = form.dataset.kind;
  const data = { ...formObject(form), savedAt: now() };
  if (kind === 'settings') {
    const state = pageState();
    state.settings = { ...state.settings, ...data, savedAt: now() };
    state.audit = [{ action: 'Saved settings', detail: data.businessName || 'Business controls', at: now() }, ...(state.audit || [])].slice(0, 80);
    savePageState(state);
    toast('Settings saved', 'Business controls updated.');
  } else if (kind === 'ticket') {
    const state = pageState();
    state.tickets = [{ id: id('ticket'), ...data }, ...(state.tickets || [])].slice(0, 50);
    savePageState(state);
    toast('Ticket saved', data.area || 'Support');
  } else if (kind === 'plan') {
    const state = pageState();
    state.planActions = [{ id: id('plan'), ...data, at: now() }, ...(state.planActions || [])].slice(0, 50);
    savePageState(state);
    toast('Plan action saved', `${data.plan || 'Plan'} - ${data.action || 'saved'}`);
  } else if (kind === 'commandFix') {
    queueCommand({ type: data.type || 'Fix needed', title: data.title || 'Record needs fixing', client: data.client || 'Not set', owner: 'Edit', filled: data.detail || 'Owner fix required.', evidence: 'Created from Command action.', check: 'Edit, approve or park in Command.' });
  } else {
    saveRecord(kind, data);
  }
  closeModal();
  renderHardWiring();
}

function openAction(action) {
  if (action === 'add-job') return openModal('job', 'Add job', 'Complete jobs can appear on Today. Missing date/time/worker goes to Command.');
  if (action === 'add-client') return openModal('client', 'Add client', 'Save contact details, service memory, price memory and notes.');
  if (action === 'new-quote') return openModal('quote', 'New quote', 'Quote approval and sending stay in Command.');
  if (action === 'draft-invoice') return openModal('invoice', 'Draft invoice', 'Invoice approval and sync decisions stay in Command.');
  if (action === 'draft-message') return openModal('message', 'Draft message', 'Sending approval stays in Command.');
  if (action === 'worker-day') return openModal('worker', 'Worker day slip', 'Clock times, GPS, proof, messages and slip status.');
  if (action === 'person') return openModal('person', 'Team person', 'Role, access, worker app and payroll state.');
  if (action === 'settings') return openModal('settings', 'Business controls', 'Business defaults and operating rules.');
  if (action === 'ticket') return openModal('ticket', 'New help ticket', 'Save a support ticket.');
  if (action === 'command-fix') return openModal('commandFix', 'Create Command fix item', 'Create a real Command item for something the owner needs to repair.', { type: 'Fix needed', title: 'Record needs fixing', client: '', detail: '' });
  if (action === 'recurring') return openModal('job', 'Recurring job', 'Save the recurring job rule as a job record.', { recurring: 'Fortnightly' });
  if (action === 'dispatch') return openModal('job', 'Dispatch job', 'Plan a job/run. Maps stay on Workers.', { title: 'Dispatch run', service: 'Route planning' });
  if (action === 'followup') return queueCommand({ type: 'Quote follow-up ready', title: 'Quote follow-up', client: 'Client', owner: 'Approve', filled: 'Follow-up message prepared.', evidence: 'Follow-up action clicked.', check: 'Approve or edit in Command.' });
  if (action === 'accepted-jobs') return queueCommand({ type: 'Job fix needed', title: 'Accepted quote job shell', client: 'Accepted quote client', owner: 'Edit', filled: 'Accepted quote prepared as a job shell.', evidence: 'Accepted quote action clicked.', check: 'Add date, time and assigned worker before Today.' });
  if (action === 'queue-sync') return queueCommand({ type: 'Invoice sync ready', title: 'Draft invoice sync', client: 'Invoice ledger', owner: 'Approve', filled: 'Draft invoice ready for accounting sync.', evidence: 'Sync action clicked.', check: 'Owner-approved draft sync only. No tax filing. No payout files.' });
  if (action === 'queue-message') return queueCommand({ type: 'Message ready', title: 'Draft reply', client: 'Customer', owner: 'Approve', filled: 'Message draft ready for approval.', evidence: 'Message action clicked.', check: 'Approve or edit wording in Command.' });
  if (action === 'payroll-review') return queueCommand({ type: 'Timesheet/proof/slip issue', title: 'Payroll review', client: 'Worker day', owner: 'Edit', filled: 'Payroll/slip review opened.', evidence: 'Worker timesheet or proof needs owner check.', check: 'Fix or park in Command.' });
  if (action === 'run-today') return queueCommand({ type: 'Today check complete', title: 'Today readiness', client: 'Today', owner: 'Edit', filled: 'Churvox checked Today. Incomplete jobs stay out until fixed.', evidence: 'Jobs need client, worker, date, time, service and price.', check: 'Review any missing details in Command.' });
  if (action === 'open-command') { window.history.replaceState({}, '', '/dashboard#command'); window.dispatchEvent(new HashChangeEvent('hashchange')); return undefined; }
  if (action.startsWith('export-')) return exportData(action.replace('export-', '') || currentPage());
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
  xero: [['queue-sync', 'Queue draft sync', 'primary'], ['settings', 'Open guardrails', 'blue'], ['export-xero', 'Export sync log', 'light']],
  settings: [['settings', 'Save controls', 'primary'], ['export-settings', 'Export settings', 'light'], ['ticket', 'Setup help', 'blue']],
  plans: [['plan-operator', 'Start Operator trial', 'primary'], ['plan-command', 'Choose Command', 'blue'], ['ticket', 'Ask billing question', 'light']],
  help: [['ticket', 'New ticket', 'primary'], ['settings', 'Setup controls', 'blue'], ['export-help', 'Export support pack', 'light']],
};

function exportData(name) {
  const state = pageState();
  const payload = { exportedAt: now(), name, page: currentPage(), pageActions: state, workspace: mainState(), operations: opsState() };
  state.exports = [{ name, at: payload.exportedAt }, ...(state.exports || [])].slice(0, 50);
  savePageState(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `churvox-${name}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast('Export ready', `churvox-${name}.json`);
}

function rowTitle(kind, item) { return item.title || item.name || item.worker || item.subject || item.number || item.client || `${kind} record`; }
function rowMeta(kind, item) { return item.client || item.job || item.service || item.status || item.createdAt || item.savedAt || 'saved'; }
function rowTag(kind, item) { return item.amount ? dollars(item.amount) : item.price || item.sync || item.recurring || item.payroll || item.status || 'Saved'; }

function recordsForPage(pageName, main) {
  if (pageName === 'jobs' || pageName === 'today') return ['job', main.jobs || []];
  if (pageName === 'clients') return ['client', main.clients || []];
  if (pageName === 'quotes') return ['quote', main.quotes || []];
  if (pageName === 'invoices' || pageName === 'xero') return ['invoice', main.invoices || []];
  if (pageName === 'messages') return ['message', main.messages || []];
  if (pageName === 'workers') return ['worker', main.workers || []];
  if (pageName === 'team') return ['person', main.workers || []];
  return ['', []];
}

function renderActions(root, pageName) {
  const actions = actionMap[pageName] || [];
  if (!actions.length) return;
  const node = document.createElement('section');
  node.className = 'ofHardActions';
  node.innerHTML = `<h3>Page actions</h3><div class="ofHardButtonGrid">${actions.map(([key, label, tone]) => `<button type="button" class="${tone || ''}" data-hard-action="${html(key)}">${html(label)}</button>`).join('')}</div>`;
  root.appendChild(node);
}

function renderSaved(root, pageName) {
  const main = mainState();
  const [kind, rows] = recordsForPage(pageName, main);
  if (!kind || !rows.length) return;
  const body = rows.slice(0, 8).map((item, index) => `<div class="ofHardRow clickable" data-open-saved="${html(kind)}" data-open-index="${index}"><b>${html(rowTitle(kind, item))}</b><span>${html(rowMeta(kind, item))}${item._commandMissing ? ` - missing ${html(item._commandMissing)}` : ''}</span><em>${html(rowTag(kind, item))}</em></div>`).join('');
  const node = document.createElement('section');
  node.className = 'ofHardSaved';
  node.innerHTML = `<h3>Saved ${kind === 'person' ? 'team' : kind} records</h3><div class="ofHardRows">${body}</div>`;
  root.appendChild(node);
}

function renderCommand(root) {
  const queue = [...(mainState().command || []), ...(opsState().commandQueue || [])];
  const seen = new Set();
  const rows = queue.filter((item) => {
    const key = item.id || `${item.type}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
  const body = rows.map((item) => `<div class="ofHardRow" data-status="${html(item.status)}"><b>${html(item.type || 'Command item')}</b><span>${html(item.title || item.filled || '')}</span><span class="rowActions"><button type="button" data-command-id="${html(item.id)}" data-command-status="approved">Approve</button><button type="button" data-command-id="${html(item.id)}" data-command-status="edit">Edit</button><button type="button" data-command-id="${html(item.id)}" data-command-status="parked">Park</button></span></div>`).join('') || '<div class="ofHardRow"><b>No runtime items</b><span>Invoices, messages, missing info and slip issues land here.</span><em>Ready</em></div>';
  const node = document.createElement('section');
  node.className = 'ofHardCommand';
  node.innerHTML = `<h3>Live Command queue</h3><div class="ofHardRows">${body}</div>`;
  root.appendChild(node);
}

function enhancePlans() {
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

function savePlanAction(name, action) {
  const price = planPrices[name] || 0;
  const state = pageState();
  const item = { id: id('plan'), plan: name, action, price: dollars(price), incGst: incGst(price), at: now() };
  state.planActions = [item, ...(state.planActions || [])].slice(0, 50);
  savePageState(state);
  toast('Plan action saved', `${name}: ${action}. ${dollars(price)} + GST / ${incGst(price)} inc GST.`);
}

function updateCommandStatus(commandId, status) {
  if (status === 'edit') {
    openModal('commandFix', 'Edit Command item', 'Add the owner note or correction.', { title: commandId || 'Command item', type: 'Edited Command item', detail: '' });
    return;
  }
  const update = (item) => item.id === commandId ? { ...item, status, decidedAt: now() } : item;
  const main = mainState();
  const ops = opsState();
  main.command = (main.command || []).map(update);
  ops.commandQueue = (ops.commandQueue || []).map(update);
  main.audit = [{ action: status === 'approved' ? 'Approved Command item' : 'Parked Command item', detail: commandId, at: now() }, ...(main.audit || [])].slice(0, 90);
  saveMainState(main);
  saveOpsState(ops);
  toast(`Command item ${status}`, 'Owner decision saved.');
  renderHardWiring();
}

function collectDrawerRecord(drawer) {
  const data = {};
  drawer.querySelectorAll('.cocField').forEach((label) => {
    const name = clean(label.querySelector('span')?.textContent).replace(/\s+/g, '_').toLowerCase();
    const input = label.querySelector('input,textarea,select');
    if (name && input) data[name] = input.value;
  });
  return data;
}

function handleDrawerButton(button) {
  const text = lower(button.textContent);
  const onCommand = currentPage() === 'command';
  if (['approve', 'park'].includes(text) && onCommand) { updateCommandStatus('', text === 'approve' ? 'approved' : 'parked'); return true; }
  if (text.includes('edit form') && onCommand) return false;
  if (text.includes('create quote')) { openAction('new-quote'); return true; }
  if (text.includes('add job')) { openAction('add-job'); return true; }
  if (text.includes('message worker')) { openAction('draft-message'); return true; }
  if (text.includes('timesheet') || text.includes('payroll')) { openAction('payroll-review'); return true; }
  if (text.startsWith('save') || text.includes('update access')) {
    const drawer = button.closest('.cocDrawer');
    const data = collectDrawerRecord(drawer);
    const title = clean(drawer?.querySelector('h2')?.textContent).toLowerCase();
    const kind = title.includes('client') ? 'client' : title.includes('invoice') ? 'invoice' : title.includes('quote') ? 'quote' : title.includes('message') ? 'message' : title.includes('worker') || title.includes('timesheet') ? 'worker' : title.includes('person') ? 'person' : 'job';
    saveRecord(kind, data);
    return true;
  }
  return false;
}

function openSaved(kind, index) {
  const main = mainState();
  const key = listKey(kind);
  const item = (main[key] || [])[Number(index)];
  if (!item) return;
  openModal(kind, `Edit ${kind}`, 'Saved record opened for editing.', item);
}

function openControlRow(row) {
  const cols = Array.from(row.children).map((child) => clean(child.textContent));
  openModal('settings', cols[0] || 'Control', 'Control detail opened from this page.', { businessName: cols[0] || 'Control', proofRequirement: cols[1] || '', notifications: cols[2] || 'On' });
}

function handleClick(event) {
  if (!document.querySelector('.churvoxOptionC')) return;
  const button = event.target.closest('button');
  const saved = event.target.closest('[data-open-saved]');
  const controlRow = event.target.closest('.optionFControlDepth .depthRow');

  if (saved) { event.preventDefault(); openSaved(saved.dataset.openSaved, saved.dataset.openIndex); return; }

  if (button?.closest('.cocDrawer') && handleDrawerButton(button)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const commandId = button?.dataset?.commandId;
  if (commandId !== undefined && currentPage() === 'command') {
    event.preventDefault();
    event.stopPropagation();
    updateCommandStatus(commandId, button.dataset.commandStatus);
    return;
  }

  const hardAction = button?.dataset?.hardAction;
  if (hardAction) {
    event.preventDefault();
    event.stopPropagation();
    if (hardAction === 'plan-operator') savePlanAction('Operator', 'Start trial');
    else if (hardAction === 'plan-command') savePlanAction('Command', 'Choose plan');
    else openAction(hardAction);
    setTimeout(renderHardWiring, 80);
    return;
  }

  const planAction = button?.dataset?.planAction;
  if (planAction) {
    event.preventDefault();
    event.stopPropagation();
    const name = button.dataset.planName;
    if (planAction === 'details') {
      const price = planPrices[name] || 0;
      openModal('plan', `${name} details`, `Locked price: ${dollars(price)}/month + GST. Actual cost: ${incGst(price)}/month inc GST.`, { plan: name, action: 'Viewed details', price: dollars(price), incGst: incGst(price), notes: 'Pricing unchanged. Inclusions are shown on the plan card.' });
    } else {
      savePlanAction(name, planAction === 'trial' ? 'Start trial' : planAction === 'addon' ? 'Add add-on' : 'Choose plan');
    }
    return;
  }

  if (controlRow && !button) { event.preventDefault(); openControlRow(controlRow); return; }

  const label = lower(button?.textContent);
  if (!label) return;
  if (label.includes('add job')) { event.preventDefault(); openAction('add-job'); return; }
  if (label.includes('add client')) { event.preventDefault(); openAction('add-client'); return; }
  if (label.includes('new quote')) { event.preventDefault(); openAction('new-quote'); return; }
  if (label.includes('new ticket')) { event.preventDefault(); openAction('ticket'); return; }
  if (label === 'recurring') { event.preventDefault(); openAction('recurring'); return; }
  if (label === 'dispatch board') { event.preventDefault(); openAction('dispatch'); return; }
  if (label === 'follow-ups') { event.preventDefault(); openAction('followup'); return; }
  if (label === 'accepted to jobs') { event.preventDefault(); openAction('accepted-jobs'); return; }
}

function renderHardWiring() {
  ensureStyle();
  const root = workspace();
  if (!root) return;
  root.querySelectorAll('.ofHardActions,.ofHardSaved,.ofHardCommand').forEach((node) => node.remove());
  const pageName = currentPage();
  if (pageName === 'command') renderCommand(root);
  renderActions(root, pageName);
  renderSaved(root, pageName);
  setTimeout(enhancePlans, 60);
  setTimeout(enhancePlans, 220);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(renderHardWiring, 80));
  window.addEventListener('hashchange', () => setTimeout(renderHardWiring, 120));
  window.addEventListener('popstate', () => setTimeout(renderHardWiring, 120));
  window.addEventListener('storage', () => setTimeout(renderHardWiring, 120));
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', () => setTimeout(renderHardWiring, 150));
  document.addEventListener('input', () => setTimeout(renderHardWiring, 220), true);
  document.addEventListener('change', () => setTimeout(renderHardWiring, 160), true);
}
