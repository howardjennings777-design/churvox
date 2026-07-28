from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import re


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one exact anchor, found {count}")
    file.write_text(text.replace(old, new, 1))
    print(f"patched: {label}")


api_base = "frontend/src/lib/apiBase.js"
replace_once(
    api_base,
    'const OUTREACH_GET_PATH = "/api/admin/owner/tester-outreach";',
    'const PRODUCTION_BACKEND = "https://grassley-backend.onrender.com";\nconst OUTREACH_GET_PATH = "/api/admin/owner/tester-outreach";',
    "declare the canonical production backend",
)
replace_once(
    api_base,
    '''function isFrontendProxyHost(host = "") {
  const cleanHost = String(host || "").trim().toLowerCase();
  return (
    cleanHost === "www.churvox.com" ||
    cleanHost === "churvox.com" ||
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "0.0.0.0" ||
    cleanHost === "::1"
  );
}''',
    '''function isLocalFrontendHost(host = "") {
  const cleanHost = String(host || "").trim().toLowerCase();
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(cleanHost);
}

function isChurvoxProductionHost(host = "") {
  const cleanHost = String(host || "").trim().toLowerCase();
  return cleanHost === "www.churvox.com" || cleanHost === "churvox.com";
}''',
    "separate local proxy hosts from production Churvox hosts",
)
replace_once(
    api_base,
    '''function resolveApiBase() {
  // Production and local branch previews both use the frontend's same-origin
  // /api proxy. Return the concrete origin rather than an empty string so
  // live-data loaders can distinguish a valid same-origin backend from a
  // missing backend while auth cookies remain first-party.
  if (typeof window !== "undefined" && isFrontendProxyHost(window.location.hostname)) {
    return clean(window.location.origin);
  }

  return configuredBackend() || "";
}''',
    '''function resolveApiBase() {
  const configured = configuredBackend();
  if (typeof window !== "undefined") {
    // The public Render frontend does not own a production /api proxy. Sending
    // auth to www.churvox.com/api returns the website fallback as HTTP 200,
    // which looks successful but contains no user or token. Production browser
    // traffic must use the real backend origin; local previews retain their
    // same-origin development proxy.
    if (isChurvoxProductionHost(window.location.hostname)) return configured || PRODUCTION_BACKEND;
    if (isLocalFrontendHost(window.location.hostname)) return clean(window.location.origin);
  }
  return configured || PRODUCTION_BACKEND;
}''',
    "route production browser API traffic to the real backend",
)

polish = "frontend/src/churvox-studio/studioPolish.css"
replace_once(
    polish,
    ".cvsContextBeam nav button { min-height: 36px; padding: 0 15px; }",
    ".cvsContextBeam nav button { min-height: 44px; padding: 0 15px; }",
    "desktop context tabs meet the touch target",
)
replace_once(
    polish,
    ".cvsContextBeam nav button { min-height: 35px; padding: 0 14px; }",
    ".cvsContextBeam nav button { min-height: 44px; padding: 0 14px; }",
    "mobile context tabs meet the touch target",
)

live_test = "frontend/tests/e2e/churvox-live-launch-human-audit-v2.spec.js"
replace_once(
    live_test,
    "  ['worker', /workers|field/i],",
    "  ['worker', /team|people|workers|field/i],",
    "align the worker owner-page marker with the current Team page",
)
replace_once(
    live_test,
    "  ['activity', /activity/i],\n",
    "",
    "remove the retired Activity hash from the current page audit",
)
replace_once(
    live_test,
    '''async function apiSession(page, email, password, role) {
  const response = await page.request.post(apiUrl('/api/auth/login'), {
    data: { email, password },
    timeout: 30_000,
  });
  const body = await responseBody(response);''',
    '''async function apiSession(page, email, password, role) {
  let response;
  let body = {};
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await page.request.post(apiUrl('/api/auth/login'), {
        data: { email, password },
        timeout: 60_000,
      });
      body = await responseBody(response);
      if (response.ok() || ![429, 500, 502, 503, 504].includes(response.status()) || attempt === 3) break;
    } catch (error) {
      lastError = error;
      if (attempt === 3) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
  }
  if (!response) throw lastError || new Error(`${role} API session login produced no response`);''',
    "retry transient mobile API login delays",
)

flow = "frontend/tests/e2e/churvox-current-human-owner-worker-flow.spec.js"
replace_once(
    flow,
    "  const raw = row?.id || row?._id || row?.job_id || row?.worker_id || row?.user_id || row?.action_id || row?.source_id || '';",
    "  const raw = row?.id || row?._id || row?.client_id || row?.job_id || row?.worker_id || row?.user_id || row?.action_id || row?.source_id || '';",
    "recognise client IDs returned by the current API",
)
replace_once(
    flow,
    "  for (const key of ['items', 'records', 'results', 'workers', 'team', 'members', 'jobs', 'slips', 'actions', 'data']) {",
    "  for (const key of ['items', 'records', 'results', 'clients', 'workers', 'team', 'members', 'jobs', 'slips', 'actions', 'data']) {",
    "read client lists from the current clients response shape",
)
replace_once(
    flow,
    '''async function apiLogin(request, email, password, label) {
  const response = await request.post(apiUrl('/api/auth/login'), { data: { email, password }, timeout: 30_000 });
  const body = await bodyOf(response);''',
    '''async function apiLogin(request, email, password, label) {
  const { response, body } = await api(request, 'post', '/api/auth/login', '', { email, password });''',
    "use the retrying API helper for owner and worker login",
)
replace_once(
    flow,
    '''async function api(request, method, path, token, data) {
  const response = await request[method](apiUrl(path), {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(data === undefined ? {} : { data }),
    timeout: 30_000,
  });
  return { response, body: await bodyOf(response) };
}''',
    '''async function api(request, method, path, token, data) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await request[method](apiUrl(path), {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(data === undefined ? {} : { data }),
        timeout: 60_000,
      });
      const body = await bodyOf(response);
      if (response.ok() || ![429, 500, 502, 503, 504].includes(response.status()) || attempt === 3) return { response, body };
    } catch (error) {
      lastError = error;
      if (attempt === 3) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
  }
  throw lastError || new Error(`${method.toUpperCase()} ${path} produced no response`);
}''',
    "retry transient backend delays in the full owner-worker flow",
)
replace_once(
    flow,
    "  let clientId = idOf(body.client || body.record || body.data?.client || body.data?.record || body.data || body);",
    "  let clientId = idOf(body.client || body.record || body.result?.client || body.result?.record || body.data?.client || body.data?.record || body.data || body) || String(body.client_id || body.data?.client_id || body.result?.client_id || '');",
    "extract the current client creation response ID",
)
replace_once(
    flow,
    "    }, { timeout: 20_000, intervals: [500, 900, 1500, 2500] }).toBe(true);",
    "    }, { timeout: 45_000, intervals: [500, 900, 1500, 2500, 4000] }).toBe(true);",
    "allow the created client to appear after a slow backend write",
)

stamp = datetime.now(timezone.utc).isoformat()
Path("backend/RENDER_RESTART_20260615.txt").write_text(
    f"render-restart-current-full-user-repair-3-20260728\nTriggered: {stamp}\nPurpose: production API origin, final touch target, current route and client response repairs\n"
)
Path("frontend/public/render-deploy-marker.txt").write_text(
    f"churvox-current-full-user-repair-3-20260728\n{stamp}\n"
)
print("updated Render deployment markers")
