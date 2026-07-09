const { test, expect } = require('@playwright/test');

const pages = [
  ['today', /Today|Daily briefing|Command/i],
  ['command', /Owner decision queue|Command/i],
  ['work', /Jobs, bookings and appointments|Work/i],
  ['schedule', /Calendar and daily planning|Schedule/i],
  ['clients', /Client memory and follow-up|Clients/i],
  ['messages', /Inbox, worker updates and customer replies|Prepared reply draft/i],
  ['worker', /Simple phone view for staff|Churvox Worker/i],
  ['quotes', /Quote desk|Quotes/i],
  ['invoices', /Invoice desk|Invoices/i],
  ['money', /Invoices, quotes and payment follow-up|Money/i],
  ['staff', /Workers, timers and daily run|Staff/i],
  ['payroll', /Hours review, not tax filing|Payroll/i],
  ['team', /Roles behind the desk|Office Team/i],
  ['playbooks', /Same system, different business wording|Playbooks/i],
  ['integrations', /Accounting, email and future tools|Integrations/i],
  ['activity', /Office activity log|Activity/i],
  ['automation', /Prepared rules, not blind automation|Automation/i],
  ['branding', /Business settings and mobile polish|Branding/i],
  ['settings', /Settings|Business/i],
  ['plans', /Plans|Start|Crew|Operator|Command/i],
  ['help', /Owner guide|Help/i],
  ['readiness', /Hidden lab is functionally shaped|Readiness/i],
  ['safety', /Rules before this moves into the real app|Safety/i],
];

test.describe('hidden Office Team lab', () => {
  test('all hidden lab pages load without blank screens', async ({ page }) => {
    for (const [hash, expected] of pages) {
      await page.goto(`/office-team-lab#${hash}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.cvOfficeSite')).toBeVisible();
      await expect(page.locator('.cvSiteTopbar')).toBeVisible();
      await expect(page.getByText(expected).first()).toBeVisible();
      await expect(page.getByText(/Owner approval locked|owner approves|prepared-only/i).first()).toBeVisible();
    }
  });

  test('prepared Command handoff stays local and appears in Activity', async ({ page }) => {
    await page.goto('/office-team-lab#messages', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Prepared reply draft/i)).toBeVisible();
    await page.getByRole('button', { name: /Prepare Command card/i }).first().click();
    await expect(page.getByText(/prepared-only Command item/i).first()).toBeVisible();

    await page.goto('/office-team-lab#command', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Owner decision queue/i)).toBeVisible();
    await expect(page.getByText(/local prepared-only handoff|Nothing was sent, synced, charged or changed/i).first()).toBeVisible();

    await page.locator('.cvSiteDecisionCard').first().getByRole('button').first().click();
    await expect(page.getByText(/cleared the local Command card|Nothing was sent or synced/i).first()).toBeVisible();

    await page.goto('/office-team-lab#activity', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Local office trail/i)).toBeVisible();
    await expect(page.getByText(/Prepared|Cleared/i).first()).toBeVisible();
    await expect(page.getByText(/Nothing was sent, synced, charged or changed|Owner approval still required/i).first()).toBeVisible();
  });

  test('worker phone view uses large local-only controls', async ({ page }) => {
    await page.goto('/office-team-lab#worker', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Churvox Worker/i)).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByText(/Start/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Prepare Command card/i }).first().click();
    await expect(page.getByText(/prepared-only Command item/i).first()).toBeVisible();
  });
});
