#!/usr/bin/env node

const { spawnSync } = require('child_process');

const live = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const deep = process.env.CHURVOX_DEEP === '1';
const env = {
  ...process.env,
  PLAYWRIGHT_BASE_URL: live,
};

function run(label, command, args, options = {}) {
  console.log(`\n=== ${label} ===`);
  console.log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
    ...options,
  });
  if (result.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    console.error('Fix the failure above, then run npm run green again.');
    process.exit(result.status || 1);
  }
  console.log(`PASSED: ${label}`);
}

console.log('\nChurvox Green Machine');
console.log(`Live site: ${live}`);
console.log(`Deep mode: ${deep ? 'on' : 'off'}`);

run('Frontend build', 'npm', ['run', 'build']);
run('Site green smoke', 'npx', [
  'playwright',
  'test',
  'tests/e2e/churvox-full-human-audit-v8-standalone.spec.js',
  '--project=mobile-chromium',
]);

if (deep) {
  run('Deep human audit mobile', 'npx', [
    'playwright',
    'test',
    'tests/e2e/churvox-full-human-audit-v8.spec.js',
    '--project=mobile-chromium',
  ]);
}

console.log('\nGREEN: Churvox passed the selected gate.');
console.log('Use CHURVOX_DEEP=1 npm run green when you want the deeper audit too.');
