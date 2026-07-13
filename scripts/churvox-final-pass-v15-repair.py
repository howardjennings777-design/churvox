from __future__ import annotations

import json
from pathlib import Path

BUILD = "churvox-final-pass-v15-20260713"
WORKER_JOBS_VERSION = "worker-jobs-active-only-v5-20260713"
WORKER_READ_BUILD = "churvox-worker-active-jobs-only-v15-20260713"


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:180]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


def insert_before(path: str, marker: str, addition: str, sentinel: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if sentinel in text:
        return
    if marker not in text:
        raise SystemExit(f"Insertion marker not found in {path}: {marker!r}")
    file.write_text(text.replace(marker, f"{addition}{marker}", 1), encoding="utf-8")


# 1. Definitive worker jobs API: return active assignments only.
backend = "backend/churvox_worker_jobs_read_patch.py"
replace_once(
    backend,
    'LIVE_PATCH_VERSION = "worker-jobs-current-first-v4-20260713"',
    f'LIVE_PATCH_VERSION = "{WORKER_JOBS_VERSION}"',
)
insert_before(
    backend,
    "\n\ndef _business_query(user):",
    '''\n\ndef _inactive(job):
    job = job or {}
    if any(job.get(key) is True for key in ("archived", "is_archived", "deleted", "is_deleted")):
        return True
    if job.get("active") is False or job.get("is_active") is False:
        return True
    status = str(job.get("status") or job.get("job_status") or job.get("workflow_status") or job.get("state") or job.get("stage") or "").strip().lower().replace("-", "_").replace(" ", "_")
    return status in {"archived", "deleted", "cancelled", "canceled", "void"} or status.startswith("archiv")
''',
    "def _inactive(job):",
)
replace_once(
    backend,
    "                if _assigned(job, current_user):\n                    rows.append(_safe(job))",
    "                if _assigned(job, current_user) and not _inactive(job):\n                    rows.append(_safe(job))",
)

# 2. Frontend live rows: defence-in-depth filtering before mapping and sorting.
office_api = "frontend/src/churvox-office-lab/officeTeamApi.js"
replace_once(
    office_api,
    'export const WORKER_LIVE_READ_BUILD = "churvox-worker-current-first-20260713c";',
    f'export const WORKER_LIVE_READ_BUILD = "{WORKER_READ_BUILD}";',
)
insert_before(
    office_api,
    "\n\nfunction recordTime(item = {}) {",
    '''\n\nfunction workerRecordActive(item = {}) {
  if (item.archived === true || item.is_archived === true || item.deleted === true || item.is_deleted === true) return false;
  if (item.active === false || item.is_active === false) return false;
  const status = clean(item.status || item.job_status || item.workflow_status || item.state || item.stage).toLowerCase().replace(/[-\\s]+/g, "_");
  return !["archived", "deleted", "cancelled", "canceled", "void"].includes(status) && !status.startsWith("archiv");
}
''',
    "function workerRecordActive(item = {})",
)
replace_once(
    office_api,
    '''function normalizeRows(area, body) {
  const sourceRecords = extractArray(body, area);
  const ordered = area === "worker"
    ? [...sourceRecords].sort((left, right) => recordTime(right) - recordTime(left))
    : sourceRecords;
  const records = ordered.slice(0, area === "worker" ? 80 : 12);''',
    '''function normalizeRows(area, body) {
  const sourceRecords = extractArray(body, area);
  const activeRecords = area === "worker" ? sourceRecords.filter(workerRecordActive) : sourceRecords;
  const ordered = area === "worker"
    ? [...activeRecords].sort((left, right) => recordTime(right) - recordTime(left))
    : activeRecords;
  const records = ordered.slice(0, area === "worker" ? 80 : 12);''',
)

# 3. Worker Jobs view: one real queue, default eight rows, explicit Show all.
worker_route = "frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx"
replace_once(
    worker_route,
    '  const [proofBusy, setProofBusy] = useState(false);',
    '  const [proofBusy, setProofBusy] = useState(false);\n  const [showAllJobs, setShowAllJobs] = useState(false);',
)
replace_once(
    worker_route,
    '''  const rows = live.rows;
  const hasWork = rows.length > 0;''',
    '''  const rows = live.rows;
  const visibleJobRows = showAllJobs ? rows : rows.slice(0, 8);
  const hiddenJobCount = Math.max(0, rows.length - visibleJobRows.length);
  const hasWork = rows.length > 0;''',
)
replace_once(
    worker_route,
    '''{viewKey === "jobs" ? <section className="cvWorkerRouteQueue" aria-label="Assigned worker jobs"><h3>Job queue</h3>{hasWork ? rows.map((row) => <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button"><span>{row[0]}</span><b>{row[1]}</b><small>{row[2]}</small></button>) : <p>No assigned jobs.</p>}</section> : null}''',
    '''{viewKey === "jobs" ? <section className="cvWorkerRouteQueue" aria-label="Assigned worker jobs"><h3>Job queue</h3>{hasWork ? <>{visibleJobRows.map((row) => <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button"><span>{row[0]}</span><b>{row[1]}</b><small>{row[2]}</small></button>)}{rows.length > 8 ? <button className="cvWorkerQueueToggle" type="button" onClick={() => setShowAllJobs((value) => !value)}>{showAllJobs ? "Show fewer jobs" : `Show all ${rows.length} jobs`}{hiddenJobCount && !showAllJobs ? ` · ${hiddenJobCount} more` : ""}</button> : null}</> : <p>No assigned jobs.</p>}</section> : null}''',
)
replace_once(
    worker_route,
    '''<aside className="cvWorkerRouteDesk"><span>Office link</span><h2>{view.title}</h2><p>{view.copy}</p><strong>{hasWork ? live.label : "No live assigned work found"}</strong><section><h3>Worker queue</h3>{hasWork ? rows.map((row) => <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button"><span>{row[0]}</span><b>{row[1]}</b><small>{row[2]}</small></button>) : <p>No assigned work yet.</p>}</section><section><h3>Phone trail</h3>{trail.length ? trail.map((item) => <p key={item.id}>{item.text}</p>) : <p>No worker actions yet.</p>}</section></aside>''',
    '''<aside className="cvWorkerRouteDesk"><span>Office link</span><h2>{view.title}</h2><p>{view.copy}</p><strong>{hasWork ? live.label : "No live assigned work found"}</strong><section><h3>Worker queue</h3>{hasWork ? <><p>{rows.length} active job{rows.length === 1 ? "" : "s"} assigned.</p><strong>{title}</strong><small>{badge}</small></> : <p>No assigned work yet.</p>}</section><section><h3>Phone trail</h3>{trail.length ? trail.map((item) => <p key={item.id}>{item.text}</p>) : <p>No worker actions yet.</p>}</section></aside>''',
)

# 4. Live smoke: retry only the explicit safe Command timeout, bounded to four attempts.
smoke = "scripts/churvox-paid-launch-live-smoke-v2.cjs"
replace_once(
    smoke,
    '''  const scan = await call('/api/command/scan', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ source: 'paid_launch_final_gate_v2', prepared_only: true, owner_review_only: true }),
  }, 2);
  assert(scan.response?.status === 200 && scan.body?.success === true, `Command scan ${scan.response?.status}: ${JSON.stringify(scan.body).slice(0,1200)}`);''',
    '''  let scan = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    scan = await call('/api/command/scan', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ source: 'paid_launch_final_gate_v2', prepared_only: true, owner_review_only: true }),
    }, 1);
    if (scan.response?.status === 200 && scan.body?.success === true) break;
    const detail = String(scan.body?.detail || scan.body?.message || scan.body?.error || '');
    const safeTimeout = scan.response?.status === 503 && /timed out safely/i.test(detail);
    if (!safeTimeout || attempt === 4) break;
    console.log(`Command scan safe timeout on attempt ${attempt}; retrying within the bounded launch gate.`);
    await sleep(1200 * attempt);
  }
  assert(scan?.response?.status === 200 && scan?.body?.success === true, `Command scan ${scan?.response?.status}: ${JSON.stringify(scan?.body).slice(0,1200)}`);''',
)

# 5. Current build marker.
marker_path = Path("frontend/public/churvox-paid-launch-build.json")
marker = json.loads(marker_path.read_text(encoding="utf-8"))
marker["build"] = BUILD
marker["backend"] = WORKER_JOBS_VERSION
marker["worker_jobs_active_filter"] = WORKER_READ_BUILD
marker["command_scan_retry"] = "bounded-safe-timeout-retry-v15-20260713"
includes = list(marker.get("includes") or [])
for value in [
    "active-worker-jobs-only",
    "worker-job-queue-bounded-with-show-all",
    "desktop-worker-queue-not-duplicated",
    "bounded-command-scan-safe-timeout-retries",
]:
    if value not in includes:
        includes.append(value)
marker["includes"] = includes
marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")

# 6. Ensure the definitive full gate compiles and checks the new stack.
final_gate = ".github/workflows/churvox-paid-launch-final-gate-v2.yml"
replace_once(
    final_gate,
    '''            python -m py_compile \\
              backend/churvox_paid_launch_readiness_routes.py \\''',
    '''            python -m py_compile \\
              backend/churvox_worker_jobs_read_patch.py \\
              backend/churvox_owner_data_visibility_patch.py \\
              backend/churvox_paid_launch_readiness_routes.py \\''',
)
replace_once(
    final_gate,
    '''            node scripts/churvox-hardcore-owner-worker-audit.cjs
            node scripts/churvox-auth-401-storm-contract.cjs''',
    '''            node scripts/churvox-hardcore-owner-worker-audit.cjs
            node scripts/churvox-worker-field-command-bridge-contract.cjs
            node scripts/churvox-owner-message-dedupe-contract.cjs
            node scripts/churvox-worker-jobs-copy-trim-contract.cjs
            node scripts/churvox-final-pass-v15-contract.cjs
            node scripts/churvox-auth-401-storm-contract.cjs''',
)

# 7. Focused live proof remains usable with the current v15 build.
focused = ".github/workflows/churvox-worker-command-priority-live-proof.yml"
replace_once(
    focused,
    "          const build = 'churvox-owner-message-completion-dedupe-v13-20260713';",
    f"          const build = '{BUILD}';",
)
replace_once(
    focused,
    "          const workerJobs = 'worker-jobs-current-first-v4-20260713';",
    f"          const workerJobs = '{WORKER_JOBS_VERSION}';\n          const workerActiveFilter = '{WORKER_READ_BUILD}';",
)
replace_once(
    focused,
    "                  && front.owner_message_dedupe === messageDedupe",
    "                  && front.owner_message_dedupe === messageDedupe\n                  && front.worker_jobs_active_filter === workerActiveFilter\n                  && front.includes.includes('active-worker-jobs-only')\n                  && front.includes.includes('worker-job-queue-bounded-with-show-all')",
)
replace_once(
    focused,
    "            if (!ready) throw new Error(`Exact v12/v13 deployment did not arrive: ${last}`);",
    "            if (!ready) throw new Error(`Exact v12/v13/v15 deployment did not arrive: ${last}`);",
)

# 8. Static contract for this repair.
contract = Path("scripts/churvox-final-pass-v15-contract.cjs")
contract.write_text(
    f'''const fs = require('fs');
const backend = fs.readFileSync('backend/churvox_worker_jobs_read_patch.py', 'utf8');
const api = fs.readFileSync('frontend/src/churvox-office-lab/officeTeamApi.js', 'utf8');
const route = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx', 'utf8');
const smoke = fs.readFileSync('scripts/churvox-paid-launch-live-smoke-v2.cjs', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const gate = fs.readFileSync('.github/workflows/churvox-paid-launch-final-gate-v2.yml', 'utf8');
const checks = [
  ['v15 build marker', marker.includes('{BUILD}')],
  ['worker API version', backend.includes('{WORKER_JOBS_VERSION}')],
  ['backend excludes inactive assignments', backend.includes('def _inactive(job):') && backend.includes('_assigned(job, current_user) and not _inactive(job)')],
  ['frontend filters inactive assignments', api.includes('function workerRecordActive(item = {{}})') && api.includes('sourceRecords.filter(workerRecordActive)')],
  ['worker queue defaults to eight rows', route.includes('rows.slice(0, 8)') && route.includes('Show all ${{rows.length}} jobs')],
  ['desktop queue is summary not duplicate list', route.includes('active job{{rows.length === 1 ? "" : "s"}} assigned') && !route.includes('<aside className="cvWorkerRouteDesk"><span>Office link</span><h2>{{view.title}}</h2><p>{{view.copy}}</p><strong>{{hasWork ? live.label : "No live assigned work found"}}</strong><section><h3>Worker queue</h3>{{hasWork ? rows.map')],
  ['safe Command timeout retry is bounded', smoke.includes('attempt <= 4') && smoke.includes('/timed out safely/i') && smoke.includes('attempt === 4')],
  ['persistent Command scan failure still blocks', smoke.includes('assert(scan?.response?.status === 200 && scan?.body?.success === true')],
  ['marker records all v15 protections', marker.includes('active-worker-jobs-only') && marker.includes('worker-job-queue-bounded-with-show-all') && marker.includes('bounded-command-scan-safe-timeout-retries')],
  ['full gate runs v15 contract', gate.includes('churvox-final-pass-v15-contract.cjs') && gate.includes('backend/churvox_worker_jobs_read_patch.py')],
];
let failed = false;
for (const [name, ok] of checks) {{ console.log(`${{ok ? 'PASS' : 'FAIL'}} ${{name}}`); if (!ok) failed = true; }}
if (failed) process.exit(1);
console.log('CHURVOX_FINAL_PASS_V15_CONTRACT_PASS');
''',
    encoding="utf-8",
)

print("CHURVOX_FINAL_PASS_V15_REPAIR_APPLIED")
