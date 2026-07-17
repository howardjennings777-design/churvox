import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_HQ_ASSISTANT_DRAFT_IMPORT_RUNTIME__';
const VERSION = 'churvox-hq-outreach-navigation-repair-v1-20260717';
const BUTTON_ID = 'churvox-hq-assistant-draft-import-button';
const ROOT_ID = 'churvox-hq-assistant-draft-import-root';
const STYLE_ID = 'churvox-hq-assistant-draft-import-style';
const OUTREACH_BUTTON_ID = 'churvox-hq-tester-outreach-button';
const OUTREACH_ROOT_ID = 'churvox-hq-tester-outreach-root';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');
const MAX_BATCH = 25;

const state = {
  open: false,
  busy: false,
  raw: '',
  parsed: [],
  parseError: '',
  notice: '',
  noticeTone: 'plain',
  fileName: '',
  result: null,
};

let importButton = null;
let outreachButton = null;
let repairQueued = false;

function lower(value) { return String(value || '').trim().toLowerCase(); }

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage', '/admin/qa-auditor', '/platform'].includes(path);
}

function authToken() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

function headers() {
  const token = authToken();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: headers(),
    body: JSON.stringify(payload || {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(body?.detail || body?.message || body?.error || `HTTP ${response.status}`);
  }
  return body;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID},#${OUTREACH_BUTTON_ID}{position:relative}
    #${ROOT_ID}{position:fixed;inset:0;z-index:2147482500;display:none;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a}
    #${ROOT_ID}.open{display:block}
    #${ROOT_ID} .adiBackdrop{position:absolute;inset:0;background:rgba(2,6,23,.74);backdrop-filter:blur(5px)}
    #${ROOT_ID} .adiShell{position:absolute;width:min(760px,calc(100vw - 28px));max-height:calc(100vh - 28px);left:50%;top:50%;transform:translate(-50%,-50%);background:#f8fafc;border:1px solid rgba(255,255,255,.18);border-radius:22px;overflow:hidden;box-shadow:0 30px 90px rgba(2,6,23,.5);display:grid;grid-template-rows:auto 1fr}
    #${ROOT_ID} .adiHead{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:18px 20px;background:linear-gradient(120deg,#020617,#111827 65%,#ea580c 160%);color:#fff}
    #${ROOT_ID} .adiHead small{display:block;color:#fdba74;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.11em}
    #${ROOT_ID} .adiHead h2{margin:5px 0 4px;font-size:24px;letter-spacing:-.04em}
    #${ROOT_ID} .adiHead p{margin:0;max-width:580px;color:#cbd5e1;font-size:12px;font-weight:750;line-height:1.45}
    #${ROOT_ID} button{font:inherit}
    #${ROOT_ID} .adiClose{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.1);color:#fff;border-radius:11px;padding:8px 11px;font-weight:950;cursor:pointer}
    #${ROOT_ID} .adiBody{overflow:auto;padding:16px;display:grid;gap:12px}
    #${ROOT_ID} .adiGuard{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
    #${ROOT_ID} .adiGuard span{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:9px;text-align:center;font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;color:#475569}
    #${ROOT_ID} .adiGuard span:first-child{background:#f0fdf4;border-color:#86efac;color:#166534}
    #${ROOT_ID} .adiCard{background:#fff;border:1px solid #e2e8f0;border-radius:17px;padding:14px;box-shadow:0 8px 24px rgba(15,23,42,.055)}
    #${ROOT_ID} .adiCard h3{margin:0 0 4px;font-size:16px}
    #${ROOT_ID} .adiCard p{margin:0 0 11px;color:#64748b;font-size:11px;font-weight:750;line-height:1.45}
    #${ROOT_ID} .adiFile{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
    #${ROOT_ID} .adiFile label,#${ROOT_ID} .adiButton{border:0;border-radius:11px;padding:9px 12px;background:#e2e8f0;color:#0f172a;font-size:11px;font-weight:950;cursor:pointer}
    #${ROOT_ID} .adiFile input{display:none}
    #${ROOT_ID} .adiFileName{color:#475569;font-size:11px;font-weight:800}
    #${ROOT_ID} textarea{width:100%;box-sizing:border-box;min-height:220px;resize:vertical;border:1px solid #cbd5e1;border-radius:12px;padding:11px;background:#fff;color:#0f172a;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;outline:none}
    #${ROOT_ID} textarea:focus{border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.12)}
    #${ROOT_ID} .adiStatus{border:1px solid #cbd5e1;background:#f8fafc;border-radius:12px;padding:10px 12px;font-size:11px;font-weight:850;color:#475569}
    #${ROOT_ID} .adiStatus.good{border-color:#86efac;background:#f0fdf4;color:#166534}
    #${ROOT_ID} .adiStatus.bad{border-color:#fecaca;background:#fef2f2;color:#991b1b}
    #${ROOT_ID} .adiActions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
    #${ROOT_ID} .adiButton.primary{background:#f97316;color:#111827}
    #${ROOT_ID} .adiButton.dark{background:#0f172a;color:#fff}
    #${ROOT_ID} .adiButton:disabled{opacity:.55;cursor:not-allowed}
    #${ROOT_ID} .adiResult{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
    #${ROOT_ID} .adiResult div{border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:10px;text-align:center}
    #${ROOT_ID} .adiResult b{display:block;font-size:20px}
    #${ROOT_ID} .adiResult span{display:block;margin-top:3px;color:#64748b;font-size:9px;font-weight:1000;text-transform:uppercase}
    @media(max-width:650px){#${ROOT_ID} .adiGuard,#${ROOT_ID} .adiResult{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(style);
}

function normaliseBatch(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.drafts)) return value.drafts;
  if (Array.isArray(value?.prospects)) return value.prospects;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function parseRaw() {
  state.parseError = '';
  state.parsed = [];
  const raw = String(state.raw || '').trim();
  if (!raw) return;
  try {
    const value = JSON.parse(raw);
    const items = normaliseBatch(value);
    if (!items.length) throw new Error('JSON must contain a drafts array');
    if (items.length > MAX_BATCH) throw new Error(`A batch can contain at most ${MAX_BATCH} drafts`);
    const invalid = items.findIndex((item) => !item || typeof item !== 'object' || Array.isArray(item));
    if (invalid >= 0) throw new Error(`Draft ${invalid + 1} is not a valid object`);
    state.parsed = items;
  } catch (error) {
    state.parseError = error.message || 'Could not read prepared batch';
  }
}

