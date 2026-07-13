from __future__ import annotations

import json
from pathlib import Path

BUILD = "churvox-worker-jobs-copy-trim-v14-20260713"


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source text not found in {path}: {old!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


route = "frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx"
replace_once(
    route,
    'jobs: { label: "Jobs", title: "Assigned jobs", copy: "Only work assigned to this worker appears here." },',
    'jobs: { label: "Jobs", title: "Assigned jobs", copy: "Only your assigned work appears." },',
)
replace_once(
    route,
    '<small>No card is charged inside Worker View. Payment happens through an approved secure invoice link.</small>',
    '<small>Worker View never charges cards. Use an approved invoice link.</small>',
)

marker_path = Path("frontend/public/churvox-paid-launch-build.json")
marker = json.loads(marker_path.read_text(encoding="utf-8"))
marker["build"] = BUILD
marker["worker_jobs_copy_trim"] = BUILD
includes = list(marker.get("includes") or [])
for value in [
    "fresh-owner-created-slips-ranked-before-routine-command-items",
    "single-owner-completion-per-message-channel",
    "worker-jobs-under-hardcore-word-limit",
]:
    if value not in includes:
        includes.append(value)
marker["includes"] = includes
marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")

contract = Path("scripts/churvox-worker-jobs-copy-trim-contract.cjs")
contract.write_text(
    f'''const fs = require('fs');
const route = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const checks = [
  ['build marker', marker.includes('{BUILD}')],
  ['short assigned-work copy', route.includes('Only your assigned work appears.')],
  ['short payment safety copy', route.includes('Worker View never charges cards. Use an approved invoice link.')],
  ['old verbose assignment copy removed', !route.includes('Only work assigned to this worker appears here.')],
  ['old verbose payment copy removed', !route.includes('Payment happens through an approved secure invoice link.')],
  ['worker controls retained', route.includes('const statusSteps = ["Acknowledge", "Start", "Pause", "Resume", "Complete"]')],
  ['payment owner approval retained', route.includes('Payment request sent to owner Command')),
  ['marker records visual limit repair', marker.includes('worker-jobs-under-hardcore-word-limit')],
];
let failed = false;
for (const [name, ok] of checks) {{ console.log(`${{ok ? 'PASS' : 'FAIL'}} ${{name}}`); if (!ok) failed = true; }}
if (failed) process.exit(1);
console.log('WORKER_JOBS_COPY_TRIM_CONTRACT_PASS');
''',
    encoding="utf-8",
)

print("CHURVOX_WORKER_JOBS_COPY_TRIM_REPAIR_APPLIED")
