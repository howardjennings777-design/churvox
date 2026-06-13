const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const OWNER_PASS = process.env.CHURVOX_E2E_PASSWORD;

function api(path) {
  return `${API_BASE}/api${path.startsWith('/') ? path : `/${path}`}`;
}

async function readJson(res) {
  const text = await res.text();
  try {
    return { text, json: text ? JSON.parse(text) : {} };
  } catch {
    return { text, json: {} };
  }
}

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'object') return String(value.$oid || value.id || value._id || '');
  return String(value);
}

function listFrom(payload) {
  const data = payload?.data || payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.team)) return data.team;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function backendLogin(request, email, password, label) {
  const res = await request.post(api('/auth/login'), { data: { email, password } });
  const payload = await readJson(res);
  console.log(`${label}_LOGIN_STATUS=${res.status()}`);
  console.log(`${label}_LOGIN_EMAIL=${payload.json?.user?.email || payload.json?.email || ''}`);
  expect(res.status()).toBeLessThan(400);
  return payload.json;
}

function planFrom(payload) {
  return payload?.plan || payload?.user?.plan || payload?.data?.plan || payload?.data?.user?.plan || '';
}

test('team csv import creates invited workers proof', async ({ request }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

  const workerOne = {
    name: `CSV Worker A ${stamp}`,
    email: `csv.worker.a.${stamp}@example.com`,
    phone: '0220000001',
  };

  const workerTwo = {
    name: `CSV Worker B ${stamp}`,
    email: `csv.worker.b.${stamp}@example.com`,
    phone: '0220000002',
  };

  const csv = [
    'name,email,phone',
    `"${workerOne.name}",${workerOne.email},${workerOne.phone}`,
    `"${workerTwo.name}",${workerTwo.email},${workerTwo.phone}`,
    `"Bad Worker",not-an-email,0220000003`,
  ].join('\n');

  console.log(`TEAM_CSV_API_BASE=${API_BASE}`);
  console.log(`TEAM_CSV_WORKER_ONE=${workerOne.email}`);
  console.log(`TEAM_CSV_WORKER_TWO=${workerTwo.email}`);

  await backendLogin(request, OWNER_EMAIL, OWNER_PASS, 'OWNER');

  const statusBefore = await request.get(api('/user/status'));
  const beforePayload = await readJson(statusBefore);
  const originalPlan = planFrom(beforePayload.json) || 'enterprise';

  console.log(`TEAM_CSV_STATUS_BEFORE=${statusBefore.status()}`);
  console.log(`TEAM_CSV_ORIGINAL_PLAN=${originalPlan}`);

  const planRes = await request.patch(api('/user/plan'), { data: { plan: 'enterprise' } });
  console.log(`TEAM_CSV_PLAN_SAVE_STATUS=${planRes.status()}`);
  expect(planRes.status()).toBeLessThan(400);

  try {
    const importRes = await request.post(api('/team/import-csv'), {
      multipart: {
        file: {
          name: `team-proof-${stamp}.csv`,
          mimeType: 'text/csv',
          buffer: Buffer.from(csv, 'utf8'),
        },
      },
    });

    const importPayload = await readJson(importRes);

    console.log(`TEAM_CSV_IMPORT_STATUS=${importRes.status()}`);
    console.log(`TEAM_CSV_IMPORT_BODY=${importPayload.text.slice(0, 360)}`);
    console.log(`TEAM_CSV_INVITED=${Number(importPayload.json?.invited || 0)}`);
    console.log(`TEAM_CSV_SKIPPED=${Number(importPayload.json?.skipped || 0)}`);

    expect(importRes.status()).toBeLessThan(400);
    expect(Number(importPayload.json?.invited || 0)).toBeGreaterThanOrEqual(2);
    expect(Number(importPayload.json?.skipped || 0)).toBeGreaterThanOrEqual(1);

    const workersRes = await request.get(api('/team/workers'));
    const workersPayload = await readJson(workersRes);
    const workers = listFrom(workersPayload.json);

    const foundOne = workers.find((worker) => String(worker.email || '').toLowerCase() === workerOne.email);
    const foundTwo = workers.find((worker) => String(worker.email || '').toLowerCase() === workerTwo.email);

    console.log(`TEAM_CSV_WORKERS_STATUS=${workersRes.status()}`);
    console.log(`TEAM_CSV_FOUND_ONE=${Boolean(foundOne)}`);
    console.log(`TEAM_CSV_FOUND_TWO=${Boolean(foundTwo)}`);
    console.log(`TEAM_CSV_FOUND_ONE_ID=${normalizeId(foundOne?.id || foundOne?._id)}`);
    console.log(`TEAM_CSV_FOUND_TWO_ID=${normalizeId(foundTwo?.id || foundTwo?._id)}`);
    console.log(`TEAM_CSV_FOUND_ONE_STATUS=${String(foundOne?.status || '')}`);
    console.log(`TEAM_CSV_FOUND_TWO_STATUS=${String(foundTwo?.status || '')}`);

    expect(workersRes.status()).toBeLessThan(400);
    expect(Boolean(foundOne)).toBeTruthy();
    expect(Boolean(foundTwo)).toBeTruthy();
    expect(String(foundOne.status || '').toLowerCase()).toBe('invited');
    expect(String(foundTwo.status || '').toLowerCase()).toBe('invited');

    console.log('TEAM_CSV_IMPORT_PROOF=passed');
  } finally {
    const restoreRes = await request.patch(api('/user/plan'), { data: { plan: originalPlan } });
    console.log(`TEAM_CSV_RESTORE_PLAN_STATUS=${restoreRes.status()}`);
  }
});
