const fs = require('fs');

const site = String(process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const api = String(process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const ownerEmail = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const password = process.env.CHURVOX_OWNER_PASSWORD || '';
const expectedBackend = 'churvox-command-v3-server-wrapper-20260713g';
const expectedOwnerMessages = 'churvox-final-owner-messages-v17-20260714';
const frontendMarkers = {
  auth: 'churvox-auth-401-storm-repair-20260713b',
  growth: 'churvox-growth-pack-checkout-20260713a',
  command: 'churvox-command-instant-load-20260713d',
};
const roleNames = ['Office Manager','Receptionist','Bookkeeper','Accountant','Payroll Clerk','Client Memory','Quality Checker','Operations Manager'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function tokenFrom(body = {}) {
  return body.token || body.access_token || body.auth_token || body.jwt || body.accessToken
    || body.user?.token || body.user?.access_token || body.data?.token || body.data?.access_token || body.data?.user?.token || '';
}

function rowsFrom(payload) {
  const body = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  for (const key of ['workers','team','members','items','records','results','data']) if (Array.isArray(body?.[key])) return body[key];
  return [];
}

function emailOf(row = {}) {
  return String(row.email || row.worker_email || row.user_email || row.login_email || '').trim().toLowerCase();
}

function active(row = {}) {
  const status = String(row.status || row.worker_status || '').toLowerCase();
  return row.active !== false && row.is_active !== false && !/inactive|deleted|archived|disabled/.test(status);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function bodyOf(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { text: text.slice(0, 900) }; }
}

async function call(path, options = {}, attempts = 3) {
  let last = null;
  const { headers: suppliedHeaders = {}, ...requestOptions } = options || {};
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const started = Date.now();
    try {
      const response = await fetch(`${api}${path}`, {
        ...requestOptions,
        headers: {
          Accept: 'application/json',
          ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
          ...suppliedHeaders,
        },
      });
      const body = await bodyOf(response);
      last = { response, body, elapsedMs: Date.now() - started };
      const transient = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!transient || attempt === attempts) return last;
    } catch (error) {
      last = { error, elapsedMs: Date.now() - started };
      if (attempt === attempts) throw error;
    }
    await sleep(400 * attempt);
  }
  return last;
}

async function login(path, email) {
  const result = await call(path, { method: 'POST', body: JSON.stringify({ email, password }) }, 4);
  return { ...result, token: tokenFrom(result.body) };
}

async function deployedFrontend() {
  const manifestResponse = await fetch(`${site}/asset-manifest.json?ts=${Date.now()}`, { cache: 'no-store' });
  assert(manifestResponse.ok, `manifest ${manifestResponse.status}`);
  const manifest = await manifestResponse.json();
  const assets = [...new Set(Object.values(manifest.files || {}).filter((value) => typeof value === 'string' && /\.js(?:$|\?)/.test(value)))];
  assert(assets.length > 0, 'no deployed JS assets found');
  const found = Object.fromEntries(Object.keys(frontendMarkers).map((key) => [key, '']));
  for (const asset of assets) {
    const response = await fetch(new URL(asset, site), { cache: 'no-store' });
    if (!response.ok) continue;
    const text = await response.text();
    for (const [key, marker] of Object.entries(frontendMarkers)) if (!found[key] && text.includes(marker)) found[key] = asset;
  }
  for (const key of Object.keys(frontendMarkers)) assert(found[key], `deployed ${key} marker missing across ${assets.length} JS assets`);
  return found;
}

async function backendReady() {
  const result = await call(`/api/command-fast-load/boot?ts=${Date.now()}`, {}, 1);
  assert(result.response?.status === 200, `backend boot ${result.response?.status}`);
  const body = result.body || {};
  const slipOwners = body.route_owners?.['/api/command/slips'] || [];
  const scanOwners = body.route_owners?.['/api/command/scan'] || [];
  const messageOwners = body.route_owners?.['/api/messages'] || [];
  const messageReadinessOwners = body.route_owners?.['/api/messages/readiness'] || [];
  assert(body.version === expectedBackend, `wrong backend version ${body.version}`);
  assert(body.patch_installed === true && body.patch_stage === 'ready', `backend patch not ready: ${JSON.stringify(body).slice(0,700)}`);
  assert(body.billing_patch_installed === true && body.billing_error == null, `billing patch not ready: ${body.billing_error || 'not installed'}`);
  assert(body.session_revocation_installed === true && body.session_revocation_error == null, `session revocation not ready: ${body.session_revocation_error || 'not installed'}`);
  assert(slipOwners.some((value) => String(value).endsWith(':fast_slips')), `fast_slips not live: ${JSON.stringify(slipOwners)}`);
  assert(scanOwners.some((value) => String(value).endsWith(':fast_scan')), `fast_scan not live: ${JSON.stringify(scanOwners)}`);
  assert(body.owner_messages_patch_installed === true && body.owner_messages_version === expectedOwnerMessages && body.owner_messages_error == null, `owner messages patch not ready: ${JSON.stringify(body).slice(0,900)}`);
  assert(messageOwners.some((value) => String(value).endsWith(':list_messages')), `final list_messages not live: ${JSON.stringify(messageOwners)}`);
  assert(messageReadinessOwners.some((value) => String(value).endsWith(':readiness')), `messages readiness not live: ${JSON.stringify(messageReadinessOwners)}`);
  return { version: body.version, elapsedMs: result.elapsedMs, slipOwners, scanOwners, messageOwners, messageReadinessOwners };
}

async function ownerLogin() {
  assert(ownerEmail && password, 'owner launch credential is missing');
  const result = await login('/api/auth/login', ownerEmail);
  assert(result.response?.ok && result.token, `owner login ${result.response?.status}: ${JSON.stringify(result.body).slice(0,600)}`);
  const me = await call('/api/auth/me', { headers: { Authorization: `Bearer ${result.token}` } }, 2);
  assert(me.response?.status === 200, `/api/auth/me ${me.response?.status}`);
  return result.token;
}

async function ownerPlatformChecks(ownerToken) {
  const auth = { Authorization: `Bearer ${ownerToken}` };
  const messagesReady = await call(`/api/messages/readiness?ts=${Date.now()}`, { headers: auth }, 2);
  assert(messagesReady.response?.status === 200 && messagesReady.body?.ready === true, `messages readiness ${messagesReady.response?.status}: ${JSON.stringify(messagesReady.body).slice(0,600)}`);
  assert(messagesReady.body?.version === expectedOwnerMessages && messagesReady.body?.route_owner === 'final_owner_messages_wrapper', `wrong messages route owner: ${JSON.stringify(messagesReady.body).slice(0,700)}`);
  const queue = await call(`/api/command/slips?ts=${Date.now()}`, { headers: auth }, 1);
  assert(queue.response?.status === 200 && queue.body?.success !== false, `Command queue ${queue.response?.status}: ${JSON.stringify(queue.body).slice(0,600)}`);
  assert(queue.elapsedMs < 4500, `Command queue took ${queue.elapsedMs}ms`);

  const payroll = await call(`/api/payroll?ts=${Date.now()}`, { headers: auth });
  assert(payroll.response?.status === 200 && payroll.body?.success !== false, `payroll ${payroll.response?.status}`);
  assert(payroll.body?.read_only === true && payroll.body?.owner_approval_required === true, 'payroll is not owner-review only');
  assert(payroll.body?.no_tax_filing === true && payroll.body?.no_government_submission === true && payroll.body?.no_bank_file === true && payroll.body?.no_payment === true, 'payroll safety flags missing');
  const payrollSummary = await call(`/api/payroll/summary?ts=${Date.now()}`, { headers: auth });
  assert(payrollSummary.response?.status === 200 && payrollSummary.body?.success !== false, `payroll summary ${payrollSummary.response?.status}`);

  let scan = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    scan = await call('/api/command/scan', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ source: 'paid_launch_final_gate_v2', prepared_only: true, owner_review_only: true }),
    }, 1);
    if (scan.response?.status === 200 && scan.body?.success === true) break;
    const detail = String(scan.body?.detail || scan.body?.message || scan.body?.error || '');
    const safeTimeout = scan.response?.status === 503 && /timed out safely/i.test(detail);
    if (!safeTimeout || attempt === 4) break;
    console.log(`Command scan safe timeout on attempt ${attempt}; retrying within the bounded launch gate.`);
    await sleep(1200 * attempt);
  }
  assert(scan?.response?.status === 200 && scan?.body?.success === true, `Command scan ${scan?.response?.status}: ${JSON.stringify(scan?.body).slice(0,1200)}`);
  assert(scan.body?.source === 'human-mimic-intelligence-v3', `wrong brain source ${scan.body?.source}`);
  assert(scan.body?.guard === 'human-mimic-strict-preflight-v3', `wrong brain guard ${scan.body?.guard}`);
  assert(scan.body?.scan_complete === true && !(scan.body?.scan_errors || []).length, `brain scan incomplete: ${JSON.stringify(scan.body?.scan_errors || [])}`);
  const checked = new Set(scan.body?.roles_checked || []);
  const missingRoles = roleNames.filter((role) => !checked.has(role));
  assert(!missingRoles.length, `mimic roles missing: ${missingRoles.join(', ')}`);
  for (const slip of [...(scan.body?.slips || []), ...(scan.body?.existing || [])]) {
    const payload = slip?.payload || {};
    assert(slip.prepared_only === true && slip.owner_review_only === true, 'unsafe Command slip top-level flags');
    assert(payload.no_auto_send === true && payload.no_auto_sync === true && payload.no_auto_charge === true && payload.no_auto_record_change === true, 'unsafe Command slip payload flags');
  }
  const safety = String(scan.body?.safety || '').toLowerCase();
  for (const phrase of ['owner approval','nothing was sent','synced','charged','changed']) assert(safety.includes(phrase), `brain safety missing ${phrase}`);
  return { queueMs: queue.elapsedMs, payrollCount: payroll.body?.count ?? payroll.body?.entries?.length ?? null, scanMs: scan.elapsedMs, created: scan.body?.created_count || 0, existing: scan.body?.existing_count || 0 };
}

