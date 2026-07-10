#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const playwright = path.join(frontend, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
const consent = 'I_UNDERSTAND_LIVE_DATA_WILL_CHANGE';

if (!fs.existsSync(playwright)) {
  console.error('Playwright is not installed. Run npm --prefix frontend install --legacy-peer-deps first.');
  process.exit(1);
}

const required = [
  ['CHURVOX_OWNER_EMAIL', process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL],
  ['CHURVOX_OWNER_PASSWORD', process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD],
  ['CHURVOX_WORKER_EMAIL', process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL],
  ['CHURVOX_WORKER_PASSWORD', process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD],
];
const missing = required.filter(([, value]) => !value).map(([name]) => name);
if (missing.length) {
  console.error(`Missing hardcore live credentials: ${missing.join(', ')}. Load them in the terminal; do not paste passwords into chat.`);
  process.exit(1);
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const apiBase = process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com';
const mutate = process.env.CHURVOX_HARDCORE_MUTATE === consent;

function run(args, label) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(playwright, args, {
    cwd: frontend,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseURL,
      PLAYWRIGHT_API_BASE: apiBase,
    },
  });
  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}`);
}

function generatedVisualSpec() {
  const sourcePath = path.join(frontend, 'tests', 'e2e', 'churvox-hardcore-owner-worker-visual.spec.js');
  const generatedPath = path.join(frontend, 'tests', 'e2e', '.churvox-hardcore-owner-worker-visual.generated.spec.js');
  const original = fs.readFileSync(sourcePath, 'utf8');
  const oldBlock = [
    '  await waitForSettledContent(page, path);',
    "  const text = (await page.locator('body').innerText()).replace(/\\s+/g, ' ').trim();",
    '  expect(text.length, `${path} is blank or nearly blank`).toBeGreaterThan(90);',
  ].join('\n');
  const newBlock = [
    '  await waitForSettledContent(page, path);',
    '  await expect.poll(async () => {',
    "    const currentText = (await page.locator('body').innerText().catch(() => '')).replace(/\\s+/g, ' ').trim();",
    '    return currentText.length;',
    '  }, {',
    '    message: `${path} stayed on an authentication/loading shell instead of rendering the real page`,',
    '    timeout: 20_000,',
    '    intervals: [250, 500, 900, 1500, 2500],',
    '  }).toBeGreaterThan(90);',
    "  const text = (await page.locator('body').innerText()).replace(/\\s+/g, ' ').trim();",
  ].join('\n');

  const transformed = original.replace(oldBlock, newBlock);
  if (transformed === original || !transformed.includes('stayed on an authentication/loading shell')) {
    throw new Error('Could not strengthen the hardcore authenticated-content wait.');
  }
  fs.writeFileSync(generatedPath, transformed);
  return generatedPath;
}

function generatedMutationSpec() {
  const sourcePath = path.join(frontend, 'tests', 'e2e', 'churvox-hardcore-owner-worker-mutate.spec.js');
  const generatedPath = path.join(frontend, 'tests', 'e2e', '.churvox-hardcore-owner-worker-mutate.generated.spec.js');
  const original = fs.readFileSync(sourcePath, 'utf8');
  const correctedMarker = 'exactly one completion per owner-facing channel';

  if (original.includes(correctedMarker)) {
    fs.writeFileSync(generatedPath, original);
    return generatedPath;
  }

  const oldMessage = 'exactly one completion event reaches owner-facing notification/message collections';
  const messageIndex = original.indexOf(oldMessage);
  const blockStart = messageIndex >= 0 ? original.lastIndexOf('await expect.poll(async () => {', messageIndex) : -1;
  const blockEndMarker = ').toBe(1);';
  const blockEndIndex = messageIndex >= 0 ? original.indexOf(blockEndMarker, messageIndex) : -1;
  const blockEnd = blockEndIndex >= 0 ? blockEndIndex + blockEndMarker.length : -1;

  if (blockStart < 0 || blockEnd < 0 || blockEnd <= blockStart) {
    throw new Error('Could not locate the old completion duplicate check in the mutation spec.');
  }

  const indentation = original.slice(original.lastIndexOf('\n', blockStart) + 1, blockStart);
  const newBlock = `${indentation}await expect.poll(async () => {
${indentation}  const paths = ['/api/notifications?limit=160', '/api/messages?limit=160', '/api/command/slips'];
${indentation}  const counts = {};
${indentation}  for (const path of paths) {
${indentation}    const result = await json(page, 'get', path + (path.includes('?') ? '&' : '?') + 'ts=' + Date.now(), ownerToken);
${indentation}    if (!result.ok) { counts[path] = 0; continue; }
${indentation}    const rows = listFrom(result.body);
${indentation}    const completionRows = rows.filter((row) => contains(row, titleToken) && /job_complete|job_completed|finished the job|complete/i.test(JSON.stringify(row)));
${indentation}    counts[path] = new Set(completionRows.map((row) => idOf(row) || JSON.stringify(row))).size;
${indentation}  }
${indentation}  const values = Object.values(counts);
${indentation}  return values.some((count) => count === 1) && values.every((count) => count <= 1);
${indentation}}, { message: 'exactly one completion per owner-facing channel; no duplicate completion in Notifications, Messages or Command', timeout: 20_000, intervals: [700, 1300, 2400] }).toBe(true);`;

  const transformed = `${original.slice(0, blockStart)}${newBlock}${original.slice(blockEnd)}`;
  if (!transformed.includes(correctedMarker)) {
    throw new Error('Could not build the corrected per-channel completion duplicate check.');
  }
  fs.writeFileSync(generatedPath, transformed);
  return generatedPath;
}

console.log(`Hardcore owner/worker target: ${baseURL}`);
console.log(`Backend: ${apiBase}`);
console.log('Visual truth, permissions, route purpose, touch targets, box density and explanation length will be challenged.');
console.log(mutate
  ? 'LIVE MUTATION ENABLED: a uniquely named job will be created, exercised through the complete field loop, and cleanup must pass.'
  : `Read-only mode. Set CHURVOX_HARDCORE_MUTATE=${consent} only when you intentionally want the live job mutation test.`);

try {
  const generatedVisual = generatedVisualSpec();
  try {
    run([
      'test',
      path.relative(frontend, generatedVisual).replace(/\\/g, '/'),
      '--config=playwright.config.js',
      '--project=desktop-chromium',
      '--project=mobile-chromium',
      '--workers=1',
      '--reporter=line',
    ], 'Hardcore read-only owner/worker and visual gauntlet');
  } finally {
    try { fs.unlinkSync(generatedVisual); } catch {}
  }

  if (mutate) {
    const generated = generatedMutationSpec();
    try {
      run([
        'test',
        path.relative(frontend, generated).replace(/\\/g, '/'),
        '--config=playwright.config.js',
        '--project=desktop-chromium',
        '--workers=1',
        '--reporter=line',
      ], 'Hardcore live boss-worker mutation loop');
    } finally {
      try { fs.unlinkSync(generated); } catch {}
    }
  }
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

console.log('\nHardcore owner/worker gauntlet passed.');