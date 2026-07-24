import API_BASE from '../lib/apiBase';
import './churvoxClientCsvRehearsalRuntime.css';

const FLAG = '__CHURVOX_CLIENT_CSV_REHEARSAL_RUNTIME__';
const DIALOG_ID = 'churvox-client-csv-rehearsal';
const FILE_INPUT_ID = 'churvox-client-csv-source-file';
const MANIFEST_INPUT_ID = 'churvox-client-csv-manifest-file';
const MANIFEST_SCHEMA = 'churvox.client-migration-manifest.v1';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function keyOf(value) {
  return clean(value).toLowerCase().replace(/^\ufeff/, '').replace(/[^a-z0-9]+/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hasEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));
}

function phoneKey(value) {
  return clean(value).replace(/[^0-9+]/g, '').replace(/^00/, '+');
}

function alias(row, names) {
  for (const name of names) {
    const value = row[keyOf(name)];
    if (clean(value)) return clean(value);
  }
  return '';
}

function detectDelimiter(text) {
  const sample = String(text || '').slice(0, 4096);
  const counts = new Map([[',', 0], [';', 0], ['\t', 0]]);
  let quoted = false;
  for (let index = 0; index < sample.length; index += 1) {
    const char = sample[index];
    const next = sample[index + 1];
    if (char === '"') {
      if (quoted && next === '"') index += 1;
      else quoted = !quoted;
      continue;
    }
    if (!quoted && counts.has(char)) counts.set(char, counts.get(char) + 1);
    if (!quoted && (char === '\n' || char === '\r')) break;
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[1] ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] : ',';
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text);
  const matrix = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text || '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => clean(value))) matrix.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.some((value) => clean(value))) matrix.push(row);
  if (quoted) throw new Error('The CSV has an unclosed quoted field.');
  if (matrix.length < 2) throw new Error('The CSV needs a header row and at least one client row.');
  if (matrix.length - 1 > MAX_ROWS) throw new Error(`This rehearsal supports up to ${MAX_ROWS.toLocaleString()} rows at a time.`);

  const headers = matrix[0].map(keyOf);
  if (!headers.some(Boolean)) throw new Error('The CSV header row is empty.');
  const duplicateHeaders = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicateHeaders.length) throw new Error(`Duplicate CSV headers found: ${[...new Set(duplicateHeaders)].join(', ')}.`);

  return matrix.slice(1).map((values, index) => {
    const record = { __row: index + 2 };
    headers.forEach((header, cellIndex) => {
      if (header) record[header] = clean(values[cellIndex]);
    });
    return record;
  });
}

function clientPayload(row) {
  return {
    name: alias(row, ['name', 'client name', 'customer name', 'contact name', 'business name']),
    phone: alias(row, ['phone', 'mobile', 'client phone', 'customer phone']),
    email: alias(row, ['email', 'client email', 'customer email']).toLowerCase(),
    address: alias(row, ['address', 'site address', 'service address']),
    service: alias(row, ['service', 'preferred service', 'service type']),
    price: alias(row, ['price', 'saved price', 'usual price']),
    schedule: alias(row, ['schedule', 'recurrence', 'recurring', 'preferred schedule']) || 'One-off',
    notes: alias(row, ['notes', 'access notes', 'site notes']),
  };
}

