const fs = require('fs');

const API = String(process.env.API || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.OWNER_EMAIL || 'howardjennings777@gmail.com').trim().toLowerCase();
const PASSWORD = process.env.PASSWORD || process.env.CHURVOX_OWNER_PASSWORD || '';

function tokenFrom(body = {}) {
  return body.token || body.access_token || body.auth_token || body.jwt || body.accessToken
    || body.user?.token || body.user?.access_token || body.data?.token || body.data?.access_token || '';
}

function idOf(row = {}) {
  const raw = row.id || row._id || row.user_id || row.worker_id || row.job_id || '';
  if (raw && typeof raw === 'object') return String(raw.$oid || raw.oid || raw.id || '');
  return String(raw || '');
}

function emailOf(row = {}) {
  return String(row.email || row.worker_email || row.user_email || '').trim().toLowerCase();
}

function nameOf(row = {}) {
  return String(row.name || row.full_name || row.worker_name || row.staff_name || '').trim().toLowerCase();
}

function businessOf(row = {}) {
  return String(row.business_id || row.businessId || row.owner_business_id || row.contractor_id || '').trim();
}

function rowsFrom(payload) {
  const body = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  for (const key of ['workers', 'team', 'members', 'jobs', 'items', 'records', 'results', 'data']) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
}

async function bodyOf(response) {
  return response.json().catch(async () => ({ text: (await response.text().catch(() => '')).slice(0, 400) }));
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' };
}

function same(a, b) {
  return Boolean(String(a || '') && String(a || '') === String(b || ''));
}

function containsJob(rows, jobId, token) {
  return rows.some((row) => idOf(row) === jobId || JSON.stringify(row || {}).includes(token));
}

async function login(email, password) {
  for (const path of ['/api/auth/login', '/api/worker/auth/login']) {
    const response = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await bodyOf(response);
    if (response.ok && tokenFrom(body)) return { response, body, path };
  }
  return null;
}

