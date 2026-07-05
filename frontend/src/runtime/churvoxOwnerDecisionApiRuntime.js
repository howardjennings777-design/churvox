// Owner decision API bridge.
// Sends Command approve/edit/park decisions to backend decision endpoint.

const COMMAND_KEY = 'churvox.command.prepared.v1';
const SENT_KEY = 'churvox.owner.decisionApi.sent.v1';
const URL = '/api/owner-record-engine/command/decision';

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function isDecision(status) { return /approved by owner|editing in command|parked by owner/i.test(String(status || '')); }

let busy = false;
async function run() {
  if (busy) return;
  busy = true;
  try {
    const sent = read(SENT_KEY, {});
    const command = read(COMMAND_KEY, []).filter(Boolean);
    for (const item of command) {
      if (!isDecision(item.status)) continue;
      const key = `${item.id || item.key}:${item.status}:${item.linkedRecordId || ''}`;
      if (sent[key]) continue;
      try {
        const res = await fetch(URL, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.command_key || item.key || item.id,
            commandId: item.command_key || item.key || item.id,
            linkedRecordId: item.linkedRecordId,
            status: item.status,
            note: item.note || '',
          }),
        });
        if (res.ok) sent[key] = new Date().toISOString();
      } catch (_) {}
    }
    write(SENT_KEY, sent);
  } finally {
    busy = false;
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_DECISION_API__) {
  window.__CHURVOX_OWNER_DECISION_API__ = true;
  addEventListener('churvox:owner-decision-applied', () => setTimeout(run, 400));
  addEventListener('churvox:command-prepared', () => setTimeout(run, 1200));
  document.addEventListener('click', () => setTimeout(run, 700), true);
  setInterval(run, 9000);
  run();
}

export {};
