from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:150]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


worker = "backend/churvox_worker_jobs_read_patch.py"
replace_once(
    worker,
    'LIVE_PATCH_VERSION = "worker-jobs-definitive-route-v3-20260713"',
    'LIVE_PATCH_VERSION = "worker-jobs-current-first-v4-20260713"',
)
replace_once(
    worker,
    '            cursor = db.jobs.find(_business_query(current_user)).limit(300)',
    '            cursor = db.jobs.find(_business_query(current_user)).sort([("created_at", -1), ("updated_at", -1)]).limit(300)',
)

api = "frontend/src/churvox-office-lab/officeTeamApi.js"
replace_once(
    api,
    'export const WORKER_LIVE_READ_BUILD = "churvox-worker-live-read-no-cache-20260713b";',
    'export const WORKER_LIVE_READ_BUILD = "churvox-worker-current-first-20260713c";',
)
replace_once(
    api,
    '''function normalizeRows(area, body) {
  const records = extractArray(body, area).slice(0, 12);
  const rows = records.map((item, index) => rowFor(area, item, index)).filter(Boolean);
''',
    '''function recordTime(item = {}) {
  const raw = item.updated_at || item.created_at || item.assigned_at || item.scheduled_date || item.date || "";
  const parsed = Date.parse(String(raw || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRows(area, body) {
  const sourceRecords = extractArray(body, area);
  const ordered = area === "worker"
    ? [...sourceRecords].sort((left, right) => recordTime(right) - recordTime(left))
    : sourceRecords;
  const records = ordered.slice(0, area === "worker" ? 80 : 12);
  const rows = records.map((item, index) => rowFor(area, item, index)).filter(Boolean);
''',
)

marker = Path("frontend/public/churvox-paid-launch-build.json")
marker.write_text(
    '''{
  "build": "churvox-worker-jobs-current-first-v4-20260713",
  "includes": [
    "definitive-worker-jobs-route",
    "current-assignment-first",
    "expanded-worker-live-queue",
    "concise-command-cards",
    "current-wrapper-contract"
  ],
  "safety": "Owner approval remains required. This marker performs no action."
}
''',
    encoding="utf-8",
)

for path in [
    ".github/workflows/churvox-worker-jobs-definitive-live-proof.yml",
    "scripts/churvox-worker-assignment-diagnostic-v2.cjs",
]:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    text = text.replace("worker-jobs-definitive-route-v3-20260713", "worker-jobs-current-first-v4-20260713")
    text = text.replace("churvox-worker-jobs-definitive-route-v3-20260713", "churvox-worker-jobs-current-first-v4-20260713")
    file.write_text(text, encoding="utf-8")

print("CHURVOX_WORKER_JOBS_CURRENT_FIRST_PATCH_APPLIED")
