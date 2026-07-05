// Owner record engine API sync.
// Stable launch version: sync quietly and only emit when local state actually changes.

const RECORD_KEY = 'churvox.owner.records.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';
const RADAR_KEY = 'churvox.owner.adminDebt.v1';
const COMMAND_KEY = 'churvox.command.prepared.v1';
const BASE = '/api/owner-record-engine';

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function sig(value) { try { return JSON.stringify(value); } catch (_) { return ''; } }

function payload() {
  const records = read(RECORD_KEY, {});
  return { records: Object.values(records || {}).filter(Boolean), timeline: read(TIMELINE_KEY, []).filter(Boolean), admin_debt: read(RADAR_KEY, []).filter(Boolean), command: read(COMMAND_KEY, []).filter(Boolean) };
}

function mergeRecords(rows) {
  if (!Array.isArray(rows) || !rows.length) return false;
  const current = read(RECORD_KEY, {});
  const before = sig(current);
  rows.forEach((row) => {
    const id = row.record_id || row.id || row.recordId;
    if (!id) return;
    current[id] = { ...current[id], ...row, id };
  });
  if (sig(current) === before) return false;
  write(RECORD_KEY, current);
  return true;
}

function mergeList(key, rows, idKey) {
  if (!Array.isArray(rows) || !rows.length) return false;
  const current = read(key, []).filter(Boolean);
  const before = sig(current);
  const seen = new Set(current.map((x) => String(x[idKey] || x.key || x.id || '')));
  rows.forEach((row) => {
    const id = String(row[idKey] || row.key || row.id || '');
    if (!seen.has(id)) current.unshift(row);
  });
  if (sig(current) === before) return false;
  write(key, current.slice(0, 120));
  return true;
}

async function pull() {
  const res = await fetch(`${BASE}/state`, { credentials: 'include' });
  if (!res.ok) return false;
  const data = await res.json();
  if (!data?.success) return false;
  const changed = [
    mergeRecords(data.records || []),
    mergeList(TIMELINE_KEY, data.timeline || [], 'timeline_key'),
    mergeList(RADAR_KEY, data.admin_debt || [], 'debt_key'),
    mergeList(COMMAND_KEY, data.command || [], 'command_key'),
  ].some(Boolean);
  return changed;
}

let lastPushSig = '';
async function push() {
  const body = payload();
  if (!body.records.length && !body.timeline.length && !body.admin_debt.length && !body.command.length) return false;
  const bodySig = sig(body);
  if (bodySig === lastPushSig) return false;
  const res = await fetch(`${BASE}/bulk-sync`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (res.ok) lastPushSig = bodySig;
  return res.ok;
}

let busy = false;
async function sync(reason = 'auto') {
  if (busy) return;
  busy = true;
  try {
    const pulledChanged = await pull();
    const pushed = await push();
    if (pulledChanged || pushed) dispatchEvent(new CustomEvent('churvox:owner-record-api-synced', { detail: { reason } }));
  } catch (_) {
    // local runtime remains source of truth if backend is unavailable
  } finally {
    busy = false;
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_RECORD_ENGINE_API_SYNC__) {
  window.__CHURVOX_OWNER_RECORD_ENGINE_API_SYNC__ = true;
  addEventListener('load', () => setTimeout(() => sync('load'), 1600));
  addEventListener('hashchange', () => setTimeout(() => sync('page'), 2200));
  addEventListener('churvox:command-prepared', () => setTimeout(() => sync('command'), 1200));
  addEventListener('churvox:owner-record-autofilled', () => setTimeout(() => sync('autofill'), 1400));
  addEventListener('churvox:owner-decision-applied', () => setTimeout(() => sync('decision'), 1400));
  addEventListener('churvox:owner-data-quality', () => setTimeout(() => sync('quality'), 2000));
  document.addEventListener('click', () => setTimeout(() => sync('click'), 3500), true);
  setInterval(() => sync('interval'), 60000);
}

export {};
