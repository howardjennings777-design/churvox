// Recurring workflow guard.
// Prevents workflow-created future jobs from endlessly generating more future jobs.

const RECORD_KEY = 'churvox.owner.records.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

function timeline(event) {
  const list = read(TIMELINE_KEY, []);
  const key = `${event.type}:${event.recordId}:${event.detail || ''}`;
  if (list.some((x) => x.key === key)) return;
  write(TIMELINE_KEY, [{ ...event, key, at: new Date().toISOString() }, ...list].slice(0, 120));
}

function run() {
  const records = read(RECORD_KEY, {});
  let changed = false;
  Object.values(records).forEach((record) => {
    if (!record || record.page !== 'jobs' || record.source !== 'churvox-workflow') return;
    const note = String(record.values?.notes || '').toLowerCase();
    if (!note.includes('recurring') && !record.sourceRecordId) return;
    if (String(record.values?.repeat || '').toLowerCase() === 'none') return;
    record.values = { ...(record.values || {}), repeat: 'None' };
    record.recurringGuarded = true;
    record.updatedAt = new Date().toISOString();
    timeline({ type: 'recurring-guarded', recordId: record.id, page: 'jobs', title: record.title, detail: 'Generated future job set to one-off so it does not create an endless chain.' });
    changed = true;
  });
  if (changed) {
    write(RECORD_KEY, records);
    dispatchEvent(new CustomEvent('churvox:owner-recurring-guarded', { detail: records }));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_RECURRING_GUARD__) {
  window.__CHURVOX_OWNER_RECURRING_GUARD__ = true;
  addEventListener('DOMContentLoaded', run);
  addEventListener('load', run);
  addEventListener('churvox:owner-workflow-automation', () => setTimeout(run, 150));
  addEventListener('churvox:owner-record-api-synced', () => setTimeout(run, 180));
  setInterval(run, 1200);
  run();
}

export {};
