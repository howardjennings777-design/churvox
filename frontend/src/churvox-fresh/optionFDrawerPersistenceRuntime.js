// CHURVOX_OPTION_F_DRAWER_PERSISTENCE_20260629
// Saves opened slips into the workspace store and routes incomplete records to Command.

const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';
const STYLE_ID = 'option-f-drawer-persistence-style';
const TOAST_ID = 'option-f-drawer-persistence-toast';

const mainDefaults = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
const opsDefaults = { audit: [], commandQueue: [], invoices: [], messages: [], workerDays: [], teamPeople: [] };

function load(key, fallback) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}')) }; } catch (_) { return { ...fallback }; }
}

function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function main() { return load(MAIN_STORE, mainDefaults); }
function ops() { return load(OPS_STORE, opsDefaults); }
function saveMain(value) { save(MAIN_STORE, value); }
function saveOps(value) { save(OPS_STORE, value); }

function now() { return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }); }
function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function html(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function money(value) { const n = Number(clean(value).replace(/[^0-9.-]/g, '') || 0); return Number.isFinite(n) ? n : 0; }
function blank(value) { const v = lower(value); return !v || ['none', 'not set', 'not saved', 'undefined', 'null', 'still working'].includes(v); }
function first(record, keys) { for (const key of keys) if (!blank(record[key])) return clean(record[key]); return ''; }
function hash(value) { let out = 0; const input = String(value || ''); for (let i = 0; i < input.length; i += 1) out = ((out << 5) - out) + input.charCodeAt(i) | 0; return out; }

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;left:18px;bottom:72px;z-index:999999;max-width:380px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${TOAST_ID}.show{opacity:1;transform:translateY(0)}#${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.72);font-weight:800}
    .churvoxOptionC .cocDrawer[data-saved-state="saved"]{box-shadow:0 30px 90px rgba(22,101,52,.22)!important}.churvoxOptionC .cocDrawer[data-saved-state="command"]{box-shadow:0 30px 90px rgba(234,88,12,.28)!important}
    @media(max-width:760px){#${TOAST_ID}{left:10px;right:10px;bottom:70px;max-width:none}}
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

function fieldsFromDrawer(drawer) {
  const fields = {};
  drawer.querySelectorAll('.cocField').forEach((field) => {
    const label = clean(field.querySelector('span')?.textContent || 'field');
    const input = field.querySelector('input, textarea, select');
    if (label && input) fields[label] = clean(input.value);
  });
  return fields;
}

function drawerKind(drawer) {
  const marker = lower(`${drawer.querySelector('em')?.textContent || ''} ${drawer.querySelector('h2')?.textContent || ''}`);
  if (marker.includes('approval') || marker.includes('command')) return 'command';
  if (marker.includes('client')) return 'clients';
  if (marker.includes('worker') || marker.includes('timesheet') || marker.includes('person')) return 'workers';
  if (marker.includes('quote')) return 'quotes';
  if (marker.includes('invoice')) return 'invoices';
  if (marker.includes('message')) return 'messages';
  return 'jobs';
}

function normalize(kind, fields) {
  if (kind === 'jobs') return {
    id: `drawer-job-${Math.abs(hash(`${fields['Job name']}|${fields.Client}|${fields['Scheduled date']}|${fields['Start time']}`))}`,
    title: fields['Job name'] || fields.Job || '', client: fields.Client || '', address: fields['Site address'] || '', service: fields.Service || '', worker: fields['Assigned worker'] || fields.Worker || '', date: fields['Scheduled date'] || fields.Date || '', time: fields['Start time'] || fields.Time || '', duration: fields['Estimated duration'] || '', price: fields['Price NZD'] || fields.Amount || '', billing: fields['Billing type'] || '', recurring: fields.Frequency || fields.Recurring || '', status: fields.Status || '', proof: fields['Proof/photos'] || '', issue: fields['Issue status'] || '', notes: fields['Job notes'] || fields.Notes || '', savedAt: now(), source: 'drawer',
  };
  if (kind === 'clients') return {
    id: `drawer-client-${Math.abs(hash(`${fields.Name}|${fields.Phone}|${fields.Email}`))}`,
    name: fields.Name || fields.Client || '', phone: fields.Phone || '', email: fields.Email || '', address: fields.Address || '', service: fields['Preferred service'] || fields['Service memory'] || '', price: fields['Saved price'] || fields['Price memory'] || '', schedule: fields['Preferred schedule'] || '', notes: fields['Access notes'] || fields['Notes / access'] || fields.Notes || '', savedAt: now(), source: 'drawer',
  };
  if (kind === 'quotes') return {
    id: `drawer-quote-${Math.abs(hash(`${fields.Quote}|${fields.Client}|${fields.Amount}`))}`,
    title: fields.Quote || fields['Quote title'] || '', client: fields.Client || '', amount: fields.Amount || '', status: fields.Status || 'Draft', scope: fields.Scope || '', prepared: fields['Prepared from'] || '', terms: fields.Terms || '', followUp: fields['Follow-up'] || '', next: fields['Next step'] || '', savedAt: now(), source: 'drawer',
  };
  if (kind === 'invoices') return {
    id: `drawer-invoice-${Math.abs(hash(`${fields.Invoice}|${fields.Client}|${fields.Amount}`))}`,
    number: fields.Invoice || fields['Invoice number'] || '', client: fields.Client || '', job: fields.Job || '', amount: fields.Amount || '', due: fields['Due date'] || '', status: fields.Status || 'Draft', sync: fields['Xero/MYOB status'] || fields.Sync || '', line: fields['Line item'] || '', evidence: fields.Evidence || '', savedAt: now(), source: 'drawer',
  };
  if (kind === 'messages') return {
    id: `drawer-message-${Math.abs(hash(`${fields.Subject}|${fields.Client}|${fields.Channel}`))}`,
    from: fields.From || '', channel: fields.Channel || '', client: fields.Client || '', job: fields.Job || '', subject: fields.Subject || '', priority: fields.Priority || '', history: fields.History || '', detail: fields.Message || '', draft: fields['Drafted reply'] || fields['Draft reply'] || '', savedAt: now(), source: 'drawer',
  };
  if (kind === 'workers') return {
    id: `drawer-worker-${Math.abs(hash(`${fields.Worker || fields.Name}|${fields['Current job']}|${fields.Timesheet}`))}`,
    name: fields.Worker || fields.Name || '', role: fields['Role/access'] || fields.Role || '', status: fields['Clock status'] || fields.Status || '', job: fields['Current job'] || '', gps: fields['GPS/location'] || '', start: fields['Clock in'] || '', end: fields['Clock out'] || '', break: fields.Break || '', proof: fields['Proof/photos'] || '', messages: fields['Worker messages'] || '', timesheet: fields.Timesheet || '', slip: fields['Slip/payroll status'] || '', app: fields['Worker app'] || '', payroll: fields['Payroll review'] || fields['Slip/payroll status'] || '', notes: fields['Day notes'] || fields.Notes || '', savedAt: now(), source: 'drawer',
  };
  return { id: `drawer-record-${Date.now()}`, ...fields, savedAt: now(), source: 'drawer' };
}

function missingFor(kind, record) {
  const missing = [];
  if (kind === 'jobs') {
    if (blank(record.title)) missing.push('job name');
    if (blank(record.client)) missing.push('client');
    if (blank(record.worker)) missing.push('assigned worker');
    if (blank(record.date)) missing.push('date');
    if (blank(record.time)) missing.push('time');
    if (blank(record.service)) missing.push('service');
    if (money(record.price) <= 0 && !lower(record.billing).includes('quote')) missing.push('price');
  }
  if (kind === 'clients') {
    if (blank(record.name)) missing.push('client name');
    if (blank(record.phone) && blank(record.email)) missing.push('phone or email');
    if (blank(record.address)) missing.push('address');
  }
  if (kind === 'quotes') {
    if (blank(record.title)) missing.push('quote title');
    if (blank(record.client)) missing.push('client');
    if (money(record.amount) <= 0) missing.push('amount');
    if (blank(record.scope)) missing.push('scope');
  }
  if (kind === 'invoices') {
    if (blank(record.number)) missing.push('invoice number');
    if (blank(record.client)) missing.push('client');
    if (blank(record.due)) missing.push('due date');
    if (money(record.amount) <= 0) missing.push('amount');
    if (blank(record.line)) missing.push('line item');
  }
  if (kind === 'messages') {
    if (blank(record.client)) missing.push('client');
    if (blank(record.subject)) missing.push('subject');
    if (blank(record.draft)) missing.push('draft reply');
  }
  if (kind === 'workers') {
    if (blank(record.name)) missing.push('worker name');
    if (/review|pending|needs|not ready|mismatch|0h/i.test(`${record.payroll} ${record.slip} ${record.timesheet}`)) missing.push('slip review');
    if (/no proof|missing/i.test(record.proof)) missing.push('proof');
  }
  return missing;
}

function titleFor(kind, record) {
  return first(record, ['title', 'number', 'subject', 'name']) || first(record, ['client', 'job']) || kind.slice(0, -1);
}

function commandType(kind) {
  return ({ jobs: 'Job fix needed', clients: 'Client issue ready', quotes: 'Quote fix needed', invoices: 'Invoice fix needed', messages: 'Message fix needed', workers: 'Timesheet/proof/slip issue ready' })[kind] || 'Record fix needed';
}

function upsert(list, record, matcher) {
  const next = [...(list || [])];
  const index = next.findIndex(matcher);
  if (index >= 0) next[index] = { ...next[index], ...record, editedAt: now() };
  else next.unshift(record);
  return next.slice(0, 100);
}

function saveRecord(kind, record, missing) {
  const state = main();
  const opState = ops();
  const blocked = missing.length > 0;
  const saved = { ...record, _blockedByCommand: blocked, _doNotShowToday: kind === 'jobs' && blocked, _commandMissing: missing.join(', ') };
  const matcher = (item) => item.id === saved.id || lower(titleFor(kind, item)) === lower(titleFor(kind, saved));
  state[kind] = upsert(state[kind], saved, matcher);
  state.audit = [{ action: blocked ? 'Saved and routed to Command' : 'Saved drawer record', detail: titleFor(kind, saved), at: now() }, ...(state.audit || [])].slice(0, 80);

  if (blocked) {
    const issueKey = `drawer:${kind}:${titleFor(kind, saved)}:${missing.join('|')}`.toLowerCase();
    const exists = [...(state.command || []), ...(opState.commandQueue || [])].some((item) => item.issueKey === issueKey || item.flowKey === issueKey);
    saved._commandIssueKey = issueKey;
    state[kind] = upsert(state[kind], saved, matcher);
    if (!exists) {
      const item = {
        id: `drawer-command-${Math.abs(hash(issueKey))}`,
        type: commandType(kind),
        title: titleFor(kind, saved),
        client: saved.client || saved.name || 'Not set',
        amount: money(saved.amount || saved.price),
        status: 'Missing details',
        owner: 'Edit',
        issueKey,
        flowKey: issueKey,
        sourceType: kind,
        sourceId: saved.id,
        missing: missing.join(', '),
        filled: `Churvox saved the slip but found missing ${missing.join(', ')}.`,
        evidence: 'Opened slip was checked before being allowed into the live workflow.',
        check: `Fix ${missing.join(', ')} in Command, then approve or park.`,
        createdAt: now(),
      };
      state.command = [item, ...(state.command || [])].slice(0, 120);
      opState.commandQueue = [item, ...(opState.commandQueue || [])].slice(0, 120);
      opState.audit = [{ action: 'Drawer routed fix to Command', detail: item.title, at: now() }, ...(opState.audit || [])].slice(0, 80);
    }
  }

  saveMain(state);
  saveOps(opState);
  return saved;
}

function commandDecision(drawer, action) {
  const fields = fieldsFromDrawer(drawer);
  const ref = clean(fields.Record || fields['Approval type'] || drawer.querySelector('h2')?.textContent || 'Command item');
  const state = main();
  const opState = ops();
  const matcher = (item) => lower(item.title) === lower(ref) || lower(item.type) === lower(ref) || lower(`${item.type} ${item.title}`).includes(lower(ref));
  let found = false;
  state.command = (state.command || []).map((item) => matcher(item) ? (found = true, { ...item, status: action, decidedAt: now(), ownerNote: fields['Edit notes'] || '' }) : item);
  opState.commandQueue = (opState.commandQueue || []).map((item) => matcher(item) ? { ...item, status: action, decidedAt: now(), ownerNote: fields['Edit notes'] || '' } : item);
  state.audit = [{ action: `Command ${action}`, detail: ref, at: now() }, ...(state.audit || [])].slice(0, 80);
  saveMain(state);
  saveOps(opState);
  drawer.dataset.savedState = action === 'approved' ? 'saved' : 'command';
  toast(`Command item ${action}`, found ? ref : 'Decision saved to audit.');
}

function handleDrawerButton(event) {
  const button = event.target.closest('button');
  const drawer = button?.closest('.churvoxOptionC .cocDrawer');
  if (!button || !drawer) return;
  const label = lower(button.textContent);
  const kind = drawerKind(drawer);

  if (kind === 'command' && ['approve', 'park'].includes(label)) {
    event.preventDefault();
    event.stopPropagation();
    commandDecision(drawer, label === 'approve' ? 'approved' : 'parked');
    return;
  }

  if (!/^save\b/.test(label) && !label.includes('update access')) return;
  event.preventDefault();
  event.stopPropagation();
  const record = normalize(kind, fieldsFromDrawer(drawer));
  const missing = missingFor(kind, record);
  saveRecord(kind, record, missing);
  drawer.dataset.savedState = missing.length ? 'command' : 'saved';
  toast(missing.length ? 'Saved and sent to Command' : 'Saved', missing.length ? `Missing ${missing.join(', ')}.` : `${titleFor(kind, record)} is usable.`);
  setTimeout(() => window.dispatchEvent(new Event('hashchange')), 80);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', ensureStyle);
  document.addEventListener('click', handleDrawerButton, true);
}

export {};
