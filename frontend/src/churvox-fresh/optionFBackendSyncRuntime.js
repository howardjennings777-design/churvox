import API_BASE from '../lib/apiBase';

const STORAGE_KEY = 'churvox_option_f_working_actions_v1';
const SYNC_BADGE_ID = 'option-f-backend-sync-badge';

const endpointMap = {
  jobs: '/jobs',
  clients: '/clients',
  quotes: '/quotes',
  invoices: '/invoices',
  messages: '/messages',
  workers: '/team',
};

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function apiUrl(endpoint) {
  return `${API_BASE || ''}/api${endpoint}`;
}

function isBlocked(record) {
  return Boolean(record?._blockedByCommand || record?._doNotShowToday || record?._commandMissing);
}

function mapPayload(key, record) {
  if (key === 'jobs') {
    return {
      title: record.title || record['Job name'] || 'New job',
      client_name: record.client || record.Client || '',
      address: record.address || record['Site address'] || '',
      service: record.service || record.Service || '',
      assigned_worker_name: record.worker || record['Assigned worker'] || '',
      scheduled_date: record.date || record['Scheduled date'] || '',
      scheduled_time: record.time || record['Start time'] || '',
      price: Number(record.price || record['Price NZD'] || 0),
      billing_type: record.billing || record['Billing type'] || '',
      recurring: record.recurring || record.Frequency || '',
      notes: record.notes || record['Job notes'] || '',
      source: 'option_f_working_actions',
    };
  }
  if (key === 'clients') {
    return {
      name: record.name || record.Name || '',
      phone: record.phone || record.Phone || '',
      email: record.email || record.Email || '',
      address: record.address || record.Address || '',
      notes: record.notes || record['Notes/access'] || record['Access notes'] || '',
      service_memory: record.service || record['Service memory'] || record['Preferred service'] || '',
      price_memory: record.price || record['Price memory'] || record['Saved price'] || '',
      source: 'option_f_working_actions',
    };
  }
  if (key === 'quotes') {
    return {
      title: record.title || record.Quote || 'New quote',
      client_name: record.client || record.Client || '',
      amount: Number(record.amount || record.Amount || 0),
      status: record.status || record.Status || 'Draft',
      scope: record.scope || record.Scope || '',
      terms: record.terms || record.Terms || '',
      follow_up: record.followUp || record['Follow-up'] || '',
      source: 'option_f_working_actions',
    };
  }
  if (key === 'invoices') {
    return {
      invoice_number: record.Invoice || record.number || '',
      client_name: record.Client || record.client || '',
      job_title: record.Job || record.job || '',
      amount: Number(record.Amount || record.amount || 0),
      due_date: record['Due date'] || record.due || '',
      status: record.Status || record.status || 'Draft',
      sync_status: record['Xero/MYOB status'] || record.sync || '',
      line_item: record.line || record['Line item'] || '',
      evidence: record.evidence || record.Evidence || '',
      source: 'option_f_working_actions',
    };
  }
  if (key === 'messages') {
    return {
      client_name: record.client || record.Client || '',
      job_title: record.job || record.Job || '',
      subject: record.subject || record.Subject || 'Message draft',
      channel: record.channel || record.Channel || '',
      message: record.draft || record.reply || record['Drafted reply'] || record.Message || '',
      context: record.detail || record.context || '',
      source: 'option_f_working_actions',
    };
  }
  if (key === 'workers') {
    return {
      name: record.name || record.Worker || record.worker || '',
      role: record.role || record.Role || '',
      access: record.access || record.Access || '',
      status: record.status || record['Clock status'] || '',
      current_job: record.job || record['Current job'] || record.currentJob || '',
      gps: record.gps || record['GPS/location'] || '',
      clock_in: record.start || record.clockIn || record['Clock in'] || '',
      clock_out: record.end || record.clockOut || record['Clock out'] || '',
      break_time: record.break || record.breakTime || record.Break || '',
      proof: record.proof || record['Proof/photos'] || '',
      messages: record.messages || record['Worker messages'] || '',
      timesheet: record.timesheet || record.hours || record['Timesheet hours'] || '',
      slip_status: record.slip || record.slipStatus || record['Slip status'] || '',
      payroll_status: record.payroll || record['Payroll review'] || '',
      worker_app: record.app || record['Worker app'] || '',
      notes: record.notes || record.Notes || '',
      source: 'option_f_working_actions',
    };
  }
  return record;
}

async function postRecord(key, record) {
  const endpoint = endpointMap[key];
  if (!endpoint || record._synced || record._syncing || isBlocked(record)) return record;
  const last = Number(record._lastSyncAttempt || 0);
  if (record._syncError && Date.now() - last < 30000) return record;

  const next = { ...record, _syncing: true, _lastSyncAttempt: Date.now() };
  try {
    const response = await fetch(apiUrl(endpoint), {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify(mapPayload(key, record)),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.success === false) {
      throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
    }
    return { ...next, _syncing: false, _synced: true, _syncError: '', _backendId: body?.id || body?._id || body?.data?.id || body?.data?._id || '' };
  } catch (error) {
    return { ...next, _syncing: false, _synced: false, _syncError: error.message || 'Sync failed' };
  }
}

async function syncState() {
  const state = loadState();
  let changed = false;
  for (const key of Object.keys(endpointMap)) {
    const list = Array.isArray(state[key]) ? state[key] : [];
    const nextList = [];
    for (const record of list) {
      const next = await postRecord(key, record);
      if (next !== record || next._synced !== record._synced || next._syncError !== record._syncError) changed = true;
      nextList.push(next);
    }
    state[key] = nextList;
  }
  if (changed) saveState(state);
  renderBadge(state);
}

function renderBadge(state = loadState()) {
  const pending = Object.keys(endpointMap).reduce((sum, key) => sum + (state[key] || []).filter((item) => !item._synced && !isBlocked(item)).length, 0);
  const blocked = Object.keys(endpointMap).reduce((sum, key) => sum + (state[key] || []).filter(isBlocked).length, 0);
  const synced = Object.keys(endpointMap).reduce((sum, key) => sum + (state[key] || []).filter((item) => item._synced).length, 0);
  let badge = document.getElementById(SYNC_BADGE_ID);
  if (!pending && !synced && !blocked) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('div');
    badge.id = SYNC_BADGE_ID;
    badge.style.cssText = 'position:fixed;left:18px;bottom:58px;z-index:99991;border:1px solid rgba(16,21,19,.09);border-radius:999px;padding:8px 11px;background:#fff;color:#111815;box-shadow:0 12px 28px rgba(16,21,19,.12);font:900 12px Inter,system-ui,sans-serif';
    document.body.appendChild(badge);
  }
  badge.textContent = blocked ? `${blocked} held for Command fix` : pending ? `${pending} pending backend sync` : `${synced} synced to backend`;
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(syncState, 1600));
  window.addEventListener('hashchange', () => setTimeout(syncState, 1600));
  document.addEventListener('click', () => setTimeout(syncState, 1800));
  setInterval(syncState, 15000);
}
