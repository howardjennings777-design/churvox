const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';
const HYDRATION_STYLE_ID = 'option-f-record-hydration-style';
const HYDRATION_MODAL_ID = 'option-f-record-hydration-modal';
const HYDRATION_TOAST_ID = 'option-f-record-hydration-toast';

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

function html(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function text(record, keys) {
  for (const key of keys) {
    const raw = record?.[key];
    if (raw !== undefined && raw !== null && String(raw).trim()) return String(raw).trim();
  }
  return '';
}

function money(value) {
  const number = Number(String(value ?? 0).replace(/[^0-9.-]/g, '') || 0);
  return number ? number.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }) : 'No money';
}

function isBlocked(record) {
  return Boolean(record?._blockedByCommand || record?._doNotShowToday || record?._parkedByCommand || record?._commandMissing);
}

function hasSchedule(job) {
  return Boolean(text(job, ['date', 'Scheduled date', 'scheduled_date'])) && Boolean(text(job, ['time', 'Start time', 'scheduled_time']));
}

function isComplete(item) {
  return /approved|parked|fixed|done/i.test(String(item?.status || ''));
}

function ensureStyle() {
  if (document.getElementById(HYDRATION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HYDRATION_STYLE_ID;
  style.textContent = `
    .ofHydrationPanel{grid-column:1/-1;display:grid;gap:12px;padding:14px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    .ofHydrationPanel h3{margin:0;font-size:15px;color:#111815}.ofHydrationPanel p{margin:0;color:#52605a;font-size:12px;font-weight:850}.ofHydrationRows{display:grid;gap:8px}.ofHydrationRow{display:grid;grid-template-columns:145px 1fr auto;gap:10px;align-items:center;min-height:44px;padding:9px 10px;border:1px solid rgba(16,21,19,.06);border-radius:12px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:850;text-align:left}.ofHydrationRow b{color:#111815}.ofHydrationRow em{font-style:normal;color:#9a3412;font-weight:950}.ofHydrationRow button{border:0;border-radius:999px;padding:7px 9px;background:#101513;color:#fff;font-size:11px;font-weight:950;cursor:pointer}.ofHydrationRow button.primary{background:#ea580c}.ofHydrationRow .actions{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.ofHydrationStats{display:flex;flex-wrap:wrap;gap:8px}.ofHydrationStats span{display:grid;min-width:105px;border-radius:12px;padding:10px 12px;background:#eef2ed;color:#52605a;font-size:11px;font-weight:900}.ofHydrationStats b{font-size:20px;color:#111815;line-height:1}.ofHydrationWarning{background:#fff7ed!important;border-color:rgba(234,88,12,.2)!important}
    #${HYDRATION_TOAST_ID}{position:fixed;right:18px;bottom:252px;z-index:999999;max-width:360px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${HYDRATION_TOAST_ID}.show{opacity:1;transform:translateY(0)}
    #${HYDRATION_MODAL_ID}{position:fixed;inset:0;z-index:1000001;display:grid;place-items:center;padding:24px;background:rgba(16,21,19,.42);backdrop-filter:blur(5px)}#${HYDRATION_MODAL_ID}[hidden]{display:none}#${HYDRATION_MODAL_ID} .hydrateModal{width:min(980px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.3)}#${HYDRATION_MODAL_ID} header{display:flex;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}#${HYDRATION_MODAL_ID} h2{margin:0;font-size:30px;line-height:1.05}#${HYDRATION_MODAL_ID} p{margin:7px 0 0;color:#52605a;font-size:13px;font-weight:850}#${HYDRATION_MODAL_ID} button{border:0;border-radius:999px;padding:10px 14px;background:#101513;color:#fff;font-weight:950;cursor:pointer}#${HYDRATION_MODAL_ID} form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px 22px}#${HYDRATION_MODAL_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}#${HYDRATION_MODAL_ID} input,#${HYDRATION_MODAL_ID} textarea{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif;text-transform:none;letter-spacing:0}#${HYDRATION_MODAL_ID} textarea{min-height:96px;resize:vertical}.hydrateFull{grid-column:1/-1}.hydrateActions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid rgba(16,21,19,.08);padding-top:10px}.hydrateActions button:last-child{background:#ea580c}
    @media(max-width:760px){.ofHydrationRow{grid-template-columns:1fr}.ofHydrationRow .actions{justify-content:flex-start}#${HYDRATION_MODAL_ID} form{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function toast(message) {
  ensureStyle();
  let node = document.getElementById(HYDRATION_TOAST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = HYDRATION_TOAST_ID;
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 2400);
}

function field(name, label, value = '', full = false) {
  const multiline = /note|scope|evidence|filled|check|message|draft|line/i.test(name);
  if (multiline) return `<label class="${full ? 'hydrateFull' : ''}"><span>${html(label)}</span><textarea name="${html(name)}">${html(value)}</textarea></label>`;
  return `<label class="${full ? 'hydrateFull' : ''}"><span>${html(label)}</span><input name="${html(name)}" value="${html(value)}" /></label>`;
}

const editableFields = {
  jobs: [['title', 'Job'], ['client', 'Client'], ['worker', 'Worker'], ['date', 'Date'], ['time', 'Time'], ['service', 'Service'], ['price', 'Price'], ['status', 'Status'], ['recurring', 'Frequency'], ['notes', 'Notes']],
  clients: [['name', 'Name'], ['phone', 'Phone'], ['email', 'Email'], ['address', 'Address'], ['service', 'Service memory'], ['price', 'Price memory'], ['notes', 'Notes']],
  quotes: [['title', 'Quote'], ['client', 'Client'], ['amount', 'Amount'], ['status', 'Status'], ['followUp', 'Follow-up'], ['scope', 'Scope']],
  invoices: [['number', 'Invoice'], ['client', 'Client'], ['job', 'Job'], ['amount', 'Amount'], ['due', 'Due date'], ['status', 'Status'], ['sync', 'Sync'], ['line', 'Line item'], ['evidence', 'Evidence']],
  messages: [['subject', 'Subject'], ['client', 'Client'], ['job', 'Job'], ['channel', 'Channel'], ['draft', 'Draft reply'], ['context', 'Context']],
  workers: [['name', 'Worker'], ['role', 'Role'], ['status', 'Status'], ['job', 'Current job'], ['gps', 'GPS'], ['start', 'Clock in'], ['end', 'Clock out'], ['timesheet', 'Timesheet'], ['slip', 'Slip'], ['payroll', 'Payroll'], ['notes', 'Notes']],
};

function display(record, type) {
  if (type === 'jobs') return { title: text(record, ['title', 'Job name']) || 'Saved job', meta: `${text(record, ['client', 'Client']) || 'No client'} - ${text(record, ['date']) || 'No date'} ${text(record, ['time']) || ''}`, value: money(text(record, ['price', 'amount'])) };
  if (type === 'clients') return { title: text(record, ['name', 'Name']) || 'Saved client', meta: `${text(record, ['phone']) || text(record, ['email']) || 'No contact'} - ${text(record, ['address']) || 'No address'}`, value: text(record, ['price']) || 'No price' };
  if (type === 'quotes') return { title: text(record, ['title', 'Quote']) || 'Saved quote', meta: `${text(record, ['client', 'Client']) || 'No client'} - ${text(record, ['status']) || 'Draft'}`, value: money(text(record, ['amount'])) };
  if (type === 'invoices') return { title: text(record, ['number', 'Invoice']) || 'Saved invoice', meta: `${text(record, ['client', 'Client']) || 'No client'} - ${text(record, ['status']) || 'Draft'}`, value: money(text(record, ['amount'])) };
  if (type === 'messages') return { title: text(record, ['subject']) || 'Saved message', meta: `${text(record, ['client', 'Client']) || 'No client'} - ${text(record, ['channel']) || 'No channel'}`, value: text(record, ['status']) || 'Draft' };
  if (type === 'workers') return { title: text(record, ['name', 'Worker', 'worker']) || 'Saved worker', meta: `${text(record, ['job', 'Current job']) || 'No job'} - ${text(record, ['status']) || text(record, ['payroll']) || 'No status'}`, value: text(record, ['timesheet', 'hours']) || text(record, ['slip']) || 'No time' };
  return { title: record.type || 'Command item', meta: record.title || record.filled || 'Waiting', value: record.status || 'waiting' };
}

function row(type, record, index, command = false) {
  const view = display(record, type);
  const blocked = isBlocked(record);
  const commands = command ? `<button type="button" class="primary" data-hydrate-command="approve" data-ref="${html(record.id || record.issueKey || index)}">Approve</button><button type="button" data-hydrate-command="edit" data-ref="${html(record.issueKey || record.id || index)}">Edit</button><button type="button" data-hydrate-command="park" data-ref="${html(record.id || record.issueKey || index)}">Park</button>` : `<button type="button" class="primary" data-hydrate-open="${html(type)}" data-index="${index}">Open</button>`;
  return `<span class="ofHydrationRow ${blocked ? 'ofHydrationWarning' : ''}"><b>${html(view.title)}</b><small>${html(view.meta)}</small><span class="actions"><em>${html(view.value)}</em>${commands}</span></span>`;
}

function recordsFor(type) {
  const state = main();
  if (type === 'workers') return [...(state.workers || []), ...(ops().workerDays || []), ...(ops().teamPeople || [])];
  return state[type] || [];
}

function commandRecords() {
  const seen = new Set();
  return [...(ops().commandQueue || []), ...(main().command || [])].filter((item) => {
    const ref = item.id || item.issueKey || item.flowKey || `${item.type}:${item.title}`;
    if (!ref || seen.has(ref) || isComplete(item)) return false;
    seen.add(ref);
    return true;
  });
}

function renderPanelFor(type, title, note, limit = 8) {
  const list = recordsFor(type);
  const ready = list.filter((item) => !isBlocked(item)).length;
  const held = list.filter(isBlocked).length;
  const rows = list.slice(0, limit).map((record, index) => row(type, record, index)).join('') || `<span class="ofHydrationRow"><b>No saved ${html(type)} yet</b><small>Use the page actions to create records.</small><em>Ready</em></span>`;
  return `<section class="ofHydrationPanel"><h3>${html(title)}</h3><p>${html(note)}</p><div class="ofHydrationStats"><span><b>${ready}</b>ready</span><span><b>${held}</b>held</span><span><b>${list.length}</b>saved</span></div><div class="ofHydrationRows">${rows}</div></section>`;
}

function renderCommandPanel() {
  const list = commandRecords();
  const rows = list.slice(0, 12).map((record, index) => row('command', record, index, true)).join('') || '<span class="ofHydrationRow"><b>No live Command items</b><small>Churvox will send missing details and approvals here.</small><em>Ready</em></span>';
  return `<section class="ofHydrationPanel"><h3>Live Command inbox</h3><p>Only this desk has Approve, Edit and Park.</p><div class="ofHydrationStats"><span><b>${list.length}</b>waiting</span><span><b>${(main().audit || []).length}</b>audit</span><span><b>${(ops().audit || []).length}</b>ops</span></div><div class="ofHydrationRows">${rows}</div></section>`;
}

function renderTodayPanel() {
  const state = main();
  const jobs = (state.jobs || []).filter((job) => !isBlocked(job) && hasSchedule(job));
  const invoices = (state.invoices || []).filter((invoice) => !isBlocked(invoice) && /due|draft|ready|approval/i.test(`${invoice.status || ''} ${invoice.sync || ''}`));
  const messages = (state.messages || []).filter((message) => !isBlocked(message) && text(message, ['draft', 'reply']));
  const rows = [...jobs.slice(0, 4).map((record, index) => row('jobs', record, index)), ...invoices.slice(0, 3).map((record, index) => row('invoices', record, index)), ...messages.slice(0, 3).map((record, index) => row('messages', record, index))].join('') || '<span class="ofHydrationRow"><b>No saved ready work</b><small>Complete saved records will appear here.</small><em>Clean</em></span>';
  return `<section class="ofHydrationPanel"><h3>Saved work ready today</h3><p>Only complete scheduled work appears here. Missing details go to Command.</p><div class="ofHydrationRows">${rows}</div></section>`;
}

function render() {
  ensureStyle();
  document.querySelectorAll('.ofHydrationPanel').forEach((node) => node.remove());
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  const current = page();
  if (current === 'today') root.insertAdjacentHTML('beforeend', renderTodayPanel());
  if (current === 'command') root.insertAdjacentHTML('beforeend', renderCommandPanel());
  if (current === 'jobs') root.insertAdjacentHTML('beforeend', renderPanelFor('jobs', 'Saved job records', 'Jobs are held until client, worker, date, time, service and price are usable.'));
  if (current === 'clients') root.insertAdjacentHTML('beforeend', renderPanelFor('clients', 'Saved client records', 'Client memory stays usable for jobs, quotes and invoices.'));
  if (current === 'quotes') root.insertAdjacentHTML('beforeend', renderPanelFor('quotes', 'Saved quote records', 'Accepted quotes prepare jobs; sending still waits in Command.'));
  if (current === 'invoices') root.insertAdjacentHTML('beforeend', renderPanelFor('invoices', 'Saved invoice records', 'Draft and sync decisions still go through Command.'));
  if (current === 'messages') root.insertAdjacentHTML('beforeend', renderPanelFor('messages', 'Saved message records', 'Draft replies are prepared here; sending approval stays in Command.'));
  if (current === 'workers' || current === 'team') root.insertAdjacentHTML('beforeend', renderPanelFor('workers', current === 'team' ? 'Saved team records' : 'Saved worker day records', 'Worker days, slips and payroll checks feed Command when they need review.'));
}

function openRecord(type, index) {
  const list = recordsFor(type);
  const record = list[index];
  if (!record) return;
  ensureStyle();
  let modal = document.getElementById(HYDRATION_MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = HYDRATION_MODAL_ID;
    modal.hidden = true;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target.id === HYDRATION_MODAL_ID || event.target.closest('[data-close]')) closeModal(); });
    modal.addEventListener('submit', submitRecord);
  }
  const view = display(record, type);
  const fields = (editableFields[type] || []).map(([name, label]) => field(name, label, text(record, [name, label]))).join('');
  modal.innerHTML = `<section class="hydrateModal"><header><div><h2>${html(view.title)}</h2><p>${html(view.meta)}</p></div><button type="button" data-close>Close</button></header><form data-type="${html(type)}" data-index="${index}">${fields}<div class="hydrateActions"><button type="button" data-close>Cancel</button><button type="submit">Save record</button></div></form></section>`;
  modal.hidden = false;
  modal.querySelector('input,textarea')?.focus();
}

function closeModal() {
  const modal = document.getElementById(HYDRATION_MODAL_ID);
  if (modal) modal.hidden = true;
}

function submitRecord(event) {
  event.preventDefault();
  const form = event.target;
  const type = form.dataset.type;
  const index = Number(form.dataset.index || 0);
  const data = Object.fromEntries(new FormData(form).entries());
  const state = main();
  const list = state[type] || [];
  if (list[index]) {
    list[index] = { ...list[index], ...data, editedAt: now(), _synced: false, _syncError: '' };
    state[type] = list;
    state.audit = [{ action: `Edited ${type}`, detail: display(list[index], type).title, at: now() }, ...(state.audit || [])].slice(0, 60);
    saveMain(state);
    toast('Record saved');
  }
  closeModal();
  setTimeout(render, 60);
}

function updateCommand(ref, status) {
  const state = main();
  const opState = ops();
  const matcher = (item) => item.id === ref || item.issueKey === ref || item.flowKey === ref;
  const command = [...(state.command || []), ...(opState.commandQueue || [])].find(matcher);
  if (!command) return;
  state.command = (state.command || []).map((item) => matcher(item) ? { ...item, status, decidedAt: now() } : item);
  opState.commandQueue = (opState.commandQueue || []).map((item) => matcher(item) ? { ...item, status, decidedAt: now() } : item);
  state.audit = [{ action: `Command ${status}`, detail: command.title || command.type || ref, at: now() }, ...(state.audit || [])].slice(0, 60);
  saveMain(state);
  saveOps(opState);
  toast(`Command item ${status}`);
  setTimeout(render, 60);
}

function findBrainFixButton(ref) {
  return [...document.querySelectorAll('[data-brain-fix]')].find((button) => button.dataset.brainFix === ref);
}

function handleClick(event) {
  const open = event.target.closest('[data-hydrate-open]');
  if (open) {
    event.preventDefault();
    event.stopPropagation();
    openRecord(open.dataset.hydrateOpen, Number(open.dataset.index || 0));
    return;
  }
  const action = event.target.closest('[data-hydrate-command]');
  if (action) {
    event.preventDefault();
    event.stopPropagation();
    if (action.dataset.hydrateCommand === 'edit') {
      const button = findBrainFixButton(action.dataset.ref);
      if (button) button.click(); else toast('Edit from the Admin fix queue');
      return;
    }
    updateCommand(action.dataset.ref, action.dataset.hydrateCommand === 'approve' ? 'approved' : 'parked');
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(render, 1500));
  window.addEventListener('hashchange', () => setTimeout(render, 220));
  window.addEventListener('popstate', () => setTimeout(render, 220));
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', () => setTimeout(render, 280));
  setInterval(render, 3200);
}