async function discoverWorker(ownerToken) {
  const auth = { Authorization: `Bearer ${ownerToken}` };
  const candidates = [];
  for (const endpoint of ['/api/team/workers','/api/team','/api/workers']) {
    const result = await call(`${endpoint}?ts=${Date.now()}`, { headers: auth });
    if (!result.response?.ok) continue;
    for (const row of rowsFrom(result.body)) {
      const email = emailOf(row);
      if (!email || email === ownerEmail || !active(row) || candidates.includes(email)) continue;
      candidates.push(email);
    }
  }
  assert(candidates.length, 'no linked active worker found');
  for (const email of candidates.slice(0, 10)) {
    let result = await login('/api/auth/login', email);
    if (!result.response?.ok || !result.token) result = await login('/api/worker/auth/login', email);
    if (result.response?.ok && result.token) return { email, token: result.token };
  }
  throw new Error('no linked worker could authenticate');
}

async function workerBoundary(worker) {
  const auth = { Authorization: `Bearer ${worker.token}` };
  const payroll = await call('/api/payroll', { headers: auth });
  assert(payroll.response?.status === 403, `worker payroll boundary ${payroll.response?.status}`);
  const scan = await call('/api/command/scan', { method: 'POST', headers: auth, body: JSON.stringify({ source: 'worker_boundary' }) }, 1);
  assert(scan.response?.status === 403, `worker Command boundary ${scan.response?.status}`);
}

