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


replace_once(
    "frontend/src/pages/auth/LoginPage.js",
    '''      const destination = postLoginPath(confirmed);
      navigate(destination, { replace: true });
      if (destination.startsWith("/dashboard") || destination === "/plans") {
        window.setTimeout(() => window.dispatchEvent(new Event("churvox-owner-app-ready")), 120);
      }''',
    '''      const destination = postLoginPath(confirmed);
      // The server session has been confirmed. A full route replacement avoids a
      // React state/navigation race where the protected route can briefly see the
      // previous anonymous render and send a valid user back to /login.
      window.location.replace(destination);''',
    "confirmed login opens the authenticated route without a state race",
)

replace_once(
    "frontend/src/churvox-studio/studioModel.js",
    '''  payroll: "timesheets",
  xero: "accounting",''',
    '''  payroll: "timesheets",
  integrations: "accounting",
  xero: "accounting",''',
    "legacy integrations hash opens Accounting",
)

replace_once(
    "frontend/src/churvox-studio/churvoxStudio.css",
    ".cvsContextBeam nav button { min-height: 35px; padding: 0 14px; border: 0; border-radius: 8px; background: transparent; color: #656b66; cursor: pointer; font-size: 12px; font-weight: 700; }",
    ".cvsContextBeam nav button { min-height: 44px; padding: 0 14px; border: 0; border-radius: 8px; background: transparent; color: #656b66; cursor: pointer; font-size: 12px; font-weight: 700; }",
    "touch-sized Command and area tabs",
)

replace_once(
    "frontend/tests/e2e/churvox-current-human-owner-worker-flow.spec.js",
    "  await ownerPage.getByRole('button', { name: 'Add client', exact: true }).click();",
    "  await ownerPage.getByRole('button', { name: 'Add client', exact: true }).first().click();",
    "target the primary Add client action",
)

stamp = datetime.now(timezone.utc).isoformat()
Path("backend/RENDER_RESTART_20260615.txt").write_text(
    f"render-restart-current-full-user-repair-2-20260728\nTriggered: {stamp}\nPurpose: confirmed login route, accounting alias, mobile Command tabs and current client test\n"
)
Path("frontend/public/render-deploy-marker.txt").write_text(
    f"churvox-current-full-user-repair-2-20260728\n{stamp}\n"
)
print("updated Render deployment markers")
