#!/usr/bin/env node

const DEFAULT_BASE = 'https://grassley-backend.onrender.com';
const EXPECTED_MARKER = 'command-live-smoke-guard-20260710e';
const EXPECTED_HUMAN_MIMIC = 'human-mimic-intelligence-v3';
const EXPECTED_GUARD = 'human-mimic-strict-preflight-v3';
const EXPECTED_POST_GUARD = 'linked-invoice-source-recheck-v1';
const EXPECTED_SOURCE_NORMALIZATION = 'legacy-job-status-and-timer-units-v1';
const EXPECTED_ROLE_SCHEMA_GUARD = 'role-required-evidence-v1';
const EXPECTED_SUMMARY_GUARD = 'strict-surviving-queue-summary-v1';
const EXPECTED_SETTINGS = 'business-profile-live-v1';
const base = String(process.env.PLAYWRIGHT_API_BASE || process.env.CHURVOX_API_BASE || DEFAULT_BASE).replace(/\/$/, '');

const getEndpoints = [
  '/api/command/slips',
  '/api/command/events',
  '/api/command/audit',
];

const postEndpoints = [
  '/api/command/scan',
  '/api/command/worker-payment-request',
  '/api/command/worker-update-request',
  '/api/command/slips/000000000000000000000000/approve',
  '/api/logic/business-profile',
];

const okStatuses = new Set([200, 401, 403]);
const protectedStatuses = new Set([401, 403]);
const failures = [];

async function readJson(response) {
  const text = await response.text().catch(() => '');
  try { return { text, body: text ? JSON.parse(text) : null }; } catch { return { text, body: null }; }
}

async function checkLiveMarker() {
  const endpoint = '/api/command/live-smoke-marker';
  const response = await fetch(`${base}${endpoint}`, { method: 'GET', headers: { Accept: 'application/json' } });
  const { text, body } = await readJson(response);
  const marker = body && typeof body === 'object' ? String(body.marker || '') : '';
  if (response.status === 200 && marker === EXPECTED_MARKER) {
    console.log(`✓ backend live marker present (${marker})`);
    return true;
  }
  failures.push(`${endpoint} marker missing or stale. Expected ${EXPECTED_MARKER}, got status ${response.status}: ${text.slice(0, 160)}`);
  console.log('✗ backend live marker missing or stale');
  return false;
}

async function checkHumanMimicMarker() {
  const endpoint = '/api/command/human-mimic-marker';
  const response = await fetch(`${base}${endpoint}`, { method: 'GET', headers: { Accept: 'application/json' } });
  const { text, body } = await readJson(response);
  const version = body && typeof body === 'object' ? String(body.version || '') : '';
  const guard = body && typeof body === 'object' ? String(body.guard || '') : '';
  const postGuard = body && typeof body === 'object' ? String(body.post_guard || '') : '';
  const sourceNormalization = body && typeof body === 'object' ? String(body.source_normalization || '') : '';
  const roleSchemaGuard = body && typeof body === 'object' ? String(body.role_schema_guard || '') : '';
  const summaryGuard = body && typeof body === 'object' ? String(body.summary_guard || '') : '';
  const roles = body && Array.isArray(body.roles) ? body.roles : [];
  const safety = body && typeof body === 'object' ? String(body.safety || '') : '';
  const preflight = body && typeof body.preflight === 'object' ? body.preflight : {};
  const strictFlags = [
    preflight.source_validation,
    preflight.source_normalization,
    preflight.business_isolation,
    preflight.weak_candidate_rejection,
    preflight.historical_money_reference_only,
    preflight.required_fields_block_approval,
    preflight.role_specific_required_evidence,
    preflight.secret_redaction,
    preflight.linked_invoice_postguard,
    preflight.manager_summaries_use_strict_queue,
  ];
  if (
    response.status === 200
    && version === EXPECTED_HUMAN_MIMIC
    && guard === EXPECTED_GUARD
    && postGuard === EXPECTED_POST_GUARD
    && sourceNormalization === EXPECTED_SOURCE_NORMALIZATION
    && roleSchemaGuard === EXPECTED_ROLE_SCHEMA_GUARD
    && summaryGuard === EXPECTED_SUMMARY_GUARD
    && roles.length === 8
    && strictFlags.every((value) => value === true)
    && safety.includes('Nothing was sent, synced, charged or changed')
  ) {
    console.log(`✓ complete strict human office chain present (${version}, ${guard}, ${postGuard}, ${sourceNormalization}, ${roleSchemaGuard}, ${summaryGuard}, ${roles.length} roles)`);
    return true;
  }
  failures.push(`${endpoint} missing or stale. Expected complete strict v3 chain and 8 roles; got status ${response.status}: ${text.slice(0, 420)}`);
  console.log('✗ complete strict human office chain missing or stale');
  return false;
}

