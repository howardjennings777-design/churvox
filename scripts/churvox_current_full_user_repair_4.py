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


login_page = "frontend/src/pages/auth/LoginPage.js"
replace_once(
    login_page,
    "const ACCESS_REFRESH_TIMEOUT_MS = 9000;",
    "const ACCESS_REFRESH_TIMEOUT_MS = 30000;",
    "give live session confirmation enough time",
)
replace_once(
    login_page,
    '''function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}''',
    '''function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function confirmFreshSession(checkAuth) {
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
    "retry a slow or temporarily empty session confirmation",
)
replace_once(
    login_page,
    '''      let freshUser;
      try {
        freshUser = await withTimeout(checkAuth({ allowOfflineFallback: false }), ACCESS_REFRESH_TIMEOUT_MS, "Your session could not be confirmed. Please sign in again.");
      } catch {
        try { await logout?.(); } catch {}
        throw new Error("Your session could not be confirmed. Please sign in again.");
      }
      if (!freshUser) {
        try { await logout?.(); } catch {}
        throw new Error("Your session could not be confirmed. Please sign in again.");
      }''',
    '''      let freshUser;
      try {
        freshUser = await confirmFreshSession(checkAuth);
      } catch {
        try { await logout?.(); } catch {}
        throw new Error("Your session could not be confirmed. Please sign in again.");
      }''',
    "only log out after all session-confirmation attempts fail",
)

use_api = "frontend/src/hooks/useApi.js"
replace_once(
    use_api,
    "const API_TIMEOUT_MS = 15000;",
    "const API_TIMEOUT_MS = 30000;",
    "allow live business data through a slow Render response",
)

login_test = "frontend/tests/e2e/churvox-login-recovery-paid-launch.spec.js"
replace_once(
    login_test,
    '''  test('login does not navigate when the new session cannot be confirmed', async ({ page }) => {''',
    '''  test('login retries a temporary session confirmation outage', async ({ page }) => {
    await installLoginApi(page, { postLoginMeFailures: 1 });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signIn(page);
    await expect.poll(() => page.url()).toMatch(/\/dashboard/);
  });

  test('login does not navigate when the new session cannot be confirmed', async ({ page }) => {''',
    "cover a temporary post-login session outage",
)
replace_once(
    login_test,
    "    await expect(page.getByRole('alert')).toContainText(/session could not be confirmed/i);",
    "    await expect(page.getByRole('alert')).toContainText(/session could not be confirmed/i, { timeout: 45_000 });",
    "wait for deliberate session retry exhaustion before checking the final error",
)

live_test = "frontend/tests/e2e/churvox-live-launch-human-audit-v2.spec.js"
replace_once(
    live_test,
    "  ['payroll', /payroll|hours/i],",
    "  ['payroll', /time|timesheet|hours|team status/i],",
    "match Payroll alias to the current Time workspace",
)
replace_once(
    live_test,
    '''    timeout: 30_000,
    intervals: [300, 600, 1000, 1800, 3000],
  }).not.toMatch(/\/login(?:[?#]|$)/);''',
    '''    timeout: 60_000,
    intervals: [300, 600, 1000, 1800, 3000, 5000],
  }).not.toMatch(/\/login(?:[?#]|$)/);''',
    "allow the real visible login to complete through a cold backend",
)

flow = "frontend/tests/e2e/churvox-current-human-owner-worker-flow.spec.js"
replace_once(
    flow,
    '''  await ownerPage.getByRole('button', { name: 'Add client', exact: true }).first().click(); // Stable equivalent of .filter({ visible: true }).first().click();
  const dialog = ownerPage.getByRole('dialog', { name: /Create client/i });
  await expect(dialog).toBeVisible({ timeout: 10_000 });''',
    '''  await ownerPage.getByRole('button', { name: 'Create a record', exact: true }).click();
  const createMenu = ownerPage.getByRole('dialog', { name: 'Create in Churvox' });
  await expect(createMenu).toBeVisible({ timeout: 10_000 });
  await createMenu.getByRole('button', { name: /Client/i }).click();
  const dialog = ownerPage.getByRole('dialog', { name: /Create client/i });
  await expect(dialog).toBeVisible({ timeout: 10_000 });''',
    "create a client through the current global Create workflow",
)

hardcore = "frontend/tests/e2e/churvox-hardcore-owner-worker-visual.spec.js"
replace_once(
    hardcore,
    "      ['/dashboard#worker', /workers|field|worker/i],",
    "      ['/dashboard#worker', /team|people|workers|field|worker/i],",
    "match the Worker alias to the current Team workspace",
)

stamp = datetime.now(timezone.utc).isoformat()
Path("backend/RENDER_RESTART_20260615.txt").write_text(
    f"render-restart-current-full-user-repair-4-20260728\nTriggered: {stamp}\nPurpose: resilient visible login, live API tolerance and current Create/Team/Time audit flow\n"
)
Path("frontend/public/render-deploy-marker.txt").write_text(
    f"churvox-current-full-user-repair-4-20260728\n{stamp}\n"
)
print("updated Render deployment markers")
