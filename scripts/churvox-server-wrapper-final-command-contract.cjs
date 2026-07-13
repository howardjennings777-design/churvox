const fs = require('fs');
const wrapper = fs.readFileSync('backend/server/__init__.py', 'utf8');
const live = fs.readFileSync('backend/churvox_paid_launch_live_patch.py', 'utf8');

const forceIndex = wrapper.indexOf('command_patch.install(legacy, force=True)');
const proofIndex = wrapper.indexOf('_install_wrapper_proof_pack_guard()');
const checks = [
  ['live server wrapper states Render starts server:app', wrapper.includes('Render starts with: uvicorn server:app')],
  ['final Command patch is force installed', forceIndex >= 0],
  ['final install occurs after generic patch list', forceIndex > wrapper.indexOf('_install_launch_patch(_patch)')],
  ['final install occurs before later wrapper routes', proofIndex < 0 || forceIndex < proofIndex],
  ['safe public boot marker exists', wrapper.includes("app.add_api_route('/api/command-fast-load/boot', _final_command_wrapper_marker, methods=['GET'])")],
  ['wrapper marker version exists', wrapper.includes('churvox-command-queue-speed-server-wrapper-20260713f')],
  ['marker reports route owners', wrapper.includes("'/api/command/slips', '/api/command/scan', '/api/admin-brain/scan'")],
  ['queue route implementation is v3', live.includes('paid-launch-fast-command-v3')],
  ['queue uses parallel exact-status reads', live.includes('read_queue_status(bid, status) for status in OPEN_STATUSES')],
  ['owner safety unchanged', live.includes('Owner approval required. Nothing was sent, synced, charged, filed or paid.')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('SERVER_WRAPPER_FINAL_COMMAND_CONTRACT_PASS');
