#!/usr/bin/env node

const { spawnSync } = require('child_process');

const files = [
  'backend/server/__init__.py',
  'backend/churvox_owner_access_safety_patch.py',
  'backend/churvox_command_human_mimic_routes.py',
  'backend/churvox_command_human_mimic_guard_routes.py',
  'backend/churvox_command_human_mimic_v3_routes.py',
  'backend/churvox_command_human_mimic_source_normalizer.py',
  'backend/churvox_command_human_mimic_role_schema_guard.py',
  'backend/churvox_command_human_mimic_queue_finalizer.py',
  'backend/churvox_command_human_mimic_live_routes.py',
  'backend/churvox_command_human_mimic_marker_routes.py',
  'backend/churvox_command_apply_routes.py',
  'backend/churvox_hq_connection_status_patch.py',
  'backend/churvox_hq_paid_launch_filter_patch.py',
  'backend/churvox_hq_stripe_snapshot_patch.py',
  'backend/churvox_hq_paid_launch_report_patch.py',
  'backend/churvox_hq_paid_launch_postguard_patch.py',
  'backend/usercustomize.py',
  'scripts/churvox_hq_paid_launch_behavior_test.py',
  'scripts/churvox_mimic_full_test.py',
  'scripts/churvox_mimic_full_test_runner.py',
];

const source = [
  'import ast, pathlib, sys',
  `files = ${JSON.stringify(files)}`,
  'failed = []',
  'for name in files:',
  '    path = pathlib.Path(name)',
  '    try:',
  '        ast.parse(path.read_text(encoding="utf-8"), filename=name)',
  '        print(f"✓ Python syntax: {name}")',
  '    except Exception as exc:',
  '        failed.append(f"{name}: {exc}")',
  '        print(f"✗ Python syntax: {name} — {exc}")',
  'if failed:',
  '    print("", file=sys.stderr)',
  '    print(f"Command Python syntax failed: {len(failed)} file(s).", file=sys.stderr)',
  '    raise SystemExit(1)',
  'print("")',
  'print(f"Command Python syntax passed: {len(files)} files.")',
].join('\n');

let result = null;
for (const executable of ['python3', 'python']) {
  result = spawnSync(executable, ['-c', source], { cwd: process.cwd(), encoding: 'utf8' });
  if (!result.error || result.error.code !== 'ENOENT') break;
}

if (!result || (result.error && result.error.code === 'ENOENT')) {
  console.error('Command Python syntax failed: Python was not found.');
  process.exit(1);
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status || 1);
