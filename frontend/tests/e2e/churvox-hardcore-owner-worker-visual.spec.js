const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const TOKEN_CACHE = new Map();

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function tokenFrom(data = {}) {
  return data?.token || data?.access_token || data?.auth_token || data?.jwt || data?.accessToken
    || data?.user?.token || data?.user?.access_token || data?.user?.accessToken
    || data?.data?.token || data?.data?.access_token || data?.data?.user?.token || '';
}

function accountEmail(data = {}) {
  return String(data?.email || data?.user?.email || data?.data?.email || data?.data?.user?.email || '').trim().toLowerCase();
}

async function seedAuth(page, token, email, label) {
  const role = label === 'worker' ? 'worker' : 'owner';
  await page.context().addInitScript(({ tokenValue, emailValue, roleValue }) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('authToken', tokenValue);
    localStorage.setItem('access_token', tokenValue);
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: tokenValue,
      user: { email: emailValue, role: roleValue, has_app_access: true, email_verified: true },
    }));
  }, { tokenValue: token, emailValue: email, roleValue: role });
}

async function loginApi(page, email, password, label) {
  if (!email || !password) throw new Error(`Missing ${label} credentials. Hardcore tests fail rather than skip.`);
  const cacheKey = `${label}:${String(email).toLowerCase()}`;
  if (TOKEN_CACHE.has(cacheKey)) {
    const cached = TOKEN_CACHE.get(cacheKey);
    await seedAuth(page, cached, email, label);
    return cached;
  }
  const paths = label === 'worker' ? ['/api/auth/login', '/api/worker/auth/login'] : ['/api/auth/login'];
  const attempts = [];
  for (const path of paths) {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      try {
        const response = await page.request.post(apiUrl(path), { data: { email, password }, timeout: 60_000 });
        const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
        attempts.push({ path, attempt, status: response.status(), body: JSON.stringify(body).slice(0, 180) });
        if (!response.ok() || body?.success === false) {
          if (![408, 425, 429, 500, 502, 503, 504].includes(response.status())) break;
        } else {
          const token = tokenFrom(body);
          if (token) {
            const returnedEmail = accountEmail(body);
            if (returnedEmail && returnedEmail !== email.toLowerCase()) throw new Error(`${label} login returned a different account.`);
            TOKEN_CACHE.set(cacheKey, token);
            await seedAuth(page, token, email, label);
            return token;
          }
        }
      } catch (error) {
        attempts.push({ path, attempt, status: 'network', body: String(error?.message || error).slice(0, 180) });
        if (attempt === 6) break;
      }
      if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, Math.min(1200 * attempt, 6000)));
    }
  }
  throw new Error(`${label} login failed: ${JSON.stringify(attempts)}`);
}

async function getJson(page, path, token) {
  let lastError = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await page.request.get(apiUrl(path), {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        timeout: 60_000,
      });
      const text = await response.text();
      let body = null;
      try { body = JSON.parse(text); } catch {}
      if (response.ok() || ![408, 425, 429, 500, 502, 503, 504].includes(response.status()) || attempt === 6) {
        return { response, text, body, contentType: response.headers()['content-type'] || '' };
      }
    } catch (error) {
      lastError = error;
      if (attempt === 6) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1200 * attempt, 6000)));
  }
  throw lastError || new Error(`GET ${path} produced no response`);
}

async function waitForSettledContent(page, path) {
  await expect.poll(async () => {
    const text = await page.locator('body').innerText().catch(() => '');
    return (text.match(/checking\s*(?:·|-)?\s*checking live records|checking live records/gi) || []).length;
  }, {
    message: `${path} never settled past repeated live-record loading placeholders`,
    timeout: 15_000,
    intervals: [250, 500, 900, 1500, 2500],
  }).toBeLessThanOrEqual(1);
}

async function openHealthy(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 3500 }).catch(() => null);
  await expect(page.locator('body')).toBeVisible();
  await waitForSettledContent(page, path);
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  expect(text.length, `${path} is blank or nearly blank`).toBeGreaterThan(90);
  expect(text, `${path} rendered a fatal/error boundary`).not.toMatch(/something went wrong|application error|cannot read properties|failed to render|unexpected error/i);
  return text;
}

