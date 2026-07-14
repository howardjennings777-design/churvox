#!/usr/bin/env node

const api = String(process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const ownerEmail = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const password = process.env.CHURVOX_OWNER_PASSWORD || '';
const expectedContract = 'churvox-command-runs-office-v1-20260715';
const marker = `COMMAND RECOMMENDATION LIVE PROOF ${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tokenFrom = (body = {}) => body.token || body.access_token || body.auth_token || body.jwt || body.accessToken
  || body.user?.token || body.user?.access_token || body.data?.token || body.data?.access_token || body.data?.user?.token || '';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function read(response) {
  return response.json().catch(async () => ({ text: (await response.text().catch(() => '')).slice(0, 1200) }));
}

async function request(path, { method = 'GET', token = '', data, timeoutMs = 35000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${api}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: controller.signal,
      cache: 'no-store',
    });
    return { response, body: await read(response) };
  } finally {
    clearTimeout(timer);
  }
}

function rowsFrom(payload) {
  const body = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  for (const key of ['slips', 'items', 'records', 'results', 'workers', 'team', 'members', 'jobs', 'data']) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
}

function idOf(row = {}) {
  const raw = row.id || row._id || row.job_id || row.worker_id || row.user_id || row.action_id || row.source_id || '';
  if (raw && typeof raw === 'object') return String(raw.$oid || raw.oid || raw.id || '');
  return String(raw || '');
}

function contains(value, text) {
  return JSON.stringify(value || {}).toLowerCase().includes(String(text || '').toLowerCase());
}

function activeWorker(row = {}) {
  const status = String(row.status || row.worker_status || row.employment_status || '').toLowerCase();
  const role = String(row.role || row.user_role || row.account_type || '').toLowerCase();
  return row.active !== false
    && row.is_active !== false
    && row.enabled !== false
    && !/inactive|disabled|deleted|archived|removed|former|left/.test(status)
    && !/owner|admin|manager|client|customer/.test(role);
}

async function login() {
  assert(ownerEmail && password, 'Live proof owner credential is missing.');
  const { response, body } = await request('/api/auth/login', {
    method: 'POST',
    data: { email: ownerEmail, password },
  });
  const token = tokenFrom(body);
  assert(response.ok && token, `Owner login failed ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  return token;
}

async function waitForDeployment(token) {
  let last = {};
  for (let attempt = 1; attempt <= 90; attempt += 1) {
    const result = await request(`/api/command/slips?limit=2&ts=${Date.now()}`, { token }).catch((error) => ({ response: { status: 0, ok: false }, body: { error: error.message } }));
    last = {
      status: result.response.status,
      success: result.body?.success,
      contract: result.body?.decision_contract_version || '',
      command_runs_office: result.body?.command_runs_office === true,
    };
    const ready = result.response.status === 200
      && result.body?.success === true
      && result.body?.decision_contract_version === expectedContract
      && result.body?.command_runs_office === true;
    console.log(`DEPLOY attempt=${attempt} ready=${ready} ${JSON.stringify(last)}`);
    if (ready) return;
    if (attempt < 90) await sleep(10000);
  }
  throw new Error(`COMMAND_RECOMMENDATION_NOT_DEPLOYED ${JSON.stringify(last)}`);
}

async function findWorkers(token) {
  const found = [];
  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
    const { response, body } = await request(`${endpoint}?ts=${Date.now()}`, { token });
    if (!response.ok) continue;
    for (const worker of rowsFrom(body)) {
      if (!activeWorker(worker)) continue;
      const id = idOf(worker);
      const name = String(worker.name || worker.full_name || worker.display_name || worker.email || '').trim();
      if (!id || !name) continue;
      if (!found.some((item) => item.id === id)) found.push({ id, name, raw: worker });
    }
  }
  assert(found.length > 0, 'No active worker was available for the live recommendation proof.');
  console.log(`ACTIVE_WORKERS count=${found.length} names=${found.map((item) => item.name).join(', ')}`);
  return found;
}

async function createUnassignedJob(token) {
  const scheduled = new Date(Date.now() + 2 * 86400000);
  const payload = {
    title: marker,
    job_title: marker,
    job_type: 'other',
    service_type: 'Lawn mowing and garden tidy',
    client_name: `${marker} CLIENT`,
    customer_name: `${marker} CLIENT`,
    address: '1 Command Proof Street, Wellington',
    scheduled_date: scheduled.toISOString().slice(0, 10),
    scheduled_time: '09:00',
    status: 'scheduled',
    price: 0,
    notes: 'Temporary marked audit job. Command must recommend a suitable worker and owner approval remains required.',
    source: 'command-recommendation-live-proof',
  };
  const { response, body } = await request('/api/jobs', { method: 'POST', token, data: payload });
  assert(response.ok && body?.success !== false, `Could not create unassigned proof job ${response.status}: ${JSON.stringify(body).slice(0, 900)}`);
  let record = body.job || body.record || body.data?.job || body.data?.record || body.data || body;
  let jobId = idOf(record);
  if (!jobId) {
    for (let attempt = 1; attempt <= 12 && !jobId; attempt += 1) {
      const listed = await request(`/api/jobs?limit=500&ts=${Date.now()}`, { token });
      const row = rowsFrom(listed.body).find((item) => contains(item, marker));
      jobId = idOf(row);
      if (!jobId) await sleep(1000);
    }
  }
  assert(jobId, 'Created proof job has no stable id.');
  console.log(`CREATED_JOB id=${jobId}`);
  return jobId;
}

