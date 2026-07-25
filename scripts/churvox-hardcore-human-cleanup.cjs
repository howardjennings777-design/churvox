#!/usr/bin/env node

const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const MARKERS = /Human Client |Human Job |Human Quote |HUMAN-INV-|Boss to worker |Human worker |HARDCORE boss-worker |Hardcore Test Client |hardcore-owner-worker-test|HUMAN CURRENT |STUDIO HUMAN /i;

function tokenFrom(body = {}) {
  return body.token || body.access_token || body.user?.token || body.data?.token || body.data?.user?.token || '';
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
  if (row.archived_at || row.deleted_at) return true;
  return /archived|deleted|dismissed|rejected/i.test(String(row.status || row.state || ''));
}

async function call(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let body = {};
  try { body = JSON.parse(text); } catch { body = { text: text.slice(0, 300) }; }
  return { response, body };
}

async function login() {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Owner cleanup credentials are missing.');
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
  let result = await call(`/api/command/slips/${encodeURIComponent(id)}/ignore`, {
    method: 'POST', headers, body: JSON.stringify({ action: 'Ignore', note: 'Hardcore human audit cleanup' }),
  });
  if (result.response.ok || result.response.status === 404) return true;
  result = await call(`/api/command/field-slips/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST', headers, body: JSON.stringify({ note: 'Hardcore human audit cleanup' }),
  });
  return result.response.ok || result.response.status === 404;
}

async function list(path, headers) {
  const suffix = path.includes('?') ? '&' : '?';
  const result = await call(`${path}${suffix}ts=${Date.now()}`, { headers });
  return result.response.ok ? rowsFrom(result.body) : [];
}

async function main() {
  const token = await login();
  const headers = { Authorization: `Bearer ${token}` };
  const failures = [];
  const settled = new Set();
  const commandSeen = new Set();
  let matched = 0;
  let cleaned = 0;

  for (const kind of ['jobs', 'clients', 'quotes', 'invoices']) {
    for (const row of await list(`/api/${kind}?limit=400`, headers)) {
      if (!matches(row)) continue;
      matched += 1;
      const id = idOf(row);
      if (!id) { failures.push(`${kind}:missing-id`); continue; }
      if (await removeBusinessRecord(kind, id, headers)) { cleaned += 1; settled.add(`${kind}:${id}`); }
      else failures.push(`${kind}:${id}`);
    }
  }

  // The live Command endpoint can expose a bounded page. Drain successive
  // pages until no matching active audit slips remain instead of cleaning only page one.
  for (let round = 0; round < 24; round += 1) {
    const commandRows = (await list('/api/command/slips?limit=400', headers)).filter((row) => matches(row) && !inactiveRecord(row));
    if (!commandRows.length) break;
    let progressed = 0;
    for (const row of commandRows) {
      const id = idOf(row);
      if (id && !commandSeen.has(id)) { commandSeen.add(id); matched += 1; }
      if (await resolveCommandSlip(row, headers)) {
        progressed += 1;
        cleaned += 1;
        if (id) settled.add(`command:${id}`);
      } else {
        failures.push(`command:${id || 'missing-id'}`);
      }
    }
    if (!progressed) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  // Messages and notifications are immutable audit history. They are checked for safety but are not treated as active business records.
  const historyMatches = [];
  for (const path of ['/api/messages?limit=400', '/api/notifications?limit=400']) {
    for (const row of await list(path, headers)) if (matches(row)) historyMatches.push({ path, id: idOf(row) });
  }

  const remainingActive = [];
  for (const kind of ['jobs', 'clients', 'quotes', 'invoices']) {
    for (const row of await list(`/api/${kind}?limit=400`, headers)) { const key = `${kind}:${idOf(row)}`; if (matches(row) && !inactiveRecord(row) && !settled.has(key)) remainingActive.push(key); }
  }
  for (const row of await list('/api/command/slips?limit=400', headers)) { const key = `command:${idOf(row)}`; if (matches(row) && !inactiveRecord(row) && !settled.has(key)) remainingActive.push(key); }

  console.log(`Cleanup matched ${matched} active audit records and cleaned/resolved ${cleaned}.`);
  console.log(`Retained ${historyMatches.length} immutable message/notification audit entries.`);
  if (failures.length || remainingActive.length) {
    throw new Error(`Cleanup incomplete. Failures: ${failures.join(', ') || 'none'}. Active remnants: ${remainingActive.join(', ') || 'none'}.`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
