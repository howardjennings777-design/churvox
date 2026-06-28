const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';
const STORE = 'churvox_option_f_auto_admin_flow_v1';
const STYLE_ID = 'option-f-auto-admin-flow-style';

const mainDefaults = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
const opsDefaults = { audit: [], commandQueue: [], invoices: [], messages: [], workerDays: [], teamPeople: [] };
const flowDefaults = { created: {}, audit: [] };

function load(key, fallback) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}')) }; } catch (_) { return { ...fallback }; }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function main() { return load(MAIN_STORE, mainDefaults); }
function ops() { return load(OPS_STORE, opsDefaults); }
function flow() { return load(STORE, flowDefaults); }
function saveMain(value) { save(MAIN_STORE, value); }
function saveOps(value) { save(OPS_STORE, value); }
function saveFlow(value) { save(STORE, value); }

function now() {
  return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
}

function page() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function text(record, keys) {
  for (const key of keys) {
    const raw = record?.[key];
    if (raw !== undefined && raw !== null && String(raw).trim()) return String(raw).trim();
  }
  return '';
}

function amount(record) {
  return Number(String(text(record, ['amount', 'Amount', 'price', 'Price NZD']) || '0').replace(/[^0-9.-]/g, '') || 0);
}

function completeDate(record) {
  return Boolean(text(record, ['date', 'Scheduled date', 'scheduled_date'])) && Boolean(text(record, ['time', 'Start time', 'scheduled_time']));
}

function keyFor(type, record) {
  return `${type}:${text(record, ['id', '_backendId', 'title', 'Job name', 'number', 'Invoice', 'subject', 'name'])}`.toLowerCase();
}

function jobScheduleIssueKey(jobId) {
  return `jobs:${jobId}:assigned worker|date|time`.toLowerCase();
}

function addCommand(state, opState, flowState, flowKey, item) {
  if (flowState.created[flowKey]) return false;
  const payload = {
    id: `auto-${Math.abs(hash(flowKey))}`,
    status: 'waiting',
    owner: item.owner || 'Approve',
    createdAt: now(),
    flowKey,
    ...item,
  };
  state.command = [payload, ...(state.command || [])].slice(0, 90);
  opState.commandQueue = [payload, ...(opState.commandQueue || [])].slice(0, 90);
  flowState.created[flowKey] = { at: now(), type: item.type, title: item.title };
  flowState.audit = [{ action: 'Auto admin queued Command', detail: `${item.type}: ${item.title}`, at: now() }, ...(flowState.audit || [])].slice(0, 50);
  state.audit = [{ action: 'Auto admin queued Command', detail: `${item.type}: ${item.title}`, at: now() }, ...(state.audit || [])].slice(0, 50);
  return true;
}

function hash(textValue) {
  let out = 0;
  const input = String(textValue || '');
  for (let index = 0; index < input.length; index += 1) out = ((out << 5) - out) + input.charCodeAt(index) | 0;
  return out;
}

