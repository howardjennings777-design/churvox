from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one exact anchor, found {count}")
    file.write_text(text.replace(old, new, 1))
    print(f"patched: {label}")


auth = "frontend/src/context/AuthContext.js"
replace_once(auth, "const AUTH_TIMEOUT_MS = 8000;\nconst WORKER_AUTH_TIMEOUT_MS = 8000;", "const AUTH_TIMEOUT_MS = 30000;\nconst WORKER_AUTH_TIMEOUT_MS = 30000;", "allow cold Render auth requests to complete")
replace_once(
    auth,
    '''function shouldTryWorkerFallback(error) {
  const status = error?.response?.status;
  if (!status) return true;
  return [401, 404, 408, 422, 500, 502, 503, 504].includes(status);
}''',
    '''function isTransientAuthError(error) {
  const status = error?.response?.status;
  return !status || [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function authDelay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function withTransientAuthRetry(operation, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (!isTransientAuthError(error) || attempt === attempts) throw error;
      await authDelay([700, 1400, 2500, 4000, 6000][attempt - 1] || 6000);
    }
  }
  throw lastError || new Error("Authentication service unavailable.");
}

function shouldTryWorkerFallback(error) {
  const status = error?.response?.status;
  // Worker fallback is for a real identity/route rejection only. A network or
  // Render 5xx error must retry the same owner endpoint instead of pretending
  // the user may be a worker.
  return [401, 404, 422].includes(status);
}''',
    "retry transient auth failures without misrouting owners to worker login",
)
replace_once(
    auth,
    '''  const fetchMe = useCallback(async (token) => {
    const response = await axios.get(`${API_BASE}/api/auth/me`, {
      headers: headersFor(token),
      withCredentials: true,
      timeout: AUTH_TIMEOUT_MS,
    });
    const nextToken = tokenFrom(response.data) || token || "";
    const nextUser = userFrom(response.data);
    if (!nextUser) throw new Error("No current user returned.");
    if (nextToken) nextUser.token = nextToken;
    return nextUser;
  }, []);''',
    '''  const fetchMe = useCallback(async (token) => withTransientAuthRetry(async () => {
    const response = await axios.get(`${API_BASE}/api/auth/me`, {
      headers: headersFor(token),
      withCredentials: true,
      timeout: AUTH_TIMEOUT_MS,
    });
    const nextToken = tokenFrom(response.data) || token || "";
    const nextUser = userFrom(response.data);
    if (!nextUser) {
      const error = new Error("No current user returned.");
      error.response = { status: 503 };
      throw error;
    }
    if (nextToken) nextUser.token = nextToken;
    return nextUser;
  }, 4), []);''',
    "retry transient current-session reads",
)
replace_once(
    auth,
    '''      const response = await axios.post(
        `${API_BASE}/api/worker/auth/login`,
        { email: cleanEmail, password },
        { withCredentials: true, timeout: WORKER_AUTH_TIMEOUT_MS }
      );''',
    '''      const response = await withTransientAuthRetry(() => axios.post(
        `${API_BASE}/api/worker/auth/login`,
        { email: cleanEmail, password },
        { withCredentials: true, timeout: WORKER_AUTH_TIMEOUT_MS }
      ), 5);''',
    "retry transient worker login failures",
)
replace_once(
    auth,
    '''        response = await axios.post(
          `${API_BASE}/api/auth/login`,
          { email: cleanEmail, password },
          { withCredentials: true, timeout: AUTH_TIMEOUT_MS }
        );''',
    '''        response = await withTransientAuthRetry(() => axios.post(
          `${API_BASE}/api/auth/login`,
          { email: cleanEmail, password },
          { withCredentials: true, timeout: AUTH_TIMEOUT_MS }
        ), 5);''',
    "retry transient owner login failures",
)