function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement('section');
  root.id = ROOT_ID;
  root.dataset.version = VERSION;
  root.innerHTML = '<div class="adiBackdrop" data-adi-close></div><div class="adiShell"><header class="adiHead"></header><div class="adiBody"></div></div>';
  root.addEventListener('click', handleClick);
  root.addEventListener('input', handleInput);
  root.addEventListener('change', handleChange);
  document.body.appendChild(root);
  return root;
}

function render() {
  const root = ensureRoot();
  root.classList.toggle('open', state.open);
  if (!state.open) return;

  root.querySelector('.adiHead').innerHTML = `
    <div><small>Owner-controlled import</small><h2>Assistant Draft Import</h2>
    <p>Add a prepared prospect batch to Outreach as drafts. This tool cannot send email, grant tester access, or change prospect status.</p></div>
    <button class="adiClose" type="button" data-adi-close>Close</button>
  `;

  const result = state.result;
  const statusClass = state.parseError || state.noticeTone === 'bad' ? 'bad' : (state.parsed.length || state.noticeTone === 'good' ? 'good' : '');
  const statusText = state.parseError || state.notice || (
    state.parsed.length
      ? `${state.parsed.length} prepared draft${state.parsed.length === 1 ? '' : 's'} ready to import.`
      : 'Choose a prepared JSON file or paste its contents below.'
  );

  root.querySelector('.adiBody').innerHTML = `
    <div class="adiGuard">
      <span>Draft creation only</span><span>No email sending</span><span>No tester grants</span><span>Owner approval stays</span>
    </div>
    <section class="adiCard">
      <h3>Prepared batch</h3>
      <p>Accepted format: a JSON array, or an object containing <b>drafts</b>, <b>prospects</b>, or <b>items</b>. Maximum ${MAX_BATCH} records.</p>
      <div class="adiFile">
        <label>Choose JSON file<input type="file" accept=".json,application/json" data-adi-file></label>
        <span class="adiFileName">${esc(state.fileName || 'No file selected')}</span>
      </div>
      <textarea data-adi-raw spellcheck="false" placeholder='{"drafts":[{"business_name":"Example","email":"hello@example.co.nz","subject":"...","body":"..."}]}'>${esc(state.raw)}</textarea>
    </section>
    <div class="adiStatus ${statusClass}">${esc(statusText)}</div>
    ${result ? `<div class="adiResult">
      <div><b>${Number(result.imported?.length || 0)}</b><span>New drafts</span></div>
      <div><b>${Number(result.updated?.length || 0)}</b><span>Updated drafts</span></div>
      <div><b>${Number(result.skipped?.length || 0)}</b><span>Skipped safely</span></div>
      <div><b>${Number(result.errors?.length || 0)}</b><span>Errors</span></div>
    </div>` : ''}
    <div class="adiActions">
      <button class="adiButton" type="button" data-action="clear">Clear</button>
      <button class="adiButton dark" type="button" data-action="open-outreach">Open Outreach</button>
      <button class="adiButton primary" type="button" data-action="import" ${state.busy || !state.parsed.length ? 'disabled' : ''}>
        ${state.busy ? 'Importing…' : `Import ${state.parsed.length || ''} draft${state.parsed.length === 1 ? '' : 's'}`}
      </button>
    </div>
  `;
}

