from __future__ import annotations

import json
from pathlib import Path

BUILD = "churvox-owner-manual-command-priority-v12-20260713"


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:220]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


live_path = "backend/churvox_paid_launch_live_patch.py"
replace_once(
    live_path,
    '''        worker_problem = source == "worker_field_problem" or bool(payload.get("worker_field_problem"))
        priority = 100 if worker_problem else 80 if any(word in urgency for word in ("urgent", "top", "high")) else 40
''',
    '''        worker_problem = source == "worker_field_problem" or bool(payload.get("worker_field_problem"))
        payload_source = str(payload.get("source") or "").strip().lower()
        owner_manual = payload_source in {"manual_form", "quick_intake", "csv_import"}
        priority = 100 if worker_problem else 95 if owner_manual else 80 if any(word in urgency for word in ("urgent", "top", "high")) else 40
''',
)
replace_once(
    live_path,
    '''            "worker_command_priority": "churvox-worker-command-priority-v10-20260713",
            "routes":''',
    f'''            "worker_command_priority": "churvox-worker-command-priority-v10-20260713",
            "owner_manual_command_priority": "{BUILD}",
            "routes":''',
)

site_path = "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
replace_once(
    site_path,
    '''  if (raw.source_type === "worker_field_problem" || payload.worker_field_problem) return 100;
  if (/top priority|urgent|high/.test(level)) return 80;
''',
    '''  if (raw.source_type === "worker_field_problem" || payload.worker_field_problem) return 100;
  if (["manual_form", "quick_intake", "csv_import"].includes(String(payload.source || "").toLowerCase())) return 95;
  if (/top priority|urgent|high/.test(level)) return 80;
''',
)

marker_path = Path("frontend/public/churvox-paid-launch-build.json")
marker = json.loads(marker_path.read_text(encoding="utf-8"))
marker["build"] = BUILD
marker["owner_manual_command_priority"] = BUILD
includes = list(marker.get("includes") or [])
if "fresh-owner-created-slips-ranked-before-routine-command-items" not in includes:
    includes.append("fresh-owner-created-slips-ranked-before-routine-command-items")
marker["includes"] = includes
marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")

speed_path = Path("scripts/churvox-command-queue-speed-backend-contract.cjs")
speed = speed_path.read_text(encoding="utf-8")
needle = "  ['worker problems receive queue priority', live.includes('worker_problem = source == \\\"worker_field_problem\\\"') && live.includes('priority = 100 if worker_problem')],\n"
addition = needle + "  ['fresh owner-created slips receive queue priority', live.includes('payload_source in {\\\"manual_form\\\", \\\"quick_intake\\\", \\\"csv_import\\\"}') && live.includes('95 if owner_manual')],\n"
if "fresh owner-created slips receive queue priority" not in speed:
    if needle not in speed:
        raise SystemExit("Expected worker priority contract entry not found")
    speed = speed.replace(needle, addition, 1)
speed_path.write_text(speed, encoding="utf-8")

bridge_path = Path("scripts/churvox-worker-field-command-bridge-contract.cjs")
bridge = bridge_path.read_text(encoding="utf-8")
needle = "  ['open Command refreshes live without rerunning scan', site.includes('screen !== \\\"command\\\"') && site.includes('window.setInterval(refreshOpenCommand, 5000)') && site.includes('force: true') && marker.includes('command-screen-bounded-five-second-refresh')],\n"
addition = needle + "  ['fresh manual owner slips rank before routine items', site.includes('[\\\"manual_form\\\", \\\"quick_intake\\\", \\\"csv_import\\\"]') && site.includes('return 95') && marker.includes('fresh-owner-created-slips-ranked-before-routine-command-items')],\n"
if "fresh manual owner slips rank before routine items" not in bridge:
    if needle not in bridge:
        raise SystemExit("Expected open Command refresh contract entry not found")
    bridge = bridge.replace(needle, addition, 1)
bridge_path.write_text(bridge, encoding="utf-8")

print("CHURVOX_OWNER_MANUAL_COMMAND_PRIORITY_REPAIR_APPLIED")
