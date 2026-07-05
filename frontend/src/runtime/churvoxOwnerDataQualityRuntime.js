// Owner data quality radar.
// Finds duplicate/messy records and prepares clean Command items without repaint loops.

const RECORD_KEY = 'churvox.owner.records.v1';
const COMMAND_KEY = 'churvox.command.prepared.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';
const PANEL_ID = 'churvox-owner-data-quality-panel';
const STYLE_ID = 'churvox-owner-data-quality-style';

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function clean(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function esc(value) { return String(value || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

function timeline(event) {
  const list = read(TIMELINE_KEY, []);
  const key = `${event.type}:${event.recordId || ''}:${event.detail || ''}`;
  if (list.some((x) => x.key === key)) return;
  write(TIMELINE_KEY, [{ ...event, key, at: new Date().toISOString() }, ...list].slice(0, 140));
}

function command(issue) {
  const list = read(COMMAND_KEY, []).filter(Boolean);
  if (list.some((x) => x.key === issue.key && !/approved|parked/i.test(x.status || ''))) return false;
  const item = { id: `quality-${Date.now()}-${Math.random().toString(16).slice(2)}`, status: 'Waiting owner approval', issueType: 'data-quality', createdAt: new Date().toISOString(), ...issue };
  write(COMMAND_KEY, [item, ...list].slice(0, 45));
  timeline({ type: 'quality-prepared', recordId: item.linkedRecordId, page: item.sourcePage, title: item.title, detail: item.note });
  dispatchEvent(new CustomEvent('churvox:command-prepared', { detail: item }));
  return true;
}

function duplicateGroups(records, page, keyFn) {
  const groups = new Map();
  Object.values(records).filter((r) => r.page === page).forEach((r) => {
    const key = keyFn(r);
    if (!key) return;
    const arr = groups.get(key) || [];
    arr.push(r);
    groups.set(key, arr);
  });
  return Array.from(groups.entries()).filter(([, rows]) => rows.length > 1);
}

function runChecks(records) {
  const issues = [];
  duplicateGroups(records, 'clients', (r) => clean(r.values?.email || r.values?.name || r.title)).forEach(([key, rows]) => {
    const first = rows[0];
    issues.push({ key: `dup-client:${key}`, title: 'Possible duplicate client', sourcePage: 'clients', linkedRecordId: first.id, confidence: 76, note: `${rows.length} client records look similar. Churvox prepared a merge/review decision.` });
  });
  duplicateGroups(records, 'invoices', (r) => clean(r.values?.invoiceNo || `${r.values?.client} ${r.values?.amount}`)).forEach(([key, rows]) => {
    const first = rows[0];
    issues.push({ key: `dup-invoice:${key}`, title: 'Possible duplicate invoice', sourcePage: 'invoices', linkedRecordId: first.id, confidence: 70, note: `${rows.length} invoice records look similar. Review before sending or syncing.` });
  });
  Object.values(records).forEach((r) => {
    const v = r.values || {};
    if (r.page === 'clients' && !v.phone && !v.email) issues.push({ key: `client-contact:${r.id}`, title: 'Client missing contact details', sourcePage: 'clients', linkedRecordId: r.id, confidence: 64, note: 'Client has no phone or email. Churvox prepared this so future job/quote/invoice follow-up does not fail.' });
    if (r.page === 'jobs' && v.status === 'Completed' && !String(v.proof || '').trim()) issues.push({ key: `job-proof-missing:${r.id}`, title: 'Completed job missing proof', sourcePage: 'jobs', linkedRecordId: r.id, confidence: 62, note: 'Job is completed but proof is missing. Review before invoice draft.' });
    if (r.page === 'invoices' && !String(v.sync || '').toLowerCase().includes('draft')) issues.push({ key: `invoice-sync-guard:${r.id}`, title: 'Invoice sync guard missing', sourcePage: 'invoices', linkedRecordId: r.id, confidence: 58, note: 'Invoice record does not clearly say draft sync only. Add guardrail before accounting handoff.' });
    if (r.page === 'invoices' && !String(v.paidRule || '').toLowerCase().includes('refresh')) issues.push({ key: `invoice-paid-guard:${r.id}`, title: 'Paid-status guard missing', sourcePage: 'invoices', linkedRecordId: r.id, confidence: 58, note: 'Invoice does not clearly say paid only after accounting refresh confirms paid.' });
    if (r.page === 'quotes' && !v.total) issues.push({ key: `quote-total:${r.id}`, title: 'Quote missing total', sourcePage: 'quotes', linkedRecordId: r.id, confidence: 66, note: 'Quote has no total. Churvox prepared this before it can be sent or converted.' });
    if (r.page === 'workers' && /complete/i.test(String(v.status || '')) && !String(v.proof || '').trim()) issues.push({ key: `worker-proof:${r.id}`, title: 'Worker completion missing proof', sourcePage: 'workers', linkedRecordId: r.id, confidence: 62, note: 'Worker marked work complete but proof is missing or unclear.' });
  });
  issues.slice(0, 10).forEach(command);
  return issues;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `#${PANEL_ID}{grid-column:1/-1!important;display:grid!important;gap:9px!important;border:1px solid rgba(239,85,60,.14)!important;border-radius:17px!important;background:#fff7f0!important;padding:12px!important;color:#111815!important;min-height:154px!important;contain:layout paint!important}#${PANEL_ID} h3{margin:0!important;font:950 16px Inter,system-ui,sans-serif!important}#${PANEL_ID} p{margin:0!important;color:#52605a!important;font:850 12px Inter,system-ui,sans-serif!important}#${PANEL_ID} .rows{display:grid!important;gap:7px!important;max-height:180px!important;overflow:auto!important;scrollbar-gutter:stable!important}#${PANEL_ID} .row{display:grid!important;grid-template-columns:1fr auto!important;gap:8px!important;border:1px solid rgba(16,21,19,.07)!important;border-radius:12px!important;background:#fff!important;padding:9px!important;min-height:51px!important}#${PANEL_ID} b{display:block!important;font-size:12px!important;font-weight:950!important}#${PANEL_ID} span{display:block!important;color:#52605a!important;font-size:10px!important;font-weight:850!important}#${PANEL_ID} em{font-style:normal!important;border-radius:999px!important;background:#fff0e8!important;color:#b9381e!important;padding:5px 7px!important;font-size:9px!important;font-weight:950!important;text-transform:uppercase!important}`;
  document.head.appendChild(style);
}

let lastHtml = '';
function mount(issues) {
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  installStyle();
  let panel = document.getElementById(PANEL_ID);
  if (!panel) { panel = document.createElement('section'); panel.id = PANEL_ID; root.appendChild(panel); lastHtml = ''; }
  panel.removeAttribute('data-proper-hidden');
  panel.removeAttribute('data-core-hidden');
  panel.removeAttribute('data-lite-hidden');
  const bodyRows = issues.length ? issues.slice(0, 6).map((x) => `<div class="row"><span><b>${esc(x.title)}</b>${esc(x.note)}</span><em>${esc(x.sourcePage)}</em></div>`) : [`<div class="row"><span><b>Data quality clear</b>No duplicate or unsafe records found on this pass.</span><em>clear</em></div>`];
  while (bodyRows.length < 2) bodyRows.push('<div class="row" aria-hidden="true"><span><b>&nbsp;</b>&nbsp;</span><em>&nbsp;</em></div>');
  const rows = bodyRows.join('');
  const html = `<h3>Data quality radar</h3><p>Checks duplicates, missing contact info, proof gaps and money/accounting guardrails.</p><div class="rows">${rows}</div>`;
  if (html === lastHtml) return;
  lastHtml = html;
  panel.innerHTML = html;
}

let lastIssueSig = '';
function run() {
  const records = read(RECORD_KEY, {});
  const issues = runChecks(records);
  const sig = JSON.stringify(issues.map((x) => x.key).sort());
  mount(issues);
  if (issues.length && sig !== lastIssueSig) {
    lastIssueSig = sig;
    dispatchEvent(new CustomEvent('churvox:owner-data-quality', { detail: issues }));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_DATA_QUALITY__) {
  window.__CHURVOX_OWNER_DATA_QUALITY__ = true;
  addEventListener('load', () => setTimeout(run, 2200));
  addEventListener('hashchange', () => setTimeout(run, 1400));
  addEventListener('churvox:owner-backend-hydrated', () => setTimeout(run, 500));
  addEventListener('churvox:owner-record-api-synced', () => setTimeout(run, 800));
  addEventListener('churvox:owner-workflow-automation', () => setTimeout(run, 900));
  document.addEventListener('click', () => setTimeout(run, 1000), true);
  setInterval(run, 15000);
}

export {};
