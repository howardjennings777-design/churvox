// CHURVOX_OPTION_F_DRAWER_SAVE_RUNTIME_20260630
// Makes the FreshApp side drawer save buttons real instead of decorative.

const STORE_KEY = 'churvox_option_f_working_actions_v1';
const TOAST_ID = 'option-f-drawer-save-toast';

const KIND_TO_LIST = {
  job: 'jobs',
  client: 'clients',
  invoice: 'invoices',
  quote: 'quotes',
  message: 'messages',
  worker: 'workers',
  person: 'workers',
};

const LABEL_MAP = {
  'Job name': 'title',
  'Record': 'title',
  'Name': 'name',
  'Worker': 'name',
  'Client': 'client',
  'Site address': 'address',
  'Address': 'address',
  'Service': 'service',
  'Preferred service': 'service',
  'Assigned worker': 'worker',
  'Scheduled date': 'date',
  'Start time': 'time',
  'Estimated duration': 'duration',
  'Price NZD': 'price',
  'Saved price': 'price',
  'Amount': 'amount',
  'Billing type': 'billing',
  'Frequency': 'recurring',
  'Status': 'status',
  'Proof/photos': 'proof',
  'Issue status': 'issue',
  'Job notes': 'notes',
  'Phone': 'phone',
  'Email': 'email',
  'Notes / access': 'notes',
  'Access notes': 'notes',
  'Service memory': 'service',
  'Price memory': 'price',
  'Preferred schedule': 'schedule',
  'Invoice': 'number',
  'Quote': 'title',
  'Job': 'job',
  'Due date': 'due',
  'Xero/MYOB status': 'sync',
  'Line item': 'line',
  'Evidence': 'evidence',
  'Scope': 'scope',
  'Prepared from': 'prepared',
  'Terms': 'terms',
  'Follow-up': 'followUp',
  'Next step': 'next',
  'From': 'from',
  'Channel': 'channel',
  'Subject': 'subject',
  'Priority': 'priority',
  'History': 'history',
  'Message': 'detail',
  'Drafted reply': 'draft',
  'Role/access': 'role',
  'Role': 'role',
  'Access': 'access',
  'Phone/email': 'contact',
  'Clock status': 'status',
  'Current job': 'job',
  'GPS/location': 'gps',
  'Clock in': 'start',
  'Clock out': 'end',
  'Break': 'break',
  'Worker messages': 'messages',
  'Timesheet': 'timesheet',
  'Slip/payroll status': 'slip',
  'Worker app': 'app',
  'Day notes': 'notes',
  'Payroll review': 'payroll',
  'Churvox memory': 'memory',
  'Edit notes': 'owner_note',
};

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
function lower(value) {
  return clean(value).toLowerCase();
}
function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (_) { return {}; }
}
function writeStore(value) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(value)); } catch (_) {}
}
function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}
function toast(title, detail = '') {
  let node = document.getElementById(TOAST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = TOAST_ID;
    node.style.cssText = 'position:fixed;right:18px;bottom:26px;z-index:1000015;max-width:390px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none';
    document.body.appendChild(node);
  }
  node.innerHTML = `<b>${title}</b>${detail ? `<small style="display:block;margin-top:4px;color:rgba(255,255,255,.72);font-weight:800">${detail}</small>` : ''}`;
  node.style.opacity = '1';
  node.style.transform = 'translateY(0)';
  clearTimeout(node._timer);
  node._timer = setTimeout(() => { node.style.opacity = '0'; node.style.transform = 'translateY(12px)'; }, 2600);
}
function titleFor(kind, record) {
  return clean(record.title || record.name || record.number || record.subject || record.client || record.job || `${kind} record`);
}
function inferKind(drawer, buttonText) {
  const heading = lower(drawer.querySelector('h2')?.textContent || '');
  const text = `${heading} ${lower(buttonText)}`;
  if (text.includes('client')) return 'client';
  if (text.includes('invoice')) return 'invoice';
  if (text.includes('quote')) return 'quote';
  if (text.includes('message') || text.includes('reply') || text.includes('draft')) return 'message';
  if (text.includes('worker') || text.includes('timesheet') || text.includes('person') || text.includes('day slip')) return text.includes('person') ? 'person' : 'worker';
  return 'job';
}
function drawerData(drawer) {
  const data = {};
  drawer.querySelectorAll('.cocField').forEach((field) => {
    const label = clean(field.querySelector('span')?.textContent || '');
    const input = field.querySelector('input,select,textarea');
    if (!label || !input) return;
    const key = LABEL_MAP[label] || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    data[key] = input.value;
  });
  return data;
}
function upsert(list, record) {
  const title = lower(titleFor('', record));
  const index = list.findIndex((item) => item.id === record.id || lower(titleFor('', item)) === title);
  if (index >= 0) list[index] = { ...list[index], ...record, editedAt: new Date().toISOString() };
  else list.unshift(record);
  return list.slice(0, 160);
}
function saveDrawer(button) {
  const drawer = button.closest('.cocDrawer');
  if (!drawer) return false;
  const label = lower(button.textContent);
  if (!/^save\b/.test(label) && !label.includes('update access') && !label.includes('payroll review')) return false;
  const kind = inferKind(drawer, label);
  const listName = KIND_TO_LIST[kind] || 'jobs';
  const store = readStore();
  const record = { ...drawerData(drawer), id: drawer.getAttribute('data-record-id') || uid(kind), type: kind, savedAt: new Date().toISOString(), source: 'fresh_drawer' };
  store[listName] = upsert(Array.isArray(store[listName]) ? store[listName] : [], record);
  store.audit = [{ action: `Saved ${kind} drawer`, detail: titleFor(kind, record), at: new Date().toISOString() }, ...(Array.isArray(store.audit) ? store.audit : [])].slice(0, 100);
  writeStore(store);
  toast(`${kind[0].toUpperCase()}${kind.slice(1)} saved`, 'Saved from the editable drawer.');
  try { window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated', { detail: { kind, record } })); } catch (_) {}
  const close = drawer.querySelector(':scope > button');
  if (close && lower(close.textContent).includes('close')) setTimeout(() => close.click(), 180);
  return true;
}

function handleClick(event) {
  const button = event.target?.closest?.('button');
  if (!button) return;
  if (!button.closest('.churvoxOptionC .cocDrawer')) return;
  if (saveDrawer(button)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OPTION_F_DRAWER_SAVE__) {
  window.__CHURVOX_OPTION_F_DRAWER_SAVE__ = true;
  document.addEventListener('click', handleClick, true);
}

export {};
