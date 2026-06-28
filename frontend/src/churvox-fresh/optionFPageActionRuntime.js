// CHURVOX_OPTION_F_DEEP_WIRING_20260629
// Hard-wires page actions, Command decisions, safe missing-info fill, plans, exports and editable slips.

function installOptionFRefreshGuard() {
  if (typeof window === 'undefined' || window.__churvoxOptionFRefreshGuard) return;
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const blockedDelays = new Set([1000, 1200, 1600, 1800, 2400, 2500, 3000, 4200]);
  const blockedHandles = new Set();
  let nextBlockedHandle = 900000;

  window.__churvoxOptionFRefreshGuard = true;
  window.setInterval = (handler, delay, ...args) => {
    if (blockedDelays.has(Number(delay))) {
      const handle = nextBlockedHandle += 1;
      blockedHandles.add(handle);
      return handle;
    }
    return nativeSetInterval(handler, delay, ...args);
  };
  window.clearInterval = (handle) => {
    if (blockedHandles.delete(handle)) return undefined;
    return nativeClearInterval(handle);
  };
  window.setTimeout(() => {
    if (window.__churvoxOptionFRefreshGuard) {
      window.setInterval = nativeSetInterval;
      window.clearInterval = nativeClearInterval;
    }
  }, 8000);
}

installOptionFRefreshGuard();

const PAGE_STORE = 'churvox_option_f_page_actions_v2';
const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';
const STYLE_ID = 'option-f-deep-wiring-style';
const MODAL_ID = 'option-f-deep-wiring-modal';
const TOAST_ID = 'option-f-deep-wiring-toast';
const GST_RATE = 1.15;

const pageDefaults = { tickets: [], settings: {}, planActions: [], exports: [], audit: [] };
const mainDefaults = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
const opsDefaults = { audit: [], commandQueue: [], invoices: [], messages: [], workerDays: [], teamPeople: [] };

const planData = {
  Start: { price: 39, includes: ['Jobs, clients, quotes and invoices', 'Basic Today view', 'Manual owner approvals'] },
  Crew: { price: 89, includes: ['Everything in Start', 'Worker app records', 'Team and timesheet review'] },
  Operator: { price: 149, includes: ['Most Popular', 'Churvox prepares admin', 'Quotes, invoices and replies prepared for approval'] },
  Command: { price: 299, includes: ['Full approval OS', 'Command approval desk', 'Accounting sync option'] },
  'Command Growth Pack': { price: 99, includes: ['Adds 50 active team members', 'Extra operating capacity'] },
  'Accounting Sync Add-on': { price: 39, includes: ['For non-Command tiers where available', 'Draft sync only'] },
};

const pickLists = {
  workers: ['Howard', 'Alex', 'Sam', 'Tui'],
  frequency: ['One-off', 'Weekly', 'Fortnightly', 'Monthly', 'Custom'],
  service: ['Lawn mowing', 'Hedge trimming', 'Property tidy', 'Cleanup', 'Quote visit', 'Other'],
  billing: ['Fixed price', 'Hourly', 'Fixed + extras', 'Hourly + extras', 'Package price', 'Quote required'],
  quoteStatus: ['Draft', 'Sent', 'Viewed', 'Accepted'],
  invoiceStatus: ['Draft', 'Due today', 'Overdue', 'Paid'],
  sync: ['Command approval', 'Xero ready', 'Not synced', 'Synced'],
  clock: ['Clocked in', 'Driving', 'Proof upload', 'Clocked out'],
  slip: ['Ready', 'Review', 'Pending', 'Issue'],
  role: ['Owner', 'Manager', 'Worker', 'Subcontractor', 'Payroll only'],
  access: ['Full access', 'Jobs only', 'Worker app', 'Payroll review', 'No access'],
  app: ['Active', 'Invited', 'Paused'],
};

