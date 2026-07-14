#!/usr/bin/env node

const FRONTEND = String(process.env.PLAYWRIGHT_BASE_URL || process.env.CHURVOX_FRONTEND_URL || 'https://www.churvox.com').replace(/\/$/, '');
const BACKEND = String(process.env.PLAYWRIGHT_API_BASE || process.env.CHURVOX_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const FRONTEND_BUILD = 'churvox-job-done-live-v2-20260714';
const BACKEND_BUILD = 'job-done-reality-v2-20260714';
const ROUTE_GUARD = 'startup-mount-confirmed-v1';
const MAX_ATTEMPTS = Math.max(1, Number(process.env.CHURVOX_DEPLOY_PROOF_ATTEMPTS || 24));
const RETRY_MS = Math.max(1000, Number(process.env.CHURVOX_DEPLOY_PROOF_RETRY_MS || 10000));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function responseText(url, options = {}) {
  const response = await fetch(url, { redirect: 'follow', cache: 'no-store', ...options });
  return { response, text: await response.text() };
}

async function jsonResponse(url, options = {}) {
  const { response, text } = await responseText(url, options);
  let body = {};
  try { body = JSON.parse(text); } catch {}
  return { response, body, text };
}

function assetUrls(manifest = {}) {
  const values = [];
  if (manifest.files && typeof manifest.files === 'object') values.push(...Object.values(manifest.files));
  if (Array.isArray(manifest.entrypoints)) values.push(...manifest.entrypoints);
  return [...new Set(values)]
    .filter((value) => typeof value === 'string' && /\.js(?:\?|$)/i.test(value))
    .map((value) => new URL(value, `${FRONTEND}/`).toString());
}

async function frontendHasBuild() {
  const manifestResult = await jsonResponse(`${FRONTEND}/asset-manifest.json`);
  if (!manifestResult.response.ok) {
    return { ok: false, detail: `asset-manifest HTTP ${manifestResult.response.status}`, assets: 0 };
  }
  const assets = assetUrls(manifestResult.body);
  for (const url of assets) {
    try {
      const { response, text } = await responseText(url);
      if (response.ok && text.includes(FRONTEND_BUILD)) return { ok: true, detail: FRONTEND_BUILD, assets: assets.length };
    } catch {}
  }
  return { ok: false, detail: `${FRONTEND_BUILD} not found`, assets: assets.length };
}

async function probe() {
  const frontend = await frontendHasBuild().catch((error) => ({ ok: false, detail: error.message, assets: 0 }));
  const command = await jsonResponse(`${BACKEND}/api/command/human-mimic-marker`).catch((error) => ({ response: { status: 0, ok: false }, body: {}, text: error.message }));
  const marker = await jsonResponse(`${BACKEND}/api/job-done/marker`).catch((error) => ({ response: { status: 0, ok: false }, body: {}, text: error.message }));
  const protectedRoute = await jsonResponse(`${BACKEND}/api/job-done/closeouts`).catch((error) => ({ response: { status: 0, ok: false }, body: {}, text: error.message }));

  const commandOk = command.response.ok
    && command.body?.job_done_reality_build === BACKEND_BUILD
    && command.body?.job_done_route_guard === ROUTE_GUARD;
  const markerOk = marker.response.ok
    && marker.body?.build === BACKEND_BUILD
    && marker.body?.route_guard === ROUTE_GUARD
    && marker.body?.owner_approval_required === true;
  const protectedOk = [401, 403].includes(Number(protectedRoute.response.status));

  return {
    ok: frontend.ok && commandOk && markerOk && protectedOk,
    frontend,
    command: {
      status: command.response.status,
      build: command.body?.job_done_reality_build || '',
      routeGuard: command.body?.job_done_route_guard || '',
    },
    marker: {
      status: marker.response.status,
      build: marker.body?.build || '',
      routeGuard: marker.body?.route_guard || '',
    },
    protectedCloseoutsStatus: protectedRoute.response.status,
  };
}

(async () => {
  let latest = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    latest = await probe();
    console.log(JSON.stringify({ attempt, ...latest }, null, 2));
    if (latest.ok) {
      console.log(`Job Done live deploy proof passed on attempt ${attempt}.`);
      process.exit(0);
    }
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_MS);
  }
  console.error('Job Done live deploy proof failed after deployment retries.');
  console.error(JSON.stringify(latest, null, 2));
  process.exit(1);
})().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
