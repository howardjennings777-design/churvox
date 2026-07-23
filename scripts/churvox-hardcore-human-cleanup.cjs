#!/usr/bin/env node

const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const MARKERS = /Human Client |Human Job |Human Quote |HUMAN-INV-|Boss to worker |Human worker |HARDCORE boss-worker |Hardcore Test Client |hardcore-owner-worker-test|HUMAN CURRENT |Full launch worker detail /i;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const REQUEST_TIMEOUT_MS = Math.max(4_000, Number(process.env.CHURVOX_CLEANUP_REQUEST_TIMEOUT_MS || 10_000));
const MAX_ATTEMPTS = Math.max(1, Number(process.env.CHURVOX_CLEANUP_ATTEMPTS || 2));
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

function matches(row) {
  MARKERS.lastIndex = 0;
  return MARKERS.test(JSON.stringify(row || {}));
}

function inactiveRecord(row = {}) {
  if (row.archived === true || row.is_archived === true || row.deleted === true || row.is_deleted === true) return true;
  if (row.archived_at || row.deleted_at || row.ignored_at || row.dismissed_at || row.decided_at) return true;
  const status = String(row.status || row.state || row.action || row.owner_decision || row.decision || '');
  return /archived|deleted|dismissed|rejected|ignored|resolved|approved_recorded/i.test(status);
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
  try { body = JSON.parse(text); } catch { body = { text: text.slice(0, 300) }; }
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
  if (!result.response.ok) throw new Error(`Cleanup owner login failed with ${result.response.status}.`);
  const token = tokenFrom(result.body);
  if (!token) throw new Error('Cleanup owner login returned no token.');
  return token;
}

async function removeBusinessRecord(kind, id, headers) {
  let result = await call(`/api/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
  if (result.response.ok || result.response.status === 404) return true;
  if (kind === 'jobs') {
    result = await call(`/api/jobs/${encodeURIComponent(id)}/archive`, {
      method: 'POST', headers, body: JSON.stringify({ archived: true, status: 'archived', archive_reason: 'hardcore human audit cleanup' }),
    });
    if (result.response.ok || result.response.status === 404) return true;
    result = await call(`/api/jobs/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers, body: JSON.stringify({ archived: true, status: 'archived', archive_reason: 'hardcore human audit cleanup' }),
    });
  }
  return result.response.ok || result.response.status === 404;
}

async function resolveCommandSlip(row, headers) {
  const id = idOf(row);
  if (!id) return false;
  let commandHandled = false;
  let fieldHandled = false;

  try {
    const command = await call(`/api/command/slips/${encodeURIComponent(id)}/ignore`, {
      method: 'POST', headers, body: JSON.stringify({ action: 'Ignore', note: 'Hardcore human audit cleanup' }),
    });
    commandHandled = command.response.ok || command.response.status === 404;
  } catch (error) {
    log(`Command Ignore request for ${id} could not complete: ${error.message || error}`);
  }

  // Some live Command queues include legacy worker_field_slips. Always record
  // the paired non-destructive dismissal as well; neither route approves or
  // applies a record. The final queue read remains the source of truth.
  try {
    const field = await call(`/api/command/field-slips/${encodeURIComponent(id)}/dismiss`, {
      method: 'POST', headers, body: JSON.stringify({ note: 'Hardcore human audit cleanup' }),
    });
    fieldHandled = field.response.ok || field.response.status === 404;
  } catch (error) {
    log(`Field-slip Dismiss request for ${id} could not complete: ${error.message || error}`);
  }

  return commandHandled || fieldHandled;
}

async function list(path, headers) {
  const suffix = path.includes('?') ? '&' : '?';
  const result = await call(`${path}${suffix}ts=${Date.now()}`, { headers });
  if (!result.response.ok) throw new Error(`Cleanup list ${path} failed with HTTP ${result.response.status}.`);
  return rowsFrom(result.body);
}

