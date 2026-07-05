import API_BASE from '../lib/apiBase';

// Smart Admin Audit: finds incomplete forms, risky records and worker job clashes.
// Surfaces them as Command findings. Churvox does the admin; owner approves/fixes/parks.

const STYLE_ID = 'churvox-smart-admin-audit-style';
const PANEL_ID = 'churvox-smart-admin-audit-panel';
const MODAL_ID = 'churvox-smart-admin-audit-slip';
const STORE_KEY = 'churvox_smart_admin_findings_v1';
const AUDIT_INTERVAL_MS = 45000;

let lastAuditAt = 0;
let lastFindings = [];
let running = false;

const css = `
  .cvxSmartAuditPanel {
    grid-column: 1 / -1;
    display: grid;
    gap: 12px;
    margin: 0 0 14px;
    padding: 14px;
    border: 1px solid rgba(17,21,19,.09);
    border-left: 5px solid #f36b21;
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(255,255,252,.88), rgba(255,247,237,.82));
    box-shadow: 0 14px 34px rgba(17,21,19,.07);
    backdrop-filter: blur(14px);
  }

  .cvxSmartAuditHead {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px;
    align-items: start;
  }

  .cvxSmartAuditHead small {
    display: inline-flex;
    margin-bottom: 5px;
    border-radius: 999px;
    padding: 5px 8px;
    background: #111713;
    color: #fff;
    font-size: 9px;
    font-weight: 1000;
    letter-spacing: .09em;
    text-transform: uppercase;
  }

  .cvxSmartAuditHead b {
    display: block;
    color: #111713;
    font-size: 18px;
    line-height: 1.05;
    font-weight: 1000;
    letter-spacing: -.045em;
  }

  .cvxSmartAuditHead span {
    display: block;
    margin-top: 4px;
    color: #5f6a64;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 760;
  }

  .cvxSmartAuditStats {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    justify-content: flex-end;
  }

  .cvxSmartAuditStats em {
    border-radius: 999px;
    padding: 7px 9px;
    background: rgba(17,21,19,.07);
    color: #111713;
    font-size: 11px;
    font-style: normal;
    font-weight: 1000;
    white-space: nowrap;
  }

  .cvxSmartAuditRows {
    display: grid;
    gap: 8px;
    max-height: 315px;
    overflow: auto;
    padding-right: 3px;
  }

  .cvxSmartAuditRow {
    width: 100%;
    display: grid;
    grid-template-columns: 9px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 58px;
    border: 1px solid rgba(17,21,19,.08);
    border-radius: 16px;
    padding: 10px;
    background: rgba(255,255,255,.74);
    color: #111713;
    text-align: left;
    cursor: pointer;
    transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease, background .14s ease;
  }

  .cvxSmartAuditRow:hover {
    transform: translateY(-1px);
    border-color: rgba(243,107,33,.38);
    background: #fff;
    box-shadow: 0 14px 30px rgba(17,21,19,.09);
  }

  .cvxSmartAuditRow i {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: #f36b21;
  }

  .cvxSmartAuditRow[data-severity="high"] i { background: #dc2626; }
  .cvxSmartAuditRow[data-severity="medium"] i { background: #f59e0b; }
  .cvxSmartAuditRow[data-severity="low"] i { background: #2563eb; }

  .cvxSmartAuditRow b,
  .cvxSmartAuditRow small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cvxSmartAuditRow b {
    font-size: 13px;
    font-weight: 1000;
    letter-spacing: -.02em;
  }

  .cvxSmartAuditRow small {
    margin-top: 3px;
    color: #66736d;
    font-size: 11px;
    font-weight: 760;
  }

  .cvxSmartAuditRow em {
    border-radius: 999px;
    padding: 6px 8px;
    background: #111713;
    color: #fff;
    font-size: 10px;
    font-style: normal;
    font-weight: 1000;
    white-space: nowrap;
  }

  .cvxSmartAuditEmpty {
    border: 1px dashed rgba(17,21,19,.16);
    border-radius: 16px;
    padding: 13px;
    background: rgba(255,255,255,.62);
    color: #5f6a64;
    font-size: 13px;
    font-weight: 780;
  }

  .cvxSmartAuditLayer {
    position: fixed;
    inset: 0;
    z-index: 1000005;
    display: grid;
    place-items: center;
    padding: 22px;
    background: rgba(13,17,15,.48);
    backdrop-filter: blur(8px);
  }

  .cvxSmartAuditSlip {
    width: min(880px, calc(100vw - 44px));
    max-height: calc(100vh - 44px);
    overflow: auto;
    border: 1px solid rgba(255,255,255,.58);
    border-radius: 30px;
    background: linear-gradient(180deg, rgba(255,255,252,.98), rgba(248,244,237,.98));
    box-shadow: 0 36px 110px rgba(10,14,12,.38);
  }

  .cvxSmartAuditSlipHead {
    position: sticky;
    top: 0;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0,1fr) auto;
    gap: 12px;
    padding: 18px 20px;
    border-bottom: 1px solid rgba(17,21,19,.10);
    background: rgba(255,255,252,.94);
    backdrop-filter: blur(12px);
  }

  .cvxSmartAuditSlipHead small {
    display: inline-flex;
    margin-bottom: 7px;
    border-radius: 999px;
    padding: 5px 8px;
    background: #111713;
    color: #fff;
    font-size: 9px;
    font-weight: 1000;
    letter-spacing: .09em;
    text-transform: uppercase;
  }

  .cvxSmartAuditSlipHead h2 {
    margin: 0;
    color: #111713;
    font-size: 28px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -.06em;
  }

  .cvxSmartAuditSlipHead p {
    margin: 7px 0 0;
    color: #5f6a64;
    font-size: 13px;
    line-height: 1.4;
    font-weight: 760;
  }

  .cvxSmartAuditClose {
    border: 0;
    border-radius: 999px;
    padding: 9px 12px;
    background: #111713;
    color: #fff;
    font-size: 12px;
    font-weight: 1000;
    cursor: pointer;
  }

  .cvxSmartAuditSlipBody {
    display: grid;
    gap: 12px;
    padding: 18px 20px 20px;
  }

  .cvxSmartAuditSlipGrid {
    display: grid;
    grid-template-columns: repeat(2,minmax(0,1fr));
    gap: 9px;
  }

  .cvxSmartAuditSlipGrid div,
  .cvxSmartAuditBlock {
    border: 1px solid rgba(17,21,19,.09);
    border-radius: 16px;
    padding: 11px;
    background: rgba(255,255,255,.74);
  }

  .cvxSmartAuditSlipGrid small,
  .cvxSmartAuditBlock small {
    display: block;
    color: #7b8781;
    font-size: 9px;
    font-weight: 1000;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .cvxSmartAuditSlipGrid strong,
  .cvxSmartAuditBlock strong {
    display: block;
    margin-top: 4px;
    color: #111713;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .cvxSmartAuditActions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid rgba(17,21,19,.10);
  }

  .cvxSmartAuditActions button {
    min-height: 38px;
    border: 0;
    border-radius: 999px;
    padding: 9px 13px;
    background: #111713;
    color: #fff;
    font-size: 12px;
    font-weight: 1000;
    cursor: pointer;
  }

  .cvxSmartAuditActions button:first-child {
    background: linear-gradient(135deg,#f36b21,#ffad5b);
    color: #211006;
  }

  .cvxSmartAuditActions button.quiet {
    border: 1px solid rgba(17,21,19,.12);
    background: #fff;
    color: #111713;
  }

  @media(max-width:760px){
    .cvxSmartAuditPanel{border-radius:18px;padding:12px}.cvxSmartAuditRow{grid-template-columns:8px minmax(0,1fr)}.cvxSmartAuditRow em{display:none}.cvxSmartAuditSlipGrid{grid-template-columns:1fr}.cvxSmartAuditLayer{padding:10px;place-items:end center}.cvxSmartAuditSlip{width:calc(100vw - 20px);max-height:calc(100vh - 20px);border-radius:24px}
  }
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  } else if (style.textContent !== css) {
    style.textContent = css;
  }
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function route(page) {
  window.history.replaceState({}, document.title, `/dashboard#${page}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function currentPage() {
  return (window.location.hash || '#today').replace('#', '').toLowerCase() || 'today';
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function rowsFromPayload(body, keys = []) {
  if (Array.isArray(body)) return body;
  for (const key of keys) {
    if (Array.isArray(body?.[key])) return body[key];
    if (Array.isArray(body?.data?.[key])) return body.data[key];
  }
  for (const key of ['items', 'records', 'results', 'data']) {
    if (Array.isArray(body?.[key])) return body[key];
    if (Array.isArray(body?.data?.[key])) return body.data[key];
  }
  return [];
}

