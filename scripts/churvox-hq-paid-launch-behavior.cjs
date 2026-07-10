#!/usr/bin/env node

const { spawnSync } = require('child_process');

let result = null;
for (const executable of ['python3', 'python']) {
  result = spawnSync(executable, ['scripts/churvox_hq_paid_launch_behavior_test.py'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, PYTHONPATH: process.cwd() },
  });
  if (!result.error || result.error.code !== 'ENOENT') break;
}

if (!result || (result.error && result.error.code === 'ENOENT')) {
  console.error('HQ paid launch behavior failed: Python was not found.');
  process.exit(1);
}
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status || 1);
