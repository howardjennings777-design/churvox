#!/usr/bin/env node

const fs = require('fs');

const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';

function tokenFrom(body = {}) {
  return body.token || body.access_token || body.auth_token || body.jwt || body.accessToken
    || body.user?.token || body.user?.access_token || body.data?.token || body.data?.access_token || body.data?.user?.token || '';
}

function rowsFrom(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of ['workers', 'team', 'members', 'items', 'records', 'results', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function emailOf(row = {}) {
  return String(row.email || row.worker_email || row.user_email || row.login_email || '').trim().toLowerCase();
}

function active(row = {}) {
  const status = String(row.status || row.worker_status || '').toLowerCase();
  return row.active !== false && row.is_active !== false && !/inactive|deleted|archived|disabled/.test(status);
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let body = {};
  try { body = JSON.parse(text); } catch { body = { text: text.slice(0, 300) }; }
  return { response, body };
}

async function login(path, email) {
  const { response, body } = await request(path, {
    method: 'POST',
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  return {
    ok: response.ok && body?.success !== false && Boolean(tokenFrom(body)),
    body,
    status: response.status,
  };
}

async function main() {
  if (!OWNER_EMAIL || !PASSWORD) throw new Error('Owner email/password is missing for linked-worker discovery.');
  const ownerLogin = await login('/api/auth/login', OWNER_EMAIL);
  if (!ownerLogin.ok) throw new Error(`Owner login failed during worker discovery with HTTP ${ownerLogin.status}.`);
  const ownerToken = tokenFrom(ownerLogin.body);
  const candidates = [];

  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
    const { response, body } = await request(`${endpoint}?ts=${Date.now()}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    if (!response.ok) continue;
    for (const row of rowsFrom(body)) {
      const email = emailOf(row);
      if (!email || email === OWNER_EMAIL || !active(row) || candidates.includes(email)) continue;
      candidates.push(email);
    }
  }

  if (!candidates.length) throw new Error('No active linked worker was found in the owner team endpoints.');
  const attempts = [];
  let selected = '';
  for (const email of candidates.slice(0, 8)) {
    let result = await login('/api/auth/login', email);
    if (!result.ok) result = await login('/api/worker/auth/login', email);
    attempts.push(`${email}:${result.status}`);
    if (result.ok) {
      selected = email;
      break;
    }
  }

  if (!selected) throw new Error(`No linked worker accepted the shared password. Attempts: ${attempts.join(', ')}`);
  console.log(`::add-mask::${selected}`);
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `CHURVOX_WORKER_EMAIL=${selected}\n`);
  else process.stdout.write(`${selected}\n`);
  console.log('A linked active worker was discovered, authenticated and masked.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
