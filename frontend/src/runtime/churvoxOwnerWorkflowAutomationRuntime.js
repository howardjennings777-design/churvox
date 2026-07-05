// Churvox owner workflow automation.
// Runs quiet admin preparation without showing a moving panel.

const RECORD_KEY = 'churvox.owner.records.v1';
const COMMAND_KEY = 'churvox.command.prepared.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';
const PANEL_ID = 'churvox-owner-workflow-automation-panel';

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function text(value) { return String(value || '').trim(); }
function norm(value) { return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70); }

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

function runQuoteToJob(records) {
  Object.values(records).filter((r) => r.page === 'quotes').forEach((quote) => {
    const status = text(quote.values?.status).toLowerCase();
    if (!status.includes('accepted')) return;
    const title = `Job from ${quote.values?.quoteNo || quote.title || 'accepted quote'}`;
    addRecord(records, 'jobs', title, { client: quote.values?.client || '', site: quote.values?.address || '', worker: '', date: '', time: '', status: 'Draft', priceType: quote.values?.priceType || 'Fixed', price: quote.values?.total || '', repeat: 'None', scope: quote.values?.scope || '', notes: 'Created from accepted quote. Missing schedule details are highlighted in Command.' }, quote.id);
    command({ key: `quote-to-job:${quote.id}`, title: 'Accepted quote prepared as job', sourcePage: 'quotes', linkedRecordId: quote.id, confidence: 82, note: 'Quote is accepted. Churvox prepared the job and highlighted schedule/worker decisions in Command.' });
  });
}

function runJobToInvoice(records) {
  Object.values(records).filter((r) => r.page === 'jobs').forEach((job) => {
    const status = text(job.values?.status).toLowerCase();
    const proof = text(job.values?.proof || job.values?.proofStatus || job.values?.notes).toLowerCase();
    if (!status.includes('completed')) return;
    if (!proof.includes('upload') && !proof.includes('photo') && !proof.includes('proof')) {
      command({ key: `job-proof:${job.id}`, title: 'Completed job proof highlighted', sourcePage: 'jobs', linkedRecordId: job.id, confidence: 68, note: 'Job is completed but proof is unclear. Churvox highlighted it in Command before invoice approval.' });
      return;
    }
    const title = `Invoice from ${job.title || job.values?.client || 'completed job'}`;
    addRecord(records, 'invoices', title, { client: job.values?.client || '', invoiceNo: `DRAFT-${Date.now().toString().slice(-6)}`, job: job.title || '', status: 'Draft', amount: job.values?.price || '', due: '', sync: 'Draft sync only', paidRule: 'Only mark paid after accounting refresh confirms paid', lineItems: job.values?.scope || '' }, job.id);
    command({ key: `job-invoice:${job.id}`, title: 'Draft invoice prepared from job', sourcePage: 'jobs', linkedRecordId: job.id, confidence: 88, note: 'Churvox prepared the draft invoice. Owner approves in Command before sending or syncing.' });
  });
}

function runRecurring(records) {
  Object.values(records).filter((r) => r.page === 'jobs').forEach((job) => {
    if (job.source === 'churvox-workflow' && job.sourceRecordId) return;
    const repeat = text(job.values?.repeat);
    if (!repeat || /^none$/i.test(repeat)) return;
    const next = nextDate(job.values?.date, repeat);
    if (!next) return;
    const title = `${job.title || job.values?.client || 'Recurring job'} · ${next}`;
    addRecord(records, 'jobs', title, { ...job.values, date: next, status: 'Draft', repeat: 'None', notes: `Next ${repeat.toLowerCase()} job prepared from recurring schedule.` }, job.id);
    command({ key: `recurring:${job.id}:${next}`, title: 'Next recurring job prepared', sourcePage: 'jobs', linkedRecordId: job.id, confidence: 78, note: `Churvox prepared the next ${repeat.toLowerCase()} job for ${next}. Any uncertainty is highlighted in Command.` });
  });
}

function runOverdueInvoices(records) {
  const today = new Date().toISOString().slice(0, 10);
  Object.values(records).filter((r) => r.page === 'invoices').forEach((invoice) => {
    const due = text(invoice.values?.due);
    const status = text(invoice.values?.status).toLowerCase();
    if (!due || due >= today || status.includes('paid')) return;
    command({ key: `overdue:${invoice.id}:${due}`, title: 'Overdue invoice follow-up prepared', sourcePage: 'invoices', linkedRecordId: invoice.id, confidence: 84, note: `Invoice due ${due} is not paid. Churvox prepared the follow-up for owner approval in Command.` });
  });
}

function runWorkerIssues(records) {
  Object.values(records).filter((r) => r.page === 'workers' || r.page === 'messages').forEach((record) => {
    const body = `${record.values?.message || ''} ${record.values?.ownerNote || ''}`.toLowerCase();
    if (!/extra|locked|problem|issue|customer asked|unsafe|damage|angry|payment|invoice/.test(body)) return;
    command({ key: `field-issue:${record.id}`, title: 'Field issue prepared for owner decision', sourcePage: record.page, linkedRecordId: record.id, confidence: 72, note: 'Worker/client update contains a decision word. Churvox prepared it in Command.' });
  });
}

let lastRecordSig = '';
function run() {
  document.getElementById(PANEL_ID)?.remove();
  const records = read(RECORD_KEY, {});
  const before = JSON.stringify(records);
  runQuoteToJob(records);
  runJobToInvoice(records);
  runRecurring(records);
  runOverdueInvoices(records);
  runWorkerIssues(records);
  const after = JSON.stringify(records);
  if (after !== before && after !== lastRecordSig) {
    write(RECORD_KEY, records);
    lastRecordSig = after;
  }
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