async function checkSettingsMarker() {
  const endpoint = '/api/settings/live-marker';
  const response = await fetch(`${base}${endpoint}`, { method: 'GET', headers: { Accept: 'application/json' } });
  const { text, body } = await readJson(response);
  const version = body && typeof body === 'object' ? String(body.version || '') : '';
  const safety = body && typeof body === 'object' ? String(body.safety || '') : '';
  if (response.status === 200 && version === EXPECTED_SETTINGS && safety.includes('Nothing was sent, synced, charged or changed')) {
    console.log(`✓ live business-profile route present (${version})`);
    return true;
  }
  failures.push(`${endpoint} missing or stale. Expected ${EXPECTED_SETTINGS}, got status ${response.status}: ${text.slice(0, 200)}`);
  console.log('✗ live business-profile route missing or stale');
  return false;
}

async function checkGet(endpoint) {
  const response = await fetch(`${base}${endpoint}`, { method: 'GET', headers: { Accept: 'application/json' } });
  const { text, body } = await readJson(response);
  if (!okStatuses.has(response.status)) {
    failures.push(`${endpoint} returned ${response.status}: ${text.slice(0, 160)}`);
    console.log(`✗ ${endpoint} returned ${response.status}`);
    return;
  }
  if (response.status === 200) {
    const safety = body && typeof body === 'object' ? String(body.safety || '') : '';
    if (!safety.includes('Nothing was sent, synced, charged or changed')) {
      failures.push(`${endpoint} returned 200 but safety text was missing`);
      console.log(`✗ ${endpoint} returned 200 but safety text was missing`);
      return;
    }
    console.log(`✓ ${endpoint} available with safety text`);
    return;
  }
  console.log(`✓ ${endpoint} is deployed and protected (${response.status})`);
}

async function checkProtectedPost(endpoint) {
  const isPayment = endpoint.includes('payment');
  const isScan = endpoint.includes('/scan');
  const isApproval = endpoint.endsWith('/approve');
  const isSettings = endpoint.includes('/logic/business-profile');
  const response = await fetch(`${base}${endpoint}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(isSettings ? {
      businessName: 'Live smoke protected route only',
    } : {
      title: isPayment ? 'Live smoke worker payment request' : isScan ? 'Live smoke human office scan' : isApproval ? 'Live smoke Command approval executor' : 'Live smoke worker update request',
      action: isApproval ? 'Approve record' : undefined,
      form_title: isApproval ? 'Live smoke owner approval form' : undefined,
      fields: isApproval ? [{ label: 'Smoke test', value: 'Protected route only' }] : undefined,
      trigger: 'live_smoke',
      amount: 'Smoke test only',
      invoice: 'Smoke test only',
      customer: 'Smoke test only',
      update: 'Smoke test only',
      note: 'Smoke test only',
      update_type: 'Smoke test only',
      prepared_only: true,
      owner_review_only: true,
      no_auto_send: true,
      no_auto_sync: true,
      no_auto_charge: true,
      no_auto_record_change: true,
    }),
  });
  const { text, body } = await readJson(response);
  if (protectedStatuses.has(response.status)) {
    console.log(`✓ ${endpoint} is deployed and protected (${response.status})`);
    return;
  }
  if (response.status === 200 && body && body.success === true) {
    const safety = String(body.safety || body.message || '');
    if (!safety.includes('Nothing was sent, synced, charged or changed') && !safety.includes('Nothing was sent, synced, charged or filed') && !safety.includes('No card was charged') && !safety.includes('Owner approval is required')) {
      failures.push(`${endpoint} returned 200 but safety text was missing`);
      console.log(`✗ ${endpoint} returned 200 but safety text was missing`);
      return;
    }
    console.log(`✓ ${endpoint} available with safety text`);
    return;
  }
  failures.push(`${endpoint} returned ${response.status}: ${text.slice(0, 160)}`);
  console.log(`✗ ${endpoint} returned ${response.status}`);
}

(async () => {
  console.log(`Checking live Command backend at ${base}`);
  const wrapperOk = await checkLiveMarker().catch((error) => {
    failures.push(`/api/command/live-smoke-marker request failed: ${error.message}`);
    console.log('✗ backend live marker request failed');
    return false;
  });
  const mimicOk = await checkHumanMimicMarker().catch((error) => {
    failures.push(`/api/command/human-mimic-marker request failed: ${error.message}`);
    console.log('✗ human office marker request failed');
    return false;
  });
  const settingsOk = await checkSettingsMarker().catch((error) => {
    failures.push(`/api/settings/live-marker request failed: ${error.message}`);
    console.log('✗ settings marker request failed');
    return false;
  });

  if (!wrapperOk || !mimicOk || !settingsOk) {
    console.error('\nLive Command smoke failed before route checks:');
    console.error('- Redeploy grassley-backend to the latest main commit, then rerun this test. The wrapper, complete strict human-office chain and business-profile markers must pass.');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  for (const endpoint of getEndpoints) {
    try { await checkGet(endpoint); } catch (error) {
      failures.push(`${endpoint} request failed: ${error.message}`);
      console.log(`✗ ${endpoint} request failed`);
    }
  }
  for (const endpoint of postEndpoints) {
    try { await checkProtectedPost(endpoint); } catch (error) {
      failures.push(`${endpoint} request failed: ${error.message}`);
      console.log(`✗ ${endpoint} request failed`);
    }
  }

  if (failures.length) {
    console.error('\nLive Command smoke failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('\nLive Command smoke passed. The complete strict human mimic chain, protected settings and Command routes are deployed, and no unsafe action was triggered.');
})();
