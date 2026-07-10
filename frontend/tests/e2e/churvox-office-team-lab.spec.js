const { test, expect } = require('@playwright/test');

const pages = [
  ['today', /Your office team has checked the business|Daily briefing|Churvox does the admin/i],
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
  ['team', /Roles behind the desk|Office Team|Owner question/i],
  ['playbooks', /Same system, different business wording/i],
  ['integrations', /Accounting, email and future tools/i],
  ['activity', /Office activity and approval trail|Activity and approval trail/i],
  ['automation', /Prepared rules, not blind automation/i],
  ['branding', /Business settings and mobile polish/i],
  ['settings', /Business settings|Owner controls|Settings/i],
  ['plans', /Choose the level of control|Included in this plan|Command Growth Pack/i],
  ['help', /Owner guide/i],
  ['readiness', /Readiness|owner approval|checked/i],
  ['safety', /Owner-control rules|How Churvox keeps the owner in charge/i],
];

const safetyCopy = /Owner approval locked|owner approves|owner approval|prepared-only|No auto-send|No auto-sync|Nothing was sent, synced, charged or changed|no send, sync, charge or record change/i;
const approvalTrailCopy = /Owner reviewed|Command recorded|recorded|approved|Approve record|Approval trail saved/i;

test.describe('hidden Office Team lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/office-team-lab#today', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.localStorage.removeItem('churvox_office_team_approval_trail_v1');
      window.localStorage.removeItem('churvox_office_owner_approval_trail_v1');
      window.localStorage.removeItem('churvox_office_lab_command_queue_v1');
      window.localStorage.removeItem('churvox_office_lab_activity_v1');
      window.localStorage.removeItem('churvox_office_owner_command_queue_v1');
      window.localStorage.removeItem('churvox_office_owner_activity_v1');
      window.sessionStorage.removeItem('churvox_office_lab_command_queue_v1');
      window.sessionStorage.removeItem('churvox_office_lab_activity_v1');
      window.sessionStorage.removeItem('churvox_office_owner_command_queue_v1');
      window.sessionStorage.removeItem('churvox_office_owner_activity_v1');
    });
  });

  test('all hidden lab pages load without blank screens', async ({ page }) => {
    for (const [hash, expected] of pages) {
      await page.goto(`/office-team-lab#${hash}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.cvOfficeSite')).toBeVisible();
      await expect(page.locator('.cvSiteTopbar')).toBeVisible();
      await expect(page.locator('.cvSiteScreen')).toBeVisible();
      await expect(page.locator('.cvSiteScreen').getByText(expected).first()).toBeVisible();
      await expect(page.getByText(safetyCopy).first()).toBeVisible();
    }
  });

  test('Command action wording stays approval-safe', async ({ page }) => {
    await page.goto('/office-team-lab#command', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Owner decision queue/i)).toBeVisible();
    const visibleLabels = await page.locator('.cvSiteDecisionCard footer button').evaluateAll((buttons) => buttons.map((button) => button.textContent || '').join(' '));
    expect(visibleLabels).not.toMatch(/\bSend\b|\bBook\b|\bComplete\b|\bAdd charge\b|\bSave\b/);
    await expect(page.getByText(/Approval recorded only · no send, sync, charge or record change/i).first()).toBeVisible();
  });

  test('prepared Command handoff survives reload then records owner approval', async ({ page }) => {
    await page.goto('/office-team-lab#messages', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Prepared reply draft/i)).toBeVisible();
    await page.getByRole('button', { name: /Prepare Command card/i }).first().click();
    await expect(page.getByText(/prepared-only Command item/i).first()).toBeVisible();

    await page.goto('/office-team-lab#today', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Office desk handover/i)).toBeVisible();
    await expect(page.getByText(/prepared · owner approval required/i).first()).toBeVisible();

    await page.goto('/office-team-lab#command', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Owner decision queue/i)).toBeVisible();
    await expect(page.getByText(/prepared-only handoff|Nothing was sent, synced, charged or changed/i).first()).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Owner decision queue/i)).toBeVisible();
    await expect(page.getByText(/prepared-only handoff|Nothing was sent, synced, charged or changed/i).first()).toBeVisible();

    await page.locator('.cvSiteDecisionCard').first().getByRole('button', { name: /Open slip/i }).click();
    await expect(page.locator('.cvCommandSlip').getByText(/Command slip/i).first()).toBeVisible();
    await page.locator('.cvCommandSlip footer button.primary').first().click();
    await expect(page.getByText(/recorded as the owner decision|Approval trail saved|Nothing was sent, synced, charged or changed/i).first()).toBeVisible();

    await page.goto('/office-team-lab#today', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Recent owner approvals/i)).toBeVisible();
    await expect(page.getByText(approvalTrailCopy).first()).toBeVisible();

    await page.goto('/office-team-lab#activity', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Owner approval trail/i)).toBeVisible();
    await expect(page.getByText(approvalTrailCopy).first()).toBeVisible();
    await expect(page.getByText(/Nothing was sent, synced, charged or changed/i).first()).toBeVisible();
    await expect(page.getByText(/Prepared work trail/i)).toBeVisible();
    await expect(page.getByText(/Prepared|Cleared/i).first()).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Owner approval trail/i)).toBeVisible();
    await expect(page.getByText(approvalTrailCopy).first()).toBeVisible();
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