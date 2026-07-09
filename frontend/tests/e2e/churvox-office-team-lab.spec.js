const { test, expect } = require('@playwright/test');

const pages = [
  ['today', /Your office team has checked the business|Daily briefing/i],
  ['command', /Owner decision queue/i],
  ['work', /Jobs, bookings and appointments/i],
  ['schedule', /Calendar and daily planning/i],
  ['clients', /Client memory and follow-up/i],
  ['messages', /Inbox, worker updates and customer replies|Prepared reply draft/i],
  ['worker', /Simple phone view for staff|Churvox Worker/i],
  ['quotes', /Quote desk/i],
  ['invoices', /Invoice desk/i],
  ['money', /Invoices, quotes and payment follow-up/i],
  ['staff', /Workers, timers and daily run/i],
  ['payroll', /Hours review, not tax filing/i],
  ['team', /Roles behind the desk/i],
  ['playbooks', /Same system, different business wording/i],
  ['integrations', /Accounting, email and future tools/i],
  ['activity', /Office activity and approval trail/i],
  ['automation', /Prepared rules, not blind automation/i],
  ['branding', /Business settings and mobile polish/i],
  ['settings', /Owner controls before this becomes live/i],
  ['plans', /Pricing stays locked while the product is rebuilt/i],
  ['help', /Owner guide/i],
  ['readiness', /Hidden lab is functionally shaped/i],
  ['safety', /Rules before this moves into the real app/i],
];

test.describe('hidden Office Team lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/office-team-lab#today', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.localStorage.removeItem('churvox_office_team_approval_trail_v1');
      window.localStorage.removeItem('churvox_office_lab_command_queue_v1');
      window.localStorage.removeItem('churvox_office_lab_activity_v1');
      window.sessionStorage.removeItem('churvox_office_lab_command_queue_v1');
      window.sessionStorage.removeItem('churvox_office_lab_activity_v1');
    });
  });

  test('all hidden lab pages load without blank screens', async ({ page }) => {
    for (const [hash, expected] of pages) {
      await page.goto(`/office-team-lab#${hash}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.cvOfficeSite')).toBeVisible();
      await expect(page.locator('.cvSiteTopbar')).toBeVisible();
      await expect(page.locator('.cvSiteScreen')).toBeVisible();
      await expect(page.locator('.cvSiteScreen').getByText(expected).first()).toBeVisible();
      await expect(page.getByText(/Owner approval locked|owner approves|prepared-only|No auto-send|No auto-sync/i).first()).toBeVisible();
    }
  });

  test('prepared Command handoff survives reload then records owner approval', async ({ page }) => {
    await page.goto('/office-team-lab#messages', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Prepared reply draft/i)).toBeVisible();
    await page.getByRole('button', { name: /Prepare Command card/i }).first().click();
    await expect(page.getByText(/prepared-only Command item/i).first()).toBeVisible();

    await page.goto('/office-team-lab#command', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Owner decision queue/i)).toBeVisible();
    await expect(page.getByText(/local prepared-only handoff|Nothing was sent, synced, charged or changed/i).first()).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Owner decision queue/i)).toBeVisible();
    await expect(page.getByText(/local prepared-only handoff|Nothing was sent, synced, charged or changed/i).first()).toBeVisible();

    await page.locator('.cvSiteDecisionCard').first().getByRole('button').first().click();
    await expect(page.getByText(/cleared the local Command card|Approval trail saved|Nothing was sent or synced/i).first()).toBeVisible();

    await page.goto('/office-team-lab#activity', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Owner approval trail/i)).toBeVisible();
    await expect(page.getByText(/Owner reviewed/i).first()).toBeVisible();
    await expect(page.getByText(/Nothing was sent, synced, charged or changed/i).first()).toBeVisible();
    await expect(page.getByText(/Local office trail/i)).toBeVisible();
    await expect(page.getByText(/Prepared|Cleared/i).first()).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Owner approval trail/i)).toBeVisible();
    await expect(page.getByText(/Owner reviewed/i).first()).toBeVisible();
    await expect(page.getByText(/Nothing was sent, synced, charged or changed/i).first()).toBeVisible();
  });

  test('worker phone view uses large local-only controls', async ({ page }) => {
    await page.goto('/office-team-lab#worker', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Churvox Worker/i)).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.locator('.cvWorkerPhoneTop').getByText('Start')).toBeVisible();
    await page.getByRole('button', { name: /Prepare Command card/i }).first().click();
    await expect(page.getByText(/prepared-only Command item/i).first()).toBeVisible();
  });
});