async function fetchRows(endpoint, keys = []) {
  try {
    const response = await fetch(`${API_BASE}/api${endpoint}`, { credentials: 'include', headers: authHeaders() });
    if (!response.ok) return [];
    return rowsFromPayload(await response.json(), keys);
  } catch (_) {
    return [];
  }
}

function first(obj, keys, fallback = '') {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && clean(value)) return clean(value);
  }
  return fallback;
}

function recordId(record) {
  return first(record, ['id', '_id', 'job_id', 'client_id', 'quote_id', 'invoice_id', 'worker_id', 'number'], '').replace(/[{}]/g, '');
}

function money(record, keys = ['price', 'amount', 'total', 'subtotal', 'fixed_price', 'amount_due', 'quote_total', 'invoice_total']) {
  for (const key of keys) {
    const raw = record?.[key];
    const n = Number(String(raw ?? '').replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function title(record) {
  return first(record, ['title', 'job_name', 'name', 'client_name', 'customer_name', 'subject', 'description', 'number', 'invoice_number'], 'Untitled record');
}

function clientName(record) {
  return first(record, ['client_name', 'customer_name', 'client', 'customer', 'name'], '');
}

function address(record) {
  return first(record, ['address', 'site_address', 'service_address', 'job_address', 'customer_address'], '');
}

function service(record) {
  return first(record, ['service', 'service_type', 'job_type', 'scope', 'description', 'line_item', 'line', 'title', 'job_name'], '');
}

function workerName(record) {
  return first(record, ['worker_name', 'assigned_worker_name', 'assigned_to_name', 'assigned_to', 'worker', 'name'], '');
}

function workerKey(record) {
  return lower(first(record, ['assigned_worker_id', 'worker_id', 'assigned_to_id', 'assigned_to', 'assigned_worker_name', 'worker_name', 'worker'], ''));
}

function dateValue(record) {
  return first(record, ['date', 'scheduled_date', 'job_date', 'start_date', 'due_date', 'visit_date', 'next_visit_date'], '');
}

function timeValue(record) {
  return first(record, ['time', 'scheduled_time', 'start_time', 'start', 'arrival_time'], '');
}

function endTimeValue(record) {
  return first(record, ['end_time', 'finish_time', 'end', 'scheduled_end_time'], '');
}

function durationMinutes(record) {
  const raw = first(record, ['duration_minutes', 'estimated_minutes', 'minutes', 'duration'], '');
  const n = Number(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.min(720, n) : 90;
}

function parseDate(raw) {
  const value = clean(raw);
  if (!value) return '';
  const iso = value.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const nz = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  if (nz) return `${nz[3]}-${String(nz[2]).padStart(2, '0')}-${String(nz[1]).padStart(2, '0')}`;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? lower(value).slice(0, 20) : d.toISOString().slice(0, 10);
}

function parseMinutes(raw) {
  const value = lower(raw);
  if (!value) return null;
  const ampm = value.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  const twentyFour = value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const m = ampm || twentyFour;
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] || 0);
  if (ampm) {
    if (m[3] === 'pm' && hour < 12) hour += 12;
    if (m[3] === 'am' && hour === 12) hour = 0;
  }
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function timeLabel(minutes) {
  if (minutes === null || minutes === undefined) return 'No time saved';
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isInactive(record) {
  const status = lower(first(record, ['status', 'job_status', 'workflow_status', 'invoice_status', 'quote_status'], ''));
  return /cancel|void|archive|delete|complete|completed|paid/.test(status);
}

function finding({ type, severity = 'medium', recordType, title: findingTitle, record, missing = [], reason, prepared, routePage, details = {} }) {
  const id = `${type}:${recordType}:${recordId(record) || clean(findingTitle)}:${missing.join('|')}:${reason}`.toLowerCase().replace(/[^a-z0-9:|]+/g, '-').slice(0, 180);
  return {
    id,
    type,
    severity,
    recordType,
    title: findingTitle,
    recordTitle: title(record),
    client: clientName(record),
    missing,
    reason,
    prepared,
    routePage,
    recordId: recordId(record),
    details,
    createdAt: new Date().toISOString(),
  };
}

function missingClient(client) {
  const missing = [];
  if (!clientName(client)) missing.push('client name');
  if (!first(client, ['phone', 'mobile', 'email', 'contact_phone', 'contact_email'], '')) missing.push('phone or email');
  if (!address(client)) missing.push('site address');
  return missing;
}

function missingJob(job) {
  const missing = [];
  if (!clientName(job)) missing.push('client');
  if (!service(job)) missing.push('service/scope');
  if (!address(job)) missing.push('address');
  if (!workerKey(job)) missing.push('assigned worker');
  if (!dateValue(job)) missing.push('date');
  if (!timeValue(job)) missing.push('start time');
  const billing = lower(first(job, ['billing_type', 'pricing_type', 'charge_type'], ''));
  if (!billing.includes('quote') && !billing.includes('hour') && money(job) <= 0) missing.push('price');
  return missing;
}

function missingQuote(quote) {
  const missing = [];
  if (!clientName(quote)) missing.push('client');
  if (!service(quote)) missing.push('scope');
  if (money(quote, ['amount', 'total', 'price', 'quote_total', 'subtotal']) <= 0) missing.push('amount');
  if (!first(quote, ['status', 'quote_status'], '')) missing.push('status');
  return missing;
}

function missingInvoice(invoice) {
  const missing = [];
  if (!clientName(invoice)) missing.push('client');
  if (!service(invoice)) missing.push('line item');
  if (money(invoice, ['amount', 'total', 'amount_due', 'invoice_total', 'subtotal']) <= 0) missing.push('amount');
  if (!first(invoice, ['due_date', 'due', 'payment_due'], '')) missing.push('due date');
  return missing;
}

function missingWorker(worker) {
  const missing = [];
  if (!workerName(worker)) missing.push('worker name');
  if (!first(worker, ['phone', 'mobile', 'email'], '')) missing.push('phone or email');
  if (!first(worker, ['role', 'type', 'position'], '')) missing.push('role');
  return missing;
}

function buildRecordDetails(record, extra = {}) {
  return {
    Client: clientName(record) || 'Not linked',
    Record: title(record),
    Address: address(record) || 'Not saved',
    Service: service(record) || 'Not saved',
    Worker: workerName(record) || first(record, ['assigned_to', 'worker'], 'Not assigned'),
    Date: dateValue(record) || 'Not saved',
    Time: timeValue(record) || 'Not saved',
    Price: money(record) > 0 ? `$${money(record).toFixed(2)}` : 'Not saved',
    Status: first(record, ['status', 'job_status', 'workflow_status', 'invoice_status', 'quote_status'], 'Not saved'),
    ...extra,
  };
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function detectJobClashes(jobs) {
  const findings = [];
  const scheduled = jobs.filter((job) => !isInactive(job)).map((job) => {
    const d = parseDate(dateValue(job));
    const start = parseMinutes(timeValue(job));
    const endRaw = parseMinutes(endTimeValue(job));
    const end = endRaw !== null ? endRaw : (start !== null ? start + durationMinutes(job) : null);
    return { job, d, start, end, worker: workerKey(job) };
  }).filter((row) => row.d && row.worker && row.start !== null && row.end !== null);

  for (let i = 0; i < scheduled.length; i += 1) {
    for (let j = i + 1; j < scheduled.length; j += 1) {
      const a = scheduled[i];
      const b = scheduled[j];
      if (a.worker !== b.worker || a.d !== b.d) continue;
      if (overlap(a.start, a.end, b.start, b.end)) {
        findings.push(finding({
          type: 'Worker clash found',
          severity: 'high',
          recordType: 'job',
          title: `Same worker clash: ${workerName(a.job) || a.worker}`,
          record: a.job,
          reason: `${title(a.job)} (${timeLabel(a.start)}-${timeLabel(a.end)}) clashes with ${title(b.job)} (${timeLabel(b.start)}-${timeLabel(b.end)}).`,
          prepared: 'Churvox found two jobs assigned to the same worker at overlapping times. Owner should edit the time, move one job, or assign a different worker.',
          routePage: 'jobs',
          details: buildRecordDetails(a.job, {
            'Clashing job': title(b.job),
            'Clash time': `${timeLabel(a.start)}-${timeLabel(a.end)} vs ${timeLabel(b.start)}-${timeLabel(b.end)}`,
          }),
        }));
      }
    }
  }

  const dayWorkerCounts = new Map();
  scheduled.forEach((row) => {
    const key = `${row.worker}|${row.d}`;
    const bucket = dayWorkerCounts.get(key) || [];
    bucket.push(row);
    dayWorkerCounts.set(key, bucket);
  });
  dayWorkerCounts.forEach((rows) => {
    if (rows.length < 5) return;
    rows.sort((a, b) => a.start - b.start);
    const worker = workerName(rows[0].job) || rows[0].worker;
    findings.push(finding({
      type: 'Worker overload risk',
      severity: 'medium',
      recordType: 'worker',
      title: `${worker} has ${rows.length} jobs in one day`,
      record: rows[0].job,
      reason: `${worker} has ${rows.length} scheduled jobs on ${rows[0].d}. Check travel time and workload before the day starts.`,
      prepared: 'Churvox grouped the worker day and flagged a workload risk for owner review.',
      routePage: 'workers',
      details: buildRecordDetails(rows[0].job, {
        Worker: worker,
        Date: rows[0].d,
        Jobs: rows.map((row) => `${timeLabel(row.start)} ${title(row.job)}`).join(' · '),
      }),
    }));
  });

  return findings;
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function saveFindings(findings) {
  const payload = { at: new Date().toISOString(), findings };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(payload)); } catch (_) {}
  const commandItems = findings.map((item) => ({
    id: `smart-${item.id}`,
    status: 'waiting',
    type: item.type,
    title: item.title,
    client: item.client || 'Business',
    missing: item.missing.join(', '),
    filled: item.prepared,
    evidence: item.reason,
    check: item.missing.length ? `Fix/check: ${item.missing.join(', ')}.` : item.reason,
    source: 'Churvox Smart Admin Audit',
    details: item.details,
    payload: { routePage: item.routePage, recordId: item.recordId },
    ai_confidence: item.severity === 'high' ? 0.96 : 0.88,
    createdAt: item.createdAt,
  }));
  try {
    const main = JSON.parse(localStorage.getItem('churvox_option_f_working_actions_v1') || '{}');
    const ops = JSON.parse(localStorage.getItem('churvox_option_f_operations_v1') || '{}');
    const oldMain = Array.isArray(main.command) ? main.command : [];
    const oldOps = Array.isArray(ops.commandQueue) ? ops.commandQueue : [];
    const mergedMain = dedupe([...commandItems, ...oldMain].map((item) => ({ ...item, id: item.id || `${item.type}:${item.title}` })));
    const mergedOps = dedupe([...commandItems, ...oldOps].map((item) => ({ ...item, id: item.id || `${item.type}:${item.title}` })));
    localStorage.setItem('churvox_option_f_working_actions_v1', JSON.stringify({ ...main, command: mergedMain.slice(0, 160) }));
    localStorage.setItem('churvox_option_f_operations_v1', JSON.stringify({ ...ops, commandQueue: mergedOps.slice(0, 160) }));
  } catch (_) {}
}

async function auditRecords(force = false) {
  const now = Date.now();
  if (running || (!force && now - lastAuditAt < AUDIT_INTERVAL_MS)) return lastFindings;
  running = true;
  lastAuditAt = now;
  try {
    const [jobs, clients, quotes, invoices, workers] = await Promise.all([
      fetchRows('/jobs', ['jobs']),
      fetchRows('/clients', ['clients']),
      fetchRows('/quotes', ['quotes']),
      fetchRows('/invoices', ['invoices']),
      fetchRows('/team/workers', ['workers', 'team']),
    ]);

    const findings = [];

    clients.filter((client) => !isInactive(client)).forEach((client) => {
      const missing = missingClient(client);
      if (!missing.length) return;
      findings.push(finding({
        type: 'Client form incomplete',
        severity: missing.includes('phone or email') ? 'high' : 'medium',
        recordType: 'client',
        title: `Fix client: ${clientName(client) || title(client)}`,
        record: client,
        missing,
        reason: `Client record is missing ${missing.join(', ')}.`,
        prepared: 'Churvox checked the client form and prepared the missing fields for owner review.',
        routePage: 'clients',
        details: buildRecordDetails(client),
      }));
    });

    jobs.filter((job) => !isInactive(job)).forEach((job) => {
      const missing = missingJob(job);
      if (!missing.length) return;
      findings.push(finding({
        type: 'Job form incomplete',
        severity: missing.includes('assigned worker') || missing.includes('date') || missing.includes('start time') ? 'high' : 'medium',
        recordType: 'job',
        title: `Fix job: ${title(job)}`,
        record: job,
        missing,
        reason: `Job is not ready because it is missing ${missing.join(', ')}.`,
        prepared: 'Churvox checked the job form and blocked it from being treated as clean work until the owner fixes it.',
        routePage: 'jobs',
        details: buildRecordDetails(job),
      }));
    });

    quotes.filter((quote) => !isInactive(quote)).forEach((quote) => {
      const missing = missingQuote(quote);
      if (!missing.length) return;
      findings.push(finding({
        type: 'Quote form incomplete',
        severity: missing.includes('amount') ? 'high' : 'medium',
        recordType: 'quote',
        title: `Fix quote: ${title(quote)}`,
        record: quote,
        missing,
        reason: `Quote is not ready because it is missing ${missing.join(', ')}.`,
        prepared: 'Churvox checked the quote and prepared it for owner edit before any sending or conversion.',
        routePage: 'quotes',
        details: buildRecordDetails(quote),
      }));
    });

    invoices.filter((invoice) => !isInactive(invoice)).forEach((invoice) => {
      const missing = missingInvoice(invoice);
      if (!missing.length) return;
      findings.push(finding({
        type: 'Invoice form incomplete',
        severity: missing.includes('amount') || missing.includes('due date') ? 'high' : 'medium',
        recordType: 'invoice',
        title: `Fix invoice: ${title(invoice)}`,
        record: invoice,
        missing,
        reason: `Invoice is not ready because it is missing ${missing.join(', ')}.`,
        prepared: 'Churvox checked the invoice draft and held it for owner edit before sending or accounting sync.',
        routePage: 'invoices',
        details: buildRecordDetails(invoice),
      }));
    });

    workers.filter((worker) => !isInactive(worker)).forEach((worker) => {
      const missing = missingWorker(worker);
      if (!missing.length) return;
      findings.push(finding({
        type: 'Worker form incomplete',
        severity: missing.includes('phone or email') ? 'medium' : 'low',
        recordType: 'worker',
        title: `Fix worker: ${workerName(worker) || title(worker)}`,
        record: worker,
        missing,
        reason: `Worker record is missing ${missing.join(', ')}.`,
        prepared: 'Churvox checked the worker form so job assignment and worker app access are not messy later.',
        routePage: 'team',
        details: buildRecordDetails(worker, { Worker: workerName(worker) || title(worker) }),
      }));
    });

    findings.push(...detectJobClashes(jobs));

    lastFindings = dedupe(findings).sort((a, b) => {
      const score = { high: 0, medium: 1, low: 2 };
      return (score[a.severity] ?? 1) - (score[b.severity] ?? 1);
    }).slice(0, 80);
    saveFindings(lastFindings);
    renderPanel();
    window.dispatchEvent(new CustomEvent('churvox-smart-admin-audit', { detail: { findings: lastFindings } }));
    return lastFindings;
  } finally {
    running = false;
  }
}

function readSavedFindings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    return Array.isArray(saved.findings) ? saved.findings : [];
  } catch (_) {
    return [];
  }
}

function severityStats(findings) {
  return {
    high: findings.filter((item) => item.severity === 'high').length,
    medium: findings.filter((item) => item.severity === 'medium').length,
    total: findings.length,
  };
}

function renderPanel() {
  ensureStyle();
  const page = currentPage();
  const workspace = document.querySelector('.cvxProduct[data-product-version="v2"] .cvxWorkspace');
  if (!workspace || !['today', 'command', 'jobs', 'clients', 'workers'].includes(page)) return;

  const findings = lastFindings.length ? lastFindings : readSavedFindings();
  const stats = severityStats(findings);
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'cvxSmartAuditPanel';
    const ops = document.getElementById('churvox-product-ops-strip');
    (ops || workspace).insertAdjacentElement(ops ? 'afterend' : 'afterbegin', panel);
  }

  const rows = findings.slice(0, page === 'command' ? 12 : 6).map((item) => `
    <button type="button" class="cvxSmartAuditRow" data-cvx-smart-finding="${escapeHtml(item.id)}" data-severity="${escapeHtml(item.severity)}">
      <i></i>
      <span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.reason)}</small></span>
      <em>${escapeHtml(item.severity.toUpperCase())}</em>
    </button>
  `).join('');

  panel.innerHTML = `
    <header class="cvxSmartAuditHead">
      <div><small>Smart admin scan</small><b>Churvox found what needs fixing</b><span>Incomplete forms, risky records and same-worker job clashes are prepared for owner review.</span></div>
      <div class="cvxSmartAuditStats"><em>${stats.total} findings</em><em>${stats.high} urgent</em><em>${stats.medium} check</em></div>
    </header>
    <div class="cvxSmartAuditRows">${rows || '<div class="cvxSmartAuditEmpty">No form gaps or worker clashes found from the records Churvox can read right now.</div>'}</div>
  `;
}

function closeSlip() {
  document.getElementById(MODAL_ID)?.remove();
}

function openSlip(id) {
  const item = (lastFindings.length ? lastFindings : readSavedFindings()).find((row) => row.id === id);
  if (!item) return;
  ensureStyle();
  closeSlip();
  const details = Object.entries(item.details || {}).filter(([, value]) => clean(value));
  const layer = document.createElement('div');
  layer.id = MODAL_ID;
  layer.className = 'cvxSmartAuditLayer';
  layer.innerHTML = `
    <section class="cvxSmartAuditSlip" role="dialog" aria-modal="true" aria-label="${escapeHtml(item.title)}">
      <header class="cvxSmartAuditSlipHead">
        <div><small>${escapeHtml(item.type)}</small><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.reason)}</p></div>
        <button type="button" class="cvxSmartAuditClose" data-cvx-smart-close>Close</button>
      </header>
      <div class="cvxSmartAuditSlipBody">
        <div class="cvxSmartAuditSlipGrid">
          ${details.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join('')}
        </div>
        <div class="cvxSmartAuditBlock"><small>What Churvox prepared</small><strong>${escapeHtml(item.prepared)}</strong></div>
        <div class="cvxSmartAuditBlock"><small>Owner check</small><strong>${escapeHtml(item.missing.length ? `Fix/check: ${item.missing.join(', ')}.` : item.reason)}</strong></div>
        <div class="cvxSmartAuditActions">
          <button type="button" data-cvx-smart-go="${escapeHtml(item.routePage)}">Open ${escapeHtml(item.routePage)}</button>
          <button type="button" data-cvx-smart-go="command">Keep in Command</button>
          <button type="button" class="quiet" data-cvx-smart-park="${escapeHtml(item.id)}">Park</button>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(layer);
}

function parkFinding(id) {
  lastFindings = (lastFindings.length ? lastFindings : readSavedFindings()).filter((item) => item.id !== id);
  saveFindings(lastFindings);
  closeSlip();
  renderPanel();
}

function handleClick(event) {
  const row = event.target.closest('[data-cvx-smart-finding]');
  if (row) {
    event.preventDefault();
    event.stopPropagation();
    openSlip(row.getAttribute('data-cvx-smart-finding'));
    return;
  }
  const close = event.target.closest('[data-cvx-smart-close]');
  if (close || event.target.id === MODAL_ID) {
    event.preventDefault();
    closeSlip();
    return;
  }
  const go = event.target.closest('[data-cvx-smart-go]');
  if (go) {
    event.preventDefault();
    const page = go.getAttribute('data-cvx-smart-go');
    closeSlip();
    route(page);
    return;
  }
  const park = event.target.closest('[data-cvx-smart-park]');
  if (park) {
    event.preventDefault();
    parkFinding(park.getAttribute('data-cvx-smart-park'));
  }
}

function boot() {
  ensureStyle();
  renderPanel();
  auditRecords(true);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_SMART_ADMIN_AUDIT_RUNTIME__) {
  window.__CHURVOX_SMART_ADMIN_AUDIT_RUNTIME__ = true;
  boot();
  window.addEventListener('load', () => setTimeout(boot, 300));
  window.addEventListener('hashchange', () => setTimeout(() => { renderPanel(); auditRecords(false); }, 180));
  window.addEventListener('popstate', () => setTimeout(() => { renderPanel(); auditRecords(false); }, 180));
  document.addEventListener('click', handleClick, true);
  setInterval(() => auditRecords(false), AUDIT_INTERVAL_MS);
}

export {};