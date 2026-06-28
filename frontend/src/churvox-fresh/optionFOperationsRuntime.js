const OPS_STORE = 'churvox_option_f_operations_v1';
const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const STYLE_ID = 'option-f-operations-style';
const MODAL_ID = 'option-f-operations-modal';
const TOAST_ID = 'option-f-operations-toast';

const emptyOps = {
  audit: [],
  commandQueue: [],
  invoices: [],
  messages: [],
  workerDays: [],
  teamPeople: [],
};

const emptyMain = {
  jobs: [],
  clients: [],
  quotes: [],
  invoices: [],
  messages: [],
  workers: [],
  command: [],
  audit: [],
};

function loadOps() {
  try { return { ...emptyOps, ...(JSON.parse(localStorage.getItem(OPS_STORE) || '{}')) }; } catch (_) { return { ...emptyOps }; }
}

function saveOps(state) {
  localStorage.setItem(OPS_STORE, JSON.stringify(state));
}

function loadMain() {
  try { return { ...emptyMain, ...(JSON.parse(localStorage.getItem(MAIN_STORE) || '{}')) }; } catch (_) { return { ...emptyMain }; }
}

function saveMain(state) {
  localStorage.setItem(MAIN_STORE, JSON.stringify(state));
}

function stamp() {
  return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
}

