#!/usr/bin/env node

const DEFAULT_BASE = 'https://grassley-backend.onrender.com';
const EXPECTED_MARKER = 'command-live-smoke-guard-20260710e';
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
];

const okStatuses = new Set([200, 401, 403]);
const protectedStatuses = new Set([401, 403]);
const failures = [];

async function readJson(response) {
  const text = await response.text().catch(() => '');
  try {
    return { text, body: text ? JSON.parse(text) : null };
  } catch {
    return { text, body: null };
  }
}

async function checkLiveMarker() {
  const endpoint = '/api/command/live-smoke-marker';
  const response = await fetch(`${base}${endpoint}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
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

async function checkGet(endpoint) {
  const url = `${base}${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
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
  const url = `${base}${endpoint}`;
  const isPayment = endpoint.includes('payment');
  const isScan = endpoint.includes('/scan');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: isPayment ? 'Live smoke worker payment request' : isScan ? 'Live smoke office engine scan' : 'Live smoke worker update request',
      trigger: 'live_smoke',
      amount: 'Smoke test only',
      invoice: 'Smoke test only',
      customer: 'Smoke test only',
      update: 'Smoke test only',
      note: 'Smoke test only',
      update_type: 'Smoke test only',
      prepared_only: true,
      owner_review_only: true,
    }),
  });
  const { text, body } = await readJson(response);

  if (protectedStatuses.has(response.status)) {
    console.log(`✓ ${endpoint} is deployed and protected (${response.status})`);
    return;
  }

  if (response.status === 200 && body && body.success === true) {
    const safety = String(body.safety || body.message || '');
    if (!safety.includes('Nothing was sent, synced, charged or changed') && !safety.includes('No card was charged') && !safety.includes('Owner approval is required')) {
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
  const markerOk = await checkLiveMarker().catch((error) => {
    failures.push(`/api/command/live-smoke-marker request failed: ${error.message}`);
    console.log('✗ backend live marker request failed');
    return false;
  });

  if (!markerOk) {
    console.error('\nLive Command smoke failed before route checks:');
    console.error('- The live backend is not running the latest Command smoke wrapper build. Redeploy grassley-backend to the latest main commit, then rerun this test.');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  for (const endpoint of getEndpoints) {
    try {
      await checkGet(endpoint);
    } catch (error) {
      failures.push(`${endpoint} request failed: ${error.message}`);
      console.log(`✗ ${endpoint} request failed`);
    }
  }
  for (const endpoint of postEndpoints) {
    try {
      await checkProtectedPost(endpoint);
    } catch (error) {
      failures.push(`${endpoint} request failed: ${error.message}`);
      console.log(`✗ ${endpoint} request failed`);
    }
  }

  if (failures.length) {
    console.error('\nLive Command smoke failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('\nLive Command smoke passed. Backend routes are deployed/protected and no unsafe action was triggered.');
})();