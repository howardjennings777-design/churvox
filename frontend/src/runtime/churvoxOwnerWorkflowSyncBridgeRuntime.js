// Workflow sync bridge.
// Triggers backend record-engine sync after automation creates jobs/invoices/Command items.

const RECORD_KEY = 'churvox.owner.records.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';
const RADAR_KEY = 'churvox.owner.adminDebt.v1';
const COMMAND_KEY = 'churvox.command.prepared.v1';
const BASE = '/api/owner-record-engine';

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }

function payload() {
  const records = read(RECORD_KEY, {});
  return {
    records: Object.values(records || {}).filter(Boolean),
    timeline: read(TIMELINE_KEY, []).filter(Boolean),
    admin_debt: read(RADAR_KEY, []).filter(Boolean),
    command: read(COMMAND_KEY, []).filter(Boolean),
  };
}

let busy = false;
async function syncWorkflow() {
  if (busy) return;
  busy = true;
  try {
    await fetch(`${BASE}/bulk-sync`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    });
    dispatchEvent(new CustomEvent('churvox:owner-workflow-synced'));
  } catch (_) {
    // Backend unavailable: local workflow records remain saved locally.
  } finally {
    busy = false;
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_WORKFLOW_SYNC_BRIDGE__) {
  window.__CHURVOX_OWNER_WORKFLOW_SYNC_BRIDGE__ = true;
  import('./churvoxOwnerBackendHydrationRuntime').catch(() => {});
  import('./churvoxOwnerDecisionApiRuntime').catch(() => {});
  import('./churvoxOwnerDataQualityRuntime').catch(() => {});
  addEventListener('churvox:owner-workflow-automation', () => setTimeout(syncWorkflow, 700));
  addEventListener('churvox:command-prepared', () => setTimeout(syncWorkflow, 1200));
  addEventListener('churvox:owner-backend-hydrated', () => setTimeout(syncWorkflow, 1400));
  addEventListener('churvox:owner-data-quality', () => setTimeout(syncWorkflow, 1500));
}

export {};