function identityFor(payload) {
  if (payload.email) return `email:${payload.email.toLowerCase()}`;
  if (phoneKey(payload.phone)) return `phone:${phoneKey(payload.phone)}`;
  return `name:${clean(payload.name).toLowerCase()}|${clean(payload.address).toLowerCase()}`;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, name) => ({ ...result, [name]: stableValue(value[name]) }), {});
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function fingerprint(value) {
  const source = String(value || '');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function authHeaders(extra = {}) {
  const token = window.localStorage.getItem('token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function apiUrl(path) {
  return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`;
}

async function apiRequest(path, options = {}) {
  const response = await window.fetch(apiUrl(path), {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: authHeaders(options.headers || {}),
  });
  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
  if (!response.ok || body?.success === false) {
    const message = body?.error || body?.detail || body?.message || `Request failed (${response.status})`;
    const error = new Error(typeof message === 'string' ? message : 'Request failed');
    error.status = response.status;
    throw error;
  }
  return body;
}

function listFrom(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const name of ['clients', 'items', 'records', 'results', 'data']) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

const state = {
  busy: false,
  fileName: '',
  sourceRows: [],
  rows: [],
  liveCheckOk: false,
  liveCheckMessage: '',
  comparison: null,
  resultMessage: '',
};

function buildRows(sourceRows, existingClients) {
  const liveKeys = new Set(existingClients.map((client) => identityFor({
    name: client.name || client.client_name || client.customer_name || '',
    email: String(client.email || '').toLowerCase(),
    phone: client.phone || client.mobile || '',
    address: client.address || client.site_address || '',
  })));
  const sourceKeys = new Set();

  return sourceRows.map((source) => {
    const payload = clientPayload(source);
    const issues = [];
    const warnings = [];
    const identity = identityFor(payload);

    if (!payload.name) issues.push('Missing client name');
    if (!payload.email && !phoneKey(payload.phone)) issues.push('Add an email or phone number');
    if (payload.email && !hasEmail(payload.email)) issues.push('Email format is invalid');
    if (!payload.address) warnings.push('No address supplied');
    if (liveKeys.has(identity)) issues.push('Already exists in Churvox');
    if (sourceKeys.has(identity)) issues.push('Duplicate in this CSV');
    sourceKeys.add(identity);

    return {
      rowNumber: source.__row,
      payload,
      identity,
      issues,
      warnings,
      status: issues.length ? (issues.includes('Already exists in Churvox') ? 'existing' : 'blocked') : 'ready',
      result: '',
    };
  });
}

function totals() {
  return state.rows.reduce((summary, row) => {
    summary.total += 1;
    if (row.status === 'ready') summary.ready += 1;
    if (row.status === 'blocked') summary.blocked += 1;
    if (row.status === 'existing') summary.existing += 1;
    if (row.status === 'imported') summary.imported += 1;
    if (row.status === 'failed') summary.failed += 1;
    if (row.warnings.length) summary.warnings += 1;
    return summary;
  }, { total: 0, ready: 0, blocked: 0, existing: 0, imported: 0, failed: 0, warnings: 0 });
}

function buildManifest() {
  const summary = totals();
  return {
    schema: MANIFEST_SCHEMA,
    generatedAt: new Date().toISOString(),
    dataType: 'clients',
    mode: 'read_only_rehearsal',
    sourceFile: state.fileName || null,
    privacy: 'No client names, emails, phone numbers, addresses or notes are stored in this manifest.',
    totals: summary,
    rows: state.rows.map((row) => ({
      rowNumber: row.rowNumber,
      sourceKeyHash: fingerprint(row.identity),
      payloadHash: fingerprint(stableJson(row.payload)),
      status: row.status,
      issueCodes: row.issues.map(keyOf),
      warningCodes: row.warnings.map(keyOf),
    })),
  };
}

function compareManifest(baseline, current) {
  if (baseline?.schema !== MANIFEST_SCHEMA || baseline?.dataType !== 'clients' || !Array.isArray(baseline?.rows)) {
    return { error: 'That file is not a Churvox client migration manifest.' };
  }
  const group = (rows) => rows.reduce((map, row) => {
    const identity = clean(row.sourceKeyHash) || `row-${row.rowNumber}`;
    const values = map.get(identity) || [];
    values.push(clean(row.payloadHash));
    map.set(identity, values);
    return map;
  }, new Map());
  const before = group(baseline.rows);
  const after = group(current.rows);
  const identities = new Set([...before.keys(), ...after.keys()]);
  let matched = 0;
  let changed = 0;
  let added = 0;
  let missing = 0;

  identities.forEach((identity) => {
    const oldValues = [...(before.get(identity) || [])];
    const newValues = [...(after.get(identity) || [])];
    const unmatched = [];
    newValues.forEach((value) => {
      const matchIndex = oldValues.indexOf(value);
      if (matchIndex >= 0) {
        matched += 1;
        oldValues.splice(matchIndex, 1);
      } else {
        unmatched.push(value);
      }
    });
    const changedHere = Math.min(oldValues.length, unmatched.length);
    changed += changedHere;
    missing += Math.max(0, oldValues.length - changedHere);
    added += Math.max(0, unmatched.length - changedHere);
  });

  return { matched, changed, added, missing, baselineRows: baseline.rows.length, currentRows: current.rows.length };
}

function downloadJson(data, filename) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(value) {
  return keyOf(String(value || '').replace(/\.[^.]+$/, '')) || 'churvox-clients';
}

function dialogElement() {
  return document.getElementById(DIALOG_ID);
}

function closeDialog() {
  if (state.busy) return;
  dialogElement()?.remove();
  document.body.classList.remove('cvClientCsvOpen');
}

function statusLabel(row) {
  if (row.status === 'ready') return row.warnings.length ? 'Ready · check note' : 'Ready';
  if (row.status === 'existing') return 'Already in Churvox';
  if (row.status === 'imported') return 'Imported';
  if (row.status === 'failed') return `Failed${row.result ? ` · ${row.result}` : ''}`;
  return row.issues[0] || 'Blocked';
}

function renderComparison() {
  if (!state.comparison) return '';
  if (state.comparison.error) return `<section class="cvClientCsvCompare bad"><b>Manifest comparison</b><p>${escapeHtml(state.comparison.error)}</p></section>`;
  const result = state.comparison;
  const exact = result.changed === 0 && result.added === 0 && result.missing === 0;
  return `<section class="cvClientCsvCompare ${exact ? 'good' : 'bad'}"><div><b>Saved manifest comparison</b><span>${exact ? 'Exact source match' : 'Source changed — review before importing'}</span></div><div class="cvClientCsvCompareGrid"><span><b>${result.matched}</b>matched</span><span><b>${result.changed}</b>changed</span><span><b>${result.added}</b>added</span><span><b>${result.missing}</b>missing</span></div></section>`;
}

function renderRows() {
  const visible = state.rows.slice(0, 250);
  if (!visible.length) return '<div class="cvClientCsvEmpty">No client rows were found.</div>';
  return `<div class="cvClientCsvRows">${visible.map((row) => {
    const contact = row.payload.email || row.payload.phone || 'No contact';
    const notes = [...row.issues, ...row.warnings].join(' · ');
    return `<article class="${escapeHtml(row.status)}"><i></i><div><b>Row ${row.rowNumber} · ${escapeHtml(row.payload.name || 'Unnamed client')}</b><span>${escapeHtml(contact)}${row.payload.address ? ` · ${escapeHtml(row.payload.address)}` : ''}</span><small>${escapeHtml(notes || 'No blocking problems found.')}</small></div><em>${escapeHtml(statusLabel(row))}</em></article>`;
  }).join('')}${state.rows.length > visible.length ? `<p class="cvClientCsvMore">Showing the first ${visible.length} of ${state.rows.length.toLocaleString()} rows.</p>` : ''}</div>`;
}

function renderDialog() {
  const summary = totals();
  let overlay = dialogElement();
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = DIALOG_ID;
    overlay.className = 'cvClientCsvOverlay';
    overlay.setAttribute('role', 'presentation');
    document.body.appendChild(overlay);
    document.body.classList.add('cvClientCsvOpen');
  }

  const canImport = state.liveCheckOk && summary.ready > 0 && !state.busy;
  overlay.innerHTML = `<section class="cvClientCsvDialog" role="dialog" aria-modal="true" aria-labelledby="cv-client-csv-title">
    <header><div><small>Clients · read-only rehearsal</small><h2 id="cv-client-csv-title">Check the CSV before anything is written</h2><p>${escapeHtml(state.fileName || 'Client CSV')} · the preview and manifest do not touch live records.</p></div><button type="button" data-cv-csv-close aria-label="Close import rehearsal">Close</button></header>
    <div class="cvClientCsvStats"><span><b>${summary.total}</b>checked</span><span><b>${summary.ready}</b>ready</span><span><b>${summary.blocked}</b>blocked</span><span><b>${summary.existing}</b>already there</span><span><b>${summary.imported}</b>imported</span></div>
    ${state.liveCheckOk ? '<div class="cvClientCsvGuard good"><b>Live duplicate check passed</b><span>Ready rows were compared with current Churvox clients.</span></div>' : `<div class="cvClientCsvGuard bad"><b>Import locked</b><span>${escapeHtml(state.liveCheckMessage || 'Checking current clients before approval.')}</span><button type="button" data-cv-csv-retry>Retry check</button></div>`}
    ${renderComparison()}
    ${state.resultMessage ? `<div class="cvClientCsvResult"><b>Import result</b><span>${escapeHtml(state.resultMessage)}</span></div>` : ''}
    ${renderRows()}
    <footer><div><button type="button" class="quiet" data-cv-csv-manifest>Download privacy-safe manifest</button><label class="quiet"><input id="${MANIFEST_INPUT_ID}" type="file" accept=".json,application/json" /><span>Compare saved manifest</span></label></div><div><button type="button" class="quiet" data-cv-csv-close ${state.busy ? 'disabled' : ''}>Keep live data unchanged</button><button type="button" class="approve" data-cv-csv-import ${canImport ? '' : 'disabled'}>${state.busy ? 'Importing…' : `Import ${summary.ready} ready client${summary.ready === 1 ? '' : 's'}`}</button></div></footer>
  </section>`;

  overlay.querySelectorAll('[data-cv-csv-close]').forEach((button) => button.addEventListener('click', closeDialog));
  overlay.querySelector('[data-cv-csv-manifest]')?.addEventListener('click', () => downloadJson(buildManifest(), `${safeFilename(state.fileName)}-migration-manifest.json`));
  overlay.querySelector('[data-cv-csv-retry]')?.addEventListener('click', runLiveCheck);
  overlay.querySelector('[data-cv-csv-import]')?.addEventListener('click', importReadyRows);
  overlay.querySelector(`#${MANIFEST_INPUT_ID}`)?.addEventListener('change', loadManifest);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) closeDialog(); });
}

async function runLiveCheck() {
  state.liveCheckOk = false;
  state.liveCheckMessage = 'Checking current Churvox clients for duplicates…';
  state.comparison = null;
  renderDialog();
  try {
    const payload = await apiRequest('/clients', { method: 'GET' });
    state.rows = buildRows(state.sourceRows, listFrom(payload));
    state.liveCheckOk = true;
    state.liveCheckMessage = '';
  } catch (error) {
    state.rows = buildRows(state.sourceRows, []);
    state.liveCheckOk = false;
    state.liveCheckMessage = `Could not verify current clients: ${error?.message || 'request failed'}. No import is allowed until this check passes.`;
  }
  renderDialog();
}

async function loadSourceFile(file) {
  if (!file) return;
  state.busy = false;
  state.fileName = file.name || 'clients.csv';
  state.sourceRows = [];
  state.rows = [];
  state.liveCheckOk = false;
  state.liveCheckMessage = 'Reading and checking the CSV…';
  state.comparison = null;
  state.resultMessage = '';
  renderDialog();

  try {
    if (file.size > MAX_FILE_BYTES) throw new Error('The CSV is larger than 5 MB. Split it into smaller batches.');
    state.sourceRows = parseCsv(await file.text());
    await runLiveCheck();
  } catch (error) {
    state.liveCheckOk = false;
    state.liveCheckMessage = error?.message || 'Could not read that CSV.';
    state.rows = [];
    renderDialog();
  }
}

async function loadManifest(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    const baseline = JSON.parse(await file.text());
    state.comparison = compareManifest(baseline, buildManifest());
  } catch {
    state.comparison = { error: 'That manifest could not be read.' };
  }
  renderDialog();
}

async function createClient(payload) {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': `churvox-client-import-${fingerprint(stableJson(payload))}`,
  };
  try {
    return await apiRequest('/clients', { method: 'POST', headers, body });
  } catch (error) {
    if (![404, 405].includes(error?.status)) throw error;
    return apiRequest('/clients/create', { method: 'POST', headers, body });
  }
}

