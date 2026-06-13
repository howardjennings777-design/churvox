const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const BASE_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD || 'FreshOwnerProof123!';

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

function plusEmail(email, stamp) {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) throw new Error('CHURVOX_E2E_EMAIL must be a real email');
  return `${name}+freshproof${stamp}@${domain}`;
}

test('fresh owner can sign up and create first client job quote and invoice', async ({ request }) => {
  test.setTimeout(120000);

  if (!BASE_EMAIL) throw new Error('Set CHURVOX_E2E_EMAIL');

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const email = plusEmail(BASE_EMAIL, stamp);

  console.log(`FRESH_OWNER_API_BASE=${API_BASE}`);
  console.log(`FRESH_OWNER_EMAIL=${email}`);

  const registerRes = await request.post(api('/auth/register'), {
    data: {
      email,
      password: PASSWORD,
      name: `Fresh Owner ${stamp}`,
      business_name: `Fresh Proof Business ${stamp}`,
    },
  });
  const registerPayload = await readJson(registerRes);

  console.log(`FRESH_OWNER_REGISTER_STATUS=${registerRes.status()}`);
  console.log(`FRESH_OWNER_REGISTER_EMAIL=${registerPayload.json?.email || ''}`);
  console.log(`FRESH_OWNER_VERIFY_EMAIL_SENT=${registerPayload.json?.email_verification_sent}`);

  expect(registerRes.status()).toBeLessThan(400);
  expect(registerPayload.json?.email).toBe(email);

  const meRes = await request.get(api('/auth/me'));
  const mePayload = await readJson(meRes);

  console.log(`FRESH_OWNER_ME_STATUS=${meRes.status()}`);
  console.log(`FRESH_OWNER_ME_EMAIL=${mePayload.json?.email || ''}`);
  console.log(`FRESH_OWNER_ME_ROLE=${mePayload.json?.role || ''}`);
  console.log(`FRESH_OWNER_ME_PLAN=${mePayload.json?.plan || ''}`);

  expect(meRes.status()).toBeLessThan(400);
  expect(mePayload.json?.email).toBe(email);

  const clientRes = await request.post(api('/clients'), {
    data: {
      name: `Fresh Client ${stamp}`,
      email: plusEmail(BASE_EMAIL, `client${stamp}`),
      phone: '+64210000001',
      address: `1 Fresh Proof Street ${stamp}`,
      notes: 'Fresh owner first journey proof client',
    },
  });
  const clientPayload = await readJson(clientRes);
  const clientId = clientPayload.json?.id || clientPayload.json?._id;

  console.log(`FRESH_OWNER_CLIENT_STATUS=${clientRes.status()}`);
  console.log(`FRESH_OWNER_CLIENT_ID=${clientId || ''}`);

  expect(clientRes.status()).toBeLessThan(400);
  expect(clientId).toBeTruthy();

  const jobRes = await request.post(api('/jobs'), {
    data: {
      title: `Fresh First Job ${stamp}`,
      job_type: 'lawn_mowing',
      customer_name: `Fresh Client ${stamp}`,
      client_id: clientId,
      address: `1 Fresh Proof Street ${stamp}`,
      price: 85,
      pricing_type: 'fixed',
      notes: 'Fresh owner first job proof',
      scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  const jobPayload = await readJson(jobRes);
  const jobId = jobPayload.json?.id || jobPayload.json?._id;

  console.log(`FRESH_OWNER_JOB_STATUS=${jobRes.status()}`);
  console.log(`FRESH_OWNER_JOB_ID=${jobId || ''}`);
  console.log(`FRESH_OWNER_JOB_STATE=${jobPayload.json?.status || ''}`);

  expect(jobRes.status()).toBeLessThan(400);
  expect(jobId).toBeTruthy();

  const quoteRes = await request.post(api('/quotes'), {
    data: {
      customer_name: `Fresh Client ${stamp}`,
      customer_email: plusEmail(BASE_EMAIL, `client${stamp}`),
      client_id: clientId,
      address: `1 Fresh Proof Street ${stamp}`,
      job_description: `Fresh quote proof ${stamp}`,
      job_type: 'lawn_mowing',
      price: 120,
      pricing_type: 'fixed',
      notes: 'Fresh owner first quote proof',
    },
  });
  const quotePayload = await readJson(quoteRes);
  const quoteId = quotePayload.json?.id || quotePayload.json?._id;

  console.log(`FRESH_OWNER_QUOTE_STATUS=${quoteRes.status()}`);
  console.log(`FRESH_OWNER_QUOTE_ID=${quoteId || ''}`);

  expect(quoteRes.status()).toBeLessThan(400);
  expect(quoteId).toBeTruthy();

  const invoiceRes = await request.post(api('/invoices'), {
    data: {
      customer_name: `Fresh Client ${stamp}`,
      customer_email: plusEmail(BASE_EMAIL, `client${stamp}`),
      client_id: clientId,
      job_id: jobId,
      description: `Fresh invoice proof ${stamp}`,
      subtotal: 85,
      gst_rate: 15,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  const invoicePayload = await readJson(invoiceRes);
  const invoiceId = invoicePayload.json?.id || invoicePayload.json?._id;

  console.log(`FRESH_OWNER_INVOICE_STATUS=${invoiceRes.status()}`);
  console.log(`FRESH_OWNER_INVOICE_ID=${invoiceId || ''}`);
  console.log(`FRESH_OWNER_INVOICE_NUMBER=${invoicePayload.json?.invoice_number || ''}`);

  expect(invoiceRes.status()).toBeLessThan(400);
  expect(invoiceId).toBeTruthy();

  const statsRes = await request.get(api('/dashboard/stats'));
  const statsPayload = await readJson(statsRes);

  console.log(`FRESH_OWNER_DASHBOARD_STATUS=${statsRes.status()}`);
  console.log(`FRESH_OWNER_DASHBOARD_BODY=${JSON.stringify(statsPayload.json).slice(0, 500)}`);

  expect(statsRes.status()).toBeLessThan(400);
  expect(statsPayload.json).toBeTruthy();

  const clientsRes = await request.get(api('/clients'));
  const clientsPayload = await readJson(clientsRes);
  const clientFound = Array.isArray(clientsPayload.json)
    ? clientsPayload.json.some((c) => String(c.id || c._id) === String(clientId))
    : false;

  console.log(`FRESH_OWNER_CLIENT_LIST_STATUS=${clientsRes.status()}`);
  console.log(`FRESH_OWNER_CLIENT_FOUND=${clientFound}`);

  expect(clientsRes.status()).toBeLessThan(400);
  expect(clientFound).toBeTruthy();

  console.log('FRESH_OWNER_FIRST_JOB_PROOF=passed');
});