login_test = "frontend/tests/e2e/churvox-login-recovery-paid-launch.spec.js"
replace_once(login_test, "  let postLoginMeFailures = Number(options.postLoginMeFailures || 0);", "  let loginFailures = Number(options.loginFailures || 0);\n  let postLoginMeFailures = Number(options.postLoginMeFailures || 0);", "allow transient login failures in the browser contract")
replace_once(
    login_test,
    '''    if (path === '/api/auth/login') {
      if (options.loginStatus) return route.fulfill(json(options.loginBody || { detail: 'Login failed' }, options.loginStatus));''',
    '''    if (path === '/api/auth/login') {
      if (loginFailures > 0) {
        loginFailures -= 1;
        return route.fulfill(json({ detail: 'Temporary Render gateway failure' }, 502));
      }
      if (options.loginStatus) return route.fulfill(json(options.loginBody || { detail: 'Login failed' }, options.loginStatus));''',
    "simulate transient Render login failures",
)
replace_once(
    login_test,
    '''  test('owner login service outage never calls worker login', async ({ page }) => {''',
    '''  test('owner login retries transient Render failures without worker fallback', async ({ page }) => {
    const api = await installLoginApi(page, { loginFailures: 2 });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signIn(page);
    await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/dashboard/);
    expect(api.calls.filter((call) => call.path === '/api/auth/login')).toHaveLength(3);
    expect(api.calls.filter((call) => call.path === '/api/worker/auth/login')).toHaveLength(0);
  });

  test('owner login service outage never calls worker login', async ({ page }) => {''',
    "prove transient owner login errors retry the correct endpoint",
)
replace_once(login_test, "    await expect(page.getByRole('alert')).toContainText(/restarting|temporarily unavailable|try again/i);", "    await expect(page.getByRole('alert')).toContainText(/restarting|temporarily unavailable|try again/i, { timeout: 20_000 });", "wait for the deliberate permanent outage retries")

live = "frontend/tests/e2e/churvox-live-launch-human-audit-v2.spec.js"
replace_once(
    live,
    '''  const me = await page.request.get(apiUrl('/api/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  });
  const body = await responseBody(me);
  expect(me.status(), `${role} /api/auth/me failed: ${JSON.stringify(body).slice(0, 700)}`).toBe(200);''',
    '''  let me;
  let body = {};
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      me = await page.request.get(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60_000,
      });
      body = await responseBody(me);
      if (me.status() === 200 || ![408, 425, 429, 500, 502, 503, 504].includes(me.status()) || attempt === 6) break;
    } catch (error) {
      if (attempt === 6) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1200 * attempt, 6000)));
  }
  expect(me?.status(), `${role} /api/auth/me failed: ${JSON.stringify(body).slice(0, 700)}`).toBe(200);''',
    "retry visible-login session verification",
)
replace_once(live, "  for (let attempt = 1; attempt <= 3; attempt += 1) {", "  for (let attempt = 1; attempt <= 6; attempt += 1) {", "increase API-session login attempts")
replace_once(live, "      if (response.ok() || ![429, 500, 502, 503, 504].includes(response.status()) || attempt === 3) break;", "      if (response.ok() || ![408, 425, 429, 500, 502, 503, 504].includes(response.status()) || attempt === 6) break;", "retry all transient API-session statuses")
replace_once(live, "      if (attempt === 3) throw error;", "      if (attempt === 6) throw error;", "exhaust API-session retries before failure")
replace_once(
    live,
    '''  const me = await page.request.get(apiUrl('/api/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  });
  const meBody = await responseBody(me);
  expect(me.status(), `${role} API session /api/auth/me failed: ${JSON.stringify(meBody).slice(0, 700)}`).toBe(200);''',
    '''  let me;
  let meBody = {};
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      me = await page.request.get(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60_000,
      });
      meBody = await responseBody(me);
      if (me.status() === 200 || ![408, 425, 429, 500, 502, 503, 504].includes(me.status()) || attempt === 6) break;
    } catch (error) {
      if (attempt === 6) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1200 * attempt, 6000)));
  }
  expect(me?.status(), `${role} API session /api/auth/me failed: ${JSON.stringify(meBody).slice(0, 700)}`).toBe(200);''',
    "retry seeded-session verification",
)

flow = "frontend/tests/e2e/churvox-current-human-owner-worker-flow.spec.js"
replace_once(flow, "  for (let attempt = 1; attempt <= 3; attempt += 1) {", "  for (let attempt = 1; attempt <= 6; attempt += 1) {", "increase full-flow API attempts")
replace_once(flow, "      if (response.ok() || ![429, 500, 502, 503, 504].includes(response.status()) || attempt === 3) return { response, body };", "      if (response.ok() || ![408, 425, 429, 500, 502, 503, 504].includes(response.status()) || attempt === 6) return { response, body };", "retry all transient full-flow statuses")
replace_once(flow, "      if (attempt === 3) throw error;", "      if (attempt === 6) throw error;", "exhaust full-flow retries")
replace_once(flow, "    timeout: 25_000,", "    timeout: 90_000,", "allow visible login through a cold backend")
replace_once(
    flow,
    "  const me = await page.request.get(apiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });\n  const body = await bodyOf(me);",
    "  const { response: me, body } = await api(page.request, 'get', '/api/auth/me', token);",
    "reuse retrying API helper after visible login",
)
replace_once(
    flow,
    "  const me = await page.request.get(apiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });\n  const body = await bodyOf(me);",
    "  const { response: me, body } = await api(page.request, 'get', '/api/auth/me', token);",
    "reuse retrying API helper after seeded login",
)