function load(key, fallback) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}')) }; } catch (_) { return { ...fallback }; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function pageState() { return load(PAGE_STORE, pageDefaults); }
function mainState() { return load(MAIN_STORE, mainDefaults); }
function opsState() { return load(OPS_STORE, opsDefaults); }
function savePageState(value) { save(PAGE_STORE, value); }
function saveMainState(value) { save(MAIN_STORE, value); }
function saveOpsState(value) { save(OPS_STORE, value); }
function now() { return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }); }
function uid(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`; }
function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function moneyNumber(value) { const n = Number(clean(value).replace(/[^0-9.-]/g, '') || 0); return Number.isFinite(n) ? n : 0; }
function money(value) { return `$${Number(value || 0).toFixed(2).replace(/\.00$/, '')}`; }
function incGst(value) { return money(Number(value || 0) * GST_RATE); }
function esc(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function hash(value) { let out = 0; const input = String(value || ''); for (let i = 0; i < input.length; i += 1) out = ((out << 5) - out) + input.charCodeAt(i) | 0; return Math.abs(out); }
function first(record, keys) { for (const key of keys) { if (record?.[key] !== undefined && clean(record[key])) return clean(record[key]); } return ''; }
function blank(value) { const v = lower(value); return !v || ['none', 'not set', 'not saved', 'undefined', 'null', 'still working', 'no customer'].includes(v); }

function page() {
  const hashValue = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hashValue) return hashValue;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? lower(active.textContent) : 'today';
}
function workspace() { return document.querySelector('.churvoxOptionC .workspace .cocPage'); }
function kindList(kind) { return kind === 'client' ? 'clients' : kind === 'quote' ? 'quotes' : kind === 'invoice' ? 'invoices' : kind === 'message' ? 'messages' : kind === 'worker' || kind === 'person' ? 'workers' : 'jobs'; }
function sourceKind(value) { const v = lower(value).replace(/s$/, ''); return ['job', 'client', 'quote', 'invoice', 'message', 'worker', 'person'].includes(v) ? v : 'job'; }
function titleFor(kind, record) { return first(record, ['title', 'name', 'worker', 'subject', 'number', 'client', 'job']) || `${kind} record`; }

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;right:18px;bottom:88px;z-index:1000005;max-width:390px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${TOAST_ID}.show{opacity:1;transform:translateY(0)}#${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.72);font-weight:800}
    #${MODAL_ID}{position:fixed;inset:0;z-index:1000004;display:grid;place-items:center;padding:24px;background:rgba(16,21,19,.44);backdrop-filter:blur(5px)}#${MODAL_ID}[hidden]{display:none}#${MODAL_ID} .wireModal{width:min(1040px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.32)}#${MODAL_ID} header{display:flex;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}#${MODAL_ID} h2{margin:0;font-size:31px;line-height:1.05;letter-spacing:0}#${MODAL_ID} p{margin:7px 0 0;color:#52605a;font-size:13px;font-weight:850}#${MODAL_ID} .close{border:0;border-radius:999px;padding:9px 13px;background:#101513;color:#fff;font-weight:950;cursor:pointer}#${MODAL_ID} form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px 22px}#${MODAL_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}#${MODAL_ID} input,#${MODAL_ID} select,#${MODAL_ID} textarea{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif}#${MODAL_ID} textarea{min-height:98px;resize:vertical}#${MODAL_ID} label.full{grid-column:1/-1}#${MODAL_ID} label.problem input,#${MODAL_ID} label.problem select,#${MODAL_ID} label.problem textarea{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.12)}#${MODAL_ID} label.problem span{color:#991b1b}.wireProblemBox{grid-column:1/-1;border-radius:14px;padding:12px 14px;background:#fff1f2;color:#991b1b;font-weight:900;font-size:13px}.wireAiBox{grid-column:1/-1;border-radius:14px;padding:12px 14px;background:#eef7ff;color:#075985;font-weight:900;font-size:13px}.wireActions{grid-column:1/-1;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px solid rgba(16,21,19,.08)}.wireActions button{border:0;border-radius:999px;padding:11px 15px;background:#ea580c;color:#fff;font-weight:950;cursor:pointer}.wireActions .quiet{background:#eef2ed;color:#111815}
    .ofHardActions,.ofHardSaved,.ofHardCommand,.ofHardAudit{display:grid;grid-column:1/-1;gap:10px;padding:14px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}.ofHardActions h3,.ofHardSaved h3,.ofHardCommand h3,.ofHardAudit h3{margin:0;color:#111815;font-size:15px}.ofHardButtonGrid,.ofPlanActions{display:flex;flex-wrap:wrap;gap:9px}.ofHardButtonGrid button,.ofPlanActions button,.ofHardRow button{border:0;border-radius:999px;padding:10px 13px;background:#101513;color:#fff;font-size:12px;font-weight:950;cursor:pointer}.ofHardButtonGrid .primary,.ofPlanActions .primary,.ofHardRow button:first-child{background:#ea580c}.ofHardButtonGrid .blue{background:#0f3f56}.ofHardButtonGrid .light,.ofPlanActions .light{background:#eef2ed;color:#111815}.ofHardRows{display:grid;gap:8px}.ofHardRow{display:grid;grid-template-columns:160px 1fr auto;gap:10px;align-items:center;min-height:44px;padding:9px 10px;border:1px solid rgba(16,21,19,.07);border-radius:12px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:850}.ofHardRow b{color:#111815}.ofHardRow em{font-style:normal;color:#9a3412;font-weight:950}.ofHardRow .rowActions{display:flex;flex-wrap:wrap;gap:6px}.ofHardRow[data-status="approved"],.ofHardRow[data-status="parked"]{opacity:.58}.ofHardRow.problem{border-color:rgba(239,68,68,.35);background:#fff7f7}.ofHardRow.clickable{cursor:pointer}.ofHardRow.clickable:hover{outline:2px solid rgba(234,88,12,.16)}.ofPlanCard.hasActions,.ofAddonCard.hasActions{padding-bottom:16px!important}.ofPlanActions{margin-top:8px;padding-top:10px;border-top:1px solid rgba(16,21,19,.08)}.ofPlanActions button{font-size:11px;padding:9px 11px}.ofPlanIncluded{display:grid;gap:4px;margin:10px 0 0;padding:0;list-style:none;color:#52605a;font-size:11px;font-weight:850}.ofPlanIncluded li::before{content:'- ';color:#ea580c;font-weight:950}.ofPlanGst{margin-top:4px;color:#111815;font-size:12px;font-weight:950}.optionFControlDepth .depthRow{cursor:pointer}.optionFControlDepth .depthRow:hover{outline:2px solid rgba(234,88,12,.16)}
    @media(max-width:720px){#${MODAL_ID}{padding:10px}#${MODAL_ID} form{grid-template-columns:1fr}#${MODAL_ID} h2{font-size:25px}.ofHardRow{grid-template-columns:1fr}.ofHardButtonGrid button,.ofPlanActions button{flex:1}#${TOAST_ID}{left:10px;right:10px;bottom:12px;max-width:none}}
  `;
  document.head.appendChild(style);
}

function toast(title, detail = '') {
  ensureStyle();
  let node = document.getElementById(TOAST_ID);
  if (!node) { node = document.createElement('div'); node.id = TOAST_ID; document.body.appendChild(node); }
  node.innerHTML = `<b>${esc(title)}</b>${detail ? `<small>${esc(detail)}</small>` : ''}`;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 2800);
}