async function importReadyRows() {
  if (state.busy || !state.liveCheckOk) return;
  const readyRows = state.rows.filter((row) => row.status === 'ready');
  if (!readyRows.length) return;
  state.busy = true;
  state.resultMessage = `Importing ${readyRows.length} checked client row${readyRows.length === 1 ? '' : 's'}…`;
  renderDialog();

  let imported = 0;
  let failed = 0;
  for (const row of readyRows) {
    try {
      await createClient(row.payload);
      row.status = 'imported';
      row.result = 'Created';
      imported += 1;
    } catch (error) {
      row.status = 'failed';
      row.result = error?.message || 'Request failed';
      failed += 1;
    }
    state.resultMessage = `${imported} imported · ${failed} failed · ${readyRows.length - imported - failed} remaining.`;
    renderDialog();
  }

  state.busy = false;
  state.resultMessage = `${imported} imported · ${failed} failed. Blocked and existing rows were not written.`;
  window.dispatchEvent(new Event('churvox:data-refresh'));
  renderDialog();
}

function ensureFileInput() {
  let input = document.getElementById(FILE_INPUT_ID);
  if (input) return input;
  input = document.createElement('input');
  input.id = FILE_INPUT_ID;
  input.type = 'file';
  input.accept = '.csv,.txt,text/csv,text/plain';
  input.hidden = true;
  input.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    loadSourceFile(file);
  });
  document.body.appendChild(input);
  return input;
}

function isClientImportButton(button) {
  if (!button?.closest?.('.cv3Product')) return false;
  if (clean(button.textContent).toLowerCase() !== 'csv import') return false;
  const hash = clean(window.location.hash).toLowerCase();
  return hash.includes('clients') || Boolean(button.closest('.cv3Toolbar'));
}

function interceptImportClick(event) {
  const button = event.target?.closest?.('button');
  if (!isClientImportButton(button)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  ensureFileInput().click();
}

function install() {
  if (typeof window === 'undefined' || window[FLAG]) return;
  window[FLAG] = true;
  document.addEventListener('click', interceptImportClick, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialogElement()) closeDialog();
  });
  if (document.body) ensureFileInput();
  else document.addEventListener('DOMContentLoaded', ensureFileInput, { once: true });
}

install();
