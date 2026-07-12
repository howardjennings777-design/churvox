const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function must(ok, message) { if (!ok) throw new Error(message); console.log(`PASS ${message}`); }

const site = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const api = read('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js');
const live = read('backend/churvox_paid_launch_live_patch.py');
const mimic = read('backend/churvox_command_human_mimic_routes.py');
const guard = read('backend/churvox_command_human_mimic_guard_routes.py');
const start = read('backend/churvox_start.py');

must(site.includes('const [commandLoading, setCommandLoading] = useState(isOwnerApp);'), 'Command has an honest initial loading state');
must(site.includes('const queuePromise = loadCurrentQueue();'), 'current Command queue starts first');
must(site.indexOf('const queuePromise = loadCurrentQueue();') < site.indexOf('runBackendOfficeEngineScan();'), 'queue fetch is ordered before full brain scan');
must(!site.includes('runBackendOfficeEngineScan().catch(() => null).then((scan) => fetchBackendCommandDecisions()'), 'old scan-before-queue chain is removed');
must(site.includes('The full business check continues behind it.'), 'owner sees queue-first background-scan wording');
must(site.includes('fetchBackendCommandAudit().then((audit)'), 'audit refresh is independent from queue rendering');

must(api.includes('timeoutMs = 8000'), 'Command fetches have bounded deadlines');
must(api.includes('/api/command/slips`') && api.includes('timeoutMs: 6000'), 'queue request has a six-second safety deadline');
must(api.includes('timeoutMs: 15000'), 'background scan has a bounded deadline');

must(live.includes('def install(module, force=False):'), 'paid-launch backend patch supports final forced install');
must(live.includes('paid-launch-fast-command-v2'), 'fast queue v2 route is present');
must(live.includes('find(query, {"audit": 0})'), 'queue excludes heavy audit arrays');
must(live.includes('.limit(50)'), 'queue payload is bounded to fifty decisions');
must(live.includes('cursor.max_time_ms(2500)'), 'Mongo queue query has a server-side deadline');
must(live.includes('churvox-command-fast-load-backend-20260713b'), 'new backend deployment marker is present');
const fastSlips = live.slice(live.indexOf('async def fast_slips'), live.indexOf('async def fast_scan'));
must(!fastSlips.includes('await ensure_indexes()'), 'queue does not wait for index creation');
must(!fastSlips.includes('count_documents'), 'queue does not block on unrelated worker counts');

must(mimic.startsWith('import asyncio') || mimic.includes('\nimport asyncio\n'), 'human mimic imports asyncio');
must(mimic.includes('batches = await asyncio.gather'), 'mimic collection reads run concurrently');
must(mimic.includes('jobs, invoices, clients, messages, timers, settings = await asyncio.gather'), 'mimic areas scan concurrently');
must(mimic.includes('semaphore = asyncio.Semaphore(8)'), 'mimic slip storage has bounded concurrency');
must(guard.includes('retired_old, outbound_ids, completion_ids, payment_ids, stale_ids = await asyncio.gather'), 'guard cleanup categories run concurrently');

must(start.includes('churvox_paid_launch_live_patch.install(server, force=True)'), 'production entrypoint forces final route precedence');
must(live.includes('Owner approval required. Nothing was sent, synced, charged, filed or paid.'), 'owner-control safety remains unchanged');

console.log('COMMAND_FAST_LOAD_CONTRACT_PASS');
