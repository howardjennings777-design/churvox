const { test, expect } = require('@playwright/test');

const APP_BASE = (process.env.CHURVOX_APP_BASE || 'https://www.churvox.com').replace(/\/$/, '');

test('marketing message is serious and clear for service businesses', async ({ page }) => {
  test.setTimeout(90000);

  await page.goto(`${APP_BASE}/`, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('body')).toContainText(/Quote jobs/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Run crews/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Get paid/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Lawn care/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Cleaning/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Customer accepts/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Proofed core loop/i, { timeout: 30000 });

  const homeText = await page.locator('body').innerText();
  console.log(`MARKETING_HOME_HAS_JOB_TO_PAID=${/Quote jobs[\s\S]*Get paid/i.test(homeText)}`);
  console.log(`MARKETING_HOME_HAS_TRADE_EXAMPLES=${/Lawn care[\s\S]*Cleaning[\s\S]*Handyman/i.test(homeText)}`);
  console.log(`MARKETING_HOME_HAS_PROOFED_CORE_LOOP=${/Proofed core loop/i.test(homeText)}`);

  await page.goto(`${APP_BASE}/pricing`, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('body')).toContainText(/Which plan fits/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Start/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Crew/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Operator/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Command/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Accounting support/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/Xero\/MYOB/i, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/staged rollout/i, { timeout: 30000 });

  const pricingText = await page.locator('body').innerText();
  console.log(`MARKETING_PRICING_HAS_PLAN_CHOOSER=${/Start[\s\S]*Crew[\s\S]*Operator[\s\S]*Command/i.test(pricingText)}`);
  console.log(`MARKETING_PRICING_HAS_ACCOUNTING_CAVEAT=${/Xero\/MYOB[\s\S]*staged rollout/i.test(pricingText)}`);

  console.log('MARKETING_MESSAGE_PROOF=passed');
});
