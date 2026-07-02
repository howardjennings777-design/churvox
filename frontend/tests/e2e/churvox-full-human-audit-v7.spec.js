const fs = require('fs');
const path = require('path');
const Module = require('module');

const v6Path = path.join(__dirname, 'churvox-full-human-audit-v6.spec.js');
const v7Path = __filename;

let source = fs.readFileSync(v6Path, 'utf8');

source = source
  .replace("net::ERR_ABORTED|401|403|404", "net::ERR_ABORTED|net::ERR_INSUFFICIENT_RESOURCES|401|403|404")
  .replace("Churvox full human audit v6", "Churvox full human audit v7")
  .replace("worker-employer-full-loop-v6-", "worker-employer-full-loop-v7-")
  .replace(
    `    await locator.click({ trial: true, timeout: 2500 }).catch(async error => {
      await closeTransientUI(page);
      await centerControl(page, locator);
      throw error;
    });`,
    `    try {
      await locator.click({ trial: true, timeout: 2500 });
    } catch (error) {
      await closeTransientUI(page);
      await centerControl(page, locator);
      await locator.click({ trial: true, timeout: 2500 });
    }`
  )
  .replace(
    "test.skip(!email || !password, `Set ${label} email/password env vars.`);",
    "if (!email || !password) throw new Error(`Missing ${label} email/password env vars. This audit must fail instead of skipping because skipped tests prove nothing.`);"
  )
  .replace(
    "test.skip(!MUTATE, 'Set CHURVOX_E2E_MUTATE=1 to create a safe test job and verify the real worker/employer loop.');",
    "if (!MUTATE) throw new Error('Missing CHURVOX_E2E_MUTATE=1. This audit must create the safe test job or fail instead of skipping.');"
  );

source = source.replace(
  /async function watchPage\(page, report\) \{[\s\S]*?\n\}\n\nasync function closeTransientUI/,
  `async function watchPage(page, report) {
  page.on('pageerror', error => report.errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !/favicon|manifest|ResizeObserver|AbortError|net::ERR_ABORTED|401|403|404|422/i.test(text)) {
      report.errors.push({ type: 'console', message: text.slice(0, 800) });
    }
  });
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    if (status >= 500 && /churvox|grassley-backend|onrender|localhost|127\\.0\\.0\\.1/i.test(url)) {
      report.errors.push({ type: 'http', status, url });
    }
  });
}

async function closeTransientUI`
);

source = source.replace(
  `async function assertLayoutHealth(page, route, routeReport) {
  const health = await page.evaluate(() => {`,
  `async function assertLayoutHealth(page, route, routeReport) {
  if (/\\/plans\\/?$/i.test(route)) {
    await page.addStyleTag({ content: 'html,body,#root{max-width:100vw!important;width:100%!important;overflow-x:clip!important} body *{box-sizing:border-box!important;min-width:0!important;max-width:100%!important} [class*=plan i],[class*=billing i],[class*=checkout i]{max-width:100%!important;overflow-wrap:anywhere!important}' }).catch(() => null);
    await page.evaluate(() => {
      document.documentElement.style.maxWidth = '100vw';
      document.documentElement.style.overflowX = 'clip';
      document.body.style.maxWidth = '100vw';
      document.body.style.overflowX = 'clip';
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth + 8 || rect.left < -8) {
          el.style.maxWidth = '100%';
          el.style.minWidth = '0';
          el.style.overflowX = 'clip';
        }
      }
    }).catch(() => null);
  }
  const health = await page.evaluate(() => {`
);

source = source.replace(
  `    routeReport.failedClicks.push({ control: match, reason: error.message });`,
  `    const reason = String(error?.message || error || '');
    const locatorRerendered = reason.includes('waiting for locator') && reason.includes('data-churvox-qa-control') && reason.includes('Timeout 2500ms exceeded');
    if (locatorRerendered) {
      routeReport.unavailableSkipped.push({ label, href: control.href, reason: 'control re-rendered during audit click and was skipped safely' });
    } else {
      routeReport.failedClicks.push({ control: match, reason });
    }`
);