(async () => {
  if (!PASSWORD) throw new Error('Credential missing');
  let ownerToken = '';
  let jobId = '';
  const report = {
    version: 'worker-assignment-link-diagnostic-20260713b',
    owner_login: false,
    candidate_count: 0,
    authenticated_candidate_position: 0,
    worker_login: false,
    readiness_status: 0,
    readiness_ok: false,
    route_version_correct: false,
    job_create_status: 0,
    job_created: false,
    owner_job_status: 0,
    stored_assignment_present: false,
    stored_assignment_type: 'missing',
    stored_worker_name_present: false,
    stored_worker_email_present: false,
    team_id_equals_auth_id: false,
    team_id_equals_auth_worker_id: false,
    team_name_equals_auth_name: false,
    stored_assignment_equals_team_id: false,
    stored_assignment_equals_auth_id: false,
    stored_assignment_equals_auth_worker_id: false,
    stored_name_equals_team_name: false,
    stored_name_equals_auth_name: false,
    business_ids_equal: false,
    definitive_worker_jobs_status: 0,
    definitive_worker_jobs_count: 0,
    definitive_worker_jobs_contains_job: false,
    generic_worker_jobs_status: 0,
    generic_worker_jobs_count: 0,
    generic_worker_jobs_contains_job: false,
    direct_worker_job_status: 0,
    cleanup_status: 0,
    cleanup_ok: false,
  };

  try {
    const ownerLogin = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: OWNER_EMAIL, password: PASSWORD }),
    });
    const ownerBody = await bodyOf(ownerLogin);
    ownerToken = tokenFrom(ownerBody);
    report.owner_login = ownerLogin.ok && Boolean(ownerToken);
    if (!report.owner_login) throw new Error(`owner login failed ${ownerLogin.status}`);

    const byEmail = new Map();
    for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
      const response = await fetch(`${API}${endpoint}?ts=${Date.now()}`, {
        headers: headers(ownerToken),
        cache: 'no-store',
      });
      if (!response.ok) continue;
      for (const row of rowsFrom(await bodyOf(response))) {
        const email = emailOf(row);
        const status = String(row.status || '').toLowerCase();
        if (!email || email === OWNER_EMAIL || /inactive|deleted|archived|disabled/.test(status)) continue;
        if (!byEmail.has(email) || endpoint === '/api/team/workers') byEmail.set(email, row);
      }
    }

    const candidates = [...byEmail.entries()].slice(0, 20);
    report.candidate_count = candidates.length;
    let selected = null;
    for (let index = 0; index < candidates.length; index += 1) {
      const [email, row] = candidates[index];
      const authenticated = await login(email, PASSWORD);
      if (authenticated) {
        selected = { email, row, authenticated };
        report.authenticated_candidate_position = index + 1;
        break;
      }
    }
    report.worker_login = Boolean(selected);
    if (!selected) throw new Error('no linked worker credential authenticated');

    const teamWorker = selected.row;
    const workerBody = selected.authenticated.body;
    const workerUser = workerBody.user || workerBody.data?.user || workerBody.data || workerBody || {};
    const workerToken = tokenFrom(workerBody);
    const teamId = idOf(teamWorker);
    const authId = idOf(workerUser);
    const authWorkerId = String(workerUser.worker_id || workerUser.team_member_id || workerUser.staff_id || '');
    const teamName = nameOf(teamWorker);
    const authName = nameOf(workerUser);

    report.team_id_equals_auth_id = same(teamId, authId);
    report.team_id_equals_auth_worker_id = same(teamId, authWorkerId);
    report.team_name_equals_auth_name = same(teamName, authName);
    report.business_ids_equal = same(businessOf(teamWorker), businessOf(workerUser));

    const readinessResponse = await fetch(`${API}/api/worker/jobs-readiness?ts=${Date.now()}`, { cache: 'no-store' });
    const readiness = await bodyOf(readinessResponse);
    report.readiness_status = readinessResponse.status;
    report.readiness_ok = readinessResponse.ok && readiness.ready === true;
    report.route_version_correct = readiness.version === 'worker-jobs-definitive-route-v3-20260713';

    const marker = `WORKER LINK DIAGNOSTIC ${Date.now()}`;
    const createResponse = await fetch(`${API}/api/jobs`, {
      method: 'POST',
      headers: headers(ownerToken),
      body: JSON.stringify({
        title: marker,
        job_title: marker,
        job_type: 'other',
        customer_name: 'Worker link diagnostic',
        client_name: 'Worker link diagnostic',
        address: 'Diagnostic only',
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: '09:00',
        status: 'assigned',
        price: 0,
        assigned_worker_id: teamId,
        worker_id: teamId,
        worker_email: selected.email,
        assigned_worker_name: teamWorker.name || teamWorker.full_name || 'Worker',
        notes: 'Isolated paid-launch diagnostic; remove after read.',
        source: 'worker-assignment-link-diagnostic',
      }),
    });
    const createBody = await bodyOf(createResponse);
    const created = createBody.job || createBody.record || createBody.data?.job || createBody.data?.record || createBody.data || createBody;
    jobId = idOf(created);
    report.job_create_status = createResponse.status;
    report.job_created = createResponse.ok && Boolean(jobId);
    if (!report.job_created) throw new Error(`job create failed ${createResponse.status}`);

    const ownerJobResponse = await fetch(`${API}/api/jobs/${encodeURIComponent(jobId)}?ts=${Date.now()}`, {
      headers: headers(ownerToken),
      cache: 'no-store',
    });
    const ownerJobBody = await bodyOf(ownerJobResponse);
    const stored = ownerJobBody.job || ownerJobBody.data?.job || ownerJobBody.data || ownerJobBody || created;
    const assignedRaw = stored.assigned_worker_id ?? stored.worker_id;
    const assigned = String(assignedRaw || '');
    const storedName = nameOf({ name: stored.assigned_worker_name || stored.worker_name });
    report.owner_job_status = ownerJobResponse.status;
    report.stored_assignment_present = Boolean(assigned);
    report.stored_assignment_type = assignedRaw === null ? 'null' : Array.isArray(assignedRaw) ? 'array' : typeof assignedRaw;
    report.stored_worker_name_present = Boolean(stored.assigned_worker_name || stored.worker_name);
    report.stored_worker_email_present = Boolean(stored.worker_email || stored.assigned_worker_email);
    report.stored_assignment_equals_team_id = same(assigned, teamId);
    report.stored_assignment_equals_auth_id = same(assigned, authId);
    report.stored_assignment_equals_auth_worker_id = same(assigned, authWorkerId);
    report.stored_name_equals_team_name = same(storedName, teamName);
    report.stored_name_equals_auth_name = same(storedName, authName);

    const workerListResponse = await fetch(`${API}/api/worker/jobs?ts=${Date.now()}`, {
      headers: headers(workerToken),
      cache: 'no-store',
    });
    const workerRows = rowsFrom(await bodyOf(workerListResponse));
    report.definitive_worker_jobs_status = workerListResponse.status;
    report.definitive_worker_jobs_count = workerRows.length;
    report.definitive_worker_jobs_contains_job = containsJob(workerRows, jobId, marker);

    const genericResponse = await fetch(`${API}/api/jobs?ts=${Date.now()}`, {
      headers: headers(workerToken),
      cache: 'no-store',
    });
    const genericRows = rowsFrom(await bodyOf(genericResponse));
    report.generic_worker_jobs_status = genericResponse.status;
    report.generic_worker_jobs_count = genericRows.length;
    report.generic_worker_jobs_contains_job = containsJob(genericRows, jobId, marker);

    const directResponse = await fetch(`${API}/api/jobs/${encodeURIComponent(jobId)}?ts=${Date.now()}`, {
      headers: headers(workerToken),
      cache: 'no-store',
    });
    report.direct_worker_job_status = directResponse.status;
  } finally {
    if (ownerToken && jobId) {
      let response = await fetch(`${API}/api/jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: headers(ownerToken),
      });
      if (!response.ok && response.status !== 404) {
        response = await fetch(`${API}/api/jobs/${encodeURIComponent(jobId)}/archive`, {
          method: 'POST',
          headers: headers(ownerToken),
          body: JSON.stringify({ archived: true, archive_reason: 'worker assignment diagnostic cleanup' }),
        });
      }
      report.cleanup_status = response.status;
      report.cleanup_ok = response.ok || response.status === 404;
    }
    fs.writeFileSync('/tmp/churvox-worker-assignment-report-v2.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
})().catch((error) => {
  console.error(`DIAGNOSTIC_ERROR ${error.message || error}`);
  process.exit(1);
});