function page() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function html(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;right:18px;bottom:92px;z-index:999999;max-width:360px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}
    #${TOAST_ID}.show{opacity:1;transform:translateY(0)}
    #${MODAL_ID}{position:fixed;inset:0;z-index:999998;display:grid;place-items:center;padding:24px;background:rgba(16,21,19,.42);backdrop-filter:blur(5px)}
    #${MODAL_ID}[hidden]{display:none}
    #${MODAL_ID} .ofOpsModal{width:min(980px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.3)}
    #${MODAL_ID} header{display:flex;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}
    #${MODAL_ID} h2{margin:0;font-size:30px;line-height:1.05;letter-spacing:0}
    #${MODAL_ID} p{margin:7px 0 0;color:#52605a;font-size:13px;font-weight:850}
    #${MODAL_ID} .close{border:0;border-radius:999px;padding:9px 13px;background:#101513;color:#fff;font-weight:950;cursor:pointer}
    #${MODAL_ID} form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px 22px}
    #${MODAL_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}
    #${MODAL_ID} input,#${MODAL_ID} select,#${MODAL_ID} textarea{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif;text-transform:none;letter-spacing:0}
    #${MODAL_ID} textarea{min-height:96px;resize:vertical}
    #${MODAL_ID} label.full{grid-column:1/-1}
    #${MODAL_ID} .actions{grid-column:1/-1;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px solid rgba(16,21,19,.08)}
    #${MODAL_ID} .actions button{border:0;border-radius:999px;padding:11px 15px;background:#ea580c;color:#fff;font-weight:950;cursor:pointer}
    #${MODAL_ID} .actions .quiet{background:#eef2ed;color:#111815}
    .ofOpsPanel,.ofOpsQueue{grid-column:1/-1;display:grid;gap:12px;padding:14px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    .ofOpsPanel h3,.ofOpsQueue h3{margin:0;font-size:15px;color:#111815}
    .ofOpsActions{display:flex;flex-wrap:wrap;gap:10px}.ofOpsActions button{border:0;border-radius:999px;padding:10px 13px;background:#101513;color:#fff;font-weight:950;cursor:pointer}.ofOpsActions button.primary{background:#ea580c}.ofOpsActions button.blue{background:#0f3f56}.ofOpsActions button.light{background:#eef2ed;color:#111815}
    .ofOpsRows{display:grid;gap:8px}.ofOpsRow{display:grid;grid-template-columns:150px 1fr auto;gap:10px;align-items:center;min-height:44px;padding:9px 10px;border-radius:12px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:850}.ofOpsRow b{color:#111815}.ofOpsRow em{font-style:normal;color:#9a3412;font-weight:950}.ofOpsRow .rowActions{display:flex;gap:6px}.ofOpsRow .rowActions button{border:0;border-radius:999px;padding:7px 9px;background:#101513;color:#fff;font-size:11px;font-weight:950;cursor:pointer}.ofOpsRow .rowActions button:first-child{background:#ea580c}.ofOpsRow[data-status="approved"]{opacity:.62}.ofOpsRow[data-status="parked"]{opacity:.5;background:#eef2ed}
    @media(max-width:760px){#${MODAL_ID} form{grid-template-columns:1fr}.ofOpsRow{grid-template-columns:1fr}.ofOpsRow .rowActions{flex-wrap:wrap}}
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

function field(name, label, value = '', type = 'text', options = null, full = false) {
  if (options) return `<label class="${full ? 'full' : ''}"><span>${html(label)}</span><select name="${name}">${options.map((option) => `<option value="${html(option)}" ${option === value ? 'selected' : ''}>${html(option)}</option>`).join('')}</select></label>`;
  if (type === 'textarea') return `<label class="${full ? 'full' : ''}"><span>${html(label)}</span><textarea name="${name}">${html(value)}</textarea></label>`;
  return `<label class="${full ? 'full' : ''}"><span>${html(label)}</span><input name="${name}" type="${type}" value="${html(value)}" /></label>`;
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
    modal.addEventListener('submit', onSubmit);
  }
  modal.innerHTML = `<section class="ofOpsModal"><header><div><h2>${html(config.title)}</h2><p>${html(config.note || '')}</p></div><button type="button" class="close" data-close>Close</button></header><form data-kind="${html(config.kind)}">${config.fields.join('')}<div class="actions"><button type="button" class="quiet" data-close>Cancel</button><button type="submit">${html(config.submit || 'Save')}</button></div></form></section>`;
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

function addAudit(action, detail) {
  const ops = loadOps();
  ops.audit = [{ action, detail, at: stamp() }, ...(ops.audit || [])].slice(0, 40);
  saveOps(ops);
}

function addMain(key, item) {
  const main = loadMain();
  main[key] = [{ id: `${key}-${Date.now()}`, ...item, createdAt: stamp() }, ...(main[key] || [])].slice(0, 60);
  saveMain(main);
}

function queueCommand(item) {
  const payload = { id: `command-${Date.now()}`, status: 'waiting', createdAt: stamp(), ...item };
  const ops = loadOps();
  ops.commandQueue = [payload, ...(ops.commandQueue || [])].slice(0, 60);
  saveOps(ops);
  addMain('command', payload);
  addAudit('Queued Command item', item.title || item.type || 'approval');
}

function onSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const kind = form.dataset.kind;
  const data = { id: `${kind}-${Date.now()}`, ...formObject(form), createdAt: stamp() };
  const ops = loadOps();

  if (kind === 'invoiceDraft') {
    ops.invoices = [data, ...(ops.invoices || [])].slice(0, 40);
    saveOps(ops);
    addMain('invoices', { number: data.number, client: data.client, job: data.job, status: 'Draft', amount: data.amount, due: data.due, sync: 'Command approval', line: data.line, evidence: data.evidence });
    queueCommand({ type: 'Invoice ready', title: data.number || data.job, client: data.client, amount: data.amount, owner: 'Approve', filled: `Draft invoice prepared for ${data.job || data.client}.`, evidence: data.evidence || data.line || 'Job record and proof attached.', check: 'Owner checks price, proof and due date before approval.' });
    toast('Draft invoice saved and queued to Command');
  }

  if (kind === 'syncApproval') {
    queueCommand({ type: 'Invoice sync ready', title: data.invoice, client: data.client, amount: data.amount, owner: 'Approve', filled: 'Draft invoice is ready for accounting sync.', evidence: data.evidence || 'Invoice ledger and proof attached.', check: 'Owner approves draft sync only. No tax filing. No payout files.' });
    toast('Sync approval queued to Command');
  }

  if (kind === 'messageDraft') {
    ops.messages = [data, ...(ops.messages || [])].slice(0, 40);
    saveOps(ops);
    addMain('messages', { from: data.from, subject: data.subject, client: data.client, job: data.job, channel: data.channel, draft: data.reply, detail: data.context, priority: 'Draft ready', history: 'Saved draft' });
    queueCommand({ type: 'Message ready', title: data.subject, client: data.client, owner: 'Approve', filled: data.reply, evidence: data.context || `${data.channel} thread`, check: 'Owner approves or edits wording before sending.' });
    toast('Draft reply saved and queued to Command');
  }

  if (kind === 'workerDay') {
    ops.workerDays = [data, ...(ops.workerDays || [])].slice(0, 40);
    saveOps(ops);
    addMain('workers', { name: data.worker, role: data.role, status: data.status, job: data.job, gps: data.gps, start: data.clockIn, end: data.clockOut, break: data.breakTime, proof: data.proof, messages: data.messages, timesheet: data.hours, slip: data.slipStatus, payroll: data.payroll });
    if (/review|pending|issue|check/i.test(`${data.slipStatus} ${data.payroll} ${data.issue}`)) {
      queueCommand({ type: 'Timesheet/proof/slip issue', title: `${data.worker} - ${data.job}`, client: data.client, owner: 'Edit', filled: `Worker day saved with ${data.hours || '0h'} and slip status ${data.slipStatus}.`, evidence: data.issue || data.proof || data.messages || 'Worker day record attached.', check: 'Owner edits, approves or parks from Command.' });
    }
    toast('Worker day saved');
  }

  if (kind === 'teamPerson') {
    ops.teamPeople = [data, ...(ops.teamPeople || [])].slice(0, 40);
    saveOps(ops);
    addMain('workers', { name: data.name, role: data.role, access: data.access, app: data.app, payroll: data.payroll, timesheet: data.hours, job: data.currentJob, notes: data.notes });
    toast('Team person saved');
  }

  if (kind === 'payrollIssue') {
    queueCommand({ type: 'Timesheet/proof/slip issue', title: `${data.worker} payroll review`, client: data.client, owner: 'Edit', filled: data.issue, evidence: `${data.hours || '0h'} - ${data.slipStatus}`, check: 'Owner edits, approves or parks from Command.' });
    toast('Payroll issue queued to Command');
  }

  addAudit(`Saved ${kind}`, data.number || data.subject || data.worker || data.name || data.invoice || 'record');
  closeModal();
  render();
}

function openInvoiceDraft() {
  openModal({ kind: 'invoiceDraft', title: 'Draft invoice', note: 'Create a filled invoice from job, proof and price memory. Approval stays in Command.', submit: 'Save draft invoice', fields: [field('number', 'Invoice number', `INV-${Math.floor(1000 + Math.random() * 8999)}`), field('client', 'Client', 'Belmont Villas'), field('job', 'Job', 'Belmont hedge trim'), field('amount', 'Amount NZD', '420', 'number'), field('due', 'Due date', new Date().toISOString().slice(0, 10), 'date'), field('sync', 'Sync state', 'Command approval', 'text', ['Command approval', 'Xero ready', 'Not synced', 'Synced']), field('line', 'Line item', 'Monthly hedge and lawn package', 'textarea', null, true), field('evidence', 'Proof/evidence', '3 photos + worker note', 'textarea', null, true)] });
}

function openSyncApproval() {
  openModal({ kind: 'syncApproval', title: 'Queue sync approval', note: 'Only Command can approve draft accounting sync. No tax filing or payout files.', submit: 'Queue to Command', fields: [field('invoice', 'Invoice', 'INV-1042'), field('client', 'Client', 'Belmont Villas'), field('amount', 'Amount NZD', '420', 'number'), field('evidence', 'Sync proof', 'Draft invoice and job proof ready', 'textarea', null, true)] });
}

function markPaid() {
  const ops = loadOps();
  ops.invoices = [{ id: `paid-${Date.now()}`, number: 'Selected invoice', client: 'Ledger', amount: '', status: 'Paid', createdAt: stamp() }, ...(ops.invoices || [])].slice(0, 40);
  saveOps(ops);
  addAudit('Marked paid', 'Selected invoice');
  toast('Invoice marked paid locally');
  render();
}

function openMessageDraft() {
  openModal({ kind: 'messageDraft', title: 'Draft reply', note: 'Prepare the reply here. Sending approval stays in Command.', submit: 'Save and queue approval', fields: [field('from', 'Thread type', 'Customer', 'text', ['Customer', 'Worker']), field('channel', 'Channel', 'SMS', 'text', ['SMS', 'Email', 'Worker app']), field('client', 'Client', 'Mere H.'), field('job', 'Job', 'Naenae lawn reset'), field('subject', 'Subject', 'Gate locked'), field('context', 'Thread context', 'Worker needs customer reply.', 'textarea', null, true), field('reply', 'Churvox drafted reply', 'Hi Mere, the gate looks locked. Can you confirm access?', 'textarea', null, true)] });
}

function openThreadNote() {
  openModal({ kind: 'messageDraft', title: 'Save thread note', note: 'Save message history and queue a reply only if needed.', submit: 'Save note', fields: [field('from', 'Thread type', 'Worker', 'text', ['Customer', 'Worker']), field('channel', 'Channel', 'Worker app', 'text', ['SMS', 'Email', 'Worker app']), field('client', 'Client', 'Birchville Dairy'), field('job', 'Job', 'Birchville tidy'), field('subject', 'Subject', 'Extra green waste'), field('context', 'Thread note', 'Extra green waste may be needed.', 'textarea', null, true), field('reply', 'Draft reply or owner note', 'Check price before sending.', 'textarea', null, true)] });
}

function openWorkerDay() {
  openModal({ kind: 'workerDay', title: 'Worker day slip', note: 'Save clock times, current job, GPS, proof, messages and slip status.', submit: 'Save worker day', fields: [field('worker', 'Worker', 'Howard', 'text', ['Howard', 'Alex', 'Sam', 'Tui']), field('role', 'Role', 'Worker', 'text', ['Owner', 'Manager', 'Worker', 'Subcontractor']), field('status', 'Clock status', 'Clocked in', 'text', ['Clocked in', 'Driving', 'Proof upload', 'Clocked out']), field('client', 'Client', 'Mere H.'), field('job', 'Current job', 'Naenae lawn reset'), field('gps', 'GPS/location', 'Naenae'), field('clockIn', 'Clock in', '08:00', 'time'), field('clockOut', 'Clock out', '', 'time'), field('breakTime', 'Break', '30 min'), field('hours', 'Timesheet hours', '7.5h'), field('proof', 'Proof/photos', '2 photos uploaded'), field('slipStatus', 'Slip status', 'Ready', 'text', ['Ready', 'Review', 'Pending', 'Issue']), field('payroll', 'Payroll', 'Ready', 'text', ['Ready', 'Review', 'Pending']), field('messages', 'Worker messages', 'No unread messages', 'textarea', null, true), field('issue', 'Issue for Command if needed', '', 'textarea', null, true)] });
}

function openTeamPerson() {
  openModal({ kind: 'teamPerson', title: 'Team person', note: 'Edit staff role, access, worker app and payroll state.', submit: 'Save person', fields: [field('name', 'Name', 'Alex'), field('role', 'Role', 'Worker', 'text', ['Owner', 'Manager', 'Worker', 'Subcontractor', 'Payroll only']), field('access', 'Access', 'Worker app', 'text', ['Full access', 'Jobs only', 'Worker app', 'Payroll review', 'No access']), field('app', 'Worker app', 'Active', 'text', ['Active', 'Invited', 'Paused']), field('payroll', 'Payroll review', 'Review', 'text', ['Ready', 'Review', 'Pending']), field('hours', 'Timesheet', '6.0h'), field('currentJob', 'Current job', 'Petone unit cleanup'), field('notes', 'Notes', '', 'textarea', null, true)] });
}

function openPayrollIssue() {
  openModal({ kind: 'payrollIssue', title: 'Payroll review issue', note: 'Create a Command item for a timesheet, proof or slip check.', submit: 'Queue to Command', fields: [field('worker', 'Worker', 'Alex', 'text', ['Howard', 'Alex', 'Sam', 'Tui']), field('client', 'Client', 'Petone Units'), field('hours', 'Hours', '6.0h'), field('slipStatus', 'Slip status', 'Needs time check'), field('issue', 'Issue', 'Clock-out needs confirmation before payroll.', 'textarea', null, true)] });
}

function exportCsv(type) {
  const ops = loadOps();
  const rows = type === 'invoices' ? ops.invoices : type === 'messages' ? ops.messages : type === 'workers' ? ops.workerDays : ops.teamPeople;
  const headers = Array.from(rows.reduce((set, row) => { Object.keys(row || {}).forEach((key) => set.add(key)); return set; }, new Set(['id', 'createdAt'])));
  const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => `"${String(row?.[key] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `churvox-${type}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast(`${type} exported`);
}

function updateCommand(id, status) {
  const ops = loadOps();
  ops.commandQueue = (ops.commandQueue || []).map((item) => item.id === id ? { ...item, status, decidedAt: stamp() } : item);
  saveOps(ops);
  addAudit(status === 'approved' ? 'Approved Command item' : status === 'parked' ? 'Parked Command item' : 'Edited Command item', id);
  toast(`Command item ${status}`);
  render();
}

function editCommand(id) {
  const item = (loadOps().commandQueue || []).find((row) => row.id === id);
  if (!item) return;
  openModal({ kind: 'syncApproval', title: 'Edit Command item', note: 'Edits are saved back as a Command approval item.', submit: 'Save edited item', fields: [field('invoice', 'Item', item.title || item.type || 'Command item'), field('client', 'Client', item.client || ''), field('amount', 'Amount NZD', item.amount || '', 'number'), field('evidence', 'Owner note', item.check || item.evidence || '', 'textarea', null, true)] });
}

function panel(title, actions, rowsHtml = '') {
  return `<section class="ofOpsPanel"><h3>${html(title)}</h3><div class="ofOpsActions">${actions.map((action) => `<button type="button" class="${action.className || ''}" data-ofops="${html(action.key)}">${html(action.label)}</button>`).join('')}</div>${rowsHtml}</section>`;
}

function rows(items, emptyLabel) {
  const content = (items || []).slice(0, 6).map((item) => `<span class="ofOpsRow"><b>${html(item.number || item.subject || item.worker || item.name || item.type || 'Saved')}</b><small>${html(item.client || item.job || item.role || item.status || item.createdAt || '')}</small><em>${html(item.amount ? `$${item.amount}` : item.createdAt || item.status || 'Saved')}</em></span>`).join('') || `<span class="ofOpsRow"><b>${html(emptyLabel)}</b><small>Use the actions above to create records.</small><em>Ready</em></span>`;
  return `<div class="ofOpsRows">${content}</div>`;
}

function renderCommand(root, ops) {
  const queue = ops.commandQueue || [];
  const body = queue.slice(0, 10).map((item) => `<span class="ofOpsRow" data-status="${html(item.status)}"><b>${html(item.type || 'Command item')}</b><small>${html(item.title || item.filled || '')}</small><span class="rowActions"><button type="button" data-command-id="${html(item.id)}" data-command-action="approved">Approve</button><button type="button" data-command-id="${html(item.id)}" data-command-action="edit">Edit</button><button type="button" data-command-id="${html(item.id)}" data-command-action="parked">Park</button></span></span>`).join('') || '<span class="ofOpsRow"><b>No queued runtime items</b><small>Invoices, messages and worker issues will land here.</small><em>Ready</em></span>';
  root.insertAdjacentHTML('beforeend', `<section class="ofOpsQueue"><h3>Runtime Command queue</h3><div class="ofOpsRows">${body}</div></section>`);
}

function render() {
  ensureStyle();
  document.querySelectorAll('.ofOpsPanel,.ofOpsQueue').forEach((node) => node.remove());
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  const p = page();
  const ops = loadOps();

  if (p === 'command') renderCommand(root, ops);
  if (p === 'invoices') root.insertAdjacentHTML('beforeend', panel('Invoice actions', [{ key: 'invoice-draft', label: 'Draft invoice', className: 'primary' }, { key: 'sync-approval', label: 'Queue sync approval', className: 'blue' }, { key: 'mark-paid', label: 'Mark paid' }, { key: 'export-invoices', label: 'Export invoices', className: 'light' }], rows(ops.invoices, 'No runtime invoices yet')));
  if (p === 'messages') root.insertAdjacentHTML('beforeend', panel('Message actions', [{ key: 'message-draft', label: 'Draft reply', className: 'primary' }, { key: 'thread-note', label: 'Save thread note', className: 'blue' }, { key: 'export-messages', label: 'Export messages', className: 'light' }], rows(ops.messages, 'No saved drafts yet')));
  if (p === 'workers') root.insertAdjacentHTML('beforeend', panel('Worker actions', [{ key: 'worker-day', label: 'Worker day slip', className: 'primary' }, { key: 'payroll-issue', label: 'Queue payroll check', className: 'blue' }, { key: 'export-workers', label: 'Export worker days', className: 'light' }], rows(ops.workerDays, 'No saved worker days yet')));
  if (p === 'team') root.insertAdjacentHTML('beforeend', panel('Team actions', [{ key: 'team-person', label: 'Add/edit person', className: 'primary' }, { key: 'payroll-issue', label: 'Queue payroll check', className: 'blue' }, { key: 'export-team', label: 'Export team', className: 'light' }], rows(ops.teamPeople, 'No saved team changes yet')));
}

function handleClick(event) {
  const button = event.target.closest('button');
  if (!button || !document.querySelector('.churvoxOptionC')) return;
  const op = button.dataset.ofops;
  const commandId = button.dataset.commandId;
  if (commandId) {
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.commandAction === 'edit') editCommand(commandId); else updateCommand(commandId, button.dataset.commandAction);
    return;
  }
  if (!op) return;
  event.preventDefault();
  event.stopPropagation();
  if (op === 'invoice-draft') openInvoiceDraft();
  if (op === 'sync-approval') openSyncApproval();
  if (op === 'mark-paid') markPaid();
  if (op === 'message-draft') openMessageDraft();
  if (op === 'thread-note') openThreadNote();
  if (op === 'worker-day') openWorkerDay();
  if (op === 'team-person') openTeamPerson();
  if (op === 'payroll-issue') openPayrollIssue();
  if (op === 'export-invoices') exportCsv('invoices');
  if (op === 'export-messages') exportCsv('messages');
  if (op === 'export-workers') exportCsv('workers');
  if (op === 'export-team') exportCsv('team');
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', render);
  window.addEventListener('hashchange', () => setTimeout(render, 120));
  window.addEventListener('popstate', () => setTimeout(render, 120));
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', () => setTimeout(render, 140));
  setInterval(render, 1800);
}