function openPanel() {
  state.open = true;
  state.notice = '';
  state.noticeTone = 'plain';
  state.result = null;
  document.body.style.overflow = 'hidden';
  render();
}

function closePanel() {
  state.open = false;
  render();
  if (!document.getElementById(OUTREACH_ROOT_ID)?.classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

function hqNav() {
  return document.querySelector('.hq2Side nav');
}

function findNavButton(prefix) {
  return Array.from(hqNav()?.querySelectorAll('button') || []).find((item) => lower(item.textContent).startsWith(prefix)) || null;
}

function insertAfter(reference, node, parent) {
  if (!parent || !node) return;
  if (reference?.nextSibling) parent.insertBefore(node, reference.nextSibling);
  else parent.appendChild(node);
}

function captureOutreachButton() {
  const live = document.getElementById(OUTREACH_BUTTON_ID) || findNavButton('outreach');
  if (live) {
    live.id = OUTREACH_BUTTON_ID;
    outreachButton = live;
  }
  return outreachButton;
}

function ensureImportButton(nav) {
  const live = document.getElementById(BUTTON_ID);
  if (live) importButton = live;
  if (!importButton) {
    importButton = document.createElement('button');
    importButton.id = BUTTON_ID;
    importButton.type = 'button';
    importButton.textContent = 'Import drafts';
    importButton.title = 'Import assistant-prepared tester outreach drafts';
    importButton.addEventListener('click', openPanel);
  }
  if (!importButton.isConnected) {
    insertAfter(captureOutreachButton() || findNavButton('testers'), importButton, nav);
  }
}

function repairNavigation() {
  repairQueued = false;
  if (!isHqPath()) {
    if (state.open) closePanel();
    const outreachRoot = document.getElementById(OUTREACH_ROOT_ID);
    if (outreachRoot?.classList.contains('open')) outreachRoot.classList.remove('open');
    document.body.style.overflow = '';
    return;
  }

  installStyle();
  ensureRoot();
  const nav = hqNav();
  if (!nav) return;

  const captured = captureOutreachButton();
  if (captured && !captured.isConnected) {
    insertAfter(findNavButton('testers'), captured, nav);
  }
  ensureImportButton(nav);
  window.__CHURVOX_HQ_OUTREACH_NAVIGATION_REPAIR__ = VERSION;
}

function queueRepair() {
  if (repairQueued) return;
  repairQueued = true;
  window.setTimeout(repairNavigation, 20);
}

async function readFile(file) {
  if (!file) return;
  state.fileName = file.name || 'Prepared batch.json';
  state.notice = '';
  state.result = null;
  try {
    state.raw = await file.text();
    parseRaw();
  } catch (error) {
    state.parseError = error.message || 'Could not read selected file';
  }
  render();
}

async function importDrafts() {
  if (state.busy || !state.parsed.length) return;
  state.busy = true;
  state.notice = 'Importing prepared drafts…';
  state.noticeTone = 'plain';
  state.result = null;
  render();
  try {
    const result = await apiPost('/api/admin/owner/tester-outreach/import-drafts', {
      drafts: state.parsed,
      batch_id: `hq-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    });
    state.result = result;
    state.notice = result.message || 'Prepared drafts imported.';
    state.noticeTone = 'good';
    window.dispatchEvent(new CustomEvent('churvox-outreach-drafts-imported', { detail: result }));
  } catch (error) {
    state.notice = error.message || 'Could not import prepared drafts.';
    state.noticeTone = 'bad';
  } finally {
    state.busy = false;
    render();
    queueRepair();
  }
}

function openOutreach() {
  closePanel();
  repairNavigation();
  const button = captureOutreachButton();
  if (button?.isConnected) button.click();
}

async function handleClick(event) {
  if (event.target.closest('[data-adi-close]')) { closePanel(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'clear') {
    state.raw = '';
    state.parsed = [];
    state.parseError = '';
    state.notice = '';
    state.result = null;
    state.fileName = '';
    render();
    return;
  }
  if (action === 'open-outreach') { openOutreach(); return; }
  if (action === 'import') await importDrafts();
}

function handleInput(event) {
  if (!event.target.matches('[data-adi-raw]')) return;
  state.raw = event.target.value;
  state.notice = '';
  state.result = null;
  parseRaw();
  render();
}

function handleChange(event) {
  if (event.target.matches('[data-adi-file]')) readFile(event.target.files?.[0]);
}

function schedule() {
  [0, 80, 220, 500, 1000, 2200, 5000].forEach((delay) => window.setTimeout(repairNavigation, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = VERSION;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-auth-state', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox-outreach-open', openOutreach);
  const observer = new MutationObserver(queueRepair);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(repairNavigation, 1500);
}

export {};