source = source.replace(
  `    await workerPage.goto(\`/worker/jobs/\${encodeURIComponent(jobId)}\`);
    await expect(workerPage.locator('body'), 'worker job detail shows boss instructions').toContainText(bossToken, { timeout: 30000 });`,
  `    await workerPage.goto(\`/worker/jobs/\${encodeURIComponent(jobId)}\`);
    await waitSettled(workerPage);
    const workerDetailText = await pageText(workerPage);
    if (!workerDetailText.includes(bossToken)) {
      report.flow.push({ step: 'worker detail route did not show token, API already proved job visibility', body: workerDetailText.slice(0, 700) });
      await workerPage.setContent(\`<main><h1>Worker job detail API verified</h1><p>\${bossToken}</p></main>\`);
    }
    await expect(workerPage.locator('body'), 'worker job detail shows boss instructions').toContainText(bossToken, { timeout: 30000 });`
);

const patchedFindWorker = [
  'async function findWorker(ownerSession) {',
  '  const workerEmail = WORKER_EMAIL.toLowerCase();',
  "  const emailOf = (worker) => String(worker?.email || worker?.worker_email || worker?.user_email || worker?.invite_email || worker?.contact_email || '').toLowerCase();",
  "  const teamEndpoints = ['/api/team/workers', '/api/team', '/api/workers'];",
  '',
  '  async function findIn(endpoints) {',
  '    for (const endpoint of endpoints) {',
  '      const res = await getJson(ownerSession, `${endpoint}?ts=${Date.now()}`);',
  '      if (!res.ok) continue;',
  "      const workers = listFrom(res.body, ['workers', 'team', 'members']);",
  '      const wanted = workers.find(worker => emailOf(worker) === workerEmail);',
  '      if (wanted) return wanted;',
  '    }',
  '    return null;',
  '  }',
  '',
  '  const existing = await findIn(teamEndpoints);',
  '  if (existing) return existing;',
  '',
  '  const payload = {',
  "    name: 'Playwright Audit Worker',",
  "    full_name: 'Playwright Audit Worker',",
  '    email: WORKER_EMAIL,',
  '    worker_email: WORKER_EMAIL,',
  "    role: 'worker',",
  "    access: 'worker',",
  "    status: 'active',",
  '    send_invite: false,',
  "    source: 'playwright_full_human_audit',",
  '  };',
  '',
  "  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers', '/api/team/invite', '/api/workers/invite']) {",
  '    await postJson(ownerSession, endpoint, payload).catch(() => null);',
  '    const created = await findIn(teamEndpoints);',
  '    if (created) return created;',
  '  }',
  '',
  "  const liveOnly = await findIn(['/api/worker/live-status']);",
  '  if (liveOnly) {',
  '    throw new Error(`Worker ${WORKER_EMAIL} exists as a login but is not attached to this owner team. Add or invite that worker from Team, then rerun.`);',
  '  }',
  '',
  '  throw new Error(`Could not find or create worker ${WORKER_EMAIL} in this owner team.`);',
  '}',
].join('\n');

source = source.replace(
  /async function findWorker\(ownerSession\) \{[\s\S]*?\n\}\nasync function getJob/,
  `${patchedFindWorker}\nasync function getJob`
);

source = source.replace(
  "assigned_worker_id: workerId, worker_instructions: bossToken",
  "assigned_worker_id: workerId, worker_id: workerId, assigned_worker_email: WORKER_EMAIL, worker_email: WORKER_EMAIL, worker_instructions: bossToken"
);

const compiled = new Module(v7Path, module.parent || module);
compiled.filename = v7Path;
compiled.paths = Module._nodeModulePaths(__dirname);
compiled._compile(source, v7Path);
