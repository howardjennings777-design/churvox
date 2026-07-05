// Owner decision effects.
// Applies Command decisions back to linked records and stores an audit timeline.

const RECORD_KEY = 'churvox.owner.records.v1';
const COMMAND_KEY = 'churvox.command.prepared.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

function timeline(event) {
  const list = read(TIMELINE_KEY, []);
  const key = `${event.type}:${event.recordId}:${event.status || ''}`;
  if (list.some((x) => x.key === key)) return;
  write(TIMELINE_KEY, [{ ...event, key, at: new Date().toISOString() }, ...list].slice(0, 100));
}

function isDecision(status) {
  return /approved by owner|editing in command|parked by owner/i.test(String(status || ''));
}

function applyStatus(record, status) {
  record.ownerDecision = status;
  record.decisionAt = new Date().toISOString();
  record.values = record.values || {};
  if (/approved/i.test(status)) {
    record.values.ownerApproval = 'Approved by owner';
    if (record.page === 'invoices') record.values.status = 'Ready for review';
    if (record.page === 'quotes') record.values.status = 'Ready for review';
    if (record.page === 'jobs') record.values.status = record.values.status || 'Assigned';
  }
  if (/editing/i.test(status)) record.values.ownerApproval = 'Editing in Command';
  if (/parked/i.test(status)) record.values.ownerApproval = 'Parked by owner';
}

function run() {
  const records = read(RECORD_KEY, {});
  const command = read(COMMAND_KEY, []).filter(Boolean);
  let changed = false;
  command.forEach((item) => {
    if (!item?.linkedRecordId || !isDecision(item.status)) return;
    const record = records[item.linkedRecordId];
    if (!record || record.ownerDecision === item.status) return;
    applyStatus(record, item.status);
    timeline({ type: 'owner-decision-applied', recordId: record.id, page: record.page, title: record.title, status: item.status });
    changed = true;
  });
  if (changed) {
    write(RECORD_KEY, records);
    dispatchEvent(new CustomEvent('churvox:owner-decision-applied', { detail: records }));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_DECISION_EFFECTS__) {
  window.__CHURVOX_OWNER_DECISION_EFFECTS__ = true;
  addEventListener('DOMContentLoaded', run);
  addEventListener('load', run);
  addEventListener('hashchange', () => setTimeout(run, 100));
  addEventListener('churvox:command-prepared', () => setTimeout(run, 120));
  document.addEventListener('click', () => setTimeout(run, 300), true);
  setInterval(run, 1000);
  run();
}

export {};
