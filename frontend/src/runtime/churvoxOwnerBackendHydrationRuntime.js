// Hydrate owner record engine from existing backend data when available.
// Stable launch version: no fresh timestamp on every pull.

const RECORD_KEY = 'churvox.owner.records.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';

const SOURCES = [
  { page: 'clients', url: '/api/clients', title: (x) => x.name || x.client_name || x.email || 'Client' },
  { page: 'jobs', url: '/api/jobs', title: (x) => x.title || x.job_title || x.client_name || x.client || 'Job' },
  { page: 'quotes', url: '/api/quotes', title: (x) => x.quote_number || x.quoteNo || x.title || x.client_name || 'Quote' },
  { page: 'invoices', url: '/api/invoices', title: (x) => x.invoice_number || x.invoiceNo || x.title || x.client_name || 'Invoice' },
  { page: 'workers', url: '/api/team/workers', title: (x) => x.name || x.worker_name || x.email || 'Worker' },
  { page: 'team', url: '/api/team', title: (x) => x.name || x.email || 'Team member' },
];

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function norm(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70); }
function stableString(value) { try { return JSON.stringify(value); } catch (_) { return ''; } }

function pickArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.quotes)) return data.quotes;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.team)) return data.team;
  return [];
}

function valuesFor(page, item) {
  if (page === 'clients') return { name: item.name || item.client_name || '', phone: item.phone || item.mobile || '', email: item.email || '', address: item.address || item.service_address || '', defaultPrice: item.default_price || item.price || '', serviceMemory: item.notes || item.serviceMemory || '', access: item.access || item.access_notes || '' };
  if (page === 'jobs') return { client: item.client || item.client_name || '', site: item.address || item.site || '', worker: item.worker || item.assigned_worker || '', date: item.date || item.scheduled_date || '', time: item.time || item.start_time || '', status: item.status || 'Draft', price: item.price || item.amount || '', repeat: item.repeat || item.recurring || 'None', scope: item.scope || item.description || item.notes || '', proof: item.proof || item.proof_status || '' };
  if (page === 'quotes') return { client: item.client || item.client_name || '', quoteNo: item.quote_number || item.quoteNo || '', status: item.status || 'Draft', validUntil: item.valid_until || '', total: item.total || item.amount || '', scope: item.scope || item.description || '', followUp: item.follow_up || '' };
  if (page === 'invoices') return { client: item.client || item.client_name || '', invoiceNo: item.invoice_number || item.invoiceNo || '', job: item.job || item.job_title || '', status: item.status || 'Draft', amount: item.amount || item.total || '', due: item.due || item.due_date || '', sync: item.sync || 'Draft sync only', paidRule: item.paidRule || 'Only mark paid after accounting refresh confirms paid', lineItems: item.line_items || item.description || '' };
  if (page === 'workers' || page === 'team') return { worker: item.name || item.worker_name || item.email || '', currentJob: item.current_job || '', status: item.status || item.invite_status || '', gps: item.gps || item.location || '', timer: item.timer || '', proof: item.proof || '', message: item.message || item.notes || '', role: item.role || '', email: item.email || '' };
  return item || {};
}

function timeline(event) {
  const list = read(TIMELINE_KEY, []);
  const key = `${event.type}:${event.recordId}`;
  if (list.some((x) => x.key === key)) return;
  write(TIMELINE_KEY, [{ ...event, key, at: new Date().toISOString() }, ...list].slice(0, 120));
}

async function hydrateSource(source, records) {
  const res = await fetch(source.url, { credentials: 'include' });
  if (!res.ok) return 0;
  const rows = pickArray(await res.json()).slice(0, 80);
  let changed = 0;
  rows.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const rawId = item.id || item._id || item.job_id || item.client_id || item.invoice_id || item.quote_id || source.title(item);
    const id = `${source.page}:backend-${norm(rawId)}`;
    const existing = records[id];
    const values = valuesFor(source.page, item);
    const record = { id, page: source.page, title: source.title(item), values, source: 'backend-hydration', backendId: rawId, updatedAt: existing?.updatedAt || item.updated_at || item.updatedAt || item.created_at || item.createdAt || '' };
    if (stableString(existing) === stableString({ ...existing, ...record })) return;
    records[id] = { ...existing, ...record };
    if (!existing) timeline({ type: 'backend-hydrated', recordId: id, page: source.page, title: record.title, detail: `Loaded from ${source.url}` });
    changed += 1;
  });
  return changed;
}

let busy = false;
async function run() {
  if (busy) return;
  busy = true;
  try {
    const records = read(RECORD_KEY, {});
    let changed = 0;
    for (const source of SOURCES) {
      try { changed += await hydrateSource(source, records); } catch (_) {}
    }
    if (changed) {
      write(RECORD_KEY, records);
      dispatchEvent(new CustomEvent('churvox:owner-backend-hydrated', { detail: { changed } }));
    }
  } finally {
    busy = false;
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_BACKEND_HYDRATION__) {
  window.__CHURVOX_OWNER_BACKEND_HYDRATION__ = true;
  addEventListener('load', () => setTimeout(run, 1800));
  addEventListener('hashchange', () => setTimeout(run, 2200));
  addEventListener('churvox:owner-record-api-synced', () => setTimeout(run, 2600));
  setInterval(run, 60000);
}

export {};
