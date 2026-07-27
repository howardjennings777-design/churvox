#!/usr/bin/env node

const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const RUN_ID = String(process.env.GITHUB_RUN_ID || `local-${process.pid}`);
const RUN_MARKER = `run-${RUN_ID}-`;
const LEGACY_MARKERS = /Human Client |Human Job |Human Quote |HUMAN-INV-|Boss to worker |Human worker |HARDCORE boss-worker |Hardcore Test Client |hardcore-owner-worker-test|HUMAN CURRENT |Full launch worker detail |STUDIO HUMAN /i;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const REQUEST_TIMEOUT_MS = Math.max(4_000, Number(process.env.CHURVOX_CLEANUP_REQUEST_TIMEOUT_MS || 10_000));
const MAX_ATTEMPTS = Math.max(1, Number(process.env.CHURVOX_CLEANUP_ATTEMPTS || 3));
const DEADLINE_MS = Math.max(60_000, Number(process.env.CHURVOX_CLEANUP_DEADLINE_MS || 240_000));
const STARTED_AT = Date.now();

function log(message) {
  console.log(`[cleanup +${Math.round((Date.now() - STARTED_AT) / 1000)}s] ${message}`);
}

function remainingMs() {
  return DEADLINE_MS - (Date.now() - STARTED_AT);
}

function assertWithinDeadline(stage) {
  if (remainingMs() <= 0) throw new Error(`Cleanup deadline reached during ${stage}.`);
}

function tokenFrom(body = {}) {
  return body.token || body.access_token || body.auth_token || body.jwt || body.accessToken
    || body.user?.token || body.user?.access_token || body.data?.token
    || body.data?.access_token || body.data?.user?.token || '';
}

function idOf(row = {}) {
  const raw = row.id || row._id || row.$oid || row.oid || row.job_id || row.client_id || row.quote_id || row.invoice_id || row.message_id || row.notification_id || row.action_id || row.source_id || '';
  return typeof raw === 'object' ? String(raw.$oid || raw.oid || raw.id || '') : String(raw || '');
}

function rowsFrom(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of ['items', 'records', 'results', 'jobs', 'clients', 'quotes', 'invoices', 'messages', 'notifications', 'slips', 'actions', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function textOf(row) {
  return JSON.stringify(row || {});
}

function isCurrentRunFixture(row) {
  return textOf(row).includes(RUN_MARKER);
}

function isLegacyFixture(row) {
  LEGACY_MARKERS.lastIndex = 0;
  return LEGACY_MARKERS.test(textOf(row));
}

function inactiveRecord(row = {}) {
  if (row.archived === true || row.is_archived === true || row.deleted === true || row.is_deleted === true) return true;
  if (row.active === false || row.is_active === false) return true;
  if (row.archived_at || row.deleted_at || row.ignored_at || row.dismissed_at || row.decided_at) return true;
  const status = String(row.status || row.state || row.action || row.owner_decision || row.decision || '');
  return /archived|deleted|inactive|dismissed|rejected|ignored|resolved|approved_recorded/i.test(status);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOnce(path, options = {}) {
  assertWithinDeadline(path);
  const timeoutMs = Math.max(1_000, Math.min(REQUEST_TIMEOUT_MS, remainingMs()));
  const response = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let body = {};
  try { body = JSON.parse(text || '{}'); } catch { body = { text: text.slice(0, 300) }; }
  return { response, body };
}

async function call(path, options = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await callOnce(path, options);
      if (!RETRYABLE_STATUS.has(result.response.status) || attempt === MAX_ATTEMPTS) return result;
      lastError = new Error(`Cleanup request ${path} returned HTTP ${result.response.status}.`);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) throw error;
    }
    await sleep(Math.min(750 * attempt, Math.max(0, remainingMs())));
  }
  throw lastError || new Error(`Cleanup request failed: ${path}`);
}

async function login() {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Owner cleanup credentials are missing.');
  log('Signing in for owner-scoped cleanup.');
  const result = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }) });
  if (!result.response.ok) throw new Error(`Cleanup owner login failed with HTTP ${result.response.status}.`);
  const token = tokenFrom(result.body);
  if (!token) throw new Error('Cleanup owner login returned no token.');
  return token;
}

function deleteCount(body = {}) {
  const value = body.deleted ?? body.deleted_count ?? body.data?.deleted ?? body.data?.deleted_count;
  return Number(value || 0);
}

async function removeBusinessRecord(kind, id, headers) {
  const singular = { jobs: 'job', clients: 'client', quotes: 'quote', invoices: 'invoice' }[kind] || kind.replace(/s$/, '');
  const paths = [`/api/records/${singular}/${encodeURIComponent(id)}`, `/api/${kind}/${encodeURIComponent(id)}`];
  const attempts = [];
  for (const path of paths) {
    const result = await call(path, { method: 'DELETE', headers });
    const deleted = deleteCount(result.body);
    attempts.push(`${path} HTTP ${result.response.status} deleted=${deleted}`);
    if (result.response.ok && deleted > 0) return true;
    if (result.response.status !== 404 && result.response.ok && result.body?.success === true && result.body?.record) return true;
  }
  log(`${kind} ${id} was not actually deleted: ${attempts.join(' | ')}`);
  return false;
}