function assertUniversalSlip(slip, label) {
  const payload = slip?.payload || {};
  const form = payload.prepared_form || {};
  assert(payload.command_runs_office === true, `${label}: command_runs_office marker missing`);
  assert(payload.decision_contract_version === expectedContract, `${label}: wrong decision contract ${payload.decision_contract_version}`);
  assert(String(payload.recommended_decision || '').trim(), `${label}: recommended_decision missing`);
  assert(String(payload.recommendation_reason || '').trim(), `${label}: recommendation_reason missing`);
  assert(Array.isArray(payload.approval_effect) && payload.approval_effect.length > 0, `${label}: approval_effect missing`);
  assert(Object.prototype.hasOwnProperty.call(form, 'Churvox recommends'), `${label}: Churvox recommends field missing`);
  assert(slip.prepared_only === true && slip.owner_review_only === true, `${label}: owner-review top-level flags missing`);
  assert(payload.no_auto_send === true && payload.no_auto_sync === true && payload.no_auto_charge === true && payload.no_auto_record_change === true, `${label}: safety flags missing`);
}

async function scanForAssignment(token, jobId) {
  let last = {};
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const { response, body } = await request('/api/command/scan', {
      method: 'POST', token,
      data: { source: `command_recommendation_live_proof_${attempt}`, prepared_only: true, owner_review_only: true },
      timeoutMs: 45000,
    });
    assert(response.ok && body?.success === true, `Command scan failed ${response.status}: ${JSON.stringify(body).slice(0, 900)}`);
    assert(body.decision_contract_version === expectedContract && body.command_runs_office === true, `Scan did not return the runs-office contract: ${JSON.stringify({ contract: body.decision_contract_version, marker: body.command_runs_office })}`);
    const all = [...(body.slips || []), ...(body.existing || [])];
    for (const [index, slip] of all.entries()) assertUniversalSlip(slip, `scan slip ${index + 1}`);
    const assignment = all.find((slip) => String(slip.source_id || slip.payload?.record_id || '') === jobId || contains(slip, marker));
    last = { attempt, total: all.length, created: body.created_count || 0, existing: body.existing_count || 0 };
    console.log(`SCAN ${JSON.stringify(last)}`);
    if (assignment) return assignment;
    if (attempt < 10) await sleep(1500);
  }
  throw new Error(`No assignment Command slip found for ${jobId}: ${JSON.stringify(last)}`);
}

function assertWorkerRecommendation(slip, activeWorkers) {
  assertUniversalSlip(slip, 'worker assignment slip');
  const payload = slip.payload || {};
  const form = payload.prepared_form || {};
  const recommended = payload.recommended_worker || {};
  const recommendedName = String(recommended.name || '').trim();
  assert(recommendedName, 'Worker recommendation has no name.');
  assert(activeWorkers.some((worker) => worker.name.toLowerCase() === recommendedName.toLowerCase()), `Recommended worker ${recommendedName} is not in the active team proof set.`);
  assert(String(form.Worker || '').trim() === recommendedName, `Worker field was not filled with ${recommendedName}: ${form.Worker}`);
  assert(String(form['Recommended worker'] || '').trim() === recommendedName, 'Recommended worker field does not match Worker field.');
  assert(!/owner to choose|choose a worker/i.test(JSON.stringify(form)), 'Command still hands worker selection back to the owner.');
  for (const field of ['Why this worker', 'Backup workers', 'Schedule / capacity check']) {
    assert(Object.prototype.hasOwnProperty.call(form, field), `Worker recommendation is missing ${field}`);
  }
  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  assert(actions.includes(`Approve ${recommendedName}`), `Direct approval action for ${recommendedName} is missing: ${JSON.stringify(actions)}`);
  assert(payload.worker_action_map?.[`Approve ${recommendedName}`]?.name === recommendedName, 'Worker approval action map is missing.');
  console.log(`WORKER_RECOMMENDATION name=${recommendedName} actions=${JSON.stringify(actions)} reasons=${JSON.stringify(recommended.reasons || [])}`);
}

