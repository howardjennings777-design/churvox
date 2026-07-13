const fs = require('fs');
const v3 = fs.readFileSync('backend/churvox_command_human_mimic_v3_routes.py', 'utf8');
const paid = fs.readFileSync('backend/churvox_paid_launch_live_patch.py', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const smoke = fs.readFileSync('scripts/churvox-paid-launch-live-smoke-v2.cjs', 'utf8');
const checks = [
  ['v18 performance marker aligned', v3.includes('churvox-command-scan-performance-v18-20260714') && paid.includes('churvox-command-scan-performance-v18-20260714') && marker.includes('churvox-command-scan-performance-v18-20260714')],
  ['collection reads are concurrent and bounded', v3.includes('batches = await asyncio.gather(*(load_collection(name) for name in names))') && v3.includes('timeout=2.5') && v3.includes('max_time_ms(1800)')],
  ['six context groups load concurrently', v3.includes('jobs, invoices, clients, messages, timers, settings = await asyncio.gather(')],
  ['linked invoices use loaded context only', v3.includes('def linked_invoice_exists(') && !v3.includes('linked_jobs[source] = await linked_invoice_exists')],
  ['legacy retirement is bounded and parallel', v3.includes('rows = await asyncio.wait_for(cursor.limit(400).to_list(400), timeout=2.5)') && v3.includes('semaphore = asyncio.Semaphore(8)')],
  ['decision storage is parallel but bounded', v3.includes('store_semaphore = asyncio.Semaphore(8)') && v3.includes('stored = await asyncio.gather(*(store_hardened(doc) for doc in regular[:100]))')],
  ['stage timings are exposed', v3.includes('"stage_timings_ms": stage_timings') && v3.includes('"total_ms"') && v3.includes('"context_load_ms"')],
  ['25 second fail-safe remains', paid.includes('guarded_scan(request=request, payload=payload or {}), 25, "Command brain scan"') && paid.includes('"command_scan_timeout_seconds": 25')],
  ['owner approval and no-action safety remain', v3.includes('Owner approval required. Nothing was sent, synced, charged or changed.') && smoke.includes('no_auto_send') && smoke.includes('no_auto_sync') && smoke.includes('no_auto_charge')],
  ['v17 Messages truth remains', marker.includes('churvox-final-owner-messages-v17-20260714') && marker.includes('single-owner-completion-per-message-channel')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log('CHURVOX_COMMAND_SCAN_PERFORMANCE_V18_CONTRACT_PASS');
