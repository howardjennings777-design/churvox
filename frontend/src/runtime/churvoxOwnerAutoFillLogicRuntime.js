// Churvox owner autofill logic.
// Fills safe details from existing records before unresolved work reaches Command.

const RECORD_KEY = 'churvox.owner.records.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function empty(value) { return value == null || String(value).trim() === '' || /^none$|^draft$|^n\/a$/i.test(String(value).trim()); }
function norm(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

function timeline(event) {
  const list = read(TIMELINE_KEY, []);
  const key = `${event.type}:${event.recordId}:${event.field || ''}:${event.detail || ''}`;
  if (list.some((x) => x.key === key)) return;
  write(TIMELINE_KEY, [{ ...event, key, at: new Date().toISOString() }, ...list].slice(0, 100));
}

function clientFor(records, name) {
  const target = norm(name);
  if (!target) return null;
  return Object.values(records).find((r) => r.page === 'clients' && (norm(r.values?.name) === target || norm(r.title) === target || target.includes(norm(r.values?.name)))) || null;
}

function jobFor(records, text) {
  const target = norm(text);
  if (!target) return null;
  return Object.values(records).find((r) => r.page === 'jobs' && (norm(r.title) === target || norm(r.values?.scope).includes(target) || target.includes(norm(r.title)))) || null;
}

function setFrom(record, field, value, reason) {
  if (!record || !empty(record.values?.[field]) || empty(value)) return false;
  record.values = { ...(record.values || {}), [field]: value };
  record.autofilled = record.autofilled || [];
  record.autofilled.push({ field, reason, at: new Date().toISOString() });
  timeline({ type: 'autofilled', recordId: record.id, page: record.page, title: record.title, field, detail: reason });
  return true;
}

function fillJob(records, job) {
  const client = clientFor(records, job.values?.client);
  if (!client) return false;
  let changed = false;
  changed = setFrom(job, 'site', client.values?.address, 'Filled address from client file') || changed;
  changed = setFrom(job, 'price', client.values?.defaultPrice, 'Filled price from client saved price') || changed;
  changed = setFrom(job, 'repeat', client.values?.frequency, 'Filled repeat from client preference') || changed;
  changed = setFrom(job, 'notes', client.values?.access, 'Filled access notes from client memory') || changed;
  return changed;
}

function fillInvoice(records, invoice) {
  const job = jobFor(records, invoice.values?.job || invoice.title);
  let changed = false;
  if (job) {
    changed = setFrom(invoice, 'client', job.values?.client, 'Filled client from linked job') || changed;
    changed = setFrom(invoice, 'amount', job.values?.price, 'Filled amount from linked job price') || changed;
    changed = setFrom(invoice, 'lineItems', job.values?.scope, 'Filled line items from job scope') || changed;
  }
  if (empty(invoice.values?.due)) {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    changed = setFrom(invoice, 'due', d.toISOString().slice(0, 10), 'Filled due date as 14 days from today') || changed;
  }
  changed = setFrom(invoice, 'sync', 'Draft sync only', 'Filled accounting sync guardrail') || changed;
  changed = setFrom(invoice, 'paidRule', 'Only mark paid after accounting refresh confirms paid', 'Filled paid-status guardrail') || changed;
  return changed;
}

function fillQuote(records, quote) {
  const client = clientFor(records, quote.values?.client);
  if (!client) return false;
  let changed = false;
  changed = setFrom(quote, 'total', client.values?.defaultPrice, 'Filled quote total from client saved price') || changed;
  changed = setFrom(quote, 'followUp', 'Prepare a follow-up if no reply after 3 days', 'Filled safe follow-up rule') || changed;
  return changed;
}

function run() {
  const records = read(RECORD_KEY, {});
  let changed = false;
  Object.values(records).forEach((record) => {
    if (!record || !record.values) return;
    const before = JSON.stringify(record.values || {});
    if (record.page === 'jobs') fillJob(records, record);
    if (record.page === 'invoices') fillInvoice(records, record);
    if (record.page === 'quotes') fillQuote(records, record);
    if (JSON.stringify(record.values || {}) !== before) { record.updatedAt = new Date().toISOString(); changed = true; }
  });
  if (changed) {
    write(RECORD_KEY, records);
    dispatchEvent(new CustomEvent('churvox:owner-record-autofilled', { detail: records }));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_AUTOFILL_LOGIC__) {
  window.__CHURVOX_OWNER_AUTOFILL_LOGIC__ = true;
  addEventListener('DOMContentLoaded', run);
  addEventListener('load', run);
  addEventListener('hashchange', () => setTimeout(run, 150));
  addEventListener('churvox:command-prepared', () => setTimeout(run, 150));
  addEventListener('churvox:owner-record-autofilled', () => setTimeout(run, 350));
  document.addEventListener('click', () => setTimeout(run, 350), true);
  setInterval(run, 1400);
  run();
}

export {};
