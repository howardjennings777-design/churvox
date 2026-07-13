const api = String(process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const ownerEmail = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const password = process.env.CHURVOX_OWNER_PASSWORD || '';
const expectedVersion = 'churvox-final-owner-messages-v17-20260714';
const expectedOwner = 'final_owner_messages_wrapper';
const run = Date.now();
const title = `HARDCORE v17 completion proof ${run}`;
const note = `Complete ${run} with proof`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const read = async (response) => response.json().catch(async () => ({ text: (await response.text().catch(() => '')).slice(0, 600) }));
const tokenFrom = (body = {}) => body.token || body.access_token || body.auth_token || body.jwt || body.accessToken || body.user?.token || body.user?.access_token || body.data?.token || body.data?.access_token || '';
const rowsFrom = (payload) => {
  const body = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  for (const key of ['items','records','results','workers','team','members','jobs','messages','notifications','slips','actions','data']) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
};
const idOf = (row = {}) => String(row.id || row._id || row.event_id || row.notification_id || row.message_id || row.action_id || row.source_id || '');
const emailOf = (row = {}) => String(row.email || row.worker_email || row.user_email || '').trim().toLowerCase();
const contains = (value, token) => JSON.stringify(value || {}).toLowerCase().includes(String(token || '').toLowerCase());
const auth = (token, json = false) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json', ...(json ? { 'Content-Type': 'application/json' } : {}) });
const typeOf = (row = {}) => String(row.type || row.kind || row.event_type || row.action_type || row.source_type || 'unknown').toLowerCase();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForDeployment() {
  let last = {};
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    const readyResponse = await fetch(`${api}/api/messages/readiness?ts=${Date.now()}`, { cache: 'no-store' }).catch(() => null);
    const ready = readyResponse ? await read(readyResponse) : {};
    const bootResponse = await fetch(`${api}/api/command-fast-load/boot?ts=${Date.now()}`, { cache: 'no-store' }).catch(() => null);
    const boot = bootResponse ? await read(bootResponse) : {};
    last = {
      readiness_status: readyResponse?.status || 0,
      version: String(ready.version || ''),
      route_owner: String(ready.route_owner || ''),
      boot_status: bootResponse?.status || 0,
      boot_installed: boot.owner_messages_patch_installed === true,
      boot_version: String(boot.owner_messages_version || ''),
      boot_error: Boolean(boot.owner_messages_error),
    };
    const exact = readyResponse?.status === 200
      && ready.ready === true
      && ready.version === expectedVersion
      && ready.route_owner === expectedOwner
      && bootResponse?.status === 200
      && boot.owner_messages_patch_installed === true
      && boot.owner_messages_version === expectedVersion
      && !boot.owner_messages_error;
    console.log(`DEPLOY attempt=${attempt} exact=${exact} ${JSON.stringify(last)}`);
    if (exact) return last;
    if (attempt < 120) await sleep(10_000);
  }
  throw new Error(`V17_NOT_DEPLOYED ${JSON.stringify(last)}`);
}

