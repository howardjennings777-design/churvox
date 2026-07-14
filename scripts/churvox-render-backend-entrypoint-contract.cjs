const fs = require('fs');
const root = fs.readFileSync('Procfile', 'utf8');
const backend = fs.readFileSync('backend/Procfile', 'utf8');
const docker = fs.readFileSync('Dockerfile', 'utf8');
const wrapper = fs.readFileSync('backend/server/__init__.py', 'utf8');
const hqGuard = fs.readFileSync('backend/churvox_hq_hello_only_guard_patch.py', 'utf8');
const apiBase = fs.readFileSync('frontend/src/lib/apiBase.js', 'utf8');

const checks = [
  ['root Procfile uses production server wrapper', root.includes('uvicorn server:app')],
  ['backend Procfile uses production server wrapper', backend.includes('uvicorn server:app')],
  ['backend Procfile keeps lifespan enabled', !backend.includes('--lifespan off')],
  ['Docker CMD uses production server wrapper', docker.includes('"server:app"')],
  ['wrapper documents the Render server entrypoint', wrapper.includes('Render starts with: uvicorn server:app')],
  ['wrapper loads the guaranteed HQ guard patch', wrapper.includes("'churvox_hq_hello_only_guard_patch'")],
  ['HQ guard mounts the Outreach desk patch', hqGuard.includes('churvox_tester_outreach_desk_patch')],
  ['HQ guard mounts the Outreach importer patch', hqGuard.includes('churvox_tester_outreach_import_patch')],
  ['HQ guard exposes the Outreach boot marker', hqGuard.includes('/api/tester-outreach/boot')],
  ['HQ guard verifies the Outreach GET route', hqGuard.includes('/api/admin/owner/tester-outreach')],
  ['HQ guard owns explicit Outreach OPTIONS routes', hqGuard.includes('outreach_options') && hqGuard.includes('methods=["OPTIONS"]')],
  ['HQ guard carries the preflight-safe version', hqGuard.includes('churvox-outreach-live-wrapper-20260715c')],
  ['frontend installs the Outreach simple GET guard', apiBase.includes('__CHURVOX_OUTREACH_SIMPLE_GET_GUARD__')],
  ['frontend strips GET content type', apiBase.includes('nextHeaders.delete("content-type")')],
  ['frontend strips GET authorization preflight', apiBase.includes('nextHeaders.delete("authorization")')],
  ['frontend guard targets only the Outreach GET path', apiBase.includes('url.pathname === OUTREACH_GET_PATH') && apiBase.includes('method === "GET"')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('RENDER_BACKEND_ENTRYPOINT_CONTRACT_PASS');
