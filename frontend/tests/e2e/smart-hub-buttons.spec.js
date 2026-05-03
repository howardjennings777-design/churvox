const { test, expect } = require('@playwright/test');
const { createErrorMonitor, loginIfPossible } = require('./_helpers');

test('smart hub button wiring audit', async ({ page }, testInfo) => {
  const monitor = createErrorMonitor(page, testInfo);
  const authed = await loginIfPossible(page);
  test.skip(!authed, 'Missing test credentials for Smart Hub auth tests.');

  await page.goto('/dashboard');
  await expect(page.getByText(/AI Command Centre|AI Brain Engine/i).first()).toBeVisible();

  await page.getByRole('button', { name: /^Create$/ }).first().click();
  await expect(page.getByRole('button', { name: /New job/i })).toBeVisible();

  const createItems = ['New job', 'New quote', 'New invoice', 'Add client', 'Invite worker'];
  for (const label of createItems) {
    await page.getByRole('button', { name: new RegExp(label, 'i') }).first().click();
    await expect(page.getByRole('button', { name: /cancel|close/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /cancel|close/i }).first().click();
    await page.getByRole('button', { name: /^Create$/ }).first().click();
  }

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Ask AI$/ }).first().click();
  await expect(page.getByRole('button', { name: /^Ask AI$/ }).nth(1)).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('button', { name: /^Run scan$/ })).toHaveCount(1);
  const duplicates = await page.locator('text=/Run brain scan|Run AI check|Run daily check/i').count();
  expect(duplicates).toBe(0);
  await page.getByRole('button', { name: /^Run scan$/ }).click();

  for (const btn of ['Review approvals', 'Prepare today']) {
    await page.getByRole('button', { name: new RegExp(btn, 'i') }).click();
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  }

  const metrics = ['Jobs today', 'Unassigned', 'Quotes waiting', 'Open invoices', 'Ready to bill', 'Crew active'];
  for (const metric of metrics) {
    await page.getByRole('button', { name: new RegExp(metric, 'i') }).first().click();
    await expect(page.locator('body')).toContainText(/Today|Dispatch|Jobs|Quotes|Invoices|Clients|Crew|Approvals/i);
  }

  const tabs = ['Today', 'Dispatch', 'Jobs', 'Quotes', 'Invoices', 'Clients', 'Crew', 'Approvals'];
  for (const tab of tabs) {
    await page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') })).toHaveClass(/bg-|text-|border-/);
  }

  const approvalCards = page.locator('text=/Approval item|Prepared action|Review approvals/i');
  if (await approvalCards.count()) {
    await approvalCards.first().click();
    for (const action of ['Approve', 'Edit', 'Dismiss', 'Open full record']) {
      const actionBtn = page.getByRole('button', { name: new RegExp(action, 'i') });
      if (await actionBtn.count()) await actionBtn.first().click();
    }
  }

  await monitor.assertHealthy();
});