async function visualTruth(page, mobile) {
  return page.evaluate(({ mobile }) => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight * 2.5;
    };
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const bodyText = clean(document.body.innerText);
    const candidates = [...document.querySelectorAll('section, article, aside, [class*="Card"], [class*="card"], [class*="Panel"], [class*="panel"], [class*="Box"], [class*="box"]')].filter(visible);
    const boxed = candidates.filter((element) => {
      const style = getComputedStyle(element);
      const border = parseFloat(style.borderTopWidth || '0') + parseFloat(style.borderRightWidth || '0') + parseFloat(style.borderBottomWidth || '0') + parseFloat(style.borderLeftWidth || '0');
      const background = style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none';
      const radius = parseFloat(style.borderRadius || '0');
      return border > 0 || (background && radius > 0);
    });
    const boxedSet = new Set(boxed);
    let nestedBoxDepth = 0;
    for (const element of boxed) {
      let depth = 1;
      let parent = element.parentElement;
      while (parent) {
        if (boxedSet.has(parent)) depth += 1;
        parent = parent.parentElement;
      }
      nestedBoxDepth = Math.max(nestedBoxDepth, depth);
    }
    const paragraphs = [...document.querySelectorAll('p')].filter(visible).map((element) => clean(element.innerText)).filter(Boolean);
    const longParagraphs = paragraphs.filter((text) => text.length > 220).map((text) => text.slice(0, 120));
    const textBlocks = [...document.querySelectorAll('p, small, li, h2, h3')]
      .filter(visible)
      .map((element) => clean(element.innerText))
      .filter((text) => text.length >= 28 && text.length <= 260);
    const frequencies = new Map();
    for (const text of textBlocks) frequencies.set(text.toLowerCase(), (frequencies.get(text.toLowerCase()) || 0) + 1);
    const duplicateBlocks = [...frequencies.entries()].filter(([, count]) => count >= 3).map(([text, count]) => ({ text: text.slice(0, 100), count }));
    const oversizedEmptyBoxes = boxed.filter((element) => {
      const rect = element.getBoundingClientRect();
      const text = clean(element.innerText);
      const controls = element.querySelectorAll('button, a, input, textarea, select, img, svg').length;
      return rect.width * rect.height > innerWidth * innerHeight * 0.34 && text.length < 35 && controls === 0;
    }).map((element) => ({ className: String(element.className || '').slice(0, 120), width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) }));
    const controls = [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), textarea, select')].filter(visible);
    const touchProblems = mobile ? controls.filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (style.pointerEvents === 'none') return false;
      return rect.height < 40 || rect.width < 32;
    }).map((element) => ({ text: clean(element.innerText || element.getAttribute('aria-label') || element.getAttribute('placeholder')).slice(0, 80), width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) })) : [];
    const headings = [...document.querySelectorAll('h1, h2, h3')].filter(visible).map((element) => clean(element.innerText)).filter(Boolean).slice(0, 12);
    const buttons = [...document.querySelectorAll('button, a[href]')].filter(visible).map((element) => clean(element.innerText || element.getAttribute('aria-label'))).filter(Boolean).slice(0, 24);
    return {
      words: bodyText ? bodyText.split(/\s+/).length : 0,
      boxedElements: boxed.length,
      longParagraphs,
      duplicateBlocks,
      nestedBoxDepth,
      oversizedEmptyBoxes,
      touchProblems,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      headings,
      buttons,
      signature: `${headings.join('|')}::${buttons.join('|')}`.toLowerCase(),
    };
  }, { mobile });
}

function assertVisual(result, limits, label) {
  expect(result.horizontalOverflow, `${label} horizontal overflow`).toBeLessThanOrEqual(2);
  expect(result.words, `${label} is over-explaining (${result.words} words)`).toBeLessThanOrEqual(limits.words);
  expect(result.boxedElements, `${label} has box/card soup (${result.boxedElements} boxed regions)`).toBeLessThanOrEqual(limits.boxes);
  expect(result.longParagraphs, `${label} has wall-of-copy paragraphs: ${JSON.stringify(result.longParagraphs)}`).toHaveLength(0);
  expect(result.duplicateBlocks, `${label} repeats the same explanation: ${JSON.stringify(result.duplicateBlocks)}`).toHaveLength(0);
  expect(result.nestedBoxDepth, `${label} nests boxes too deeply`).toBeLessThanOrEqual(limits.depth);
  expect(result.oversizedEmptyBoxes, `${label} has giant empty boxes: ${JSON.stringify(result.oversizedEmptyBoxes)}`).toHaveLength(0);
  expect(result.touchProblems, `${label} has tiny mobile controls: ${JSON.stringify(result.touchProblems.slice(0, 10))}`).toHaveLength(0);
}

