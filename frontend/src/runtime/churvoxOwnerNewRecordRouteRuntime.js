const NEW_RECORD_RUNTIME_FLAG = '__CHURVOX_OWNER_NEW_RECORD_ROUTE_RUNTIME__';
const FORM_PREFIX = 'churvox-owner-new-record-';

const FORMS = {
  client: {
    title: 'Client form',
    endpoint: '/clients',
    trigger: /add client|new client/i,
    fields: [['Name'], ['Phone'], ['Email', 'email'], ['Address'], ['Preferred service'], ['Saved price', 'number'], ['Preferred schedule'], ['Access notes', 'textarea']],
  },
  worker: {
    title: 'Worker form',
    endpoint: '/team/workers',
    trigger: /add worker|invite worker|new worker/i,
    fields: [['Name'], ['Email', 'email'], ['Phone'], ['Role'], ['Access'], ['GPS/location'], ['Current job'], ['Notes', 'textarea']],
  },
  job: {
    title: 'Job form',
    endpoint: '/jobs',
    trigger: /add job|new job/i,
    fields: [['Job name'], ['Client'], ['Site address'], ['Assigned worker'], ['Scheduled date', 'date'], ['Start time', 'time'], ['Price NZD', 'number'], ['Job notes', 'textarea']],
  },
  quote: {
    title: 'Quote form',
    endpoint: '/quotes',
    trigger: /new quote|add quote/i,
    fields: [['Quote'], ['Client'], ['Amount', 'number'], ['Scope', 'textarea'], ['Terms'], ['Follow-up']],
  },
  invoice: {
    title: 'Invoice form',
    endpoint: '/invoices',
    trigger: /new invoice|add invoice/i,
    fields: [['Invoice'], ['Client'], ['Job'], ['Amount', 'number'], ['Due date', 'date'], ['Line item'], ['Evidence', 'textarea']],
  },
};

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function escapeHtml(value) { return clean(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function key(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function apiBase() {
  const host = window.location.hostname.toLowerCase();
  if (host === 'www.churvox.com' || host === 'churvox.com') return 'https://grassley-backend.onrender.com';
  return '';
}
function visible(node) {
  if (!node) return false;
  const rect = node.getBoundingClientRect?.();
  const style = getComputedStyle(node);
  return rect && rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
}
function pathKind() {
  const parts = (location.pathname || '').split('/').filter(Boolean).map((part) => part.toLowerCase());
  if (parts[1] !== 'new') return '';
  return ({ clients: 'client', jobs: 'job', quotes: 'quote', invoices: 'invoice', team: 'worker', workers: 'worker' })[parts[0]] || '';
}
function currentPageKind() {
  const hash = clean((location.hash || '').replace('#', '').split('?')[0]).toLowerCase();
  const path = clean((location.pathname || '').split('/')[1] || '').toLowerCase();
  return ({ clients: 'client', jobs: 'job', quotes: 'quote', invoices: 'invoice', team: 'worker', workers: 'worker' })[hash || path] || '';
}
function existingForm() {
  return [...document.querySelectorAll('.cvxPaidLaunchFallbackForm,.cvxDrawerLayer,[role="dialog"]')].some(visible);
}
function installStyles() {
  if (document.getElementById('churvox-owner-new-record-style')) return;
  const style = document.createElement('style');
  style.id = 'churvox-owner-new-record-style';
  style.textContent = `
    .cvxOwnerNewRecordForm{pointer-events:none}
    .cvxOwnerNewRecordForm .cvxDrawer{pointer-events:none;width:min(1040px,calc(100vw - 28px))}
    .cvxOwnerNewRecordForm input,.cvxOwnerNewRecordForm textarea,.cvxOwnerNewRecordForm select,.cvxOwnerNewRecordForm label,.cvxOwnerNewRecordForm button{pointer-events:auto}
    .cvxOwnerNewRecordState{display:flex;gap:10px;align-items:flex-start;margin:8px 0 14px;padding:12px 14px;border:1px solid rgba(15,23,42,.12);border-radius:16px;background:#ecfdf5;color:#101513}
    .cvxOwnerNewRecordState.bad{background:#fef2f2}
    .cvxOwnerNewRecordState b{white-space:nowrap}
    .cvxOwnerNewRecordState span{font-size:13px;line-height:1.45}
  `;
  document.head.appendChild(style);
}
function field(label, type = 'text') {
  const id = `${FORM_PREFIX}${key(label)}-${Math.random().toString(36).slice(2, 7)}`;
  const safe = escapeHtml(label);
  const wide = /address|notes|scope|evidence|line item/i.test(label) ? ' wide' : '';
  if (type === 'textarea') return `<label class="cvxField${wide}" for="${id}" data-cvx-human-label="${safe}"><span>${safe}</span><textarea id="${id}" name="${safe}" aria-label="${safe}" rows="4"></textarea></label>`;
  return `<label class="cvxField${wide}" for="${id}" data-cvx-human-label="${safe}"><span>${safe}</span><input id="${id}" name="${safe}" aria-label="${safe}" type="${escapeHtml(type)}" /></label>`;
}
function valuesFrom(layer) {
  const values = {};
  layer.querySelectorAll('input,textarea,select').forEach((control) => { values[clean(control.getAttribute('aria-label') || control.name)] = control.value; });
  return values;
}
function val(values, ...names) {
  for (const name of names) {
    const found = Object.keys(values).find((item) => item.toLowerCase() === name.toLowerCase());
    if (found) return clean(values[found]);
  }
  return '';
}
function payload(kind, values) {
  if (kind === 'worker') return { name: val(values, 'Name'), email: val(values, 'Email'), phone: val(values, 'Phone'), role: val(values, 'Role') || 'worker', access: val(values, 'Access') || 'Worker app', gps: val(values, 'GPS/location'), current_job: val(values, 'Current job'), notes: val(values, 'Notes'), source: 'churvox_owner_new_record_route' };
  if (kind === 'client') return { name: val(values, 'Name'), phone: val(values, 'Phone'), email: val(values, 'Email'), address: val(values, 'Address'), service: val(values, 'Preferred service'), price: val(values, 'Saved price'), schedule: val(values, 'Preferred schedule'), notes: val(values, 'Access notes'), source: 'churvox_owner_new_record_route' };
  if (kind === 'job') return { title: val(values, 'Job name'), client_name: val(values, 'Client'), address: val(values, 'Site address'), assigned_worker_name: val(values, 'Assigned worker'), scheduled_date: val(values, 'Scheduled date'), scheduled_time: val(values, 'Start time'), price: val(values, 'Price NZD'), notes: val(values, 'Job notes'), source: 'churvox_owner_new_record_route' };
  if (kind === 'quote') return { title: val(values, 'Quote'), client_name: val(values, 'Client'), amount: val(values, 'Amount'), scope: val(values, 'Scope'), terms: val(values, 'Terms'), follow_up: val(values, 'Follow-up'), source: 'churvox_owner_new_record_route' };
  return { invoice_number: val(values, 'Invoice'), client_name: val(values, 'Client'), job_title: val(values, 'Job'), amount: val(values, 'Amount'), due_date: val(values, 'Due date'), line_item: val(values, 'Line item'), evidence: val(values, 'Evidence'), status: 'Draft', source: 'churvox_owner_new_record_route' };
}
function recordTitle(kind, values) { return val(values, 'Name', 'Job name', 'Quote', 'Invoice', 'Client') || FORMS[kind]?.title || 'Record'; }
function showState(layer, kind, values, ok, message = '') {
  layer.querySelector('.cvxOwnerNewRecordState')?.remove();
  const node = document.createElement('div');
  node.className = `cvxOwnerNewRecordState ${ok ? '' : 'bad'}`;
  node.innerHTML = `<b>${ok ? 'Record saved' : 'Could not save'}</b><span>${escapeHtml(recordTitle(kind, values))}${message ? ` · ${escapeHtml(message)}` : ''}</span>`;
  const actions = layer.querySelector('.cvxDrawerActions');
  actions?.parentNode?.insertBefore(node, actions);
}
async function save(layer, kind) {
  const def = FORMS[kind];
  const values = valuesFrom(layer);
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
  const button = layer.querySelector('[data-new-record-save]');
  if (button) button.disabled = true;
  try {
    const response = await fetch(`${apiBase()}/api${def.endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, credentials: 'include', body: JSON.stringify(payload(kind, values)) });
    if (!response.ok) throw new Error(`save ${response.status}`);
    showState(layer, kind, values, true);
    window.dispatchEvent(new Event('churvox:data-refresh'));
    window.dispatchEvent(new Event('churvox-owner-app-ready'));
  } catch (error) {
    showState(layer, kind, values, false, error?.message || 'try again');
  } finally {
    if (button) button.disabled = false;
  }
}
function openForm(kind) {
  const def = FORMS[kind];
  if (!def) return;
  document.querySelectorAll(`.${FORM_PREFIX}layer`).forEach((node) => node.remove());
  const layer = document.createElement('div');
  layer.className = `cvxDrawerLayer cvxPaidLaunchFallbackForm cvxOwnerNewRecordForm ${FORM_PREFIX}layer`;
  layer.innerHTML = `<aside class="cvxDrawer" role="dialog" aria-modal="true" aria-label="${escapeHtml(def.title)}" data-cvx-human-form="${escapeHtml(kind)}"><button type="button" class="cvxClose" data-new-record-close="true">Close</button><small>New record</small><h2>${escapeHtml(def.title)}</h2><p>Proper working form. Save the record here; owner approval decisions stay in Command.</p><div class="cvxForm">${def.fields.map(([label, type]) => field(label, type || 'text')).join('')}</div><div class="cvxDrawerActions"><button type="button" class="good" data-new-record-save="true">Save record</button><button type="button" class="quiet" data-new-record-close="true">Close</button></div></aside>`;
  layer.addEventListener('click', (event) => {
    if (event.target?.matches?.('[data-new-record-close]')) layer.remove();
    if (event.target?.matches?.('[data-new-record-save]')) { event.preventDefault(); save(layer, kind); }
  });
  document.body.appendChild(layer);
}
function routeOpen() {
  const kind = pathKind();
  if (!kind || existingForm()) return;
  openForm(kind);
}
function interceptClicks(event) {
  const text = clean(event.target?.textContent || event.target?.closest?.('button,a')?.textContent || '');
  const pageKind = currentPageKind();
  const match = Object.entries(FORMS).find(([kind, def]) => def.trigger.test(text) && (pageKind === kind || kind === 'worker'));
  if (!match) return;
  window.setTimeout(() => {
    if (!existingForm()) openForm(match[0]);
  }, 180);
}
function schedule() { [0, 150, 500, 1200, 2400].forEach((delay) => setTimeout(routeOpen, delay)); }

if (typeof window !== 'undefined' && !window[NEW_RECORD_RUNTIME_FLAG]) {
  window[NEW_RECORD_RUNTIME_FLAG] = true;
  installStyles();
  schedule();
  document.addEventListener('click', interceptClicks, true);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
}
