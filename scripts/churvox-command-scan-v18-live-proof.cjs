const api = String(process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const ownerEmail = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const password = process.env.CHURVOX_OWNER_PASSWORD || '';
const expectedPerformance = 'churvox-command-scan-performance-v18-20260714';
const expectedSource = 'human-mimic-intelligence-v3';
const expectedGuard = 'human-mimic-strict-preflight-v3';
const roles = ['Office Manager','Receptionist','Bookkeeper','Accountant','Payroll Clerk','Client Memory','Quality Checker','Operations Manager'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tokenFrom = (body = {}) => body.token || body.access_token || body.auth_token || body.jwt || body.accessToken || body.user?.token || body.user?.access_token || body.data?.token || body.data?.access_token || '';
const read = async (response) => response.json().catch(async () => ({ text: (await response.text().catch(() => '')).slice(0, 700) }));
function assert(condition, message) { if (!condition) throw new Error(message); }

async function login() {
  const response = await fetch(`${api}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ownerEmail, password }),
  });
  const body = await read(response);
  const token = tokenFrom(body);
  assert(response.ok && token, `Owner login failed ${response.status}`);
  return token;
}

async function waitForDeployment(token) {
  let last = {};
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    const response = await fetch(`${api}/api/paid-launch/backend-readiness?ts=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    }).catch(() => null);
    const body = response ? await read(response) : {};
    last = {
      status: response?.status || 0,
      marker: String(body.marker || ''),
      performance: String(body.command_scan_performance || ''),
      timeout_seconds: Number(body.command_scan_timeout_seconds || 0),
      indexes_ready: body.indexes_ready === true,
    };
    const exact = response?.status === 200
      && body.success === true
      && body.command_scan_performance === expectedPerformance
      && body.command_scan_timeout_seconds === 25
      && body.indexes_ready === true;
    console.log(`DEPLOY attempt=${attempt} exact=${exact} ${JSON.stringify(last)}`);
    if (exact) return last;
    if (attempt < 120) await sleep(10_000);
  }
  throw new Error(`V18_NOT_DEPLOYED ${JSON.stringify(last)}`);
}

async function scan(token, attempt) {
  const started = Date.now();
  const response = await fetch(`${api}/api/command/scan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: `command_scan_v18_live_proof_${attempt}`,
      prepared_only: true,
      owner_review_only: true,
    }),
  });
  const elapsedMs = Date.now() - started;
  const body = await read(response);
  const safe = {
    attempt,
    status: response.status,
    elapsed_ms: elapsedMs,
    source: body.source || '',
    guard: body.guard || '',
    performance_version: body.performance_version || '',
    stage_timings_ms: body.stage_timings_ms || {},
    created_count: body.created_count || 0,
    existing_count: body.existing_count || 0,
    superseded_count: body.superseded_count || 0,
    scan_complete: body.scan_complete === true,
    scan_error_count: Array.isArray(body.scan_errors) ? body.scan_errors.length : -1,
  };
  console.log(`SCAN ${JSON.stringify(safe)}`);
  assert(response.status === 200 && body.success === true, `Scan ${attempt} failed ${response.status}: ${JSON.stringify(body).slice(0, 900)}`);
  assert(elapsedMs < 25_000, `Scan ${attempt} exceeded 25-second fail-safe: ${elapsedMs}ms`);
  assert(body.source === expectedSource, `Wrong source ${body.source}`);
  assert(body.guard === expectedGuard, `Wrong guard ${body.guard}`);
  assert(body.performance_version === expectedPerformance, `Wrong performance marker ${body.performance_version}`);
  assert(body.scan_complete === true && Array.isArray(body.scan_errors) && body.scan_errors.length === 0, `Scan incomplete: ${JSON.stringify(body.scan_errors || [])}`);
  assert(Number(body.stage_timings_ms?.total_ms || 0) > 0 && Number(body.stage_timings_ms?.total_ms || 0) < 25_000, `Invalid stage timings ${JSON.stringify(body.stage_timings_ms || {})}`);
  const checked = new Set(body.roles_checked || []);
  const missing = roles.filter((role) => !checked.has(role));
  assert(missing.length === 0, `Roles missing: ${missing.join(', ')}`);
  for (const slip of [...(body.slips || []), ...(body.existing || [])]) {
    const payload = slip?.payload || {};
    assert(slip.prepared_only === true && slip.owner_review_only === true, 'Unsafe top-level owner-review flags');
    assert(payload.no_auto_send === true && payload.no_auto_sync === true && payload.no_auto_charge === true && payload.no_auto_record_change === true, 'Unsafe Command payload flags');
  }
  const safety = String(body.safety || '').toLowerCase();
  for (const phrase of ['owner approval', 'nothing was sent', 'synced', 'charged', 'changed']) assert(safety.includes(phrase), `Safety text missing ${phrase}`);
  return safe;
}

(async () => {
  assert(ownerEmail && password, 'Launch credential missing');
  const token = await login();
  const deployment = await waitForDeployment(token);
  console.log(`EXACT_V18_DEPLOYMENT ${JSON.stringify(deployment)}`);
  const results = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) results.push(await scan(token, attempt));
  const maxMs = Math.max(...results.map((item) => item.elapsed_ms));
  const averageMs = Math.round(results.reduce((sum, item) => sum + item.elapsed_ms, 0) / results.length);
  console.log(`V18_SCAN_SUMMARY ${JSON.stringify({ runs: results.length, max_ms: maxMs, average_ms: averageMs })}`);
  console.log('EXACT_V18_COMMAND_SCAN_PROOF_PASS');
})().catch((error) => {
  console.error(`V18_SCAN_PROOF_ERROR ${error.message || error}`);
  process.exit(1);
});
