const fs = require('fs');
const root = fs.readFileSync('Procfile', 'utf8');
const backend = fs.readFileSync('backend/Procfile', 'utf8');
const docker = fs.readFileSync('Dockerfile', 'utf8');
const boot = fs.readFileSync('backend/churvox_boot.py', 'utf8');

const checks = [
  ['root Procfile uses guarded boot', root.includes('uvicorn churvox_boot:app')],
  ['backend Procfile uses guarded boot', backend.includes('uvicorn churvox_boot:app')],
  ['backend Procfile keeps lifespan enabled', !backend.includes('--lifespan off')],
  ['Docker CMD uses guarded boot', docker.includes('"churvox_boot:app"')],
  ['Docker CMD no longer starts legacy server directly', !docker.includes('"server:app"')],
  ['backend Procfile no longer starts legacy server directly', !backend.includes('uvicorn server:app')],
  ['boot force-installs final Command routes', boot.includes('churvox_paid_launch_live_patch.install(churvox_start.server, force=True)')],
  ['boot carries queue-speed version', boot.includes('churvox-command-queue-speed-boot-20260713e')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('RENDER_BACKEND_ENTRYPOINT_CONTRACT_PASS');