function similarity(a, b) {
  const aa = new Set(String(a || '').split('|').filter(Boolean));
  const bb = new Set(String(b || '').split('|').filter(Boolean));
  const union = new Set([...aa, ...bb]);
  if (!union.size) return 1;
  let same = 0;
  for (const item of aa) if (bb.has(item)) same += 1;
  return same / union.size;
}

test.describe('Hardcore owner-worker visual, permission and sense check', () => {
  test.setTimeout(240_000);

  test('owner pages are distinct, concise, usable and grounded', async ({ browser }, testInfo) => {
    const mobile = /mobile/i.test(testInfo.project.name);
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginApi(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');

    const routes = [
      ['/dashboard#today', /today|churvox/i],
      ['/dashboard#command', /command|decisions/i],
      ['/dashboard#work', /jobs|work/i],
      ['/dashboard#clients', /clients/i],
      ['/dashboard#worker', /team|people|workers|field|worker/i],
      ['/dashboard#quotes', /quotes/i],
      ['/dashboard#invoices', /invoices/i],
    ];
    const signatures = [];
    for (const [path, marker] of routes) {
      const text = await openHealthy(page, path);
      expect(text, `${path} does not explain its actual purpose`).toMatch(marker);
      const result = await visualTruth(page, mobile);
      assertVisual(result, { words: mobile ? 1450 : 1900, boxes: mobile ? 30 : 42, depth: 4 }, `${testInfo.project.name} ${path}`);
      signatures.push(result.signature);
    }
    expect(new Set(signatures).size, 'Owner pages look/behave like one repeated template').toBeGreaterThanOrEqual(5);
    await context.close();
  });

  test('worker routes are genuinely different, phone-simple and locked to workers', async ({ browser }, testInfo) => {
    const mobile = /mobile/i.test(testInfo.project.name);
    const context = await browser.newContext();
    const page = await context.newPage();
    const token = await loginApi(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');

    await page.goto('/worker/today', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-worker-view="today"]'), 'Live frontend is missing the current strict Worker View build. Deploy latest main before judging role redirects.').toBeVisible({ timeout: 12_000 });

    await page.goto('/dashboard#today', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.url(), {
      message: 'Worker remained in the owner dashboard. The current strict frontend may not be deployed or worker role normalization is broken.',
      timeout: 10_000,
      intervals: [200, 400, 800, 1500],
    }).toMatch(/\/worker\//);

    const ownerOnly = await getJson(page, '/api/admin/owner/paid-launch-report', token);
    expect([401, 403], `Worker reached owner-only HQ: ${ownerOnly.response.status()} ${ownerOnly.text.slice(0, 200)}`).toContain(ownerOnly.response.status());

    const routes = ['/worker/today', '/worker/jobs', '/worker/messages', '/worker/help'];
    const results = [];
    for (const path of routes) {
      await openHealthy(page, path);
      const result = await visualTruth(page, mobile);
      assertVisual(result, { words: mobile ? 620 : 950, boxes: mobile ? 15 : 22, depth: 3 }, `${testInfo.project.name} ${path}`);
      results.push({ path, ...result });
    }

    const unique = new Set(results.map((item) => item.signature));
    expect(unique.size, `Worker routes are duplicate screens: ${JSON.stringify(results.map((item) => ({ path: item.path, headings: item.headings })))}`).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < results.length; i += 1) {
      for (let j = i + 1; j < results.length; j += 1) {
        expect(similarity(results[i].signature, results[j].signature), `${results[i].path} and ${results[j].path} are effectively the same UI`).toBeLessThan(0.86);
      }
    }
    await context.close();
  });

  test('owner cannot impersonate Worker View through a typed URL', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginApi(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    await page.goto('/worker/today', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.url(), {
      message: 'Owner remained in Worker View. Deploy the current strict worker frontend or fix the role guard.',
      timeout: 10_000,
      intervals: [200, 400, 800, 1500],
    }).not.toMatch(/\/worker\/today(?:$|[?#])/);
    await context.close();
  });
});
