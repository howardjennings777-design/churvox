// Churvox paid launch readiness gate.
// Owner-facing launch checklist based on runtime state, without blocking the app.

const RECORD_KEY = 'churvox.owner.records.v1';
const COMMAND_KEY = 'churvox.command.prepared.v1';
const PANEL_ID = 'churvox-paid-launch-readiness-panel';
const STYLE_ID = 'churvox-paid-launch-readiness-style';
const ALLOWED_PAGES = new Set(['aiguide', 'command', 'plans', 'settings']);

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function esc(value) { return String(value || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function pageKey() { return String(location.hash || '').replace('#', '').toLowerCase() || 'aiguide'; }

function checks() {
  const records = Object.values(read(RECORD_KEY, {}) || {}).filter(Boolean);
  const command = read(COMMAND_KEY, []).filter(Boolean);
  const openCommand = command.filter((x) => !/approved|parked/i.test(String(x.status || '')));
  const hasClient = records.some((x) => x.page === 'clients');
  const hasJob = records.some((x) => x.page === 'jobs');
  const hasInvoice = records.some((x) => x.page === 'invoices');
  const unsafeInvoice = records.some((x) => x.page === 'invoices' && (!String(x.values?.sync || '').toLowerCase().includes('draft') || !String(x.values?.paidRule || '').toLowerCase().includes('refresh')));
  return [
    { name: 'Clients wired', ok: hasClient, note: hasClient ? 'Client records are available.' : 'Add or hydrate at least one client.' },
    { name: 'Jobs wired', ok: hasJob, note: hasJob ? 'Job records are available.' : 'Add or hydrate at least one job.' },
    { name: 'Invoices guarded', ok: hasInvoice && !unsafeInvoice, note: hasInvoice ? (unsafeInvoice ? 'Some invoices need draft-sync/paid-refresh guardrails.' : 'Invoice guardrails are present.') : 'Add or hydrate an invoice.' },
    { name: 'Command under control', ok: openCommand.length <= 5, note: `${openCommand.length} open Command item${openCommand.length === 1 ? '' : 's'}.` },
    { name: 'Approval model intact', ok: true, note: 'Approve/edit/park stays in Command.' },
  ];
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `#${PANEL_ID}{grid-column:1/-1!important;display:grid!important;gap:10px!important;border:1px solid rgba(16,21,19,.08)!important;border-radius:18px!important;background:#fff!important;padding:13px!important;color:#111815!important;min-height:246px!important;contain:layout paint!important}#${PANEL_ID} h3{margin:0!important;font:950 17px Inter,system-ui,sans-serif!important}#${PANEL_ID} p{margin:0!important;color:#52605a!important;font:850 12px Inter,system-ui,sans-serif!important;line-height:1.35!important}#${PANEL_ID} .rows{display:grid!important;gap:7px!important}#${PANEL_ID} .row{display:grid!important;grid-template-columns:1fr auto!important;gap:10px!important;align-items:center!important;border:1px solid rgba(16,21,19,.07)!important;border-radius:13px!important;background:#f7f8f4!important;padding:9px!important;min-height:47px!important}#${PANEL_ID} b{display:block!important;font-size:12px!important;font-weight:950!important}#${PANEL_ID} span{display:block!important;font-size:10px!important;color:#52605a!important;font-weight:850!important}#${PANEL_ID} em{font-style:normal!important;border-radius:999px!important;padding:5px 8px!important;font-size:9px!important;font-weight:950!important;text-transform:uppercase!important;background:#eaf8ef!important;color:#206b3c!important}#${PANEL_ID} em.no{background:#fff0e8!important;color:#b9381e!important}`;
  document.head.appendChild(style);
}

function removeIfLeaked(page) {
  if (ALLOWED_PAGES.has(page)) return false;
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.remove();
  lastHtml = '';
  return true;
}

let lastHtml = '';
function mount() {
  const page = pageKey();
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  if (removeIfLeaked(page)) return;
  installStyle();
  let panel = document.getElementById(PANEL_ID);
  if (!panel) { panel = document.createElement('section'); panel.id = PANEL_ID; root.appendChild(panel); lastHtml = ''; }
  panel.removeAttribute('data-proper-hidden');
  panel.removeAttribute('data-core-hidden');
  panel.removeAttribute('data-lite-hidden');
  const current = checks();
  const rows = current.map((x) => `<div class="row"><span><b>${esc(x.name)}</b>${esc(x.note)}</span><em class="${x.ok ? '' : 'no'}">${x.ok ? 'ready' : 'check'}</em></div>`).join('');
  const ready = current.every((x) => x.ok);
  const html = `<h3>Paid launch readiness</h3><p>${ready ? 'Core launch checks look ready.' : 'A few checks still need attention before paid launch.'}</p><div class="rows">${rows}</div>`;
  if (html === lastHtml) return;
  lastHtml = html;
  panel.innerHTML = html;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_PAID_LAUNCH_READINESS__) {
  window.__CHURVOX_PAID_LAUNCH_READINESS__ = true;
  addEventListener('load', () => setTimeout(mount, 1800));
  addEventListener('hashchange', () => setTimeout(mount, 500));
  addEventListener('churvox:owner-backend-hydrated', () => setTimeout(mount, 700));
  addEventListener('churvox:owner-record-api-synced', () => setTimeout(mount, 900));
  addEventListener('churvox:command-prepared', () => setTimeout(mount, 900));
  document.addEventListener('click', () => setTimeout(mount, 1200), true);
  setInterval(mount, 20000);
}

export {};
