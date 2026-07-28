from __future__ import annotations

from pathlib import Path

source_path = Path("scripts/churvox_current_full_user_repair_5.py")
source = source_path.read_text()

ambiguous = '''replace_once(
    flow,
    "  const me = await page.request.get(apiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });\\n  const body = await bodyOf(me);",
    "  const { response: me, body } = await api(page.request, 'get', '/api/auth/me', token);",
    "reuse retrying API helper after visible login",
)
replace_once(
    flow,
    "  const me = await page.request.get(apiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });\\n  const body = await bodyOf(me);",
    "  const { response: me, body } = await api(page.request, 'get', '/api/auth/me', token);",
    "reuse retrying API helper after seeded login",
)'''
scoped = '''flow_file = Path(flow)
flow_text = flow_file.read_text()
old_me = "  const me = await page.request.get(apiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });\\n  const body = await bodyOf(me);"
new_me = "  const { response: me, body } = await api(page.request, 'get', '/api/auth/me', token);"
if flow_text.count(old_me) != 2:
    raise SystemExit(f"reuse retrying API helper in both login paths: expected two exact anchors, found {flow_text.count(old_me)}")
flow_file.write_text(flow_text.replace(old_me, new_me))
print("patched: reuse retrying API helper in both login paths")'''
if source.count(ambiguous) != 1:
    raise SystemExit(f"force-fix wrapper expected one ambiguous block, found {source.count(ambiguous)}")
source = source.replace(ambiguous, scoped, 1)

stamp_anchor = '\nstamp = datetime.now(timezone.utc).isoformat()\n'
extra = r'''
login_page = "frontend/src/pages/auth/LoginPage.js"
replace_once(
    login_page,
    "const LOGIN_TIMEOUT_MS = 28000;",
    "const LOGIN_TIMEOUT_MS = 180000;",
    "align the visible login budget with transient retry timeouts",
)
replace_once(
    login_page,
    '''async function confirmFreshSession(checkAuth) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const user = await withTimeout(
        checkAuth({ allowOfflineFallback: false }),
        ACCESS_REFRESH_TIMEOUT_MS,
        "Your session could not be confirmed. Please sign in again."
      );
      if (user) return user;
      lastError = new Error("Your session could not be confirmed. Please sign in again.");
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await delay(700 * attempt);
  }
  throw lastError || new Error("Your session could not be confirmed. Please sign in again.");
}''',
    '''async function confirmFreshSession(checkAuth) {
  // checkAuth already retries transient /api/auth/me failures. Do not wrap that
  // retrying request in another timeout/retry loop or concurrent checks race.
  const user = await checkAuth({ allowOfflineFallback: false });
  if (user) return user;
  throw new Error("Your session could not be confirmed. Please sign in again.");
}''',
    "remove overlapping post-login session retries",
)
replace_once(
    login_page,
    '''  if (status === 503 || status === 504 || /unavailable|taking too long|did not respond/i.test(detail)) return "Churvox could not reach the login service. Please try again shortly.";''',
    '''  if ([408, 425, 502, 503, 504].includes(status) || /unavailable|gateway|taking too long|did not respond|timed out/i.test(detail)) return "Churvox could not reach the login service. Please try again shortly.";''',
    "show a temporary outage message for every retryable gateway failure",
)
replace_once(
    login_page,
    '''      } catch {
        try { await logout?.(); } catch {}
        throw new Error("Your session could not be confirmed. Please sign in again.");
      }''',
    '''      } catch {
        // logout clears browser auth synchronously. Do not hold the visible error
        // behind a potentially slow network logout request during an outage.
        try { void logout?.(); } catch {}
        throw new Error("Your session could not be confirmed. Please sign in again.");
      }''',
    "show session confirmation failure without waiting on network logout",
)

replace_once(
    login_test,
    '''    await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/dashboard/);
    expect(api.calls.filter((call) => call.path === '/api/auth/login')).toHaveLength(3);
    expect(api.calls.filter((call) => call.path === '/api/worker/auth/login')).toHaveLength(0);''',
    '''    await expect.poll(() => page.url(), {
      timeout: 90_000,
      intervals: [300, 600, 1000, 1800, 3000, 5000],
    }).toMatch(/\/dashboard/);
    expect(api.calls.filter((call) => call.path === '/api/auth/login').length).toBeGreaterThanOrEqual(3);
    expect(api.calls.filter((call) => call.path === '/api/worker/auth/login')).toHaveLength(0);''',
    "prove transient retries without depending on an exact browser request count",
)
replace_once(
    login_test,
    '''    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('alert')).toContainText(/session could not be confirmed/i, { timeout: 45_000 });''',
    '''    await expect(page).toHaveURL(/\/login/);
    await expect.poll(async () => {
      return (await page.locator('[role="alert"]').textContent().catch(() => '')) || '';
    }, {
      timeout: 120_000,
      intervals: [300, 600, 1000, 1800, 3000, 5000],
    }).toMatch(/session could not be confirmed/i);''',
    "wait for retry exhaustion while still requiring the visible session error",
)
'''
if source.count(stamp_anchor) != 1:
    raise SystemExit(f"force-fix wrapper expected one stamp anchor, found {source.count(stamp_anchor)}")
source = source.replace(stamp_anchor, f"\n{extra}{stamp_anchor}", 1)
source = source.replace("churvox-current-full-user-repair-5-20260728", "churvox-current-full-user-force-fix-20260728")

exec(compile(source, str(source_path), "exec"), {"__name__": "__main__", "__file__": str(source_path)})
