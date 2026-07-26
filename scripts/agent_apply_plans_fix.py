from pathlib import Path

app_path = Path("frontend/src/App.js")
app = app_path.read_text(encoding="utf-8")

import_anchor = 'const FreshApp = React.lazy(() => import("./churvox-fresh/FreshApp"));'
plans_import = 'const StandalonePlansRoute = React.lazy(() => import("./StandalonePlansRoute"));'
if plans_import not in app:
    if import_anchor not in app:
        raise SystemExit("FreshApp import anchor not found")
    app = app.replace(import_anchor, import_anchor + "\n" + plans_import, 1)

old_route = '<Route path="/plans" element={<FreshBusinessRoute><AppRedirect to="/dashboard#plans" /></FreshBusinessRoute>} />'
new_route = '<Route path="/plans" element={<FreshBusinessRoute><StandalonePlansRoute /></FreshBusinessRoute>} />'
if old_route in app:
    app = app.replace(old_route, new_route, 1)
elif new_route not in app:
    raise SystemExit("Plans route anchor not found")
app_path.write_text(app, encoding="utf-8")

Path("frontend/src/StandalonePlansRoute.jsx").write_text(
    '''import React from "react";
import FreshPlans from "./churvox-fresh/FreshPlans";

export default function StandalonePlansRoute() {
  const handleNavigate = React.useCallback((target) => {
    const section = String(target || "").trim().toLowerCase();
    if (section === "support" || section === "help") {
      window.location.assign("/support");
      return;
    }
    window.location.assign(section ? `/dashboard#${section}` : "/dashboard");
  }, []);

  return (
    <main className="cvStandalonePlansRoute" data-checkout-trace="plans-route-auth-recover-v1">
      <FreshPlans onNavigate={handleNavigate} />
    </main>
  );
}
''',
    encoding="utf-8",
)

Path("frontend/tests/e2e/churvox-plans-route-contract.spec.js").write_text(
    '''const { test, expect } = require("@playwright/test");

test.describe("standalone authenticated plans route", () => {
  test("renders real pricing and the country selector", async ({ page }) => {
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "plans-route-test-token",
          user: {
            id: "plans-route-test-owner",
            business_id: "plans-route-test-business",
            email: "plans-route-test@example.com",
            email_verified: true,
            role: "owner",
            has_app_access: false,
            plan: "",
          },
        }),
      });
    });
    await page.route("**/api/billing/subscription-status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ plan: null, has_app_access: false, subscription_status: "unpaid" }),
      });
    });

    await page.goto("/plans?country=NZ");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\\/plans(?:[?#]|$)/i);
    await expect(page.locator("body")).toContainText("Churvox pricing");
    await expect(page.locator("body")).toContainText("Pricing country");
    await expect(page.locator("body")).toContainText(/Start.*Crew.*Operator.*Command/s);
    await expect(page.locator("[data-checkout-trace]").first()).toHaveAttribute("data-checkout-trace", /auth-recover/);
    const country = page.locator("select").filter({ has: page.locator('option[value="NZ"]') }).first();
    await expect(country).toBeVisible();
    await expect(country.locator("option")).toHaveCount(4);
  });
});
''',
    encoding="utf-8",
)

regression_path = Path("frontend/tests/e2e/churvox-plans-regression-and-cleanup.spec.js")
regression = regression_path.read_text(encoding="utf-8")
old_login_click = "  const clicked = await clickText(page, ['Log in', 'Login', 'Sign in']);\n  expect(clicked, 'login button should be clickable').toBeTruthy();"
new_login_click = "  const submit = page.locator('button[type=\"submit\"], input[type=\"submit\"]').last();\n  let clicked = false;\n  if (await submit.isVisible().catch(() => false)) {\n    await submit.click();\n    clicked = true;\n  } else {\n    clicked = await clickText(page, ['Open Churvox', 'Log in', 'Login', 'Sign in']);\n  }\n  expect(clicked, 'login submit button should be clickable').toBeTruthy();"
if old_login_click in regression:
    regression = regression.replace(old_login_click, new_login_click, 1)
elif new_login_click not in regression:
    raise SystemExit("Plans regression login helper anchor not found")
regression_path.write_text(regression, encoding="utf-8")

gauntlet_path = Path("frontend/tests/e2e/churvox-human-business-gauntlet.spec.js")
gauntlet = gauntlet_path.read_text(encoding="utf-8")
old_dashboard_check = "    await page.goto('/dashboard');\n    await waitHuman(page);\n    const text = await bodyText(page);\n    expect(text, 'dashboard should expose the Churvox Business System Suite panel').toMatch(/Churvox business system|Autopilot|Office live feed|Daily closeout|Proof pack|Client memory/i);"
new_dashboard_check = "    await page.goto('/dashboard');\n    await waitHuman(page);\n    await expect(page.locator('.cvsLoading')).toHaveCount(0, { timeout: 45000 });\n    await expect(page.locator('[data-churvox-layout=\"fresh-studio\"]')).toBeVisible();\n    const text = await bodyText(page);\n    expect(text, 'dashboard should expose the live Churvox Studio owner workspace').toMatch(/Today|Live records|Owner-controlled actions|Live business data/i);\n    expect(text, 'dashboard should finish building the live business picture').not.toMatch(/Building the live business picture/i);"
if old_dashboard_check in gauntlet:
    gauntlet = gauntlet.replace(old_dashboard_check, new_dashboard_check, 1)
elif new_dashboard_check not in gauntlet:
    raise SystemExit("Owner dashboard gauntlet anchor not found")
gauntlet_path.write_text(gauntlet, encoding="utf-8")
