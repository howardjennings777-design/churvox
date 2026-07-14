import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_HQ_ASSISTANT_DRAFT_IMPORT_RUNTIME__';
const BUTTON_ID = 'churvox-hq-assistant-draft-import-button';
const ROOT_ID = 'churvox-hq-assistant-draft-import-root';
const STYLE_ID = 'churvox-hq-assistant-draft-import-style';
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
    #${BUTTON_ID}{position:relative}
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
  const text = String(state.raw || '').trim();
  if (!text) return;
  try {
    const value = JSON.parse(text);
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
    <p>Add a prepared prospect batch to Outreach as drafts. This tool has no route to send email, grant tester access, or change prospect status.</p></div>
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
  render();
}

function closePanel() {
  state.open = false;
  render();
}

function ensureButton() {
  if (!isHqPath()) return;
  const nav = document.querySelector('.hq2Side nav');
  if (!nav || document.getElementById(BUTTON_ID)) return;
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.textContent = 'Import drafts';
  button.title = 'Import assistant-prepared tester outreach drafts';
  button.addEventListener('click', openPanel);
  const outreach = Array.from(nav.querySelectorAll('button')).find((item) => lower(item.textContent).startsWith('outreach'));
  if (outreach?.nextSibling) nav.insertBefore(button, outreach.nextSibling);
  else nav.appendChild(button);
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

async function importBatch() {
  if (!state.parsed.length || state.busy) return;
  state.busy = true;
  state.notice = '';
  state.noticeTone = 'plain';
  state.result = null;
  render();
  try {
    const result = await apiPost('/api/admin/owner/tester-outreach/import-drafts', {
      batch_id: `assistant-${new Date().toISOString().replace(/[:.]/g, '-')}`,
      drafts: state.parsed,
    });
    state.result = result;
    state.notice = result.message || 'Prepared drafts imported.';
    state.noticeTone = 'good';
    window.dispatchEvent(new CustomEvent('churvox-tester-outreach-imported', { detail: result }));
    const refresh = document.querySelector('#churvox-hq-tester-outreach-root [data-action="refresh"]');
    if (refresh) refresh.click();
  } catch (error) {
    state.notice = error.message || 'Could not import prepared drafts.';
    state.noticeTone = 'bad';
  } finally {
    state.busy = false;
    render();
  }
}

function openOutreach() {
  const button = document.getElementById('churvox-hq-tester-outreach-button');
  if (button) button.click();
  else {
    state.notice = 'Outreach button is not available yet. Refresh HQ and try again.';
    state.noticeTone = 'bad';
    render();
    return;
  }
  closePanel();
}

function handleInput(event) {
  if (!event.target.matches('[data-adi-raw]')) return;
  const cursor = event.target.selectionStart || 0;
  state.raw = event.target.value;
  state.notice = '';
  state.noticeTone = 'plain';
  state.result = null;
  parseRaw();
  render();
  const next = document.querySelector(`#${ROOT_ID} [data-adi-raw]`);
  if (next) {
    next.focus();
    try { next.setSelectionRange(cursor, cursor); } catch {}
  }
}

function handleChange(event) {
  if (event.target.matches('[data-adi-file]')) readFile(event.target.files?.[0]);
}

function handleClick(event) {
  if (event.target.closest('[data-adi-close]')) { closePanel(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'clear') {
    state.raw = '';
    state.parsed = [];
    state.parseError = '';
    state.notice = '';
    state.noticeTone = 'plain';
    state.fileName = '';
    state.result = null;
    render();
  }
  if (action === 'import') importBatch();
  if (action === 'open-outreach') openOutreach();
}

function schedule() {
  if (!isHqPath()) return;
  installStyle();
  ensureRoot();
  [0, 450, 1200, 2600].forEach((delay) => setTimeout(ensureButton, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  setInterval(() => { if (isHqPath()) ensureButton(); }, 30000);
}

export {};