function inputField(name, label, value = '', type = 'text', options = null, full = false, problems = []) {
  const problem = problems.includes(name) || problems.includes(label.toLowerCase());
  const cls = `${full ? 'full ' : ''}${problem ? 'problem' : ''}`.trim();
  if (options) return `<label class="${cls}"><span>${esc(label)}</span><select name="${name}">${options.map((option) => `<option value="${esc(option)}" ${clean(option) === clean(value) ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select></label>`;
  if (type === 'textarea') return `<label class="${cls}"><span>${esc(label)}</span><textarea name="${name}">${esc(value)}</textarea></label>`;
  return `<label class="${cls}"><span>${esc(label)}</span><input name="${name}" type="${type}" value="${esc(value)}" /></label>`;
}

function fields(kind, record = {}, problems = []) {
  if (kind === 'job') return [
    inputField('title', 'Job name', record.title || record['Job name'] || 'New job', 'text', null, false, problems),
    inputField('client', 'Client', record.client || record.Client || '', 'text', null, false, problems),
    inputField('address', 'Site address', record.address || record.Address || record.site_address || '', 'text', null, false, problems),
    inputField('service', 'Service', record.service || record.Service || 'Lawn mowing', 'text', pickLists.service, false, problems),
    inputField('worker', 'Assigned worker', record.worker || record['Assigned worker'] || 'Howard', 'text', pickLists.workers, false, problems),
    inputField('date', 'Date', record.date || record['Scheduled date'] || '', 'date', null, false, problems),
    inputField('time', 'Time', record.time || record['Start time'] || '', 'time', null, false, problems),
    inputField('duration', 'Duration', record.duration || '1h'),
    inputField('price', 'Price NZD', record.price || record.amount || '', 'number', null, false, problems),
    inputField('billing', 'Billing type', record.billing || 'Fixed price', 'text', pickLists.billing, false, problems),
    inputField('recurring', 'Frequency', record.recurring || record.Frequency || 'Fortnightly', 'text', pickLists.frequency, false, problems),
    inputField('notes', 'Notes / proof / access', record.notes || record.issue || '', 'textarea', null, true, problems),
  ];
  if (kind === 'client') return [
    inputField('name', 'Client name', record.name || record.Name || '', 'text', null, false, problems), inputField('phone', 'Phone', record.phone || record.Phone || '', 'tel', null, false, problems), inputField('email', 'Email', record.email || record.Email || '', 'email', null, false, problems), inputField('address', 'Address', record.address || record.Address || '', 'text', null, false, problems), inputField('service', 'Service memory', record.service || record.service_memory || record['Service memory'] || '', 'text', null, false, problems), inputField('price', 'Price memory', record.price || record.price_memory || record['Price memory'] || '', 'text', null, false, problems), inputField('notes', 'Notes / access', record.notes || '', 'textarea', null, true, problems)
  ];
  if (kind === 'quote') return [
    inputField('title', 'Quote title', record.title || record.Quote || 'New quote', 'text', null, false, problems), inputField('client', 'Client', record.client || '', 'text', null, false, problems), inputField('amount', 'Amount NZD', record.amount || record.price || '', 'number', null, false, problems), inputField('status', 'Status', record.status || 'Draft', 'text', pickLists.quoteStatus, false, problems), inputField('terms', 'Terms', record.terms || 'Valid 14 days'), inputField('followUp', 'Follow-up', record.followUp || 'Ready'), inputField('scope', 'Scope', record.scope || record.description || '', 'textarea', null, true, problems)
  ];
  if (kind === 'invoice') return [
    inputField('number', 'Invoice number', record.number || record.Invoice || `INV-${Date.now().toString().slice(-4)}`, 'text', null, false, problems), inputField('client', 'Client', record.client || '', 'text', null, false, problems), inputField('job', 'Job', record.job || record.title || '', 'text', null, false, problems), inputField('amount', 'Amount NZD', record.amount || '', 'number', null, false, problems), inputField('due', 'Due date', record.due || record.due_date || '', 'date', null, false, problems), inputField('status', 'Status', record.status || 'Draft', 'text', pickLists.invoiceStatus, false, problems), inputField('sync', 'Xero/MYOB status', record.sync || 'Command approval', 'text', pickLists.sync, false, problems), inputField('line', 'Line item', record.line || record.description || '', 'textarea', null, true, problems), inputField('evidence', 'Proof / photos / notes', record.evidence || '', 'textarea', null, true, problems)
  ];
  if (kind === 'message') return [
    inputField('from', 'Thread type', record.from || 'Customer', 'text', ['Customer', 'Worker'], false, problems), inputField('channel', 'Channel', record.channel || 'SMS', 'text', ['SMS', 'Email', 'Worker app'], false, problems), inputField('client', 'Client', record.client || '', 'text', null, false, problems), inputField('job', 'Job', record.job || '', 'text', null, false, problems), inputField('subject', 'Subject', record.subject || record.title || '', 'text', null, false, problems), inputField('context', 'Thread context', record.context || record.detail || '', 'textarea', null, true, problems), inputField('draft', 'Draft reply', record.draft || '', 'textarea', null, true, problems)
  ];
  if (kind === 'worker' || kind === 'person') return [
    inputField('name', 'Worker', record.name || record.worker || 'Howard', 'text', pickLists.workers, false, problems), inputField('role', 'Role', record.role || 'Worker', 'text', pickLists.role, false, problems), inputField('access', 'Access', record.access || 'Worker app', 'text', pickLists.access, false, problems), inputField('app', 'Worker app', record.app || 'Active', 'text', pickLists.app, false, problems), inputField('status', 'Clock status', record.status || 'Clocked in', 'text', pickLists.clock, false, problems), inputField('job', 'Current job', record.job || record.currentJob || '', 'text', null, false, problems), inputField('gps', 'GPS/location', record.gps || '', 'text', null, false, problems), inputField('clockIn', 'Clock in', record.clockIn || record.start || '', 'time', null, false, problems), inputField('clockOut', 'Clock out', record.clockOut || record.end || '', 'time', null, false, problems), inputField('hours', 'Timesheet hours', record.hours || record.timesheet || '', 'text', null, false, problems), inputField('proof', 'Proof/photos', record.proof || '', 'text', null, false, problems), inputField('slipStatus', 'Slip status', record.slipStatus || record.slip || 'Ready', 'text', pickLists.slip, false, problems), inputField('payroll', 'Payroll review', record.payroll || 'Ready', 'text', ['Ready', 'Review', 'Pending'], false, problems), inputField('messages', 'Worker messages / issue', record.messages || record.issue || '', 'textarea', null, true, problems)
  ];
  if (kind === 'settings') return [
    inputField('businessName', 'Business name', record.businessName || 'Churvox business'), inputField('email', 'Public email', record.email || 'hello@churvox.com', 'email'), inputField('country', 'Country', record.country || 'New Zealand'), inputField('gst', 'GST', record.gst || '15%'), inputField('defaultRepeat', 'Default repeat', record.defaultRepeat || 'Fortnightly', 'text', pickLists.frequency.slice(1)), inputField('defaultBilling', 'Default billing', record.defaultBilling || 'Fixed + extras', 'text', pickLists.billing), inputField('proofRequirement', 'Proof requirement', record.proofRequirement || 'Photos + notes'), inputField('notifications', 'Notifications', record.notifications || 'On', 'text', ['On', 'Owner only', 'Off'])
  ];
  if (kind === 'ticket') return [inputField('area', 'Area', record.area || 'Setup', 'text', ['Setup', 'Billing', 'Worker app', 'CSV import', 'Xero', 'Plans', 'Other']), inputField('priority', 'Priority', record.priority || 'Normal', 'text', ['Normal', 'Urgent', 'Stuck']), inputField('contact', 'Contact email', record.contact || 'hello@churvox.com', 'email'), inputField('message', 'What is happening?', record.message || '', 'textarea', null, true)];
  if (kind === 'plan') return [inputField('plan', 'Plan/add-on', record.plan || 'Operator'), inputField('action', 'Action', record.action || 'Choose plan'), inputField('price', 'Price ex GST', record.price || ''), inputField('incGst', 'Price inc GST', record.incGst || ''), inputField('notes', 'Included / notes', record.notes || 'Pricing unchanged.', 'textarea', null, true)];
  if (kind === 'commandFix') return [inputField('type', 'Command type', record.type || 'Fix needed'), inputField('title', 'Record', record.title || 'Record needs fixing'), inputField('client', 'Client', record.client || ''), inputField('missing', 'Missing/problem', record.missing || ''), inputField('detail', 'Owner note / fix', record.detail || record.filled || '', 'textarea', null, true)];
  return [inputField('title', 'Title', record.title || 'Record'), inputField('detail', 'Detail', record.detail || '', 'textarea', null, true)];
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
    modal.addEventListener('submit', submitModal);
  }
  const problems = missingFor(kind, record);
  const problemHtml = problems.length ? `<div class="wireProblemBox">Problem: ${esc(problems.join(', '))}. Fix these before this can move forward.</div>` : '';
  const aiHtml = record._aiFilled?.length ? `<div class="wireAiBox">Churvox filled: ${esc(Array.isArray(record._aiFilled) ? record._aiFilled.join(', ') : record._aiFilled)}</div>` : '';
  modal.innerHTML = `<section class="wireModal"><header><div><h2>${esc(title)}</h2><p>${esc(note || '')}</p></div><button type="button" class="close" data-close>Close</button></header><form data-kind="${esc(kind)}" data-record-id="${esc(record.id || '')}">${problemHtml}${aiHtml}${fields(kind, record, problems).join('')}<div class="wireActions"><button type="button" class="quiet" data-close>Cancel</button><button type="submit">Save</button></div></form></section>`;
  modal.hidden = false;
  modal.querySelector('.problem input,.problem select,.problem textarea,input,select,textarea')?.focus();
}
function closeModal() { const modal = document.getElementById(MODAL_ID); if (modal) modal.hidden = true; }
function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }

function findClientMemory(state, name) {
  const target = lower(name);
  if (!target) return null;
  return (state.clients || []).find((client) => {
    const candidate = lower(first(client, ['name', 'client', 'Client']));
    return candidate && (candidate === target || candidate.includes(target) || target.includes(candidate));
  }) || null;
}
function safeFill(kind, data, state) {
  const next = { ...data };
  const filled = [];
  if (kind === 'job') {
    const client = findClientMemory(state, next.client);
    if (client && blank(next.address) && first(client, ['address', 'Address'])) { next.address = first(client, ['address', 'Address']); filled.push('address from client memory'); }
    if (client && blank(next.service) && first(client, ['service', 'service_memory', 'Service memory'])) { next.service = first(client, ['service', 'service_memory', 'Service memory']); filled.push('service from client memory'); }
    if (client && moneyNumber(next.price) <= 0 && moneyNumber(first(client, ['price', 'price_memory', 'Price memory'])) > 0) { next.price = moneyNumber(first(client, ['price', 'price_memory', 'Price memory'])); filled.push('price from client memory'); }
  }
  if (kind === 'client') {
    const noteText = lower(next.notes);
    if (blank(next.service) && /lawn|garden|hedge|clean|waste|repair/.test(noteText)) { next.service = noteText.includes('hedge') ? 'Hedge/garden work' : noteText.includes('clean') ? 'Cleaning/service visit' : noteText.includes('waste') ? 'Waste removal' : 'Lawns and garden work'; filled.push('service memory from notes'); }
    if (moneyNumber(next.price) <= 0) { const match = clean(next.notes).match(/\$\s?(\d{2,5}(?:\.\d{1,2})?)/); if (match) { next.price = `$${match[1]}`; filled.push('price memory from notes'); } }
  }
  if (filled.length) { next._aiFilled = filled; next._aiFilledAt = now(); }
  return next;
}

function missingFor(kind, data = {}) {
  const missing = [];
  if (kind === 'job') {
    if (blank(data.title)) missing.push('title');
    if (blank(data.client)) missing.push('client');
    if (blank(data.address)) missing.push('address');
    if (blank(data.worker)) missing.push('worker');
    if (blank(data.date)) missing.push('date');
    if (blank(data.time)) missing.push('time');
    if (blank(data.service)) missing.push('service');
    if (moneyNumber(data.price) <= 0 && !lower(data.billing).includes('quote')) missing.push('price');
  }
  if (kind === 'client') {
    if (blank(data.name)) missing.push('name');
    if (blank(data.phone) && blank(data.email)) missing.push('phone or email');
    if (blank(data.address)) missing.push('address');
  }
  if (kind === 'quote') {
    if (blank(data.title)) missing.push('title');
    if (blank(data.client)) missing.push('client');
    if (moneyNumber(data.amount) <= 0) missing.push('amount');
    if (blank(data.scope)) missing.push('scope');
  }
  if (kind === 'invoice') {
    if (blank(data.number)) missing.push('number');
    if (blank(data.client)) missing.push('client');
    if (blank(data.due)) missing.push('due');
    if (moneyNumber(data.amount) <= 0) missing.push('amount');
    if (blank(data.line)) missing.push('line');
  }
  if (kind === 'message') {
    if (blank(data.client)) missing.push('client');
    if (blank(data.subject)) missing.push('subject');
    if (blank(data.draft)) missing.push('draft');
  }
  if (kind === 'worker' || kind === 'person') {
    if (blank(data.name) && blank(data.worker)) missing.push('name');
    if (/review|pending|issue|needs|not ready|mismatch|0h/i.test(`${data.payroll || ''} ${data.slipStatus || ''} ${data.slip || ''} ${data.messages || ''}`)) missing.push('slip review');
    if (/no proof|missing/i.test(data.proof || '')) missing.push('proof');
  }
  return missing;
}

function commandType(kind, missing = []) {
  if (kind === 'job') return 'Job fix needed';
  if (kind === 'client') return 'Client issue ready';
  if (kind === 'quote') return missing.length ? 'Quote fix needed' : 'Quote ready';
  if (kind === 'invoice') return missing.length ? 'Invoice fix needed' : 'Invoice ready';
  if (kind === 'message') return missing.length ? 'Message fix needed' : 'Message ready';
  if (kind === 'worker' || kind === 'person') return 'Timesheet/proof/slip issue ready';
  return 'Fix needed';
}

function queueCommand(item) {
  const main = mainState();
  const ops = opsState();
  const key = item.issueKey || `${item.type}:${item.title}:${item.missing || ''}`.toLowerCase();
  const exists = [...(main.command || []), ...(ops.commandQueue || [])].some((row) => row.issueKey === key || row.flowKey === key || row.id === item.id);
  if (exists) return;
  const payload = { id: item.id || `command-${hash(key)}`, status: 'waiting', owner: item.owner || 'Edit', createdAt: now(), issueKey: key, flowKey: key, ...item };
  main.command = [payload, ...(main.command || [])].slice(0, 160);
  ops.commandQueue = [payload, ...(ops.commandQueue || [])].slice(0, 160);
  main.audit = [{ action: 'Sent to Command', detail: `${payload.type}: ${payload.title}`, at: now() }, ...(main.audit || [])].slice(0, 100);
  ops.audit = [{ action: 'Sent to Command', detail: `${payload.type}: ${payload.title}`, at: now() }, ...(ops.audit || [])].slice(0, 100);
  saveMainState(main);
  saveOpsState(ops);
}

function upsertRecord(state, listName, record) {
  const rows = [...(state[listName] || [])];
  const title = lower(titleFor(sourceKind(listName), record));
  const index = rows.findIndex((item) => item.id === record.id || lower(titleFor(sourceKind(listName), item)) === title);
  if (index >= 0) rows[index] = { ...rows[index], ...record, editedAt: now() };
  else rows.unshift(record);
  state[listName] = rows.slice(0, 120);
}

function saveRecord(kind, rawData) {
  const state = mainState();
  const data = safeFill(kind, rawData, state);
  const missing = missingFor(kind, data);
  const listName = kindList(kind);
  const record = { id: data.id || uid(kind), ...data, savedAt: now(), _blockedByCommand: missing.length > 0, _doNotShowToday: kind === 'job' && missing.length > 0, _commandMissing: missing.join(', ') };
  upsertRecord(state, listName, record);
  state.audit = [{ action: missing.length ? 'Saved and routed to Command' : `Saved ${kind}`, detail: titleFor(kind, record), at: now() }, ...(state.audit || [])].slice(0, 100);
  saveMainState(state);

  if (missing.length) {
    queueCommand({ type: commandType(kind, missing), title: titleFor(kind, record), client: record.client || record.name || 'Not set', amount: moneyNumber(record.amount || record.price), owner: 'Edit', sourceType: listName, sourceId: record.id, missing: missing.join(', '), filled: `Churvox saved what it could. Missing ${missing.join(', ')} must be fixed before this can move forward.`, evidence: record._aiFilled?.length ? `AI filled: ${record._aiFilled.join(', ')}` : 'No safe source for the missing fields.', check: 'Edit the record in Command, then approve or park.', issueKey: `${listName}:${record.id}:${missing.join('|')}`.toLowerCase() });
    toast('Saved and sent to Command', `Missing ${missing.join(', ')}.`);
  } else if (kind === 'quote' || kind === 'invoice' || kind === 'message') {
    queueCommand({ type: commandType(kind, []), title: titleFor(kind, record), client: record.client || 'Not set', amount: moneyNumber(record.amount), owner: 'Approve', sourceType: listName, sourceId: record.id, filled: record.scope || record.line || record.draft || 'Prepared by Churvox.', evidence: record.evidence || record.context || record.terms || 'Record complete.', check: kind === 'invoice' ? 'Approve before sending or sync.' : kind === 'message' ? 'Approve or edit wording before sending.' : 'Approve before sending.', issueKey: `${listName}:${record.id}:approval`.toLowerCase() });
    toast(`${kind[0].toUpperCase()}${kind.slice(1)} saved`, 'Approval was sent to Command.');
  } else if ((kind === 'worker' || kind === 'person') && /review|pending|issue|needs|not ready|mismatch|0h/i.test(`${record.payroll || ''} ${record.slipStatus || ''} ${record.messages || ''}`)) {
    queueCommand({ type: 'Timesheet/proof/slip issue ready', title: titleFor(kind, record), client: record.client || record.job || 'Worker day', owner: 'Edit', sourceType: listName, sourceId: record.id, missing: 'slip review', filled: record.messages || 'Worker record needs review.', evidence: `${record.hours || ''} ${record.proof || ''}`.trim(), check: 'Fix the worker day or park until worker confirms.', issueKey: `${listName}:${record.id}:worker-review`.toLowerCase() });
    toast('Worker issue sent to Command', 'Slip/proof review needs owner check.');
  } else {
    toast(`${kind[0].toUpperCase()}${kind.slice(1)} saved`, record._aiFilled?.length ? `Churvox filled ${record._aiFilled.join(', ')}.` : 'Record is usable.');
  }
}

function submitModal(event) {
  event.preventDefault();
  const form = event.target;
  const kind = form.dataset.kind;
  const data = { id: form.dataset.recordId || undefined, ...formObject(form) };
  if (kind === 'settings') {
    const state = pageState();
    state.settings = { ...state.settings, ...data, savedAt: now() };
    state.audit = [{ action: 'Saved settings', detail: data.businessName || 'Business controls', at: now() }, ...(state.audit || [])].slice(0, 100);
    savePageState(state);
    toast('Settings saved', 'Business controls updated.');
  } else if (kind === 'ticket') {
    const state = pageState();
    state.tickets = [{ id: uid('ticket'), ...data, createdAt: now() }, ...(state.tickets || [])].slice(0, 80);
    savePageState(state);
    toast('Ticket saved', data.area || 'Support');
  } else if (kind === 'plan') {
    savePlanAction(data.plan, data.action || 'Choose plan');
  } else if (kind === 'commandFix') {
    queueCommand({ type: data.type || 'Fix needed', title: data.title || 'Record needs fixing', client: data.client || 'Not set', missing: data.missing || '', owner: 'Edit', filled: data.detail || 'Owner fix required.', evidence: 'Created from Command action.', check: 'Edit, approve or park in Command.' });
    toast('Command item created', data.title || 'Fix needed');
  } else {
    saveRecord(kind, data);
  }
  closeModal();
  render();
}

function allCommands() {
  const seen = new Set();
  return [...(mainState().command || []), ...(opsState().commandQueue || [])].filter((item) => {
    const key = item.id || item.issueKey || `${item.type}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function findCommand(commandId) { return allCommands().find((item) => item.id === commandId || item.issueKey === commandId || item.flowKey === commandId); }
function findSource(item) {
  const kind = sourceKind(item.sourceType || '');
  const listName = kindList(kind);
  const rows = mainState()[listName] || [];
  return { kind, listName, record: rows.find((row) => row.id === item.sourceId || row._commandIssueKey === item.issueKey) || null };
}
function setCommandStatus(commandId, status) {
  const apply = (item) => item.id === commandId || item.issueKey === commandId || item.flowKey === commandId ? { ...item, status, decidedAt: now() } : item;
  const main = mainState();
  const ops = opsState();
  main.command = (main.command || []).map(apply);
  ops.commandQueue = (ops.commandQueue || []).map(apply);
  main.audit = [{ action: `Command ${status}`, detail: commandId, at: now() }, ...(main.audit || [])].slice(0, 100);
  ops.audit = [{ action: `Command ${status}`, detail: commandId, at: now() }, ...(ops.audit || [])].slice(0, 100);
  saveMainState(main);
  saveOpsState(ops);
}
function applyApprove(item) {
  if (!item) return;
  const state = mainState();
  const { kind, listName, record } = findSource(item);
  const type = lower(item.type);
  let detail = `Approved ${item.type || 'Command item'}`;

  if (/fix needed|issue ready/.test(type) && record) {
    const missing = missingFor(kind, record);
    if (missing.length) {
      setCommandStatus(item.id, 'needs_edit');
      toast('Still missing info', `${missing.join(', ')} must be fixed before approval.`);
      openModal(kind, `Fix ${kind}`, 'Problem fields are highlighted. Save the fix, then approve from Command.', record);
      return;
    }
    upsertRecord(state, listName, { ...record, _blockedByCommand: false, _doNotShowToday: false, _commandMissing: '', approvedAt: now() });
    detail = `${titleFor(kind, record)} fixed and approved`;
  }

  if (/invoice ready/.test(type) && record) { upsertRecord(state, 'invoices', { ...record, status: 'Approved', approvedAt: now() }); detail = `Invoice approved: ${titleFor('invoice', record)}`; }
  if (/invoice sync ready/.test(type)) { state.invoices = (state.invoices || []).map((invoice) => invoice.id === item.sourceId || invoice.number === item.title || invoice.client === item.client ? { ...invoice, sync: 'Owner approved sync', syncApprovedAt: now() } : invoice); detail = `Draft sync approved: ${item.title || item.client || 'invoice'}`; }
  if (/message ready/.test(type) && record) { upsertRecord(state, 'messages', { ...record, status: 'Approved to send', sentApprovedAt: now() }); detail = `Message approved: ${titleFor('message', record)}`; }
  if (/quote ready/.test(type) && record) { upsertRecord(state, 'quotes', { ...record, status: 'Sent', sentApprovedAt: now() }); detail = `Quote approved: ${titleFor('quote', record)}`; }
  if (/timesheet|proof|slip/.test(type) && record) { upsertRecord(state, 'workers', { ...record, payroll: 'Ready', slipStatus: 'Approved', slip: 'Approved', approvedAt: now(), _commandMissing: '' }); detail = `Worker slip approved: ${titleFor('worker', record)}`; }

  state.audit = [{ action: 'Command approval applied', detail, at: now() }, ...(state.audit || [])].slice(0, 100);
  saveMainState(state);
  setCommandStatus(item.id, 'approved');
  toast('Command approved', detail);
}
function applyPark(item) {
  if (!item) return;
  const state = mainState();
  const { listName, record } = findSource(item);
  if (record && state[listName]) upsertRecord(state, listName, { ...record, _parkedByCommand: true, _blockedByCommand: true, _doNotShowToday: listName === 'jobs', parkedAt: now() });
  state.audit = [{ action: 'Command park applied', detail: item.title || item.type || 'Command item', at: now() }, ...(state.audit || [])].slice(0, 100);
  saveMainState(state);
  setCommandStatus(item.id, 'parked');
  toast('Command parked', item.title || item.type || 'Item parked.');
}
function editCommand(item) {
  if (!item) return openModal('commandFix', 'Edit Command item', 'Add the fix note.', {});
  const { kind, record } = findSource(item);
  if (record) return openModal(kind, `Fix ${kind}`, 'Problem fields are highlighted. Save the fix, then approve from Command.', record);
  return openModal('commandFix', 'Edit Command item', 'Add the owner note or correction.', { type: item.type, title: item.title, client: item.client, missing: item.missing, detail: item.filled });
}

function savePlanAction(name, action) {
  const plan = planData[name] || { price: 0, includes: [] };
  const state = pageState();
  const item = { id: uid('plan'), plan: name, action, price: money(plan.price), incGst: incGst(plan.price), at: now() };
  state.planActions = [item, ...(state.planActions || [])].slice(0, 80);
  state.audit = [{ action: 'Plan action', detail: `${name}: ${action}`, at: now() }, ...(state.audit || [])].slice(0, 100);
  savePageState(state);
  toast('Plan action saved', `${name}: ${money(plan.price)} + GST / ${incGst(plan.price)} inc GST.`);
}

function actionOpen(action) {
  if (action === 'add-job') return openModal('job', 'Add job', 'Complete jobs can appear on Today. Missing date/time/worker goes to Command.');
  if (action === 'add-client') return openModal('client', 'Add client', 'Contact, service memory, price memory and notes.');
  if (action === 'new-quote') return openModal('quote', 'New quote', 'Approval and sending stay in Command.');
  if (action === 'draft-invoice') return openModal('invoice', 'Draft invoice', 'Approval and sync decisions stay in Command.');
  if (action === 'draft-message') return openModal('message', 'Draft message', 'Sending approval stays in Command.');
  if (action === 'worker-day') return openModal('worker', 'Worker day slip', 'Clock times, GPS, proof, messages and slip status.');
  if (action === 'person') return openModal('person', 'Team person', 'Role, access, worker app and payroll state.');
  if (action === 'settings') return openModal('settings', 'Business controls', 'Business defaults and operating rules.', pageState().settings || {});
  if (action === 'ticket') return openModal('ticket', 'New help ticket', 'Save a support ticket.');
  if (action === 'command-fix') return openModal('commandFix', 'Create Command fix item', 'Create a Command item for something the owner needs to repair.', { type: 'Fix needed' });
  if (action === 'recurring') return openModal('job', 'Recurring job', 'Save the recurring job rule as a job record.', { recurring: 'Fortnightly' });
  if (action === 'dispatch') return openModal('job', 'Dispatch job', 'Plan the job. Maps stay on Workers.', { title: 'Dispatch job', service: 'Route planning' });
  if (action === 'followup') return queueCommand({ type: 'Quote follow-up ready', title: 'Quote follow-up', client: 'Client', owner: 'Approve', filled: 'Follow-up message prepared.', evidence: 'Follow-up action clicked.', check: 'Approve or edit in Command.' });
  if (action === 'accepted-jobs') return queueCommand({ type: 'Job fix needed', title: 'Accepted quote job shell', client: 'Accepted quote client', owner: 'Edit', missing: 'date, time, assigned worker', filled: 'Accepted quote prepared as a job shell.', evidence: 'Accepted quote action clicked.', check: 'Add date, time and assigned worker before Today.' });
  if (action === 'queue-sync') return queueCommand({ type: 'Invoice sync ready', title: 'Draft invoice sync', client: 'Invoice ledger', owner: 'Approve', filled: 'Draft invoice ready for accounting sync.', evidence: 'Sync action clicked.', check: 'Owner-approved draft sync only. No tax filing. No payout files.' });
  if (action === 'queue-message') return queueCommand({ type: 'Message ready', title: 'Draft reply', client: 'Customer', owner: 'Approve', filled: 'Message draft ready for approval.', evidence: 'Message action clicked.', check: 'Approve or edit wording in Command.' });
  if (action === 'payroll-review') return queueCommand({ type: 'Timesheet/proof/slip issue ready', title: 'Payroll review', client: 'Worker day', owner: 'Edit', missing: 'slip review', filled: 'Payroll/slip review opened.', evidence: 'Worker timesheet or proof needs owner check.', check: 'Fix or park in Command.' });
  if (action === 'run-today') return runTodayCheck();
  if (action === 'open-command') { window.history.replaceState({}, '', '/dashboard#command'); window.dispatchEvent(new Event('hashchange')); return undefined; }
  if (action.startsWith('export-')) return exportData(action.replace('export-', '') || page());
  return undefined;
}

function runTodayCheck() {
  const state = mainState();
  (state.jobs || []).forEach((job) => {
    const missing = missingFor('job', job);
    if (missing.length) {
      queueCommand({ type: 'Job fix needed', title: titleFor('job', job), client: job.client || 'Not set', owner: 'Edit', sourceType: 'jobs', sourceId: job.id, missing: missing.join(', '), filled: `Job is held from Today until ${missing.join(', ')} is fixed.`, evidence: 'Today check found missing fields.', check: 'Edit, then approve in Command.', issueKey: `today:${job.id}:${missing.join('|')}`.toLowerCase() });
    }
  });
  state.audit = [{ action: 'Today check', detail: 'Incomplete jobs held from Today and routed to Command.', at: now() }, ...(state.audit || [])].slice(0, 100);
  saveMainState(state);
  toast('Today checked', 'Incomplete jobs were held and sent to Command.');
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
  const payload = { exportedAt: now(), name, page: page(), pageActions: state, workspace: mainState(), operations: opsState() };
  state.exports = [{ name, at: payload.exportedAt }, ...(state.exports || [])].slice(0, 80);
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

function recordsForPage(pageName) {
  const main = mainState();
  if (pageName === 'jobs' || pageName === 'today') return ['job', main.jobs || []];
  if (pageName === 'clients') return ['client', main.clients || []];
  if (pageName === 'quotes') return ['quote', main.quotes || []];
  if (pageName === 'invoices' || pageName === 'xero') return ['invoice', main.invoices || []];
  if (pageName === 'messages') return ['message', main.messages || []];
  if (pageName === 'workers') return ['worker', main.workers || []];
  if (pageName === 'team') return ['person', main.workers || []];
  return ['', []];
}
function rowMeta(kind, item) { return item.client || item.job || item.service || item.status || item.savedAt || item.createdAt || 'saved'; }
function rowTag(item) { return item.amount ? money(moneyNumber(item.amount)) : item.price || item.sync || item.recurring || item.payroll || item.status || 'Saved'; }

function renderActions(root, pageName) {
  const actions = actionMap[pageName] || [];
  if (!actions.length) return;
  const node = document.createElement('section');
  node.className = 'ofHardActions';
  node.innerHTML = `<h3>Page actions</h3><div class="ofHardButtonGrid">${actions.map(([key, label, tone]) => `<button type="button" class="${tone || ''}" data-hard-action="${esc(key)}">${esc(label)}</button>`).join('')}</div>`;
  root.appendChild(node);
}
function renderSaved(root, pageName) {
  const [kind, rows] = recordsForPage(pageName);
  if (!kind || !rows.length) return;
  const filtered = pageName === 'today' ? rows.filter((item) => !item._doNotShowToday && !item._blockedByCommand) : rows;
  const body = filtered.slice(0, 8).map((item, index) => `<div class="ofHardRow clickable ${item._commandMissing ? 'problem' : ''}" data-open-saved="${esc(kind)}" data-open-index="${index}"><b>${esc(titleFor(kind, item))}</b><span>${esc(rowMeta(kind, item))}${item._commandMissing ? ` - missing ${esc(item._commandMissing)}` : ''}</span><em>${esc(rowTag(item))}</em></div>`).join('') || '<div class="ofHardRow"><b>No ready records</b><span>Incomplete work is held in Command.</span><em>Checked</em></div>';
  const node = document.createElement('section');
  node.className = 'ofHardSaved';
  node.innerHTML = `<h3>${pageName === 'today' ? 'Today-ready records' : 'Saved records'}</h3><div class="ofHardRows">${body}</div>`;
  root.appendChild(node);
}
function renderCommand(root) {
  const rows = allCommands().slice(0, 14);
  const body = rows.map((item) => `<div class="ofHardRow ${item.missing ? 'problem' : ''}" data-status="${esc(item.status)}"><b>${esc(item.type || 'Command item')}</b><span>${esc(item.title || item.filled || '')}${item.missing ? ` - missing ${esc(item.missing)}` : ''}</span><span class="rowActions"><button type="button" data-command-id="${esc(item.id)}" data-command-status="approved">Approve</button><button type="button" data-command-id="${esc(item.id)}" data-command-status="edit">Edit</button><button type="button" data-command-id="${esc(item.id)}" data-command-status="parked">Park</button></span></div>`).join('') || '<div class="ofHardRow"><b>No runtime items</b><span>Invoices, messages, missing info and slip issues land here.</span><em>Ready</em></div>';
  const node = document.createElement('section');
  node.className = 'ofHardCommand';
  node.innerHTML = `<h3>Live Command queue</h3><div class="ofHardRows">${body}</div>`;
  root.appendChild(node);
}
function renderAudit(root) {
  const rows = [...(mainState().audit || []), ...(pageState().audit || [])].slice(0, 5);
  if (!rows.length) return;
  const node = document.createElement('section');
  node.className = 'ofHardAudit';
  node.innerHTML = `<h3>Recent logic</h3><div class="ofHardRows">${rows.map((item) => `<div class="ofHardRow"><b>${esc(item.action)}</b><span>${esc(item.detail || '')}</span><em>${esc(item.at || '')}</em></div>`).join('')}</div>`;
  root.appendChild(node);
}

function enhancePlans() {
  document.querySelectorAll('#option-f-plans-pricing-desk .ofPlanCard:not(.hasActions)').forEach((card) => {
    const name = clean(card.querySelector('h3')?.textContent);
    const plan = planData[name];
    if (!plan) return;
    card.classList.add('hasActions');
    card.insertAdjacentHTML('beforeend', `<div class="ofPlanGst">Actual cost: ${esc(incGst(plan.price))}/month inc GST</div><ul class="ofPlanIncluded">${plan.includes.map((item) => `<li>${esc(item)}</li>`).join('')}</ul><div class="ofPlanActions"><button type="button" class="primary" data-plan-action="trial" data-plan-name="${esc(name)}">Start trial</button><button type="button" data-plan-action="choose" data-plan-name="${esc(name)}">Choose plan</button><button type="button" class="light" data-plan-action="details" data-plan-name="${esc(name)}">Details</button></div>`);
  });
  document.querySelectorAll('#option-f-plans-pricing-desk .ofAddonCard:not(.hasActions)').forEach((card) => {
    const name = clean(card.querySelector('h3')?.textContent);
    const plan = planData[name];
    if (!plan) return;
    card.classList.add('hasActions');
    card.insertAdjacentHTML('beforeend', `<div class="ofPlanGst">Actual cost: ${esc(incGst(plan.price))}/month inc GST</div><ul class="ofPlanIncluded">${plan.includes.map((item) => `<li>${esc(item)}</li>`).join('')}</ul><div class="ofPlanActions"><button type="button" class="primary" data-plan-action="addon" data-plan-name="${esc(name)}">Add to plan</button><button type="button" class="light" data-plan-action="details" data-plan-name="${esc(name)}">Details</button></div>`);
  });
}

function collectDrawer(drawer) {
  const data = {};
  drawer.querySelectorAll('.cocField').forEach((label) => {
    const key = clean(label.querySelector('span')?.textContent).replace(/\s+/g, '_').toLowerCase();
    const input = label.querySelector('input,textarea,select');
    if (key && input) data[key] = input.value;
  });
  return data;
}
function drawerKind(drawer) {
  const marker = lower(`${drawer.querySelector('em')?.textContent || ''} ${drawer.querySelector('h2')?.textContent || ''}`);
  if (marker.includes('client')) return 'client';
  if (marker.includes('quote')) return 'quote';
  if (marker.includes('invoice')) return 'invoice';
  if (marker.includes('message')) return 'message';
  if (marker.includes('worker') || marker.includes('timesheet') || marker.includes('person')) return 'worker';
  return 'job';
}
function normalizeDrawer(kind, raw) {
  const get = (...keys) => keys.map((key) => raw[key]).find((value) => clean(value)) || '';
  if (kind === 'job') return { title: get('job_name', 'job'), client: get('client'), address: get('site_address', 'address'), service: get('service'), worker: get('assigned_worker', 'worker'), date: get('scheduled_date', 'date'), time: get('start_time', 'time'), price: get('price_nzd', 'amount'), billing: get('billing_type'), recurring: get('frequency', 'recurring'), notes: get('job_notes', 'notes') };
  if (kind === 'client') return { name: get('name', 'client'), phone: get('phone'), email: get('email'), address: get('address'), service: get('preferred_service', 'service_memory'), price: get('saved_price', 'price_memory'), notes: get('access_notes', 'notes_/_access', 'notes') };
  if (kind === 'quote') return { title: get('quote', 'quote_title'), client: get('client'), amount: get('amount'), status: get('status') || 'Draft', scope: get('scope'), terms: get('terms'), followUp: get('follow-up') };
  if (kind === 'invoice') return { number: get('invoice', 'invoice_number'), client: get('client'), job: get('job'), amount: get('amount'), due: get('due_date'), status: get('status') || 'Draft', sync: get('xero/myob_status', 'sync'), line: get('line_item'), evidence: get('evidence') };
  if (kind === 'message') return { from: get('from'), channel: get('channel'), client: get('client'), job: get('job'), subject: get('subject'), context: get('history', 'message'), draft: get('drafted_reply', 'draft_reply') };
  return { name: get('worker', 'name'), role: get('role/access', 'role'), status: get('clock_status', 'status'), job: get('current_job'), gps: get('gps/location'), clockIn: get('clock_in'), clockOut: get('clock_out'), proof: get('proof/photos'), messages: get('worker_messages', 'day_notes'), hours: get('timesheet'), slipStatus: get('slip/payroll_status'), payroll: get('payroll_review') };
}

function clickHandler(event) {
  if (!document.querySelector('.churvoxOptionC')) return;
  const button = event.target.closest('button');
  const saved = event.target.closest('[data-open-saved]');
  if (saved) {
    event.preventDefault();
    const [kind, rows] = recordsForPage(page());
    const item = rows[Number(saved.dataset.openIndex)];
    if (item) openModal(kind, `Edit ${kind}`, 'Saved record opened for editing. Problems are highlighted.', item);
    return;
  }
  if (!button) return;

  const drawer = button.closest('.churvoxOptionC .cocDrawer');
  if (drawer && /^save\b|update access/i.test(button.textContent)) {
    event.preventDefault();
    event.stopPropagation();
    const kind = drawerKind(drawer);
    saveRecord(kind, normalizeDrawer(kind, collectDrawer(drawer)));
    drawer.dataset.savedState = 'saved';
    setTimeout(render, 100);
    return;
  }

  const commandId = button.dataset.commandId;
  if (commandId && page() === 'command') {
    event.preventDefault();
    event.stopPropagation();
    const item = findCommand(commandId);
    const status = button.dataset.commandStatus || button.dataset.commandAction;
    if (status === 'approved') applyApprove(item);
    else if (status === 'parked') applyPark(item);
    else editCommand(item);
    setTimeout(render, 100);
    return;
  }

  const hardAction = button.dataset.hardAction;
  if (hardAction) {
    event.preventDefault();
    event.stopPropagation();
    if (hardAction === 'plan-operator') savePlanAction('Operator', 'Start trial');
    else if (hardAction === 'plan-command') savePlanAction('Command', 'Choose plan');
    else actionOpen(hardAction);
    setTimeout(render, 100);
    return;
  }

  const planAction = button.dataset.planAction;
  if (planAction) {
    event.preventDefault();
    event.stopPropagation();
    const name = button.dataset.planName;
    const plan = planData[name] || { price: 0, includes: [] };
    if (planAction === 'details') openModal('plan', `${name} details`, `Locked price: ${money(plan.price)}/month + GST. Actual cost: ${incGst(plan.price)}/month inc GST.`, { plan: name, action: 'Viewed details', price: money(plan.price), incGst: incGst(plan.price), notes: plan.includes.join('\n') });
    else savePlanAction(name, planAction === 'trial' ? 'Start trial' : planAction === 'addon' ? 'Add add-on' : 'Choose plan');
    setTimeout(render, 100);
    return;
  }

  const label = lower(button.textContent);
  if (label.includes('add job')) { event.preventDefault(); actionOpen('add-job'); return; }
  if (label.includes('add client')) { event.preventDefault(); actionOpen('add-client'); return; }
  if (label.includes('new quote')) { event.preventDefault(); actionOpen('new-quote'); return; }
  if (label.includes('new ticket')) { event.preventDefault(); actionOpen('ticket'); return; }
  if (label === 'recurring') { event.preventDefault(); actionOpen('recurring'); return; }
  if (label === 'dispatch board') { event.preventDefault(); actionOpen('dispatch'); return; }
  if (label === 'follow-ups') { event.preventDefault(); actionOpen('followup'); return; }
  if (label === 'accepted to jobs') { event.preventDefault(); actionOpen('accepted-jobs'); return; }
}

function render() {
  ensureStyle();
  const root = workspace();
  if (!root) return;
  root.querySelectorAll('.ofHardActions,.ofHardSaved,.ofHardCommand,.ofHardAudit').forEach((node) => node.remove());
  const current = page();
  if (current === 'command') renderCommand(root);
  renderActions(root, current);
  renderSaved(root, current);
  renderAudit(root);
  setTimeout(enhancePlans, 60);
  setTimeout(enhancePlans, 220);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(render, 80));
  window.addEventListener('hashchange', () => setTimeout(render, 120));
  window.addEventListener('popstate', () => setTimeout(render, 120));
  document.addEventListener('click', clickHandler, true);
  document.addEventListener('click', () => setTimeout(render, 180));
  document.addEventListener('change', () => setTimeout(render, 180), true);
}

export {};
