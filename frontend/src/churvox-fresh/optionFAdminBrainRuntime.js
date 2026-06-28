const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';
const STYLE_ID = 'option-f-admin-brain-style';
const MODAL_ID = 'option-f-admin-brain-modal';
const TOAST_ID = 'option-f-admin-brain-toast';

const mainDefaults = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
const opsDefaults = { audit: [], commandQueue: [], invoices: [], messages: [], workerDays: [], teamPeople: [] };

function load(key, fallback) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}')) }; } catch (_) { return { ...fallback }; }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function main() { return load(MAIN_STORE, mainDefaults); }
function ops() { return load(OPS_STORE, opsDefaults); }
function saveMain(value) { save(MAIN_STORE, value); }
function saveOps(value) { save(OPS_STORE, value); }

function now() {
  return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
}

function page() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function value(record, names) {
  for (const name of names) {
    const raw = record?.[name];
    if (raw !== undefined && raw !== null && String(raw).trim()) return String(raw).trim();
  }
  return '';
}

function numberValue(raw) {
  const cleaned = String(raw ?? '').replace(/[^0-9.-]/g, '');
  return Number(cleaned || 0);
}

function validDate(raw) {
  if (!raw) return false;
  const text = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return true;
  return !Number.isNaN(Date.parse(text));
}

function validTime(raw) {
  if (!raw) return false;
  return /^\d{1,2}:\d{2}/.test(String(raw).trim()) || /am|pm/i.test(String(raw));
}

