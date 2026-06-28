// CHURVOX_OPTION_F_FULL_SITE_WIRING_20260629
// Cross-page business rules: save records, block incomplete work, route problems to Command.

const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';
const RULE_STORE = 'churvox_option_f_full_site_wiring_v1';
const STYLE_ID = 'option-f-full-site-wiring-style';
const MODAL_ID = 'option-f-full-site-wiring-modal';
const TOAST_ID = 'option-f-full-site-wiring-toast';

const mainDefaults = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
const opsDefaults = { audit: [], commandQueue: [], invoices: [], messages: [], workerDays: [], teamPeople: [] };
const ruleDefaults = { fixes: {}, audit: [], exports: [] };

function load(key, fallback) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}')) }; } catch (_) { return { ...fallback }; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function main() { return load(MAIN_STORE, mainDefaults); }
function ops() { return load(OPS_STORE, opsDefaults); }
function rules() { return load(RULE_STORE, ruleDefaults); }
function saveMain(value) { save(MAIN_STORE, value); }
function saveOps(value) { save(OPS_STORE, value); }
function saveRules(value) { save(RULE_STORE, value); }

function now() { return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }); }
function id(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`; }
function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function money(value) { const raw = clean(value).replace(/[^0-9.-]/g, ''); const n = Number(raw || 0); return Number.isFinite(n) ? n : 0; }
function html(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function text(record, keys) { for (const key of keys) { const raw = record?.[key]; if (raw !== undefined && raw !== null && clean(raw)) return clean(raw); } return ''; }
function blank(value) { const v = lower(value); return !v || v === 'none' || v === 'not set' || v === 'not saved' || v === 'undefined' || v === 'null'; }
function page() { const hash = (window.location.hash || '').replace('#', '').toLowerCase(); if (hash) return hash; const active = document.querySelector('.churvoxOptionC .cocNav button.active'); return active ? active.textContent.trim().toLowerCase() : ''; }

function issueKey(type, record, fields) {
  const base = text(record, ['id', '_id', 'title', 'Job name', 'name', 'number', 'Invoice', 'subject']) || JSON.stringify(record).slice(0, 60);
  return `${type}:${base}:${fields.join('|')}`.toLowerCase();
}

function commandExists(state, opState, key) {
  return [...(state.command || []), ...(opState.commandQueue || [])].some((item) => item.issueKey === key || item.flowKey === key || item.id === key);
}

function addCommand(state, opState, ruleState, key, item) {
  if (commandExists(state, opState, key)) return false;
  const payload = {
    id: `rule-${Math.abs(hash(key))}`,
    status: 'waiting',
    owner: item.owner || 'Edit',
    createdAt: now(),
    issueKey: key,
    flowKey: key,
    ...item,
  };
  state.command = [payload, ...(state.command || [])].slice(0, 120);
  opState.commandQueue = [payload, ...(opState.commandQueue || [])].slice(0, 120);
  ruleState.fixes[key] = { at: now(), type: item.type, title: item.title, missing: item.missing || '' };
  ruleState.audit = [{ action: 'Sent to Command', detail: `${item.type}: ${item.title}`, at: now() }, ...(ruleState.audit || [])].slice(0, 80);
  state.audit = [{ action: 'Sent to Command', detail: `${item.type}: ${item.title}`, at: now() }, ...(state.audit || [])].slice(0, 80);
  return true;
}

function hash(textValue) { let out = 0; const input = String(textValue || ''); for (let i = 0; i < input.length; i += 1) out = ((out << 5) - out) + input.charCodeAt(i) | 0; return out; }

function validateJob(job) {
  const missing = [];
  if (blank(text(job, ['client', 'Client', 'client_name', 'customer_name']))) missing.push('client');
  if (blank(text(job, ['worker', 'Assigned worker', 'assigned_worker_name', 'worker_name']))) missing.push('assigned worker');
  if (blank(text(job, ['date', 'Scheduled date', 'scheduled_date']))) missing.push('date');
  if (blank(text(job, ['time', 'Start time', 'scheduled_time']))) missing.push('time');
  if (blank(text(job, ['service', 'Service']))) missing.push('service');
  const billing = lower(text(job, ['billing', 'Billing type']));
  if (money(text(job, ['price', 'Price NZD', 'amount'])) <= 0 && !billing.includes('quote')) missing.push('price');
  return missing;
}

function validateClient(client) {
  const missing = [];
  if (blank(text(client, ['name', 'Name', 'client_name', 'customer_name']))) missing.push('name');
  if (blank(text(client, ['phone', 'Phone'])) && blank(text(client, ['email', 'Email']))) missing.push('phone or email');
  if (blank(text(client, ['address', 'Address', 'site_address']))) missing.push('address');
  return missing;
}

function validateQuote(quote) {
  const missing = [];
  if (blank(text(quote, ['client', 'Client', 'client_name', 'customer_name']))) missing.push('client');
  if (blank(text(quote, ['scope', 'Scope', 'description']))) missing.push('scope');
  if (money(text(quote, ['amount', 'Amount', 'price', 'total'])) <= 0) missing.push('amount');
  return missing;
}

function validateInvoice(invoice) {
  const missing = [];
  if (blank(text(invoice, ['client', 'Client', 'client_name', 'customer_name']))) missing.push('client');
  if (blank(text(invoice, ['due', 'Due date', 'due_date']))) missing.push('due date');
  if (money(text(invoice, ['amount', 'Amount', 'total', 'amount_due'])) <= 0) missing.push('amount');
  if (blank(text(invoice, ['line', 'Line item', 'description']))) missing.push('line item');
  return missing;
}

function validateMessage(message) {
  const missing = [];
  if (blank(text(message, ['client', 'Client', 'customer_name']))) missing.push('client');
  if (blank(text(message, ['subject', 'Subject']))) missing.push('subject');
  if (blank(text(message, ['draft', 'Draft reply', 'reply']))) missing.push('draft reply');
  return missing;
}

function validateWorker(worker) {
  const missing = [];
  const reviewText = lower(`${text(worker, ['payroll', 'Payroll review'])} ${text(worker, ['slip', 'Slip', 'slipStatus'])} ${text(worker, ['timesheet', 'Timesheet'])}`);
  if (blank(text(worker, ['name', 'Name', 'Worker']))) missing.push('worker name');
  if (/review|pending|needs|not ready|mismatch|0h/.test(reviewText)) missing.push('slip review');
  if (/no proof|missing/.test(lower(text(worker, ['proof', 'Proof/photos'])))) missing.push('proof');
  return missing;
}

function normalizeRecord(record, type, missing) {
  if (!missing.length) {
    const next = { ...record, _blockedByCommand: false, _doNotShowToday: false, _commandMissing: '', _lastRuleCheck: now() };
    return next._parkedByCommand ? record : next;
  }
  return { ...record, _blockedByCommand: true, _doNotShowToday: true, _commandMissing: missing.join(', '), _lastRuleCheck: now() };
}

function validateAll() {
  const state = main();
  const opState = ops();
  const ruleState = rules();
  let changed = false;

  state.jobs = (state.jobs || []).map((job) => {
    const missing = validateJob(job);
    const next = normalizeRecord(job, 'jobs', missing);
    if (missing.length) {
      changed = addCommand(state, opState, ruleState, issueKey('jobs', job, missing), {
        type: 'Job fix needed',
        title: text(job, ['title', 'Job name']) || 'Job missing details',
        client: text(job, ['client', 'Client']) || 'Not set',
        sourceType: 'jobs',
        sourceId: text(job, ['id']),
        missing: missing.join(', '),
        filled: `Job is blocked until ${missing.join(', ')} is fixed.`,
        evidence: 'Churvox checked the job record before allowing it into Today.',
        check: 'Edit the missing fields, then approve from Command.',
      }) || changed;
    }
    return next;
  });

  state.clients = (state.clients || []).map((client) => {
    const missing = validateClient(client);
    if (missing.length) {
      changed = addCommand(state, opState, ruleState, issueKey('clients', client, missing), {
        type: 'Client issue ready',
        title: text(client, ['name', 'Name']) || 'Client missing details',
        client: text(client, ['name', 'Name']) || 'Not set',
        sourceType: 'clients',
        sourceId: text(client, ['id']),
        missing: missing.join(', '),
        filled: `Client record needs ${missing.join(', ')} before Churvox can rely on it.`,
        evidence: 'Client memory checked by Churvox.',
        check: 'Fix client details or park if not needed yet.',
      }) || changed;
    }
    return { ...client, _commandMissing: missing.join(', '), _lastRuleCheck: now() };
  });

  state.quotes = (state.quotes || []).map((quote) => {
    const missing = validateQuote(quote);
    if (missing.length) {
      changed = addCommand(state, opState, ruleState, issueKey('quotes', quote, missing), {
        type: 'Quote fix needed',
        title: text(quote, ['title', 'Quote']) || 'Quote missing details',
        client: text(quote, ['client', 'Client']) || 'Not set',
        amount: money(text(quote, ['amount', 'Amount', 'price', 'total'])),
        sourceType: 'quotes',
        sourceId: text(quote, ['id']),
        missing: missing.join(', '),
        filled: `Quote is blocked until ${missing.join(', ')} is fixed.`,
        evidence: 'Churvox checked quote client, amount and scope.',
        check: 'Edit quote before sending approval.',
      }) || changed;
    }
    return { ...quote, _commandMissing: missing.join(', '), _lastRuleCheck: now() };
  });

  state.invoices = (state.invoices || []).map((invoice) => {
    const missing = validateInvoice(invoice);
    if (missing.length) {
      changed = addCommand(state, opState, ruleState, issueKey('invoices', invoice, missing), {
        type: 'Invoice fix needed',
        title: text(invoice, ['number', 'Invoice']) || text(invoice, ['job', 'Job']) || 'Invoice missing details',
        client: text(invoice, ['client', 'Client']) || 'Not set',
        amount: money(text(invoice, ['amount', 'Amount', 'total', 'amount_due'])),
        sourceType: 'invoices',
        sourceId: text(invoice, ['id']),
        missing: missing.join(', '),
        filled: `Invoice is blocked until ${missing.join(', ')} is fixed.`,
        evidence: 'Churvox checked money, due date, client and line item.',
        check: 'Fix invoice details before sending or sync.',
      }) || changed;
    }
    return { ...invoice, _commandMissing: missing.join(', '), _lastRuleCheck: now() };
  });

  state.messages = (state.messages || []).map((message) => {
    const missing = validateMessage(message);
    if (missing.length) {
      changed = addCommand(state, opState, ruleState, issueKey('messages', message, missing), {
        type: 'Message fix needed',
        title: text(message, ['subject', 'Subject']) || 'Message missing details',
        client: text(message, ['client', 'Client']) || 'Not set',
        sourceType: 'messages',
        sourceId: text(message, ['id']),
        missing: missing.join(', '),
        filled: `Message draft is blocked until ${missing.join(', ')} is fixed.`,
        evidence: 'Churvox checked client, subject and drafted reply.',
        check: 'Fix draft before sending approval.',
      }) || changed;
    }
    return { ...message, _commandMissing: missing.join(', '), _lastRuleCheck: now() };
  });

  state.workers = (state.workers || []).map((worker) => {
    const missing = validateWorker(worker);
    if (missing.length) {
      changed = addCommand(state, opState, ruleState, issueKey('workers', worker, missing), {
        type: 'Timesheet/proof/slip issue ready',
        title: `${text(worker, ['name', 'Worker']) || 'Worker'} - ${text(worker, ['job', 'Current job']) || 'worker day'}`,
        client: text(worker, ['client', 'Client']) || 'Not set',
        sourceType: 'workers',
        sourceId: text(worker, ['id']),
        missing: missing.join(', '),
        filled: `Worker record needs ${missing.join(', ')} before payroll approval.`,
        evidence: `${text(worker, ['timesheet', 'Timesheet']) || 'No timesheet'} - ${text(worker, ['proof', 'Proof/photos']) || 'No proof'}`,
        check: 'Fix worker day or park until worker confirms.',
      }) || changed;
    }
    return { ...worker, _commandMissing: missing.join(', '), _lastRuleCheck: now() };
  });

  if (changed) {
    saveMain(state);
    saveOps(opState);
    saveRules(ruleState);
    toast('Churvox routed missing info to Command', 'Incomplete records are held until the boss checks them.');
  } else {
    saveMain(state);
    saveOps(opState);
    saveRules(ruleState);
  }
  renderAdminPanel();
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ofFullWirePanel{grid-column:1/-1;display:grid;gap:12px;padding:14px;border:1px solid rgba(16,21,19,.08);border-left:5px solid #ef6431;border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    .ofFullWirePanel h3{margin:0;color:#111815;font-size:15px}.ofFullWirePanel p{margin:0;color:#52605a;font-size:12px;font-weight:850;line-height:1.4}.ofFullWireStats{display:flex;flex-wrap:wrap;gap:8px}.ofFullWireStats span{display:grid;min-width:104px;border-radius:12px;padding:10px 12px;background:#eef2ed;color:#52605a;font-size:11px;font-weight:900}.ofFullWireStats b{color:#111815;font-size:20px;line-height:1}.ofFullWireActions{display:flex;flex-wrap:wrap;gap:8px}.ofFullWireActions button{min-height:36px;border:0;border-radius:999px;padding:8px 12px;background:#101513;color:#fff;font-size:12px;font-weight:950;cursor:pointer}.ofFullWireActions button.primary{background:#ef6431}.ofFullWireActions button.quiet{background:#eef2ed;color:#111815}.ofFullWireRows{display:grid;gap:7px}.ofFullWireRows span{display:grid;grid-template-columns:150px 1fr auto;gap:10px;align-items:center;min-height:40px;padding:8px 10px;border-radius:12px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:850}.ofFullWireRows b{color:#111815}.ofFullWireRows em{font-style:normal;color:#9a3412;font-weight:950}
    #${TOAST_ID}{position:fixed;right:18px;bottom:314px;z-index:999999;max-width:380px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${TOAST_ID}.show{opacity:1;transform:translateY(0)}#${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.7);font-weight:800}
    #${MODAL_ID}{position:fixed;inset:0;z-index:1000002;display:grid;place-items:center;padding:24px;background:rgba(16,21,19,.42);backdrop-filter:blur(5px)}#${MODAL_ID}[hidden]{display:none}#${MODAL_ID} .wireModal{width:min(940px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.3)}#${MODAL_ID} header{display:flex;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}#${MODAL_ID} h2{margin:0;font-size:30px;line-height:1.05}#${MODAL_ID} p{margin:7px 0 0;color:#52605a;font-size:13px;font-weight:850}#${MODAL_ID} button{border:0;border-radius:999px;padding:10px 14px;background:#101513;color:#fff;font-weight:950;cursor:pointer}#${MODAL_ID} .wireBody{padding:18px 22px 22px;display:grid;gap:10px}#${MODAL_ID} .wireBody textarea{width:100%;min-height:260px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:12px;background:#f8faf9;color:#111815;font:850 13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre}
    @media(max-width:760px){.ofFullWireRows span{grid-template-columns:1fr}#${TOAST_ID}{right:10px;left:10px;bottom:16px}.ofFullWireActions button{flex:1}}
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
  node._timer = setTimeout(() => node.classList.remove('show'), 2600);
}

function currentStats() {
  const state = main();
  const opState = ops();
  const jobs = state.jobs || [];
  const completeJobs = jobs.filter((job) => !job._blockedByCommand && !job._doNotShowToday).length;
  const heldJobs = jobs.filter((job) => job._blockedByCommand || job._doNotShowToday).length;
  const commandWaiting = [...(state.command || []), ...(opState.commandQueue || [])].filter((item) => !/approved|parked|done|fixed/i.test(item.status || '')).length;
  const records = ['jobs', 'clients', 'quotes', 'invoices', 'messages', 'workers'].reduce((sum, key) => sum + (state[key] || []).length, 0);
  return { completeJobs, heldJobs, commandWaiting, records };
}

function renderAdminPanel() {
  ensureStyle();
  document.querySelectorAll('.ofFullWirePanel').forEach((node) => node.remove());
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  const current = page();
  if (!['today', 'command', 'jobs', 'clients', 'workers', 'quotes', 'invoices', 'messages', 'team', 'xero', 'settings', 'help'].includes(current)) return;
  const stats = currentStats();
  const ruleState = rules();
  const rows = Object.values(ruleState.fixes || {}).slice(-4).reverse().map((item) => `<span><b>${html(item.type)}</b><small>${html(item.title)}${item.missing ? ` - missing ${html(item.missing)}` : ''}</small><em>${html(item.at)}</em></span>`).join('') || '<span><b>Rules live</b><small>Missing info will be sent to Command automatically.</small><em>Watching</em></span>';
  root.insertAdjacentHTML('beforeend', `<section class="ofFullWirePanel"><h3>Churvox admin wiring</h3><p>Every page is checked for usable records. Incomplete work is held out of Today and routed to Command for the owner.</p><div class="ofFullWireStats"><span><b>${stats.completeJobs}</b>today-ready jobs</span><span><b>${stats.heldJobs}</b>held jobs</span><span><b>${stats.commandWaiting}</b>Command items</span><span><b>${stats.records}</b>saved records</span></div><div class="ofFullWireActions"><button type="button" class="primary" data-wire-action="validate">Run checks</button><button type="button" data-wire-action="export">Export workspace</button><button type="button" class="quiet" data-wire-action="settings">Open controls</button></div><div class="ofFullWireRows">${rows}</div></section>`);
}

function openModal(title, note, content) {
  ensureStyle();
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.hidden = true;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target.id === MODAL_ID || event.target.closest('[data-wire-close]')) modal.hidden = true; });
  }
  modal.innerHTML = `<section class="wireModal"><header><div><h2>${html(title)}</h2><p>${html(note)}</p></div><button type="button" data-wire-close>Close</button></header><div class="wireBody">${content}</div></section>`;
  modal.hidden = false;
}

function exportWorkspace() {
  const payload = { exportedAt: now(), records: main(), operations: ops(), rules: rules() };
  const textValue = JSON.stringify(payload, null, 2);
  const ruleState = rules();
  ruleState.exports = [{ at: now(), size: textValue.length }, ...(ruleState.exports || [])].slice(0, 20);
  saveRules(ruleState);
  openModal('Workspace export', 'This is the current wired workspace data. CSV/export decisions stay explicit.', `<textarea readonly>${html(textValue)}</textarea>`);
  toast('Workspace export ready', 'The export is shown in a modal for review.');
}

function openControls() {
  const content = `<div class="ofFullWireRows"><span><b>Today gate</b><small>Jobs need client, worker, date, time, service and price before Today.</small><em>Locked</em></span><span><b>Command routing</b><small>Missing details, proof issues, message drafts and sync decisions go to Command.</small><em>Live</em></span><span><b>Xero guardrail</b><small>Draft sync only. No tax filing. No payout files.</small><em>Locked</em></span><span><b>Approval controls</b><small>Approve, Edit and Park stay on Command.</small><em>Locked</em></span></div>`;
  openModal('Churvox controls', 'Boss-simple rules for the whole OS.', content);
}

function makeRecurringPlan() {
  const state = main();
  const jobs = state.jobs || [];
  const recurring = jobs.filter((job) => /weekly|fortnightly|monthly/i.test(text(job, ['recurring', 'Frequency'])));
  if (!recurring.length) return toast('No recurring jobs saved yet', 'Add a job and choose weekly, fortnightly or monthly.');
  recurring.forEach((job) => {
    const missing = validateJob(job);
    if (missing.length) return;
    const nextId = id('recurring-job');
    state.jobs = [{ ...job, id: nextId, title: `${text(job, ['title', 'Job name']) || 'Recurring job'} - next run`, status: 'assigned', createdAt: now(), _generatedBy: 'recurring' }, ...(state.jobs || [])].slice(0, 100);
  });
  state.audit = [{ action: 'Generated recurring runs', detail: `${recurring.length} source jobs checked`, at: now() }, ...(state.audit || [])].slice(0, 80);
  saveMain(state);
  toast('Recurring runs checked', 'Complete recurring jobs were prepared. Incomplete ones stay in Command.');
  setTimeout(validateAll, 80);
}

function dispatchReady() {
  const state = main();
  const ready = (state.jobs || []).filter((job) => !validateJob(job).length);
  const held = (state.jobs || []).filter((job) => validateJob(job).length);
  openModal('Dispatch board check', 'Only complete jobs are dispatch-ready.', `<div class="ofFullWireRows"><span><b>${ready.length} ready</b><small>Client, worker, date, time, service and price are usable.</small><em>Dispatch</em></span><span><b>${held.length} held</b><small>Missing fields were sent to Command.</small><em>Fix first</em></span></div>`);
  setTimeout(validateAll, 80);
}

function prepareFollowUps() {
  const state = main();
  const opState = ops();
  const ruleState = rules();
  let count = 0;
  (state.quotes || []).forEach((quote) => {
    const missing = validateQuote(quote);
    if (missing.length) return;
    const key = issueKey('quote-follow-up', quote, ['follow-up']);
    if (addCommand(state, opState, ruleState, key, { type: 'Quote follow-up ready', title: text(quote, ['title', 'Quote']) || 'Quote follow-up', client: text(quote, ['client', 'Client']), amount: money(text(quote, ['amount', 'Amount'])), owner: 'Approve', filled: `Follow-up prepared for ${text(quote, ['client', 'Client']) || 'client'}.`, evidence: text(quote, ['scope', 'Scope']) || 'Quote scope saved.', check: 'Approve or edit wording in Command.' })) count += 1;
  });
  saveMain(state); saveOps(opState); saveRules(ruleState);
  toast('Follow-ups prepared', `${count} quote follow-up${count === 1 ? '' : 's'} sent to Command.`);
}

function acceptedQuotesToJobs() {
  const state = main();
  let count = 0;
  (state.quotes || []).filter((quote) => /accepted/i.test(text(quote, ['status', 'Status']))).forEach((quote) => {
    const title = text(quote, ['title', 'Quote']) || 'Accepted quote job';
    const exists = (state.jobs || []).some((job) => lower(text(job, ['title', 'Job name'])) === lower(title) && lower(text(job, ['client', 'Client'])) === lower(text(quote, ['client', 'Client'])));
    if (exists) return;
    state.jobs = [{ id: id('accepted-job'), title, client: text(quote, ['client', 'Client']), service: text(quote, ['scope', 'Scope']) || 'Accepted quote work', price: money(text(quote, ['amount', 'Amount'])), billing: 'Quote accepted', recurring: 'One-off', status: 'needs_schedule', notes: 'Created from accepted quote. Needs date, time and assigned worker before Today.', createdAt: now() }, ...(state.jobs || [])].slice(0, 100);
    count += 1;
  });
  saveMain(state);
  toast('Accepted quotes checked', `${count} job shell${count === 1 ? '' : 's'} created. Missing schedules go to Command.`);
  setTimeout(validateAll, 80);
}

function syncReadyInvoices() {
  const state = main();
  const opState = ops();
  const ruleState = rules();
  let count = 0;
  (state.invoices || []).forEach((invoice) => {
    const missing = validateInvoice(invoice);
    if (missing.length) return;
    const key = issueKey('invoice-sync', invoice, ['sync']);
    if (addCommand(state, opState, ruleState, key, { type: 'Invoice sync ready', title: text(invoice, ['number', 'Invoice']) || text(invoice, ['job', 'Job']) || 'Invoice', client: text(invoice, ['client', 'Client']), amount: money(text(invoice, ['amount', 'Amount', 'total'])), owner: 'Approve', filled: 'Draft invoice is ready for accounting sync.', evidence: text(invoice, ['evidence', 'Evidence']) || text(invoice, ['line', 'Line item']) || 'Invoice record complete.', check: 'Owner-approved draft sync only. No tax filing. No payout files.' })) count += 1;
  });
  saveMain(state); saveOps(opState); saveRules(ruleState);
  toast('Sync checks prepared', `${count} invoice sync decision${count === 1 ? '' : 's'} sent to Command.`);
}

function handleButton(button, event) {
  const label = lower(button.textContent);
  const current = page();
  if (button.dataset.wireAction === 'validate') { event.preventDefault(); validateAll(); return true; }
  if (button.dataset.wireAction === 'export') { event.preventDefault(); exportWorkspace(); return true; }
  if (button.dataset.wireAction === 'settings') { event.preventDefault(); openControls(); return true; }
  if (label.includes('recurring')) { event.preventDefault(); makeRecurringPlan(); return true; }
  if (label.includes('dispatch board')) { event.preventDefault(); dispatchReady(); return true; }
  if (label.includes('follow-up')) { event.preventDefault(); prepareFollowUps(); return true; }
  if (label.includes('accepted to jobs')) { event.preventDefault(); acceptedQuotesToJobs(); return true; }
  if (label.includes('export') && current === 'clients') { event.preventDefault(); exportWorkspace(); return true; }
  if (/worker app rules|csv defaults|security|data export|billing controls/i.test(button.textContent)) { event.preventDefault(); openControls(); return true; }
  if (/xero|sync|ready to sync/i.test(button.closest('.cocPanel')?.textContent || '') && label.includes('ready')) { event.preventDefault(); syncReadyInvoices(); return true; }
  if (/setup help|csv import|worker app|billing|add client|approve in command|import csv|xero guardrails/i.test(button.textContent)) { event.preventDefault(); openControls(); return true; }
  return false;
}

function clickHandler(event) {
  const button = event.target.closest('button');
  if (!button || !document.querySelector('.churvoxOptionC')) return;
  if (handleButton(button, event)) {
    event.stopPropagation();
    setTimeout(validateAll, 120);
  }
}

let running = false;
function scheduleValidate() {
  if (running) return;
  running = true;
  setTimeout(() => { running = false; validateAll(); }, 180);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(validateAll, 1700));
  window.addEventListener('hashchange', () => setTimeout(validateAll, 260));
  window.addEventListener('popstate', () => setTimeout(validateAll, 260));
  document.addEventListener('click', clickHandler, true);
  document.addEventListener('input', scheduleValidate, true);
  document.addEventListener('change', scheduleValidate, true);
  setInterval(validateAll, 4200);
}

export {};
