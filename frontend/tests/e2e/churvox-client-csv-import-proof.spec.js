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
  if (Array.isArray(data?.clients)) return data.clients;
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

test('client csv import proof', async ({ request }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const clientOne = {
    name: `CSV Proof Client A ${stamp}`,
    email: `csv.client.a.${stamp}@example.com`,
    phone: '0210000001',
    address: '1 CSV Proof Street, Wellington',
    notes: 'Imported by client CSV proof.',
  };
  const clientTwo = {
    name: `CSV Proof Client B ${stamp}`,
    email: `csv.client.b.${stamp}@example.com`,
    phone: '0210000002',
    address: '2 CSV Proof Street, Wellington',
    notes: 'Imported by client CSV proof.',
  };

  const csv = [
    'name,email,phone,address,notes',
    `"${clientOne.name}",${clientOne.email},${clientOne.phone},"${clientOne.address}","${clientOne.notes}"`,
    `"${clientTwo.name}",${clientTwo.email},${clientTwo.phone},"${clientTwo.address}","${clientTwo.notes}"`,
    `"Bad Email Client",not-an-email,0210000003,"3 CSV Proof Street","Should skip"`,
  ].join('\n');

  console.log(`CLIENT_CSV_API_BASE=${API_BASE}`);
  console.log(`CLIENT_CSV_CLIENT_ONE=${clientOne.email}`);
  console.log(`CLIENT_CSV_CLIENT_TWO=${clientTwo.email}`);

  await backendLogin(request, OWNER_EMAIL, OWNER_PASS, 'OWNER');

  const importRes = await request.post(api('/clients/import-csv'), {
    multipart: {
      file: {
        name: `clients-proof-${stamp}.csv`,
        mimeType: 'text/csv',
        buffer: Buffer.from(csv, 'utf8'),
      },
    },
  });

  const importPayload = await readJson(importRes);

  console.log(`CLIENT_CSV_IMPORT_STATUS=${importRes.status()}`);
  console.log(`CLIENT_CSV_IMPORT_BODY=${importPayload.text.slice(0, 320)}`);
  console.log(`CLIENT_CSV_IMPORTED=${Number(importPayload.json?.imported || 0)}`);
  console.log(`CLIENT_CSV_SKIPPED=${Number(importPayload.json?.skipped || 0)}`);

  expect(importRes.status()).toBeLessThan(400);
  expect(Number(importPayload.json?.imported || 0)).toBeGreaterThanOrEqual(2);
  expect(Number(importPayload.json?.skipped || 0)).toBeGreaterThanOrEqual(1);

  const listRes = await request.get(api('/clients'));
  const listPayload = await readJson(listRes);
  const clients = listFrom(listPayload.json);

  const foundOne = clients.find((client) => String(client.email || '').toLowerCase() === clientOne.email);
  const foundTwo = clients.find((client) => String(client.email || '').toLowerCase() === clientTwo.email);

  console.log(`CLIENT_CSV_LIST_STATUS=${listRes.status()}`);
  console.log(`CLIENT_CSV_FOUND_ONE=${Boolean(foundOne)}`);
  console.log(`CLIENT_CSV_FOUND_TWO=${Boolean(foundTwo)}`);
  console.log(`CLIENT_CSV_FOUND_ONE_ID=${normalizeId(foundOne?.id || foundOne?._id)}`);
  console.log(`CLIENT_CSV_FOUND_TWO_ID=${normalizeId(foundTwo?.id || foundTwo?._id)}`);

  expect(listRes.status()).toBeLessThan(400);
  expect(Boolean(foundOne)).toBeTruthy();
  expect(Boolean(foundTwo)).toBeTruthy();

  const getRes = await request.get(api(`/clients/${normalizeId(foundOne.id || foundOne._id)}`));
  const getPayload = await readJson(getRes);

  console.log(`CLIENT_CSV_GET_ONE_STATUS=${getRes.status()}`);
  console.log(`CLIENT_CSV_GET_ONE_NAME=${getPayload.json?.name || ''}`);

  expect(getRes.status()).toBeLessThan(400);
  expect(getPayload.json?.name).toBe(clientOne.name);

  console.log('CLIENT_CSV_IMPORT_PROOF=passed');
});
