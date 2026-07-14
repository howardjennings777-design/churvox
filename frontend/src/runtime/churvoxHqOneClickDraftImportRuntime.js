const FLAG = '__CHURVOX_HQ_ONE_CLICK_DRAFT_IMPORT_RUNTIME__';
const HASH_PREFIX = 'churvox-outreach-batch=';
const IMPORT_BUTTON_ID = 'churvox-hq-assistant-draft-import-button';
const IMPORT_ROOT_ID = 'churvox-hq-assistant-draft-import-root';
const MAX_BATCH = 25;

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage', '/admin/qa-auditor', '/platform'].includes(path);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function decodeBase64Url(value) {
  const normal = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normal + '='.repeat((4 - (normal.length % 4 || 4)) % 4);
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
  let escaped = '';
  bytes.forEach((byte) => { escaped += `%${byte.toString(16).padStart(2, '0')}`; });
  return decodeURIComponent(escaped);
}

function normaliseBatch(value) {
  const items = Array.isArray(value)
    ? value
    : (Array.isArray(value?.drafts)
      ? value.drafts
      : (Array.isArray(value?.prospects)
        ? value.prospects
        : (Array.isArray(value?.items) ? value.items : [])));
  if (!items.length) throw new Error('This link does not contain any prepared drafts.');
  if (items.length > MAX_BATCH) throw new Error(`A prepared link can contain at most ${MAX_BATCH} drafts.`);
  const invalid = items.findIndex((item) => !item || typeof item !== 'object' || Array.isArray(item));
  if (invalid >= 0) throw new Error(`Prepared draft ${invalid + 1} is invalid.`);
  return items;
}

function readPreparedBatch() {
  const hash = String(window.location.hash || '').replace(/^#/, '');
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const encoded = hash.slice(HASH_PREFIX.length);
  if (!encoded) throw new Error('The prepared draft link is empty.');
  const decoded = decodeBase64Url(encoded);
  const parsed = JSON.parse(decoded);
  return normaliseBatch(parsed);
}

function clearPreparedHash() {
  try {
    window.history.replaceState(window.history.state, document.title, `${window.location.pathname}${window.location.search}`);
  } catch {}
}

async function waitFor(selector, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const node = document.querySelector(selector);
    if (node) return node;
    await sleep(120);
  }
  return null;
}

function showFallback(message) {
  const text = String(message || 'Could not load the prepared drafts.');
  try { window.alert(text); } catch {}
}

async function processPreparedBatch() {
  if (!isHqPath()) return;
  let drafts;
  try {
    drafts = readPreparedBatch();
  } catch (error) {
    clearPreparedHash();
    showFallback(error.message);
    return;
  }
  if (!drafts) return;

  clearPreparedHash();

  const importButton = await waitFor(`#${IMPORT_BUTTON_ID}`);
  if (!importButton) {
    showFallback('Import drafts is not available yet. Refresh Churvox HQ and open the prepared link again.');
    return;
  }

  importButton.click();

  const textarea = await waitFor(`#${IMPORT_ROOT_ID} [data-adi-raw]`);
  if (!textarea) {
    showFallback('The Import drafts panel did not open. Refresh Churvox HQ and open the prepared link again.');
    return;
  }

  textarea.value = JSON.stringify({ drafts }, null, 2);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));

  const readyImport = await waitFor(`#${IMPORT_ROOT_ID} [data-action="import"]:not([disabled])`, 5000);
  if (!readyImport) {
    showFallback('The prepared drafts loaded, but Churvox could not validate them. Review the Import drafts panel.');
    return;
  }

  readyImport.click();

  const result = await waitFor(`#${IMPORT_ROOT_ID} .adiResult`, 15000);
  if (!result) return;

  const openOutreach = document.querySelector(`#${IMPORT_ROOT_ID} [data-action="open-outreach"]`);
  if (openOutreach) {
    await sleep(500);
    openOutreach.click();
  }
}

function schedule() {
  if (!isHqPath()) return;
  window.setTimeout(() => { processPreparedBatch().catch((error) => showFallback(error.message)); }, 250);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
}

export {};
