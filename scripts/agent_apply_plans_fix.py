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
