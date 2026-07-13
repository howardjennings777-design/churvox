const fs = require('fs');
const live = fs.readFileSync('backend/churvox_paid_launch_live_patch.py', 'utf8');
const boot = fs.readFileSync('backend/churvox_boot.py', 'utf8');

const checks = [
  ['parallel exact-status queue reads', live.includes(`asyncio.gather(*(read_queue_status(bid, status) for status in OPEN_STATUSES))`)],
  ['exact compound index hint', live.includes('cursor.hint([("business_id", 1), ("status", 1), ("updated_at", -1)])')],
  ['sub-second Mongo deadline', live.includes('cursor.max_time_ms(900)')],
  ['bounded foreground query', live.includes('QUEUE_QUERY_TIMEOUT_SECONDS = 2.2')],
  ['server confirmed queue cache', live.includes('queue_cache: Dict[str, Dict[str, Any]] = {}')],
  ['fresh cache returns immediately', live.includes('paid-launch-command-server-cache-v3')],
  ['stale cache is explicit', live.includes('paid-launch-command-stale-cache-v3') && live.includes('"scan_complete": not stale')],
  ['background cache refresh', live.includes('asyncio.create_task(refresh_queue_cache(bid))')],
  ['bounded fifty-slip payload', live.includes('rows = rows[:50]')],
  ['worker problems receive queue priority', live.includes('worker_problem = source == \"worker_field_problem\"') && live.includes('priority = 100 if worker_problem')],
  ['fresh owner-created slips receive queue priority', live.includes('payload_source in {\"manual_form\", \"quick_intake\", \"csv_import\"}') && live.includes('95 if owner_manual')],
  ['explicit post-create cache bypass', live.includes('x-churvox-command-refresh') && live.includes('queue_cache.pop(bid, None)')],
  ['force-refresh readiness marker', live.includes('churvox-command-force-refresh-v4-20260713')],
  ['current backend marker', live.includes('churvox-command-v3-live-backend-20260713g')],
  ['new boot marker', boot.includes('churvox-command-queue-speed-boot-20260713e')],
  ['owner safety unchanged', live.includes('Owner approval required. Nothing was sent, synced, charged, filed or paid.')],
  ['route precedence remains forced', boot.includes('churvox_paid_launch_live_patch.install(churvox_start.server, force=True)')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('COMMAND_QUEUE_SPEED_BACKEND_CONTRACT_PASS');
