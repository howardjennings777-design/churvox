from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:180]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


backend = "backend/churvox_paid_launch_live_patch.py"
replace_once(
    backend,
    'QUEUE_QUERY_TIMEOUT_SECONDS = 2.2',
    'QUEUE_QUERY_TIMEOUT_SECONDS = 2.2\nCOMMAND_FORCE_REFRESH_BUILD = "churvox-command-force-refresh-v4-20260713"',
)
replace_once(
    backend,
    '''        cached = queue_cache.get(bid)
        age = time.monotonic() - float((cached or {}).get("at") or 0)
        if cached and age <= QUEUE_CACHE_TTL_SECONDS:
''',
    '''        force_live = str(request.query_params.get("refresh") or "").lower() in {"1", "true", "yes"} \\
            or request.headers.get("x-churvox-command-refresh") == COMMAND_FORCE_REFRESH_BUILD
        if force_live:
            queue_cache.pop(bid, None)

        cached = queue_cache.get(bid)
        age = time.monotonic() - float((cached or {}).get("at") or 0)
        if cached and age <= QUEUE_CACHE_TTL_SECONDS and not force_live:
''',
)
replace_once(
    backend,
    '''            "marker": "churvox-command-v3-live-backend-20260713g",
            "routes": ["payroll", "payroll-summary", "command-slips", "command-scan", "admin-brain"],
''',
    '''            "marker": "churvox-command-v3-live-backend-20260713g",
            "command_force_refresh": COMMAND_FORCE_REFRESH_BUILD,
            "routes": ["payroll", "payroll-summary", "command-slips", "command-scan", "admin-brain"],
''',
)

api = "frontend/src/churvox-office-lab/OfficeTeamCommandApi.js"
replace_once(
    api,
    'export const BACKEND_COMMAND_EVENT = "churvox-backend-command-slip";',
    'export const BACKEND_COMMAND_EVENT = "churvox-backend-command-slip";\nexport const COMMAND_FORCE_REFRESH_BUILD = "churvox-command-force-refresh-v4-20260713";',
)
replace_once(
    api,
    '''export async function fetchBackendCommandDecisions({ timeoutMs = 3000, attempts = 1 } = {}) {
  const base = host();
  if (!base) return { source: "command-unavailable", decisions: [], message: "No API host" };
  const response = await fetchWithRetry(`${base}/api/command/slips`, { credentials: "include", headers: authHeaders({ json: false }), timeoutMs }, attempts);
''',
    '''export async function fetchBackendCommandDecisions({ timeoutMs = 3000, attempts = 1, force = false } = {}) {
  const base = host();
  if (!base) return { source: "command-unavailable", decisions: [], message: "No API host" };
  const path = force ? `/api/command/slips?refresh=${Date.now()}` : "/api/command/slips";
  const headers = {
    ...authHeaders({ json: false }),
    ...(force ? { "X-Churvox-Command-Refresh": COMMAND_FORCE_REFRESH_BUILD } : {}),
  };
  const response = await fetchWithRetry(`${base}${path}`, { credentials: "include", headers, timeoutMs }, attempts);
''',
)

site = "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
replace_once(
    site,
    'const loadCurrentQueue = async ({ afterScan = false, scan = null, timeoutMs = 3000, attempts = 1 } = {}) => {',
    'const loadCurrentQueue = async ({ afterScan = false, scan = null, timeoutMs = 3000, attempts = 1, force = false } = {}) => {',
)
replace_once(
    site,
    'const command = await fetchBackendCommandDecisions({ timeoutMs, attempts });',
    'const command = await fetchBackendCommandDecisions({ timeoutMs, attempts, force });',
)
replace_once(
    site,
    'const command = await loadCurrentQueue({ afterScan: true, scan, timeoutMs: 8000, attempts: 1 });',
    'const command = await loadCurrentQueue({ afterScan: true, scan, timeoutMs: 8000, attempts: 1, force: true });',
)
replace_once(
    site,
    '''    const refreshBackendCommand = () => {
      fetchBackendCommandDecisions()
''',
    '''    const refreshBackendCommand = () => {
      fetchBackendCommandDecisions({ timeoutMs: 8000, attempts: 2, force: true })
''',
)

contract = Path("scripts/churvox-command-queue-speed-backend-contract.cjs")
contract_text = contract.read_text(encoding="utf-8")
needle = "  ['bounded fifty-slip payload', live.includes('rows = rows[:50]')],\n"
addition = "  ['bounded fifty-slip payload', live.includes('rows = rows[:50]')],\n  ['explicit post-create cache bypass', live.includes('x-churvox-command-refresh') && live.includes('queue_cache.pop(bid, None)')],\n  ['force-refresh readiness marker', live.includes('churvox-command-force-refresh-v4-20260713')],\n"
if "explicit post-create cache bypass" not in contract_text:
    if needle not in contract_text:
        raise SystemExit("Command queue contract insertion point was not found")
    contract.write_text(contract_text.replace(needle, addition, 1), encoding="utf-8")

marker = Path("frontend/public/churvox-paid-launch-build.json")
marker.write_text(
    '''{
  "build": "churvox-command-created-slip-refresh-v6-20260713",
  "backend": "worker-jobs-current-first-v4-20260713",
  "command_backend": "churvox-command-force-refresh-v4-20260713",
  "includes": [
    "definitive-worker-jobs-route",
    "current-assignment-first",
    "expanded-worker-live-queue",
    "worker-message-job-context-guard",
    "new-command-slip-force-refresh",
    "concise-command-cards",
    "current-wrapper-contract"
  ],
  "safety": "Owner approval remains required. This marker performs no action."
}
''',
    encoding="utf-8",
)

print("CHURVOX_COMMAND_CREATED_SLIP_REFRESH_PATCH_APPLIED")
