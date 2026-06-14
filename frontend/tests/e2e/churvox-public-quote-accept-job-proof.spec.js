const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const APP_BASE = (process.env.CHURVOX_APP_BASE || 'https://www.churvox.com').replace(/\/$/, '');
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

function plusEmail(email, tag) {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) throw new Error('CHURVOX_E2E_EMAIL must be a real email');
  return `${name}+${tag}@${domain}`;
}

function tokenFromPublicQuoteUrl(url) {
  const match = String(url || '').match(/\/public\/quote\/([^/?#]+)/);
  return match ? match[1] : '';
}

test('public quote accept creates linked job visible to owner', async ({ request, page }) => {
  test.setTimeout(180000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const customerEmail = plusEmail(OWNER_EMAIL, `quoteaccept${stamp}`);

  console.log(`PUBLIC_QUOTE_JOB_API_BASE=${API_BASE}`);
  console.log(`PUBLIC_QUOTE_JOB_APP_BASE=${APP_BASE}`);
  console.log(`PUBLIC_QUOTE_JOB_OWNER_EMAIL=${OWNER_EMAIL}`);
  console.log(`PUBLIC_QUOTE_JOB_CUSTOMER_EMAIL=${customerEmail}`);

  const loginRes = await request.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });
  const loginPayload = await readJson(loginRes);

  console.log(`PUBLIC_QUOTE_JOB_OWNER_LOGIN_STATUS=${loginRes.status()}`);
  console.log(`PUBLIC_QUOTE_JOB_OWNER_PLAN=${loginPayload.json?.plan || loginPayload.json?.user?.plan || ''}`);

  expect(loginRes.status()).toBeLessThan(400);

  const clientRes = await request.post(api('/clients'), {
    data: {
      name: `Quote Accept Client ${stamp}`,
      email: customerEmail,
      phone: '+64210000008',
      address: `5 Quote Accept Street ${stamp}`,
      notes: 'Public quote accept job proof client',
    },
  });
  const clientPayload = await readJson(clientRes);
  const clientId = clientPayload.json?.id || clientPayload.json?._id;

  console.log(`PUBLIC_QUOTE_JOB_CLIENT_STATUS=${clientRes.status()}`);
  console.log(`PUBLIC_QUOTE_JOB_CLIENT_ID=${clientId || ''}`);

  expect(clientRes.status()).toBeLessThan(400);
  expect(clientId).toBeTruthy();

  const quoteRes = await request.post(api('/quotes'), {
    data: {
      customer_name: `Quote Accept Client ${stamp}`,
      customer_email: customerEmail,
      client_id: clientId,
      address: `5 Quote Accept Street ${stamp}`,
      job_description: `Quote accepted job proof ${stamp}`,
      job_type: 'lawn_mowing',
      price: 140,
      pricing_type: 'fixed',
      notes: 'Public quote accept should create job',
    },
  });
  const quotePayload = await readJson(quoteRes);
  const quoteId = quotePayload.json?.id || quotePayload.json?._id;

  console.log(`PUBLIC_QUOTE_JOB_CREATE_QUOTE_STATUS=${quoteRes.status()}`);
  console.log(`PUBLIC_QUOTE_JOB_QUOTE_ID=${quoteId || ''}`);
  console.log(`PUBLIC_QUOTE_JOB_QUOTE_NUMBER=${quotePayload.json?.quote_number || ''}`);

  expect(quoteRes.status()).toBeLessThan(400);
  expect(quoteId).toBeTruthy();

  const sendRes = await request.post(api(`/quotes/${quoteId}/send`));
  const sendPayload = await readJson(sendRes);
  const publicUrl = sendPayload.json?.public_url || '';
  const publicToken = tokenFromPublicQuoteUrl(publicUrl);

  console.log(`PUBLIC_QUOTE_JOB_SEND_STATUS=${sendRes.status()}`);
  console.log(`PUBLIC_QUOTE_JOB_SEND_STATE=${sendPayload.json?.status || ''}`);
  console.log(`PUBLIC_QUOTE_JOB_EMAIL_SENT=${sendPayload.json?.email_sent}`);
  console.log(`PUBLIC_QUOTE_JOB_EMAIL_PROVIDER=${sendPayload.json?.email_provider || ''}`);
  console.log(`PUBLIC_QUOTE_JOB_PUBLIC_URL=${publicUrl}`);
  console.log(`PUBLIC_QUOTE_JOB_PUBLIC_TOKEN=${publicToken}`);

  expect(sendRes.status()).toBeLessThan(400);
  expect(String(sendPayload.json?.status || '').toLowerCase()).toBe('sent');
  expect(publicToken).toBeTruthy();

  const publicGetRes = await request.get(api(`/public/quote/${publicToken}`));
  const publicGetPayload = await readJson(publicGetRes);

  console.log(`PUBLIC_QUOTE_JOB_PUBLIC_GET_STATUS=${publicGetRes.status()}`);
  console.log(`PUBLIC_QUOTE_JOB_PUBLIC_CUSTOMER=${publicGetPayload.json?.quote?.customer_name || ''}`);
  console.log(`PUBLIC_QUOTE_JOB_PUBLIC_STATUS_BEFORE=${publicGetPayload.json?.quote?.status || ''}`);

  expect(publicGetRes.status()).toBeLessThan(400);

  await page.goto(publicUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(`Quote Accept Client ${stamp}`, { timeout: 30000 });

  const pageText = await page.locator('body').innerText();

  console.log(`PUBLIC_QUOTE_JOB_PAGE_HAS_CUSTOMER=${pageText.includes(`Quote Accept Client ${stamp}`)}`);
  console.log(`PUBLIC_QUOTE_JOB_PAGE_HAS_QUOTE=${/quote/i.test(pageText)}`);

  expect(pageText).toMatch(/quote/i);

  const acceptRes = await request.post(api(`/public/quote/${publicToken}/accept`), {
    data: { accepted_by: `Quote Accept Client ${stamp}` },
  });
  const acceptPayload = await readJson(acceptRes);

  console.log(`PUBLIC_QUOTE_JOB_ACCEPT_STATUS=${acceptRes.status()}`);
  console.log(`PUBLIC_QUOTE_JOB_ACCEPT_BODY=${acceptPayload.text.slice(0, 600)}`);
  console.log(`PUBLIC_QUOTE_JOB_ACCEPT_JOB_ID=${acceptPayload.json?.job_id || ''}`);

  expect(acceptRes.status()).toBeLessThan(400);

  const publicAfterRes = await request.get(api(`/public/quote/${publicToken}`));
  const publicAfterPayload = await readJson(publicAfterRes);

  console.log(`PUBLIC_QUOTE_JOB_PUBLIC_AFTER_STATUS=${publicAfterRes.status()}`);
  console.log(`PUBLIC_QUOTE_JOB_PUBLIC_STATUS_AFTER=${publicAfterPayload.json?.quote?.status || ''}`);
  console.log(`PUBLIC_QUOTE_JOB_PUBLIC_JOB_ID_AFTER=${publicAfterPayload.json?.quote?.job_id || ''}`);

  expect(publicAfterRes.status()).toBeLessThan(400);
  expect(String(publicAfterPayload.json?.quote?.status || '').toLowerCase()).toBe('accepted');

  const ownerQuoteRes = await request.get(api(`/quotes/${quoteId}`));
  const ownerQuotePayload = await readJson(ownerQuoteRes);

  console.log(`PUBLIC_QUOTE_JOB_OWNER_QUOTE_GET_STATUS=${ownerQuoteRes.status()}`);
  console.log(`PUBLIC_QUOTE_JOB_OWNER_QUOTE_STATUS=${ownerQuotePayload.json?.status || ''}`);
  console.log(`PUBLIC_QUOTE_JOB_OWNER_QUOTE_JOB_ID=${ownerQuotePayload.json?.job_id || ''}`);

  expect(ownerQuoteRes.status()).toBeLessThan(400);
  expect(String(ownerQuotePayload.json?.status || '').toLowerCase()).toBe('accepted');

  const jobId =
    acceptPayload.json?.job_id ||
    ownerQuotePayload.json?.job_id ||
    publicAfterPayload.json?.quote?.job_id ||
    '';

  console.log(`PUBLIC_QUOTE_JOB_LINKED_JOB_ID=${jobId}`);

  expect(jobId).toBeTruthy();

  const ownerJobRes = await request.get(api(`/jobs/${jobId}`));
  const ownerJobPayload = await readJson(ownerJobRes);

  console.log(`PUBLIC_QUOTE_JOB_OWNER_JOB_GET_STATUS=${ownerJobRes.status()}`);
  console.log(`PUBLIC_QUOTE_JOB_OWNER_JOB_TITLE=${ownerJobPayload.json?.title || ''}`);
  console.log(`PUBLIC_QUOTE_JOB_OWNER_JOB_STATUS=${ownerJobPayload.json?.status || ''}`);
  console.log(`PUBLIC_QUOTE_JOB_OWNER_JOB_SOURCE=${ownerJobPayload.json?.source || ''}`);

  expect(ownerJobRes.status()).toBeLessThan(400);
  expect(ownerJobPayload.json?.customer_name).toContain(`Quote Accept Client ${stamp}`);
  expect(String(ownerJobPayload.json?.status || '').toLowerCase()).toBe('assigned');

  console.log('PUBLIC_QUOTE_ACCEPT_CREATES_JOB_PROOF=passed');
});