async function billingChecks(ownerToken) {
  const auth = { Authorization: `Bearer ${ownerToken}` };
  const returnBase = `${site}/dashboard`;
  const payload = {
    plan: 'solo', plan_key: 'start', selected_plan: 'start', tier: 'solo', plan_name: 'Start', action: 'start_trial',
    country: 'NZ', billing_country: 'NZ', currency: 'NZD', email: ownerEmail,
    billing_interval: 'monthly', interval: 'month',
    success_url: `${returnBase}?checkout=success&plan=start#plans`,
    cancel_url: `${returnBase}?checkout=cancelled&plan=start#plans`,
    metadata: { source: 'paid_launch_final_gate_v2' },
  };
  let planSession = null;
  const failures = [];
  for (const endpoint of ['/api/billing/create-checkout-session','/api/stripe/create-checkout-session','/api/billing/checkout','/api/stripe/checkout']) {
    const result = await call(endpoint, { method: 'POST', headers: auth, body: JSON.stringify(payload) });
    const url = result.body?.url || result.body?.checkout_url || result.body?.session_url || result.body?.data?.url;
    if (result.response?.ok && /^https:\/\//.test(String(url || ''))) { planSession = endpoint; break; }
    failures.push(`${endpoint}:${result.response?.status}`);
  }
  assert(planSession, `no secure plan checkout session: ${failures.join(', ')}`);

  const addon = await call('/api/billing/create-addon-checkout-session', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ addon: 'command_growth_pack', addon_key: 'command_growth_pack', country: 'NZ', quantity: 1, growth_packs: 1, packs: 1, source: 'paid_launch_final_gate_v2' }),
  });
  const addonUrl = addon.body?.url || addon.body?.checkout_url || addon.body?.session_url || addon.body?.data?.url;
  const commandRequired = /command/i.test(String(addon.body?.detail || addon.body?.error || addon.body?.message || '')) && [400,403,409].includes(addon.response?.status);
  assert((addon.response?.ok && /^https:\/\//.test(String(addonUrl || ''))) || commandRequired, `Growth Pack checkout invalid ${addon.response?.status}: ${JSON.stringify(addon.body).slice(0,500)}`);
  assert(![404,405,422].includes(addon.response?.status) && !(addon.response?.status >= 500), `Growth Pack route unhealthy ${addon.response?.status}`);
  return { planSession, addonStatus: addon.response.status, addonMode: addon.response.ok ? 'secure_checkout' : 'command_required' };
}

async function exactDeployment() {
  let last = '';
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const frontend = await deployedFrontend();
      const backend = await backendReady();
      console.log(`Deployment attempt ${attempt}: exact frontend chunks and final backend wrapper are live.`);
      return { frontend, backend };
    } catch (error) {
      last = error.message || String(error);
      console.log(`Deployment attempt ${attempt}: ${last}`);
      if (attempt < 20) await sleep(6_000);
    }
  }
  throw new Error(`exact paid-launch v2 deployment did not become healthy: ${last}`);
}

async function main() {
  const deployment = await exactDeployment();
  const ownerToken = await ownerLogin();

  // Discover and export the linked worker before the deeper smoke checks so
  // later page/lifecycle stages never fail merely because an earlier check did.
  const worker = await discoverWorker(ownerToken);
  console.log(`::add-mask::${worker.email}`);
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `CHURVOX_WORKER_EMAIL=${worker.email}\n`);

  const platform = await ownerPlatformChecks(ownerToken);
  await workerBoundary(worker);
  const billing = await billingChecks(ownerToken);
  console.log(JSON.stringify({ ...deployment, platform, worker: 'authenticated and isolated', billing }, null, 2));
  console.log('PAID_LAUNCH_LIVE_SMOKE_V2_PASS');
}

main().catch((error) => { console.error(error.stack || error.message || error); process.exit(1); });