function runFlows() {
  const state = main();
  const opState = ops();
  const flowState = flow();
  let changed = false;

  (state.jobs || []).forEach((job) => {
    if (job._blockedByCommand || job._doNotShowToday || job._parkedByCommand) return;
    const status = `${text(job, ['status', 'Status'])} ${text(job, ['proof', 'Proof/photos'])}`;
    if (/proof|completed|done/i.test(status) && amount(job)) {
      changed = addCommand(state, opState, flowState, `invoice:${keyFor('job', job)}`, {
        type: 'Invoice ready',
        title: text(job, ['title', 'Job name']) || 'Completed job',
        client: text(job, ['client', 'Client']),
        amount: amount(job),
        filled: `Draft invoice prepared from ${text(job, ['service', 'Service']) || 'job'} at ${text(job, ['price', 'Price NZD']) || amount(job)}.`,
        evidence: text(job, ['proof', 'Proof/photos']) || 'Job proof attached.',
        check: 'Owner checks price and proof, then approves invoice in Command.',
      }) || changed;
    }
    if (!completeDate(job)) {
      changed = addCommand(state, opState, flowState, `job-schedule:${keyFor('job', job)}`, {
        type: 'Job fix needed',
        title: text(job, ['title', 'Job name']) || 'Unscheduled job',
        client: text(job, ['client', 'Client']) || 'Not set',
        owner: 'Edit',
        sourceType: 'jobs',
        sourceId: text(job, ['id']),
        issueKey: job._commandIssueKey || `jobs:${text(job, ['id']) || text(job, ['title', 'Job name'])}:date|time`.toLowerCase(),
        filled: 'Job cannot appear on Today until date and time are set.',
        evidence: 'Churvox held this from Today automatically.',
        check: 'Add date and time, then approve in Command.',
      }) || changed;
    }
  });

  (state.quotes || []).forEach((quote) => {
    if (quote._blockedByCommand || quote._parkedByCommand) return;
    const status = text(quote, ['status', 'Status']);
    if (/accepted/i.test(status)) {
      const title = text(quote, ['title', 'Quote']) || 'Accepted quote';
      const client = text(quote, ['client', 'Client']);
      let jobId = '';
      const jobExists = (state.jobs || []).some((job) => {
        const match = text(job, ['title', 'Job name']).toLowerCase() === title.toLowerCase() && text(job, ['client', 'Client']).toLowerCase() === client.toLowerCase();
        if (match) jobId = text(job, ['id']);
        return match;
      });
      if (!jobExists) {
        jobId = `quote-job-${Date.now()}`;
        const issueKey = jobScheduleIssueKey(jobId);
        state.jobs = [{ id: jobId, title, client, price: amount(quote), service: text(quote, ['scope', 'Scope']) || 'Accepted quote work', status: 'needs_schedule', billing: 'Quote accepted', recurring: 'One-off', notes: 'Created from accepted quote. Needs schedule before Today.', _blockedByCommand: true, _doNotShowToday: true, _commandMissing: 'assigned worker, date, time', _commandIssueKey: issueKey }, ...(state.jobs || [])].slice(0, 80);
        changed = true;
      }
      const issueKey = jobId ? jobScheduleIssueKey(jobId) : `accepted-quote:${keyFor('quote', quote)}`;
      changed = addCommand(state, opState, flowState, `accepted-quote:${keyFor('quote', quote)}`, {
        type: 'Job fix needed',
        title,
        client,
        amount: amount(quote),
        owner: 'Edit',
        sourceType: 'jobs',
        sourceId: jobId,
        issueKey,
        filled: 'Accepted quote has been prepared as a job shell.',
        evidence: text(quote, ['scope', 'Scope']) || 'Accepted quote record.',
        check: 'Add date, time and assigned worker before this job appears on Today.',
      }) || changed;
    }
  });

  (state.invoices || []).forEach((invoice) => {
    if (invoice._blockedByCommand || invoice._parkedByCommand) return;
    const sync = `${text(invoice, ['sync', 'Xero/MYOB status'])} ${text(invoice, ['status', 'Status'])}`;
    if (/xero ready|command approval|sync-ready|draft/i.test(sync) && !/synced|paid/i.test(sync)) {
      changed = addCommand(state, opState, flowState, `sync:${keyFor('invoice', invoice)}`, {
        type: 'Invoice sync ready',
        title: text(invoice, ['number', 'Invoice']) || 'Draft invoice',
        client: text(invoice, ['client', 'Client']),
        amount: amount(invoice),
        filled: 'Draft invoice is ready for accounting sync.',
        evidence: text(invoice, ['evidence', 'Evidence']) || text(invoice, ['line', 'Line item']) || 'Invoice ledger attached.',
        check: 'Owner-approved draft sync only. No tax filing. No payout files.',
      }) || changed;
    }
  });

  (state.messages || []).forEach((message) => {
    if (message._blockedByCommand || message._parkedByCommand) return;
    const draft = text(message, ['draft', 'reply', 'Drafted reply', 'message', 'Message']);
    if (draft) {
      changed = addCommand(state, opState, flowState, `message:${keyFor('message', message)}`, {
        type: 'Message ready',
        title: text(message, ['subject', 'Subject']) || 'Draft reply',
        client: text(message, ['client', 'Client']),
        owner: 'Approve',
        filled: draft,
        evidence: text(message, ['context', 'detail', 'Message']) || text(message, ['channel', 'Channel']) || 'Message thread attached.',
        check: 'Owner approves or edits wording before sending.',
      }) || changed;
    }
  });

  (state.workers || []).forEach((worker) => {
    if (worker._blockedByCommand || worker._parkedByCommand) return;
    const review = `${text(worker, ['payroll', 'Payroll review'])} ${text(worker, ['slip', 'slipStatus', 'Slip status'])}`;
    if (/review|pending|issue|check/i.test(review)) {
      changed = addCommand(state, opState, flowState, `worker-review:${keyFor('worker', worker)}`, {
        type: 'Timesheet/proof/slip issue',
        title: `${text(worker, ['name', 'Worker', 'worker']) || 'Worker'} - ${text(worker, ['job', 'Current job']) || 'worker day'}`,
        client: text(worker, ['client', 'Client']) || 'Not set',
        owner: 'Edit',
        filled: `Worker slip status: ${review}`,
        evidence: `${text(worker, ['timesheet', 'hours', 'Timesheet hours']) || 'No hours'} - ${text(worker, ['proof', 'Proof/photos']) || 'No proof note'}`,
        check: 'Owner checks the slip, proof and time from Command.',
      }) || changed;
    }
  });

  if (changed) {
    saveMain(state);
    saveOps(opState);
    saveFlow(flowState);
  }
  renderPanel(flowState);
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ofAutoFlowPanel{grid-column:1/-1;display:grid;gap:10px;padding:14px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    .ofAutoFlowPanel h3{margin:0;font-size:15px;color:#111815}.ofAutoFlowPanel p{margin:0;color:#52605a;font-size:12px;font-weight:850}.ofAutoFlowRows{display:grid;gap:7px}.ofAutoFlowRows span{display:grid;grid-template-columns:150px 1fr auto;gap:10px;align-items:center;min-height:40px;padding:8px 10px;border-radius:12px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:850}.ofAutoFlowRows b{color:#111815}.ofAutoFlowRows em{font-style:normal;color:#9a3412;font-weight:950}
    @media(max-width:760px){.ofAutoFlowRows span{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function renderPanel(flowState = flow()) {
  ensureStyle();
  document.querySelectorAll('.ofAutoFlowPanel').forEach((node) => node.remove());
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  const current = page();
  if (!['today', 'command', 'jobs', 'quotes', 'invoices', 'messages', 'workers', 'team'].includes(current)) return;
  const rows = Object.values(flowState.created || {}).slice(-5).reverse();
  if (!rows.length && current !== 'command') return;
  const body = rows.map((item) => `<span><b>${escapeHtml(item.type)}</b><small>${escapeHtml(item.title)}</small><em>${escapeHtml(item.at)}</em></span>`).join('') || '<span><b>Ready</b><small>Auto admin flow will queue invoices, messages, jobs and slips.</small><em>Watching</em></span>';
  root.insertAdjacentHTML('beforeend', `<section class="ofAutoFlowPanel"><h3>Churvox admin flow</h3><p>Automatic prep is running. The boss only checks Command.</p><div class="ofAutoFlowRows">${body}</div></section>`);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(runFlows, 1300));
  window.addEventListener('hashchange', () => setTimeout(runFlows, 180));
  document.addEventListener('click', () => setTimeout(runFlows, 260));
  setInterval(runFlows, 3000);
}