async function createGenericSlip(token) {
  const payload = {
    source_type: 'message',
    action_type: 'prepare_customer_reply',
    source_id: `command-recommendation-generic-${Date.now()}`,
    title: `${marker} GENERIC`,
    found: 'A marked customer message needs a safe prepared reply.',
    prepared: 'Receptionist prepared a cautious internal reply draft.',
    why: 'Owner approval is required.',
    urgency: 'Owner review',
    payload: {
      prepared_form: { Client: 'Command Proof Client', 'Prepared reply': 'Thanks — we will confirm the details after the owner checks the records.' },
      field_sources: {},
      evidence: ['Marked inbound message', 'No date or price promised'],
      confidence: { score: 0.9, why: ['Message intent checked', 'Unverified promises avoided'] },
      actions: ['Approve reply draft', 'Handle personally', 'Park'],
      will_do: ['Create an internal reply draft', 'Keep it unsent'],
      prepared_only: true,
      owner_review_only: true,
      no_auto_send: true,
      no_auto_sync: true,
      no_auto_charge: true,
      no_auto_record_change: true,
    },
  };
  const { response, body } = await request('/api/command/slips', { method: 'POST', token, data: payload });
  assert(response.ok && body?.success !== false, `Could not create generic proof slip ${response.status}: ${JSON.stringify(body).slice(0, 900)}`);
  return idOf(body.slip || body.data?.slip || body.data || body);
}

async function fetchGenericSlip(token) {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const { response, body } = await request(`/api/command/slips?limit=400&ts=${Date.now()}`, { token });
    assert(response.ok && body?.success === true, `Could not list generic slip ${response.status}`);
    assert(body.decision_contract_version === expectedContract && body.command_runs_office === true, 'GET Command slips did not return the recommendation contract.');
    const slip = rowsFrom(body).find((item) => contains(item, `${marker} GENERIC`));
    if (slip) return slip;
    if (attempt < 10) await sleep(1000);
  }
  throw new Error('Generic proof slip was not returned by Command.');
}

function assertGenericRecommendation(slip) {
  assertUniversalSlip(slip, 'generic slip');
  const payload = slip.payload || {};
  const form = payload.prepared_form || {};
  for (const field of ['Churvox recommends', 'Why this is the best next step', 'Other safe options', 'What approval will do']) {
    assert(Object.prototype.hasOwnProperty.call(form, field), `Generic slip is missing ${field}`);
  }
  assert(String(form['Churvox recommends']).startsWith('Approve reply draft.'), `Generic recommendation does not lead with the prepared action: ${form['Churvox recommends']}`);
  console.log(`GENERIC_RECOMMENDATION ${JSON.stringify({ recommendation: payload.recommended_decision, alternatives: payload.alternatives, effect: payload.approval_effect })}`);
}

async function resolveSlip(token, slipId) {
  if (!slipId) return;
  let result = await request(`/api/command/slips/${encodeURIComponent(slipId)}/ignore`, {
    method: 'POST', token, data: { action: 'Ignore', note: 'Command recommendation live proof cleanup' },
  });
  if (result.response.ok || result.response.status === 404) return;
  result = await request(`/api/command/field-slips/${encodeURIComponent(slipId)}/dismiss`, {
    method: 'POST', token, data: { note: 'Command recommendation live proof cleanup' },
  });
  assert(result.response.ok || result.response.status === 404, `Could not resolve proof slip ${slipId}: ${result.response.status}`);
}

async function cleanupJob(token, jobId) {
  if (!jobId) return;
  let result = await request(`/api/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE', token });
  if (result.response.ok || result.response.status === 404) return;
  result = await request(`/api/jobs/${encodeURIComponent(jobId)}/archive`, {
    method: 'POST', token, data: { archived: true, status: 'archived', archive_reason: 'command recommendation live proof cleanup' },
  });
  if (result.response.ok || result.response.status === 404) return;
  result = await request(`/api/jobs/${encodeURIComponent(jobId)}`, {
    method: 'PATCH', token, data: { archived: true, status: 'archived', archive_reason: 'command recommendation live proof cleanup' },
  });
  assert(result.response.ok || result.response.status === 404, `Could not clean proof job ${jobId}: ${result.response.status}`);
}

(async () => {
  const token = await login();
  let jobId = '';
  let assignmentSlipId = '';
  let genericSlipId = '';
  try {
    await waitForDeployment(token);
    const workers = await findWorkers(token);
    jobId = await createUnassignedJob(token);
    const assignment = await scanForAssignment(token, jobId);
    assignmentSlipId = idOf(assignment);
    assert(assignmentSlipId, 'Assignment slip has no stable id.');
    assertWorkerRecommendation(assignment, workers);

    genericSlipId = await createGenericSlip(token);
    const generic = await fetchGenericSlip(token);
    genericSlipId = idOf(generic) || genericSlipId;
    assertGenericRecommendation(generic);

    console.log(`LIVE_PROOF_SUMMARY ${JSON.stringify({ contract: expectedContract, job_id: '[hidden]', assignment_slip_id: '[hidden]', generic_slip_id: '[hidden]' })}`);
    console.log('COMMAND_RECOMMENDATION_LIVE_PROOF_PASS');
  } finally {
    await resolveSlip(token, assignmentSlipId).catch((error) => console.error(`CLEANUP_ASSIGNMENT ${error.message || error}`));
    await resolveSlip(token, genericSlipId).catch((error) => console.error(`CLEANUP_GENERIC ${error.message || error}`));
    await cleanupJob(token, jobId).catch((error) => console.error(`CLEANUP_JOB ${error.message || error}`));
  }
})().catch((error) => {
  console.error(`COMMAND_RECOMMENDATION_LIVE_PROOF_ERROR ${error.message || error}`);
  process.exit(1);
});