async function resolveCommandSlip(row, headers) {
  const id = idOf(row);
  if (!id) return false;

  const command = await call(`/api/command/slips/${encodeURIComponent(id)}/ignore`, {
    method: 'POST', headers, body: JSON.stringify({ action: 'Ignore', note: `Launch audit ${RUN_ID} cleanup` }),
  });
  if (command.response.ok || command.response.status === 404) return true;

  const field = await call(`/api/command/field-slips/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST', headers, body: JSON.stringify({ note: `Launch audit ${RUN_ID} cleanup` }),
  });
  if (field.response.ok || field.response.status === 404) return true;

  log(`Command fixture ${id} could not be resolved: ignore ${command.response.status}, dismiss ${field.response.status}`);
  return false;
}

async function list(path, headers) {
  const suffix = path.includes('?') ? '&' : '?';
  const result = await call(`${path}${suffix}ts=${Date.now()}`, { headers });
  if (!result.response.ok) throw new Error(`Cleanup list ${path} failed with HTTP ${result.response.status}.`);
  return rowsFrom(result.body);
}

async function mapLimited(items, limit, worker) {
  const rows = Array.from(items || []);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor;
      cursor += 1;
      await worker(rows[index], index);
    }
  });
  await Promise.all(runners);
}

async function listCollections(kinds, headers, phase) {
  log(`${phase}: reading ${kinds.join(', ')} in parallel.`);
  const entries = await Promise.all(kinds.map(async (kind) => [kind, await list(`/api/${kind}?limit=1000`, headers)]));
  return new Map(entries);
}

async function activeCurrentRecords(kinds, headers, phase) {
  const collections = await listCollections(kinds, headers, phase);
  const active = [];
  for (const [kind, rows] of collections.entries()) {
    for (const row of rows) {
      if (isCurrentRunFixture(row) && !inactiveRecord(row)) active.push({ kind, row });
    }
  }
  return { collections, active };
}

async function main() {
  log(`Starting exact-run cleanup for GitHub run ${RUN_ID} against ${API_BASE}.`);
  const token = await login();
  const headers = { Authorization: `Bearer ${token}` };
  const failures = [];
  let matched = 0;
  let cleaned = 0;
  let legacyBacklog = 0;
  let commandMatches = 0;

  const kinds = ['jobs', 'clients', 'quotes', 'invoices'];
  const initialState = await activeCurrentRecords(kinds, headers, 'Initial scan');
  for (const rows of initialState.collections.values()) {
    for (const row of rows) {
      if (isLegacyFixture(row) && !isCurrentRunFixture(row) && !inactiveRecord(row)) legacyBacklog += 1;
    }
  }
  const businessMatches = initialState.active;
  log(`Found ${businessMatches.length} active fixture record(s) created by run ${RUN_ID}.`);
  if (legacyBacklog) log(`Found ${legacyBacklog} older audit record(s); reported as legacy backlog and not mutated by this run.`);

  await mapLimited(businessMatches, 3, async ({ kind, row }) => {
    matched += 1;
    const id = idOf(row);
    if (!id) { failures.push(`${kind}:missing-id`); return; }
    if (await removeBusinessRecord(kind, id, headers)) cleaned += 1;
    else failures.push(`${kind}:${id}`);
  });

  for (let round = 1; round <= 3; round += 1) {
    const commandRows = (await list('/api/command/slips?limit=400', headers))
      .filter((row) => isCurrentRunFixture(row) && !inactiveRecord(row));
    commandMatches += commandRows.length;
    log(`Command cleanup round ${round} found ${commandRows.length} exact-run slip(s).`);
    if (!commandRows.length) break;
    let progressed = 0;
    await mapLimited(commandRows, 3, async (row) => {
      matched += 1;
      const id = idOf(row);
      if (await resolveCommandSlip(row, headers)) { progressed += 1; cleaned += 1; }
      else failures.push(`command:${id || 'missing-id'}`);
    });
    if (!progressed) break;
    await sleep(300);
  }

  let immutableCurrentEntries = 0;
  try {
    const history = await Promise.all(['/api/messages?limit=400', '/api/notifications?limit=400'].map((path) => list(path, headers)));
    immutableCurrentEntries = history.flat().filter(isCurrentRunFixture).length;
  } catch (error) {
    log(`Immutable history count unavailable: ${error.message || error}`);
  }

  if (!businessMatches.length && commandMatches === 0 && !failures.length) {
    log('Matched 0 exact-run mutable records; no destructive verification scan is required.');
    log(`Retained ${immutableCurrentEntries} immutable exact-run audit entr${immutableCurrentEntries === 1 ? 'y' : 'ies'}.`);
    log(`Exact-run cleanup passed. Legacy backlog count: ${legacyBacklog}.`);
    return;
  }

  let remainingActive = [];
  for (let round = 1; round <= 4; round += 1) {
    await sleep(round === 1 ? 700 : 1500);
    remainingActive = (await activeCurrentRecords(kinds, headers, `Verification round ${round}`)).active
      .map(({ kind, row }) => `${kind}:${idOf(row) || 'missing-id'}`);
    for (const row of await list('/api/command/slips?limit=400', headers)) {
      if (isCurrentRunFixture(row) && !inactiveRecord(row)) remainingActive.push(`command:${idOf(row) || 'missing-id'}`);
    }
    if (!remainingActive.length) break;
  }

  log(`Matched ${matched} exact-run record(s); confirmed ${cleaned} destructive cleanup action(s).`);
  log(`Retained ${immutableCurrentEntries} immutable exact-run audit entr${immutableCurrentEntries === 1 ? 'y' : 'ies'}.`);
  if (failures.length || remainingActive.length) {
    throw new Error(`Exact-run cleanup incomplete. Failures: ${failures.join(', ') || 'none'}. Active remnants: ${remainingActive.join(', ') || 'none'}.`);
  }
  log(`Exact-run cleanup passed. Legacy backlog count: ${legacyBacklog}.`);
}

main().catch((error) => {
  console.error(`[cleanup failed] ${error.message || error}`);
  process.exit(1);
});
