const { test, expect } = require("@playwright/test");

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
    await expect(page).toHaveURL(/\/plans(?:[?#]|$)/i);
    await expect(page.locator("body")).toContainText("Churvox pricing");
    await expect(page.locator("body")).toContainText("Pricing country");
    await expect(page.locator("body")).toContainText(/Start.*Crew.*Operator.*Command/s);
    await expect(page.locator("[data-checkout-trace]").first()).toHaveAttribute("data-checkout-trace", /auth-recover/);
    const country = page.locator("select").filter({ has: page.locator('option[value="NZ"]') }).first();
    await expect(country).toBeVisible();
    await expect(country.locator("option")).toHaveCount(4);
  });
});
