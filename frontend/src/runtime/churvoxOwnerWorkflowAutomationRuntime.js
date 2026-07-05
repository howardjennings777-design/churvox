// Churvox owner workflow automation.
// Connects records into practical business flows while keeping approvals in Command.

const RECORD_KEY = 'churvox.owner.records.v1';
const COMMAND_KEY = 'churvox.command.prepared.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';
const PANEL_ID = 'churvox-owner-workflow-automation-panel';
const STYLE_ID = 'churvox-owner-workflow-automation-style';

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function text(value) { return String(value || '').trim(); }
function norm(value) { return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70); }
function esc(value) { return String(value || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

function timeline(event) {
  const list = read(TIMELINE_KEY, []);
  const key = `${event.type}:${event.recordId || ''}:${event.detail || ''}`;
  if (list.some((x) => x.key === key)) return;
  write(TIMELINE_KEY, [{ ...event, key, at: new Date().toISOString() }, ...list].slice(0, 120));
}

function command(item) {
  const list = read(COMMAND_KEY, []).filter(Boolean);
  if (list.some((x) => x.key === item.key && !/approved|parked/i.test(x.status || ''))) return false;
  const out = { id: `workflow-${Date.now()}-${Math.random().toString(16).slice(2)}`, status: 'Waiting owner approval', issueType: 'workflow', createdAt: new Date().toISOString(), ...item };
  write(COMMAND_KEY, [out, ...list].slice(0, 40));
  timeline({ type: 'workflow-prepared', recordId: out.linkedRecordId, page: out.sourcePage, title: out.title, detail: out.note });
  dispatchEvent(new CustomEvent('churvox:command-prepared', { detail: out }));
  return true;
}

function addRecord(records, page, title, values, sourceRecordId) {
  const id = `${page}:${norm(title || values?.client || Date.now())}`;
  if (records[id]) return false;
  records[id] = { id, page, title, values, source: 'churvox-workflow', sourceRecordId, updatedAt: new Date().toISOString() };
  timeline({ type: 'workflow-record-created', recordId: id, page, title, detail: `Created from ${sourceRecordId || 'workflow'}` });
  return true;
}

function nextDate(value, repeat) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const r = String(repeat || '').toLowerCase();
  if (r.includes('fortnight')) d.setDate(d.getDate() + 14);
  else if (r.includes('week')) d.setDate(d.getDate() + 7);
  else if (r.includes('month')) d.setMonth(d.getMonth() + 1);
  else return '';
  return d.toISOString().slice(0, 10);
}

function runQuoteToJob(records, actions) {
  Object.values(records).filter((r) => r.page === 'quotes').forEach((quote) => {
    const status = text(quote.values?.status).toLowerCase();
    if (!status.includes('accepted')) return;
    const title = `Job from ${quote.values?.quoteNo || quote.title || 'accepted quote'}`;
    const created = addRecord(records, 'jobs', title, { client: quote.values?.client || '', site: quote.values?.address || '', worker: '', date: '', time: '', status: 'Draft', priceType: quote.values?.priceType || 'Fixed', price: quote.values?.total || '', repeat: 'None', scope: quote.values?.scope || '', notes: 'Created from accepted quote. Assign worker and schedule date/time.' }, quote.id);
    if (created) actions.push('Accepted quote created a draft job.');
    command({ key: `quote-to-job:${quote.id}`, title: 'Accepted quote ready to become job', sourcePage: 'quotes', linkedRecordId: quote.id, confidence: 82, note: 'Quote is accepted. Churvox created a draft job and needs owner to confirm schedule/worker.' });
  });
}

function runJobToInvoice(records, actions) {
  Object.values(records).filter((r) => r.page === 'jobs').forEach((job) => {
    const status = text(job.values?.status).toLowerCase();
    const proof = text(job.values?.proof || job.values?.proofStatus || job.values?.notes).toLowerCase();
    if (!status.includes('completed')) return;
    if (!proof.includes('upload') && !proof.includes('photo') && !proof.includes('proof')) {
      command({ key: `job-proof:${job.id}`, title: 'Completed job needs proof check', sourcePage: 'jobs', linkedRecordId: job.id, confidence: 68, note: 'Job is completed but proof is unclear. Review in Command before invoice draft.' });
      return;
    }
    const title = `Invoice from ${job.title || job.values?.client || 'completed job'}`;
    const created = addRecord(records, 'invoices', title, { client: job.values?.client || '', invoiceNo: `DRAFT-${Date.now().toString().slice(-6)}`, job: job.title || '', status: 'Draft', amount: job.values?.price || '', due: '', sync: 'Draft sync only', paidRule: 'Only mark paid after accounting refresh confirms paid', lineItems: job.values?.scope || '' }, job.id);
    if (created) actions.push('Completed job created a draft invoice.');
    command({ key: `job-invoice:${job.id}`, title: 'Draft invoice ready from completed job', sourcePage: 'jobs', linkedRecordId: job.id, confidence: 88, note: 'Churvox prepared a draft invoice from completed job. Owner approves before sending or syncing.' });
  });
}

function runRecurring(records, actions) {
  Object.values(records).filter((r) => r.page === 'jobs').forEach((job) => {
    if (job.source === 'churvox-workflow' && job.sourceRecordId) return;
    const repeat = text(job.values?.repeat);
    if (!repeat || /^none$/i.test(repeat)) return;
    const next = nextDate(job.values?.date, repeat);
    if (!next) return;
    const title = `${job.title || job.values?.client || 'Recurring job'} · ${next}`;
    const created = addRecord(records, 'jobs', title, { ...job.values, date: next, status: 'Draft', repeat: 'None', notes: `Next ${repeat.toLowerCase()} job prepared from recurring schedule. Set to one-off until owner confirms the pattern.` }, job.id);
    if (created) actions.push('Recurring job prepared next visit.');
    command({ key: `recurring:${job.id}:${next}`, title: 'Next recurring job prepared', sourcePage: 'jobs', linkedRecordId: job.id, confidence: 78, note: `Churvox prepared the next ${repeat.toLowerCase()} job for ${next}. Owner confirms if needed.` });
  });
}

function runOverdueInvoices(records, actions) {
  const today = new Date().toISOString().slice(0, 10);
  Object.values(records).filter((r) => r.page === 'invoices').forEach((invoice) => {
    const due = text(invoice.values?.due);
    const status = text(invoice.values?.status).toLowerCase();
    if (!due || due >= today || status.includes('paid')) return;
    command({ key: `overdue:${invoice.id}:${due}`, title: 'Overdue invoice follow-up prepared', sourcePage: 'invoices', linkedRecordId: invoice.id, confidence: 84, note: `Invoice due ${due} is not paid. Churvox prepared a follow-up; owner reviews before sending.` });
    actions.push('Overdue invoice follow-up prepared.');
  });
}

function runWorkerIssues(records, actions) {
  Object.values(records).filter((r) => r.page === 'workers' || r.page === 'messages').forEach((record) => {
    const body = `${record.values?.message || ''} ${record.values?.ownerNote || ''}`.toLowerCase();
    if (!/extra|locked|problem|issue|customer asked|unsafe|damage|angry|payment|invoice/.test(body)) return;
    command({ key: `field-issue:${record.id}`, title: 'Field issue needs owner decision', sourcePage: record.page, linkedRecordId: record.id, confidence: 72, note: 'Worker/client update contains a decision word. Churvox prepared it in Command.' });
    actions.push('Field issue prepared in Command.');
  });
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `#${PANEL_ID}{grid-column:1/-1!important;display:grid!important;gap:9px!important;border:1px solid rgba(16,21,19,.08)!important;border-radius:17px!important;background:#fff!important;box-shadow:0 12px 28px rgba(16,21,19,.05)!important;padding:12px!important;color:#111815!important}#${PANEL_ID} h3{margin:0!important;font:950 16px Inter,system-ui,sans-serif!important;color:#111815!important}#${PANEL_ID} p{margin:0!important;color:#52605a!important;font:850 12px Inter,system-ui,sans-serif!important;line-height:1.35!important}#${PANEL_ID} .chips{display:flex!important;gap:7px!important;flex-wrap:wrap!important}#${PANEL_ID} span{border-radius:999px!important;background:#f0f3ef!important;color:#111815!important;padding:6px 9px!important;font:950 10px Inter,system-ui,sans-serif!important}#${PANEL_ID} span.hot{background:#fff0e8!important;color:#b9381e!important}`;
  document.head.appendChild(style);
}

let lastPanelHtml = '';
function mount(actions) {
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  installStyle();
  let panel = document.getElementById(PANEL_ID);
  if (!panel) { panel = document.createElement('section'); panel.id = PANEL_ID; root.prepend(panel); lastPanelHtml = ''; }
  panel.removeAttribute('data-proper-hidden');
  const chips = (actions.length ? actions.slice(0,5) : ['No workflow changes needed on this pass']).map((x,i)=>`<span class="${i===0&&actions.length?'hot':''}">${esc(x)}</span>`).join('');
  const html = `<h3>Churvox workflow engine</h3><p>Connects pages into real admin flows: quote to job, job to invoice, recurring, overdue follow-up and field issues.</p><div class="chips">${chips}</div>`;
  if (html === lastPanelHtml) return;
  lastPanelHtml = html;
  panel.innerHTML = html;
}

let lastRecordSig = '';
function run() {
  const records = read(RECORD_KEY, {});
  const before = JSON.stringify(records);
  const actions = [];
  runQuoteToJob(records, actions);
  runJobToInvoice(records, actions);
  runRecurring(records, actions);
  runOverdueInvoices(records, actions);
  runWorkerIssues(records, actions);
  const after = JSON.stringify(records);
  if (after !== before && after !== lastRecordSig) {
    write(RECORD_KEY, records);
    lastRecordSig = after;
  }
  mount(actions);
  if (actions.length) dispatchEvent(new CustomEvent('churvox:owner-workflow-automation', { detail: actions }));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_WORKFLOW_AUTOMATION__) {
  window.__CHURVOX_OWNER_WORKFLOW_AUTOMATION__ = true;
  addEventListener('DOMContentLoaded', run);
  addEventListener('load', run);
  addEventListener('hashchange', () => setTimeout(run, 220));
  addEventListener('churvox:owner-record-api-synced', () => setTimeout(run, 450));
  addEventListener('churvox:owner-record-autofilled', () => setTimeout(run, 450));
  addEventListener('churvox:owner-backend-hydrated', () => setTimeout(run, 650));
  document.addEventListener('click', () => setTimeout(run, 900), true);
  setInterval(run, 10000);
  run();
}

export {};
