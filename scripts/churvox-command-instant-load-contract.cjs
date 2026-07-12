const fs = require('fs');
const api = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js', 'utf8');
const site = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx', 'utf8');
const checks = [
  ['cache key', api.includes('churvox:command:confirmed-queue:v1')],
  ['cache reader exported', api.includes('export function readCachedBackendCommandDecisions')],
  ['successful queue cached', api.includes('cacheBackendCommandDecisions(payload)')],
  ['foreground timeout 3s', site.includes('timeoutMs: 3000, attempts: 1')],
  ['background timeout bounded', site.includes('timeoutMs: 8000, attempts: 1')],
  ['cached queue shown immediately', site.includes('Command is open from the last confirmed queue')],
  ['deep scan deferred', site.includes('}, 900);')],
  ['new build marker', site.includes('churvox-command-instant-load-20260713d')],
  ['no fake fallback', !site.includes('starterDecisions') || site.includes('if (isOwnerApp) return backendDecisions')],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