function html(raw) {
  return String(raw ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function missingFor(type, record) {
  if (record?._adminOverride || record?._parkedByCommand) return [];
  const missing = [];
  if (type === 'jobs') {
    if (!value(record, ['title', 'Job name', 'job', 'Job'])) missing.push('job name');
    if (!value(record, ['client', 'Client', 'client_name'])) missing.push('client');
    if (!value(record, ['worker', 'Assigned worker', 'assigned_worker_name'])) missing.push('assigned worker');
    if (!validDate(value(record, ['date', 'Scheduled date', 'scheduled_date']))) missing.push('date');
    if (!validTime(value(record, ['time', 'Start time', 'scheduled_time']))) missing.push('time');
    if (!value(record, ['service', 'Service'])) missing.push('service');
    if (!numberValue(value(record, ['price', 'Price NZD', 'amount'])) && !/quote/i.test(value(record, ['billing', 'Billing type']))) missing.push('price');
  }
  if (type === 'clients') {
    if (!value(record, ['name', 'Name'])) missing.push('client name');
    if (!value(record, ['phone', 'Phone']) && !value(record, ['email', 'Email'])) missing.push('phone or email');
    if (!value(record, ['address', 'Address'])) missing.push('address');
    if (!value(record, ['service', 'Service memory', 'Preferred service'])) missing.push('service memory');
    if (!value(record, ['price', 'Price memory', 'Saved price'])) missing.push('price memory');
  }
  if (type === 'quotes') {
    if (!value(record, ['title', 'Quote'])) missing.push('quote title');
    if (!value(record, ['client', 'Client', 'client_name'])) missing.push('client');
    if (!numberValue(value(record, ['amount', 'Amount']))) missing.push('amount');
    if (!value(record, ['scope', 'Scope'])) missing.push('scope');
    if (!value(record, ['followUp', 'Follow-up', 'follow_up'])) missing.push('follow-up');
  }
  if (type === 'invoices') {
    if (!value(record, ['number', 'Invoice', 'invoice_number'])) missing.push('invoice number');
    if (!value(record, ['client', 'Client', 'client_name'])) missing.push('client');
    if (!numberValue(value(record, ['amount', 'Amount']))) missing.push('amount');
    if (!validDate(value(record, ['due', 'Due date', 'due_date']))) missing.push('due date');
    if (!value(record, ['line', 'Line item', 'line_item'])) missing.push('line item');
    if (!value(record, ['evidence', 'Evidence'])) missing.push('proof/evidence');
  }
  if (type === 'messages') {
    if (!value(record, ['subject', 'Subject'])) missing.push('subject');
    if (!value(record, ['client', 'Client', 'client_name'])) missing.push('client');
    if (!value(record, ['channel', 'Channel'])) missing.push('channel');
    if (!value(record, ['draft', 'reply', 'Drafted reply', 'message', 'Message'])) missing.push('draft reply');
  }
  if (type === 'workers') {
    if (!value(record, ['name', 'Worker', 'worker'])) missing.push('worker name');
    if (!value(record, ['role', 'Role'])) missing.push('role');
    if (!value(record, ['status', 'Clock status'])) missing.push('clock status');
    if (!value(record, ['job', 'Current job', 'currentJob'])) missing.push('current job');
    if (!value(record, ['timesheet', 'hours', 'Timesheet hours'])) missing.push('timesheet hours');
    if (/clocked in|driving|proof/i.test(value(record, ['status', 'Clock status'])) && !validTime(value(record, ['start', 'clockIn', 'Clock in']))) missing.push('clock-in time');
    if (!value(record, ['slip', 'slipStatus', 'Slip status'])) missing.push('slip status');
  }
  return missing;
}

function recordTitle(type, record) {
  return value(record, ['title', 'Job name', 'number', 'Invoice', 'subject', 'name', 'Worker', 'worker', 'Quote']) || type.slice(0, -1);
}

function issueKey(type, record, missing) {
  const id = value(record, ['id', '_backendId']) || recordTitle(type, record);
  return `${type}:${id}:${missing.join('|')}`.toLowerCase();
}

function createCommandIssue(type, record, missing) {
  const title = recordTitle(type, record);
  const client = value(record, ['client', 'Client', 'client_name']) || 'Not set';
  const key = issueKey(type, record, missing);
  return {
    id: `admin-fix-${Math.abs(hash(key))}`,
    type: `${label(type)} fix needed`,
    title,
    client,
    amount: value(record, ['amount', 'Amount', 'price', 'Price NZD']) || 0,
    status: 'Missing details',
    owner: 'Edit',
    filled: `Churvox found missing ${missing.join(', ')} before this can run cleanly.`,
    evidence: `${label(type)} record checked by admin brain at ${now()}.`,
    check: `Add ${missing.join(', ')}. Then approve, edit or park from Command.`,
    issueKey: key,
    sourceStore: MAIN_STORE,
    sourceType: type,
    sourceId: value(record, ['id', '_backendId']) || '',
    createdAt: now(),
  };
}

function hash(text) {
  let out = 0;
  for (let index = 0; index < text.length; index += 1) out = ((out << 5) - out) + text.charCodeAt(index) | 0;
  return out;
}

function label(type) {
  return ({ jobs: 'Job', clients: 'Client', quotes: 'Quote', invoices: 'Invoice', messages: 'Message', workers: 'Worker' })[type] || 'Record';
}

function validateStores() {
  const state = main();
  const opState = ops();
  const issues = [];
  let changed = false;

  ['jobs', 'clients', 'quotes', 'invoices', 'messages', 'workers'].forEach((type) => {
    const list = Array.isArray(state[type]) ? state[type] : [];
    state[type] = list.map((record) => {
      if (record._parkedByCommand) return { ...record, _blockedByCommand: true, _doNotShowToday: type === 'jobs', _commandMissing: record._commandMissing || 'parked in Command' };
      const missing = missingFor(type, record);
      if (!missing.length) {
        if (record._blockedByCommand || record._doNotShowToday || record._commandMissing) changed = true;
        return { ...record, _blockedByCommand: false, _doNotShowToday: false, _commandMissing: '' };
      }
      const issue = createCommandIssue(type, record, missing);
      issues.push(issue);
      changed = true;
      return { ...record, _blockedByCommand: true, _doNotShowToday: type === 'jobs' && (missing.includes('date') || missing.includes('time')), _commandMissing: missing.join(', '), _commandIssueKey: issue.issueKey };
    });
  });

  const existingKeys = new Set([...(state.command || []), ...(opState.commandQueue || [])].map((item) => item.issueKey).filter(Boolean));
  const freshIssues = issues.filter((issue) => !existingKeys.has(issue.issueKey));
  if (freshIssues.length) {
    state.command = [...freshIssues, ...(state.command || [])].slice(0, 80);
    opState.commandQueue = [...freshIssues.map((issue) => ({ ...issue, status: 'waiting' })), ...(opState.commandQueue || [])].slice(0, 80);
    state.audit = [{ action: 'Admin brain queued fixes', detail: `${freshIssues.length} item(s) need Command`, at: now() }, ...(state.audit || [])].slice(0, 50);
    opState.audit = [{ action: 'Admin brain queued fixes', detail: `${freshIssues.length} item(s) need Command`, at: now() }, ...(opState.audit || [])].slice(0, 50);
    changed = true;
  }

  if (changed) {
    saveMain(state);
    saveOps(opState);
  }
  return { state, opState, issues: [...freshIssues, ...issues] };
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;right:18px;bottom:205px;z-index:999999;max-width:380px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${TOAST_ID}.show{opacity:1;transform:translateY(0)}
    #${MODAL_ID}{position:fixed;inset:0;z-index:1000000;display:grid;place-items:center;padding:24px;background:rgba(16,21,19,.42);backdrop-filter:blur(5px)}#${MODAL_ID}[hidden]{display:none}#${MODAL_ID} .brainModal{width:min(980px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.3)}#${MODAL_ID} header{display:flex;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}#${MODAL_ID} h2{margin:0;font-size:30px;line-height:1.05}#${MODAL_ID} p{margin:7px 0 0;color:#52605a;font-size:13px;font-weight:850}#${MODAL_ID} button{border:0;border-radius:999px;padding:10px 14px;background:#101513;color:#fff;font-weight:950;cursor:pointer}#${MODAL_ID} form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px 22px}#${MODAL_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}#${MODAL_ID} input,#${MODAL_ID} textarea,#${MODAL_ID} select{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif;text-transform:none;letter-spacing:0}#${MODAL_ID} textarea{min-height:96px;resize:vertical}#${MODAL_ID} .full{grid-column:1/-1}#${MODAL_ID} .actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid rgba(16,21,19,.08);padding-top:10px}#${MODAL_ID} .actions button:last-child{background:#ea580c}
    .ofBrainPanel{grid-column:1/-1;display:grid;gap:12px;padding:14px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}.ofBrainPanel h3{margin:0;font-size:15px;color:#111815}.ofBrainStats{display:flex;flex-wrap:wrap;gap:8px}.ofBrainStats span{display:grid;min-width:112px;border-radius:12px;padding:10px 12px;background:#f8faf9;color:#52605a;font-size:11px;font-weight:900}.ofBrainStats b{font-size:20px;color:#111815;line-height:1}.ofBrainRows{display:grid;gap:8px}.ofBrainRow{display:grid;grid-template-columns:150px 1fr auto;gap:10px;align-items:center;min-height:44px;padding:9px 10px;border-radius:12px;background:#fff7ed;color:#52605a;font-size:12px;font-weight:850}.ofBrainRow b{color:#111815}.ofBrainRow em{font-style:normal;color:#9a3412;font-weight:950}.ofBrainRow .rowActions{display:flex;gap:6px}.ofBrainRow button{border:0;border-radius:999px;padding:7px 9px;background:#101513;color:#fff;font-size:11px;font-weight:950;cursor:pointer}.ofBrainRow button:first-child{background:#ea580c}.ofBrainBadge{position:fixed;right:18px;bottom:58px;z-index:99992;border:1px solid rgba(16,21,19,.09);border-radius:999px;padding:8px 11px;background:#fff;color:#111815;box-shadow:0 12px 28px rgba(16,21,19,.12);font:900 12px Inter,system-ui,sans-serif}.ofBrainBlocked{display:none!important}
    @media(max-width:760px){#${MODAL_ID} form{grid-template-columns:1fr}.ofBrainRow{grid-template-columns:1fr}.ofBrainRow .rowActions{flex-wrap:wrap}.ofBrainBadge{left:10px;right:10px;text-align:center}}
  `;
  document.head.appendChild(style);
}

function toast(message) {
  ensureStyle();
  let node = document.getElementById(TOAST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = TOAST_ID;
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 2600);
}

function field(name, labelText, val = '', type = 'text', full = false) {
  if (type === 'textarea') return `<label class="${full ? 'full' : ''}"><span>${html(labelText)}</span><textarea name="${name}">${html(val)}</textarea></label>`;
  return `<label class="${full ? 'full' : ''}"><span>${html(labelText)}</span><input type="${type}" name="${name}" value="${html(val)}" /></label>`;
}

function findIssue(issueKey) {
  return [...(main().command || []), ...(ops().commandQueue || [])].find((row) => row.issueKey === issueKey || row.id === issueKey);
}

function findRecord(type, issueKey) {
  const state = main();
  return (state[type] || []).find((record) => record._commandIssueKey === issueKey) || {};
}

function fixFields(type, record, item) {
  const fields = [];
  if (type === 'jobs') fields.push(field('title', 'Job name', value(record, ['title', 'Job name']) || item.title), field('client', 'Client', value(record, ['client', 'Client']) || item.client), field('worker', 'Assigned worker', value(record, ['worker', 'Assigned worker'])), field('date', 'Date', value(record, ['date', 'Scheduled date']), 'date'), field('time', 'Time', value(record, ['time', 'Start time']), 'time'), field('service', 'Service', value(record, ['service', 'Service'])), field('price', 'Price NZD', value(record, ['price', 'Price NZD', 'amount']) || item.amount, 'number'), field('billing', 'Billing type', value(record, ['billing', 'Billing type']) || 'Fixed price'), field('recurring', 'Frequency', value(record, ['recurring', 'Frequency']) || 'One-off'), field('notes', 'Job notes', value(record, ['notes', 'Job notes']), 'textarea', true));
  if (type === 'clients') fields.push(field('name', 'Client name', value(record, ['name', 'Name']) || item.title), field('phone', 'Phone', value(record, ['phone', 'Phone'])), field('email', 'Email', value(record, ['email', 'Email']), 'email'), field('address', 'Address', value(record, ['address', 'Address'])), field('service', 'Service memory', value(record, ['service', 'Service memory', 'Preferred service'])), field('price', 'Price memory', value(record, ['price', 'Price memory', 'Saved price'])), field('notes', 'Notes/access', value(record, ['notes', 'Notes/access', 'Access notes']), 'textarea', true));
  if (type === 'quotes') fields.push(field('title', 'Quote title', value(record, ['title', 'Quote']) || item.title), field('client', 'Client', value(record, ['client', 'Client']) || item.client), field('amount', 'Amount NZD', value(record, ['amount', 'Amount']) || item.amount, 'number'), field('status', 'Status', value(record, ['status', 'Status']) || 'Draft'), field('followUp', 'Follow-up', value(record, ['followUp', 'Follow-up', 'follow_up']) || 'Ready'), field('terms', 'Terms', value(record, ['terms', 'Terms']) || 'Valid 14 days'), field('scope', 'Scope', value(record, ['scope', 'Scope']), 'textarea', true));
  if (type === 'invoices') fields.push(field('number', 'Invoice number', value(record, ['number', 'Invoice', 'invoice_number']) || item.title), field('client', 'Client', value(record, ['client', 'Client']) || item.client), field('job', 'Job', value(record, ['job', 'Job'])), field('amount', 'Amount NZD', value(record, ['amount', 'Amount']) || item.amount, 'number'), field('due', 'Due date', value(record, ['due', 'Due date', 'due_date']), 'date'), field('sync', 'Sync status', value(record, ['sync', 'Xero/MYOB status']) || 'Command approval'), field('line', 'Line item', value(record, ['line', 'Line item', 'line_item']), 'textarea', true), field('evidence', 'Proof/evidence', value(record, ['evidence', 'Evidence']), 'textarea', true));
  if (type === 'messages') fields.push(field('subject', 'Subject', value(record, ['subject', 'Subject']) || item.title), field('client', 'Client', value(record, ['client', 'Client']) || item.client), field('job', 'Job', value(record, ['job', 'Job'])), field('channel', 'Channel', value(record, ['channel', 'Channel']) || 'SMS'), field('context', 'Thread context', value(record, ['context', 'detail', 'Message']), 'textarea', true), field('draft', 'Draft reply', value(record, ['draft', 'reply', 'Drafted reply', 'message']), 'textarea', true));
  if (type === 'workers') fields.push(field('name', 'Worker name', value(record, ['name', 'Worker', 'worker']) || item.title), field('role', 'Role', value(record, ['role', 'Role']) || 'Worker'), field('status', 'Clock status', value(record, ['status', 'Clock status']) || 'Clocked in'), field('job', 'Current job', value(record, ['job', 'Current job', 'currentJob'])), field('gps', 'GPS/location', value(record, ['gps', 'GPS/location'])), field('clockIn', 'Clock in', value(record, ['start', 'clockIn', 'Clock in']), 'time'), field('clockOut', 'Clock out', value(record, ['end', 'clockOut', 'Clock out']), 'time'), field('hours', 'Timesheet hours', value(record, ['timesheet', 'hours', 'Timesheet hours'])), field('slipStatus', 'Slip status', value(record, ['slip', 'slipStatus', 'Slip status']) || 'Ready'), field('proof', 'Proof/photos', value(record, ['proof', 'Proof/photos'])), field('messages', 'Worker messages', value(record, ['messages', 'Worker messages']), 'textarea', true));
  fields.push(field('fixNote', 'Owner note', '', 'textarea', true));
  return fields;
}

function openFix(issueKey) {
  const item = findIssue(issueKey);
  if (!item) return;
  const type = item.sourceType || 'jobs';
  const record = findRecord(type, item.issueKey || item.id);
  ensureStyle();
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.hidden = true;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target.id === MODAL_ID || event.target.closest('[data-close]')) closeFix(); });
    modal.addEventListener('submit', submitFix);
  }
  modal.innerHTML = `<section class="brainModal"><header><div><h2>Fix ${html(label(type).toLowerCase())}</h2><p>${html(item.check || item.filled || '')}</p></div><button type="button" data-close>Close</button></header><form data-issue-key="${html(item.issueKey || item.id)}" data-source-type="${html(type)}">${fixFields(type, record, item).join('')}<div class="actions"><button type="button" data-close>Cancel</button><button type="submit">Save fix</button></div></form></section>`;
  modal.hidden = false;
  modal.querySelector('input,textarea')?.focus();
}

function closeFix() {
  const modal = document.getElementById(MODAL_ID);
  if (modal) modal.hidden = true;
}

function applyFix(type, record, data) {
  const fixed = { ...record, _blockedByCommand: false, _doNotShowToday: false, _commandMissing: '', _fixedByCommand: true, fixedAt: now() };
  if (type === 'jobs') Object.assign(fixed, { title: data.title || record.title, 'Job name': data.title || record['Job name'], client: data.client || record.client, Client: data.client || record.Client, worker: data.worker || record.worker, 'Assigned worker': data.worker || record['Assigned worker'], date: data.date || record.date, time: data.time || record.time, service: data.service || record.service, price: data.price || record.price, billing: data.billing || record.billing, recurring: data.recurring || record.recurring, notes: [record.notes, data.notes, data.fixNote].filter(Boolean).join('\n') });
  if (type === 'clients') Object.assign(fixed, { name: data.name || record.name, Name: data.name || record.Name, phone: data.phone || record.phone, email: data.email || record.email, address: data.address || record.address, service: data.service || record.service, price: data.price || record.price, notes: [record.notes, data.notes, data.fixNote].filter(Boolean).join('\n') });
  if (type === 'quotes') Object.assign(fixed, { title: data.title || record.title, Quote: data.title || record.Quote, client: data.client || record.client, Client: data.client || record.Client, amount: data.amount || record.amount, status: data.status || record.status, followUp: data.followUp || record.followUp, terms: data.terms || record.terms, scope: data.scope || record.scope, notes: [record.notes, data.fixNote].filter(Boolean).join('\n') });
  if (type === 'invoices') Object.assign(fixed, { number: data.number || record.number, Invoice: data.number || record.Invoice, client: data.client || record.client, Client: data.client || record.Client, job: data.job || record.job, Job: data.job || record.Job, amount: data.amount || record.amount, due: data.due || record.due, sync: data.sync || record.sync, line: data.line || record.line, evidence: data.evidence || record.evidence, notes: [record.notes, data.fixNote].filter(Boolean).join('\n') });
  if (type === 'messages') Object.assign(fixed, { subject: data.subject || record.subject, client: data.client || record.client, Client: data.client || record.Client, job: data.job || record.job, channel: data.channel || record.channel, context: data.context || record.context, draft: data.draft || record.draft, reply: data.draft || record.reply, notes: [record.notes, data.fixNote].filter(Boolean).join('\n') });
  if (type === 'workers') Object.assign(fixed, { name: data.name || record.name, Worker: data.name || record.Worker, role: data.role || record.role, status: data.status || record.status, job: data.job || record.job, gps: data.gps || record.gps, start: data.clockIn || record.start, clockIn: data.clockIn || record.clockIn, end: data.clockOut || record.end, clockOut: data.clockOut || record.clockOut, timesheet: data.hours || record.timesheet, hours: data.hours || record.hours, slip: data.slipStatus || record.slip, slipStatus: data.slipStatus || record.slipStatus, proof: data.proof || record.proof, messages: data.messages || record.messages, notes: [record.notes, data.fixNote].filter(Boolean).join('\n') });
  return fixed;
}

function submitFix(event) {
  event.preventDefault();
  const form = event.target;
  const issueKey = form.dataset.issueKey;
  const sourceType = form.dataset.sourceType;
  const data = Object.fromEntries(new FormData(form).entries());
  const state = main();
  const opState = ops();
  ['jobs', 'clients', 'quotes', 'invoices', 'messages', 'workers'].forEach((type) => {
    if (sourceType && type !== sourceType) return;
    state[type] = (state[type] || []).map((record) => record._commandIssueKey === issueKey ? applyFix(type, record, data) : record);
  });
  state.command = (state.command || []).map((item) => item.issueKey === issueKey ? { ...item, status: 'Fixed', owner: 'Approve', fixedAt: now(), fixNote: data.fixNote } : item);
  opState.commandQueue = (opState.commandQueue || []).map((item) => item.issueKey === issueKey ? { ...item, status: 'fixed', fixedAt: now(), fixNote: data.fixNote } : item);
  state.audit = [{ action: 'Fixed missing details', detail: data.title || data.number || data.subject || data.name || issueKey, at: now() }, ...(state.audit || [])].slice(0, 50);
  saveMain(state);
  saveOps(opState);
  closeFix();
  toast('Missing details saved');
  setTimeout(run, 50);
}

function setRecordDecision(issueKey, status) {
  const state = main();
  ['jobs', 'clients', 'quotes', 'invoices', 'messages', 'workers'].forEach((type) => {
    state[type] = (state[type] || []).map((record) => {
      if (record._commandIssueKey !== issueKey) return record;
      if (status === 'approved') return { ...record, _adminOverride: true, _blockedByCommand: false, _doNotShowToday: false, _commandMissing: '', approvedAt: now() };
      if (status === 'parked') return { ...record, _parkedByCommand: true, _blockedByCommand: true, _doNotShowToday: type === 'jobs', _commandMissing: record._commandMissing || 'parked in Command', parkedAt: now() };
      return record;
    });
  });
  return state;
}

function markCommand(issueKey, status) {
  const state = setRecordDecision(issueKey, status);
  const opState = ops();
  state.command = (state.command || []).map((item) => (item.issueKey === issueKey || item.id === issueKey) ? { ...item, status, decidedAt: now() } : item);
  opState.commandQueue = (opState.commandQueue || []).map((item) => (item.issueKey === issueKey || item.id === issueKey) ? { ...item, status, decidedAt: now() } : item);
  state.audit = [{ action: `Command ${status}`, detail: issueKey, at: now() }, ...(state.audit || [])].slice(0, 50);
  saveMain(state);
  saveOps(opState);
  toast(`Command item ${status}`);
  render();
}

function renderBadge(issueCount) {
  let badge = document.querySelector('.ofBrainBadge');
  if (!issueCount) { badge?.remove(); return; }
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'ofBrainBadge';
    document.body.appendChild(badge);
  }
  badge.textContent = `${issueCount} admin fix${issueCount === 1 ? '' : 'es'} in Command`;
}

function activeIssues(state) {
  return (state.command || []).filter((item) => /fix needed|missing/i.test(`${item.type} ${item.status}`) && !/approved|parked|fixed/i.test(String(item.status || '')));
}

function render() {
  ensureStyle();
  const result = validateStores();
  document.querySelectorAll('.ofBrainPanel').forEach((node) => node.remove());
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  const p = page();
  const state = result.state;
  const issues = activeIssues(state);
  renderBadge(issues.length);

  const readyJobs = (state.jobs || []).filter((job) => !job._blockedByCommand && !job._doNotShowToday).length;
  const blockedJobs = (state.jobs || []).filter((job) => job._blockedByCommand || job._doNotShowToday).length;
  const blockedAll = ['jobs', 'clients', 'quotes', 'invoices', 'messages', 'workers'].reduce((sum, type) => sum + (state[type] || []).filter((item) => item._blockedByCommand).length, 0);

  if (p === 'today') {
    root.insertAdjacentHTML('afterbegin', `<section class="ofBrainPanel"><h3>Boss clean run</h3><div class="ofBrainStats"><span><b>${readyJobs}</b>complete saved jobs</span><span><b>${blockedJobs}</b>held from Today</span><span><b>${issues.length}</b>Command fixes</span></div><div class="ofBrainRows">${issues.slice(0, 4).map(issueRow).join('') || '<span class="ofBrainRow"><b>Clean</b><small>No missing saved details found.</small><em>Ready</em></span>'}</div></section>`);
  }

  if (p === 'jobs') {
    const jobIssues = issues.filter((item) => item.sourceType === 'jobs');
    root.insertAdjacentHTML('beforeend', `<section class="ofBrainPanel"><h3>Job admin check</h3><div class="ofBrainStats"><span><b>${readyJobs}</b>ready jobs</span><span><b>${jobIssues.length}</b>need details</span><span><b>${blockedJobs}</b>not on Today</span></div><div class="ofBrainRows">${jobIssues.slice(0, 6).map(issueRow).join('') || '<span class="ofBrainRow"><b>Jobs clean</b><small>Saved jobs have date, time, client, worker, service and price.</small><em>Ready</em></span>'}</div></section>`);
  }

  if (p === 'command') {
    root.insertAdjacentHTML('beforeend', `<section class="ofBrainPanel"><h3>Admin fix queue</h3><div class="ofBrainStats"><span><b>${issues.length}</b>missing detail items</span><span><b>${blockedAll}</b>blocked records</span><span><b>${(state.audit || []).length}</b>admin actions</span></div><div class="ofBrainRows">${issues.slice(0, 10).map(issueRow).join('') || '<span class="ofBrainRow"><b>No fixes waiting</b><small>Incomplete records will appear here automatically.</small><em>Ready</em></span>'}</div></section>`);
  }
}

function issueRow(item) {
  return `<span class="ofBrainRow"><b>${html(item.type)}</b><small>${html(item.title)} - ${html(item.filled || item.check || '')}</small><span class="rowActions"><button type="button" data-brain-fix="${html(item.issueKey || item.id)}">Edit</button><button type="button" data-brain-approve="${html(item.issueKey || item.id)}">Approve</button><button type="button" data-brain-park="${html(item.issueKey || item.id)}">Park</button></span></span>`;
}

function hideBlockedTodayRows() {
  const state = main();
  const blockedTitles = new Set((state.jobs || []).filter((job) => job._doNotShowToday || job._blockedByCommand).map((job) => recordTitle('jobs', job)));
  document.querySelectorAll('.today .cocRow,.today .jobCard').forEach((row) => {
    const text = row.textContent || '';
    const shouldHide = [...blockedTitles].some((title) => title && text.includes(title));
    row.classList.toggle('ofBrainBlocked', shouldHide);
  });
}

function handleClick(event) {
  const button = event.target.closest('button');
  if (!button) return;
  const fix = button.dataset.brainFix;
  const approve = button.dataset.brainApprove;
  const park = button.dataset.brainPark;
  if (fix) { event.preventDefault(); event.stopPropagation(); openFix(fix); }
  if (approve) { event.preventDefault(); event.stopPropagation(); markCommand(approve, 'approved'); }
  if (park) { event.preventDefault(); event.stopPropagation(); markCommand(park, 'parked'); }
}

function run() {
  render();
  hideBlockedTodayRows();
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(run, 700));
  window.addEventListener('hashchange', () => setTimeout(run, 120));
  window.addEventListener('popstate', () => setTimeout(run, 120));
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', () => setTimeout(run, 160));
  setInterval(run, 2200);
}