hardcore = "frontend/tests/e2e/churvox-hardcore-owner-worker-visual.spec.js"
replace_once(
    hardcore,
    '''  for (const path of paths) {
    const response = await page.request.post(apiUrl(path), { data: { email, password }, timeout: 30_000 });
    const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
    attempts.push({ path, status: response.status(), body: JSON.stringify(body).slice(0, 180) });
    if (!response.ok() || body?.success === false) continue;
    const token = tokenFrom(body);
    if (!token) continue;
    const returnedEmail = accountEmail(body);
    if (returnedEmail && returnedEmail !== email.toLowerCase()) throw new Error(`${label} login returned a different account.`);
    TOKEN_CACHE.set(cacheKey, token);
    await seedAuth(page, token, email, label);
    return token;
  }''',
    '''  for (const path of paths) {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      try {
        const response = await page.request.post(apiUrl(path), { data: { email, password }, timeout: 60_000 });
        const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
        attempts.push({ path, attempt, status: response.status(), body: JSON.stringify(body).slice(0, 180) });
        if (!response.ok() || body?.success === false) {
          if (![408, 425, 429, 500, 502, 503, 504].includes(response.status())) break;
        } else {
          const token = tokenFrom(body);
          if (token) {
            const returnedEmail = accountEmail(body);
            if (returnedEmail && returnedEmail !== email.toLowerCase()) throw new Error(`${label} login returned a different account.`);
            TOKEN_CACHE.set(cacheKey, token);
            await seedAuth(page, token, email, label);
            return token;
          }
        }
      } catch (error) {
        attempts.push({ path, attempt, status: 'network', body: String(error?.message || error).slice(0, 180) });
        if (attempt === 6) break;
      }
      if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, Math.min(1200 * attempt, 6000)));
    }
  }''',
    "retry hardcore owner and worker login",
)
replace_once(
    hardcore,
    '''async function getJson(page, path, token) {
  const response = await page.request.get(apiUrl(path), {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    timeout: 30_000,
  });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return { response, text, body, contentType: response.headers()['content-type'] || '' };
}''',
    '''async function getJson(page, path, token) {
  let lastError = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await page.request.get(apiUrl(path), {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        timeout: 60_000,
      });
      const text = await response.text();
      let body = null;
      try { body = JSON.parse(text); } catch {}
      if (response.ok() || ![408, 425, 429, 500, 502, 503, 504].includes(response.status()) || attempt === 6) {
        return { response, text, body, contentType: response.headers()['content-type'] || '' };
      }
    } catch (error) {
      lastError = error;
      if (attempt === 6) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1200 * attempt, 6000)));
  }
  throw lastError || new Error(`GET ${path} produced no response`);
}''',
    "retry hardcore API reads",
)

cleanup = "scripts/churvox-hardcore-human-cleanup.cjs"
replace_once(cleanup, "const REQUEST_TIMEOUT_MS = Math.max(4_000, Number(process.env.CHURVOX_CLEANUP_REQUEST_TIMEOUT_MS || 10_000));\nconst MAX_ATTEMPTS = Math.max(1, Number(process.env.CHURVOX_CLEANUP_ATTEMPTS || 3));\nconst DEADLINE_MS = Math.max(60_000, Number(process.env.CHURVOX_CLEANUP_DEADLINE_MS || 240_000));", "const REQUEST_TIMEOUT_MS = Math.max(15_000, Number(process.env.CHURVOX_CLEANUP_REQUEST_TIMEOUT_MS || 45_000));\nconst MAX_ATTEMPTS = Math.max(3, Number(process.env.CHURVOX_CLEANUP_ATTEMPTS || 6));\nconst DEADLINE_MS = Math.max(300_000, Number(process.env.CHURVOX_CLEANUP_DEADLINE_MS || 720_000));", "give cleanup sufficient timeout, attempts and deadline")
replace_once(cleanup, "  await mapLimited(businessMatches, 3, async ({ kind, row }) => {", "  await mapLimited(businessMatches, 1, async ({ kind, row }) => {", "avoid cleanup request bursts")
replace_once(cleanup, "    await mapLimited(commandRows, 3, async (row) => {", "    await mapLimited(commandRows, 1, async (row) => {", "resolve Command fixtures sequentially")

stamp = datetime.now(timezone.utc).isoformat()
Path("frontend/public/render-deploy-marker.txt").write_text(f"churvox-current-full-user-repair-5-20260728\n{stamp}\n")
print("updated frontend Render deployment marker")