async function mapLimited(items, limit, worker) {
  const rows = Array.from(items || []);
  const results = new Array(rows.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(rows[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function listCollections(kinds, headers, phase) {
  log(`${phase}: reading ${kinds.join(', ')} in parallel.`);
  const entries = await Promise.all(kinds.map(async (kind) => {
    const rows = await list(`/api/${kind}?limit=400`, headers);
    return [kind, rows];
  }));
  return new Map(entries);
}

async function main() {
  log(`Starting bounded cleanup against ${API_BASE}.`);
  const token = await login();
  const headers = { Authorization: `Bearer ${token}` };
  const failures = [];
  const commandSeen = new Set();
  let matched = 0;
  let cleaned = 0;

  const kinds = ['jobs', 'clients', 'quotes', 'invoices'];
  const initial = await listCollections(kinds, headers, 'Initial scan');
  const businessMatches = [];
  for (const [kind, rows] of initial.entries()) {
    for (const row of rows) if (matches(row) && !inactiveRecord(row)) businessMatches.push({ kind, row });
  }
  log(`Initial scan found ${businessMatches.length} active business fixture record(s).`);

  await mapLimited(businessMatches, 4, async ({ kind, row }) => {
    assertWithinDeadline(`${kind} cleanup`);
    matched += 1;
    const id = idOf(row);
    if (!id) { failures.push(`${kind}:missing-id`); return; }
    if (await removeBusinessRecord(kind, id, headers)) cleaned += 1;
    else failures.push(`${kind}:${id}`);
  });

  // Command slips are bounded and can be paged. Drain both the primary Command
  // slip and legacy worker field-slip decision paths, then prove the queue is clear.
  for (let round = 1; round <= 6; round += 1) {
    assertWithinDeadline(`Command cleanup round ${round}`);
    const commandRows = (await list('/api/command/slips?limit=400', headers)).filter((row) => matches(row) && !inactiveRecord(row));
    log(`Command round ${round} found ${commandRows.length} active matching slip(s): ${commandRows.map((row) => idOf(row)).filter(Boolean).slice(0, 12).join(', ') || 'none'}.`);
    if (!commandRows.length) break;
    let progressed = 0;
    await mapLimited(commandRows, 4, async (row) => {
      const id = idOf(row);
      if (id && !commandSeen.has(id)) { commandSeen.add(id); matched += 1; }
      if (await resolveCommandSlip(row, headers)) {
        progressed += 1;
        cleaned += 1;
      } else {
        failures.push(`command:${id || 'missing-id'}`);
      }
    });
    if (!progressed) break;
    await sleep(300);
  }

  // Message/notification rows are immutable audit history. Count them when the
  // backend is available, but never attempt destructive deletion.
  let historyMatches = [];
  try {
    const history = await Promise.all(['/api/messages?limit=400', '/api/notifications?limit=400'].map(async (path) => [path, await list(path, headers)]));
    historyMatches = history.flatMap(([path, rows]) => rows.filter(matches).map((row) => ({ path, id: idOf(row) })));
  } catch (error) {
    log(`Immutable history count unavailable: ${error.message || error}`);
  }

  const verification = await listCollections(kinds, headers, 'Verification');
  const remainingActive = [];
  for (const [kind, rows] of verification.entries()) {
    for (const row of rows) {
      if (matches(row) && !inactiveRecord(row)) remainingActive.push(`${kind}:${idOf(row) || 'missing-id'}`);
    }
  }
  for (const row of await list('/api/command/slips?limit=400', headers)) {
    if (matches(row) && !inactiveRecord(row)) remainingActive.push(`command:${idOf(row) || 'missing-id'}`);
  }

  log(`Matched ${matched} active audit record(s); cleanup routes accepted ${cleaned} resolution request(s).`);
  log(`Retained ${historyMatches.length} immutable message/notification audit entr${historyMatches.length === 1 ? 'y' : 'ies'}.`);
  if (failures.length || remainingActive.length) {
    throw new Error(`Cleanup incomplete. Failures: ${failures.join(', ') || 'none'}. Active remnants: ${remainingActive.join(', ') || 'none'}.`);
  }
  log('Cleanup verification passed with no confirmed active fixture remnants.');
}

main().catch((error) => {
  console.error(`[cleanup failed] ${error.message || error}`);
  process.exit(1);
});
