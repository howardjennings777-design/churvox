#!/usr/bin/env node

const DEFAULT_BASE = 'https://grassley-backend.onrender.com';
const base = String(process.env.PLAYWRIGHT_API_BASE || process.env.CHURVOX_API_BASE || DEFAULT_BASE).replace(/\/$/, '');

const endpoints = [
  '/api/command/slips',
  '/api/command/events',
  '/api/command/audit',
];

const okStatuses = new Set([200, 401, 403]);
const failures = [];

async function check(endpoint) {
  const url = `${base}${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const text = await response.text().catch(() => '');
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

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

(async () => {
  console.log(`Checking live Command backend at ${base}`);
  for (const endpoint of endpoints) {
    try {
      await check(endpoint);
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
