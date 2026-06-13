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

function createdId(payload) {
  const data = payload?.data || payload || {};
  const item = data.job || data.item || data.record || data;
  return normalizeId(data.id || data._id || item.id || item._id || item.job_id || payload.id || payload._id);
}

function listFrom(payload) {
  const data = payload?.data || payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function statusOf(item) {
  return String(item?.status || item?.job_status || '').toLowerCase();
}

async function backendLogin(request, email, password, label) {
  const res = await request.post(api('/auth/login'), { data: { email, password } });
  const payload = await readJson(res);
  console.log(`${label}_LOGIN_STATUS=${res.status()}`);
  console.log(`${label}_LOGIN_EMAIL=${payload.json?.user?.email || payload.json?.email || ''}`);
  expect(res.status()).toBeLessThan(400);
  return payload.json;
}

test('recurring job creates next job after completion proof', async ({ request }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const jobTitle = `Recurring Proof Job ${stamp}`;
  const customerName = `Recurring Proof Client ${stamp}`;
  const scheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  console.log(`RECURRING_JOB_API_BASE=${API_BASE}`);
  console.log(`RECURRING_JOB_TITLE=${jobTitle}`);
  console.log(`RECURRING_JOB_CUSTOMER=${customerName}`);

  await backendLogin(request, OWNER_EMAIL, OWNER_PASS, 'OWNER');

  const createRes = await request.post(api('/jobs'), {
    data: {
      title: jobTitle,
      job_type: 'other',
      customer_name: customerName,
      address: '1 Recurring Proof Street, Wellington',
      scheduled_date: scheduled,
      estimated_duration: 60,
      price: 55,
      pricing_type: 'fixed',
      notes: 'Recurring proof job. Safe to ignore.',
      status: 'assigned',
      is_recurring: true,
      recurrence_pattern: 'weekly',
      recurring_frequency: 'weekly',
    },
  });

  const createPayload = await readJson(createRes);
  const jobId = createdId(createPayload.json);

  console.log(`RECURRING_JOB_CREATE_STATUS=${createRes.status()}`);
  console.log(`RECURRING_JOB_ID=${jobId}`);
  console.log(`RECURRING_JOB_CREATED_IS_RECURRING=${createPayload.json?.is_recurring}`);
  console.log(`RECURRING_JOB_CREATED_FREQUENCY=${createPayload.json?.recurring_frequency || createPayload.json?.recurrence_pattern || ''}`);
  console.log(`RECURRING_JOB_CREATED_NEXT_DUE=${createPayload.json?.next_recurring_due_date || ''}`);

  expect(createRes.status()).toBeLessThan(400);
  expect(jobId).toBeTruthy();
  expect(Boolean(createPayload.json?.is_recurring)).toBeTruthy();

  const completeRes = await request.post(api(`/jobs/${jobId}/complete`), {
    data: { worker_notes: 'Recurring proof completed.' },
  });

  const completePayload = await readJson(completeRes);

  console.log(`RECURRING_JOB_COMPLETE_STATUS=${completeRes.status()}`);
  console.log(`RECURRING_JOB_COMPLETE_BODY=${completePayload.text.slice(0, 260)}`);
  console.log(`RECURRING_JOB_NEXT_ID_FROM_COMPLETE=${completePayload.json?.next_recurring_job_id || ''}`);

  expect(completeRes.status()).toBeLessThan(400);
  expect(statusOf(completePayload.json)).toBe('completed');

  const listRes = await request.get(api('/jobs'));
  const listPayload = await readJson(listRes);
  const jobs = listFrom(listPayload.json);

  const nextFromResponse = normalizeId(completePayload.json?.next_recurring_job_id);
  const nextJob = jobs.find((job) => {
    const id = normalizeId(job.id || job._id);
    const parent = normalizeId(job.recurring_parent_job_id);
    const source = normalizeId(job.source_job_id);
    return (
      id !== jobId &&
      (
        (nextFromResponse && id === nextFromResponse) ||
        parent === jobId ||
        source === jobId ||
        (String(job.title || '') === jobTitle && new Date(job.scheduled_date).getTime() > new Date(scheduled).getTime())
      )
    );
  });

  console.log(`RECURRING_JOB_LIST_STATUS=${listRes.status()}`);
  console.log(`RECURRING_JOB_NEXT_FOUND=${Boolean(nextJob)}`);
  console.log(`RECURRING_JOB_NEXT_ID=${normalizeId(nextJob?.id || nextJob?._id)}`);
  console.log(`RECURRING_JOB_NEXT_STATUS=${statusOf(nextJob)}`);
  console.log(`RECURRING_JOB_NEXT_PARENT=${normalizeId(nextJob?.recurring_parent_job_id)}`);
  console.log(`RECURRING_JOB_NEXT_SOURCE=${normalizeId(nextJob?.source_job_id)}`);
  console.log(`RECURRING_JOB_NEXT_DATE=${nextJob?.scheduled_date || ''}`);

  expect(listRes.status()).toBeLessThan(400);
  expect(Boolean(nextJob)).toBeTruthy();
  expect(statusOf(nextJob)).toBe('assigned');
  expect(Boolean(nextJob?.is_recurring)).toBeTruthy();
  expect(new Date(nextJob.scheduled_date).getTime()).toBeGreaterThan(new Date(scheduled).getTime());

  console.log('RECURRING_JOB_PROOF=passed');
});
