const fs = require('fs');
const root = fs.readFileSync('Procfile', 'utf8');
const backend = fs.readFileSync('backend/Procfile', 'utf8');
const docker = fs.readFileSync('Dockerfile', 'utf8');
const guardedBoot = fs.readFileSync('backend/churvox_boot.py', 'utf8');
const outreachBoot = fs.readFileSync('backend/churvox_outreach_boot.py', 'utf8');

const target = 'churvox_outreach_boot:app';
const checks = [
  ['root Procfile uses final Outreach boot', root.includes(`uvicorn ${target}`)],
  ['backend Procfile uses final Outreach boot', backend.includes(`uvicorn ${target}`)],
  ['backend Procfile keeps lifespan enabled', !backend.includes('--lifespan off')],
  ['Docker CMD uses final Outreach boot', docker.includes('"churvox_outreach_boot:app"')],
  ['entrypoint still wraps guarded boot', outreachBoot.includes('import churvox_boot as guarded_boot')],
  ['Outreach desk is force-installed last', outreachBoot.includes('_force_install(outreach_patch, target)')],
  ['Outreach importer is force-installed last', outreachBoot.includes('_force_install(import_patch, target)')],
  ['Outreach live status route exists', outreachBoot.includes('/api/tester-outreach/boot')],
  ['guarded boot still force-installs final Command routes', guardedBoot.includes('fast_patch.install(target, force=True)')],
  ['legacy server is not a direct entrypoint', !root.includes('uvicorn server:app') && !backend.includes('uvicorn server:app') && !docker.includes('"server:app"')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('RENDER_BACKEND_ENTRYPOINT_CONTRACT_PASS');