async function login(email) {
  for (const path of ['/api/auth/login', '/api/worker/auth/login']) {
    const response = await fetch(`${api}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await read(response);
    const token = tokenFrom(body);
    if (response.ok && token) return token;
  }
  return '';
}

async function cleanup(ownerToken, jobId) {
  if (!jobId) return;
  let response = await fetch(`${api}/api/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE', headers: auth(ownerToken) }).catch(() => null);
  if (!response || (!response.ok && response.status !== 404)) {
    await fetch(`${api}/api/jobs/${encodeURIComponent(jobId)}/archive`, {
      method: 'POST',
      headers: auth(ownerToken, true),
      body: JSON.stringify({ archived: true, archive_reason: 'v17 completion proof cleanup' }),
    }).catch(() => null);
  }
}

(async () => {
  assert(ownerEmail && password, 'Launch credential missing');
  let ownerToken = '';
  let jobId = '';
  try {
    const deployment = await waitForDeployment();
    console.log(`EXACT_V17_DEPLOYMENT ${JSON.stringify(deployment)}`);

    ownerToken = await login(ownerEmail);
    assert(ownerToken, 'Owner login failed');

    const candidates = [];
    for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
      const response = await fetch(`${api}${endpoint}?ts=${Date.now()}`, { headers: auth(ownerToken), cache: 'no-store' });
      if (!response.ok) continue;
      for (const row of rowsFrom(await read(response))) {
        const email = emailOf(row);
        const status = String(row.status || '').toLowerCase();
        if (!email || email === ownerEmail || /inactive|deleted|archived|disabled/.test(status) || candidates.some((item) => item.email === email)) continue;
        candidates.push({ email, row });
      }
    }

    let workerToken = '';
    let worker = null;
    for (const candidate of candidates.slice(0, 12)) {
      const token = await login(candidate.email);
      if (token) {
        workerToken = token;
        worker = candidate.row;
        break;
      }
    }
    assert(workerToken && worker, 'No linked worker could authenticate');
    const workerId = String(worker.id || worker._id || worker.worker_id || worker.user_id || '');
    const workerEmail = emailOf(worker);
    assert(workerId, 'Linked worker has no stable id');

    const createResponse = await fetch(`${api}/api/jobs`, {
      method: 'POST',
      headers: auth(ownerToken, true),
      body: JSON.stringify({
        title,
        job_title: title,
        job_type: 'other',
        client_name: `V17 Proof Client ${run}`,
        customer_name: `V17 Proof Client ${run}`,
        address: '1 Proof Street, Wellington',
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: '09:00',
        status: 'assigned',
        price: 0,
        assigned_worker_id: workerId,
        worker_id: workerId,
        worker_email: workerEmail,
        assigned_worker_name: worker.name || worker.full_name || 'Linked worker',
        source: 'v17-completion-proof',
      }),
    });
    const created = await read(createResponse);
    assert(createResponse.ok, `Job create failed ${createResponse.status}`);
    const job = created.job || created.record || created.data?.job || created.data?.record || created.data || created;
    jobId = String(job.id || job._id || job.job_id || '');
    assert(jobId, 'Created job has no id');

    const completeResponse = await fetch(`${api}/api/worker/jobs/${encodeURIComponent(jobId)}/complete`, {
      method: 'POST',
      headers: auth(workerToken, true),
      body: JSON.stringify({
        worker_notes: note,
        note,
        proof_photo_names: [`v17-proof-${run}.jpg`],
        proof_photo_count: 1,
        source: 'v17-completion-proof',
      }),
    });
    const completeBody = await read(completeResponse);
    assert(completeResponse.ok && completeBody.success !== false, `Complete failed ${completeResponse.status}`);

    const paths = ['/api/notifications?limit=160', '/api/messages?limit=160', '/api/command/slips'];
    let passed = false;
    let lastReport = {};
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      await sleep(attempt === 1 ? 700 : 1600);
      const report = {};
      for (const path of paths) {
        const response = await fetch(`${api}${path}${path.includes('?') ? '&' : '?'}ts=${Date.now()}`, {
          headers: { ...auth(ownerToken), 'X-Churvox-Command-Refresh': 'churvox-command-force-refresh-v4-20260713' },
          cache: 'no-store',
        });
        const body = await read(response);
        const rows = response.ok ? rowsFrom(body) : [];
        const matches = rows.filter((row) => contains(row, title) && /job_complete|job_completed|finished the job|complete/i.test(JSON.stringify(row)));
        const unique = new Set(matches.map((row) => idOf(row) || JSON.stringify(row))).size;
        const types = {};
        for (const row of matches) types[typeOf(row)] = (types[typeOf(row)] || 0) + 1;
        report[path.split('?')[0]] = {
          status: response.status,
          rows: rows.length,
          matches: matches.length,
          unique,
          types,
          route_owner: body.route_owner || '',
          dedupe_version: body.dedupe_version || '',
        };
      }
      lastReport = report;
      const notifications = report['/api/notifications'];
      const messages = report['/api/messages'];
      const command = report['/api/command/slips'];
      passed = notifications.status === 200 && notifications.matches === 1
        && messages.status === 200 && messages.matches === 1 && messages.unique === 1
        && messages.route_owner === expectedOwner && messages.dedupe_version === expectedVersion
        && command.status === 200 && command.matches === 0;
      console.log(`ATTEMPT ${attempt} pass=${passed} ${JSON.stringify(report)}`);
      if (passed) break;
    }

    assert(passed, `COMPLETION_TRUTH_FAILED ${JSON.stringify(lastReport)}`);
    console.log('EXACT_V17_COMPLETION_CHANNEL_PROOF_PASS');
  } finally {
    if (ownerToken) await cleanup(ownerToken, jobId);
  }
})().catch((error) => {
  console.error(`V17_PROOF_ERROR ${error.message || error}`);
  process.exit(1);
});
