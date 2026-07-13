from __future__ import annotations

import json
from pathlib import Path

BUILD = "churvox-worker-command-priority-v10-20260713"
BRIDGE = "churvox-worker-field-command-bridge-v10-20260713"


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:200]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


live_path = Path("backend/churvox_paid_launch_live_patch.py")
live = live_path.read_text(encoding="utf-8")
live = live.replace(
    '"worker_field_command_bridge": "churvox-worker-field-command-bridge-v9-20260713"',
    f'"worker_field_command_bridge": "{BRIDGE}",\n            "worker_command_priority": "{BUILD}"',
)
old_sort = '''    def queue_sort_value(row: Dict[str, Any]) -> str:
        value = row.get("updated_at") or row.get("created_at") or row.get("_id") or ""
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)
'''
new_sort = '''    def queue_sort_value(row: Dict[str, Any]):
        source = str(row.get("source_type") or "").strip().lower()
        urgency = str(row.get("urgency") or row.get("level") or row.get("priority") or "").strip().lower()
        payload = row.get("payload") if isinstance(row.get("payload"), dict) else {}
        worker_problem = source == "worker_field_problem" or bool(payload.get("worker_field_problem"))
        priority = 100 if worker_problem else 80 if any(word in urgency for word in ("urgent", "top", "high")) else 40
        value = row.get("updated_at") or row.get("created_at") or row.get("_id") or ""
        if isinstance(value, datetime):
            value = value.isoformat()
        return priority, str(value)
'''
if new_sort not in live:
    if old_sort not in live:
        raise SystemExit("Expected Command queue sort function was not found")
    live = live.replace(old_sort, new_sort, 1)
live_path.write_text(live, encoding="utf-8")

for path, old in [
    ("backend/churvox_field_truth_fix_patch.py", 'FIELD_COMMAND_BRIDGE_BUILD = "churvox-worker-field-command-bridge-v9-20260713"'),
    ("backend/churvox_paid_launch_guard_patch.py", 'FINAL_WORKER_FIELD_BRIDGE_BUILD = "churvox-worker-field-command-bridge-v9-20260713"'),
]:
    file = Path(path)
    text = file.read_text(encoding="utf-8").replace(old, old.split(' = ')[0] + f' = "{BRIDGE}"')
    file.write_text(text, encoding="utf-8")

site = "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
replace_once(
    site,
    '''function Command({ tray, setTray, counts, pending, onAction, commandLoading }) {
  const queue = tray === "command" ? pending : pending.filter((item) => trayKey(item.tray) === tray);
  const shown = queue.slice(0, COMMAND_CARD_LIMIT);
''',
    '''function commandQueuePriority(item = {}) {
  const level = String(item.level || "").toLowerCase();
  const raw = item.raw || {};
  const payload = raw.payload && typeof raw.payload === "object" ? raw.payload : {};
  if (raw.source_type === "worker_field_problem" || payload.worker_field_problem) return 100;
  if (/top priority|urgent|high/.test(level)) return 80;
  if (/accounting check|needs check/.test(level)) return 50;
  return 30;
}

function Command({ tray, setTray, counts, pending, onAction, commandLoading }) {
  const queueBase = tray === "command" ? pending : pending.filter((item) => trayKey(item.tray) === tray);
  const queue = [...queueBase].sort((left, right) => commandQueuePriority(right) - commandQueuePriority(left));
  const shown = queue.slice(0, COMMAND_CARD_LIMIT);
''',
)

marker_path = Path("frontend/public/churvox-paid-launch-build.json")
marker = json.loads(marker_path.read_text(encoding="utf-8"))
marker["build"] = BUILD
marker["field_command_backend"] = BRIDGE
marker["command_priority_backend"] = BUILD
includes = list(marker.get("includes") or [])
for value in ["all-command-cache-aliases-invalidated", "worker-problems-ranked-before-routine-command-items"]:
    if value not in includes:
        includes.append(value)
marker["includes"] = includes
marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")

contract_path = Path("scripts/churvox-worker-field-command-bridge-contract.cjs")
contract = contract_path.read_text(encoding="utf-8").replace(
    "churvox-worker-field-command-bridge-v9-20260713", BRIDGE
)
needle = "  ['mobile open-slip target is at least 48px', ownerCss.includes('.cvOwnerReady .cvSiteDecisionCard footer button') && ownerCss.includes('min-height: 48px')],\n"
addition = needle + "  ['worker problems rank ahead of routine Command items', field.includes('worker_field_problem') && marker.includes('worker-problems-ranked-before-routine-command-items')],\n"
if "worker problems rank ahead of routine Command items" not in contract:
    if needle not in contract:
        raise SystemExit("Expected mobile touch contract entry not found")
    contract = contract.replace(needle, addition, 1)
contract_path.write_text(contract, encoding="utf-8")

speed_path = Path("scripts/churvox-command-queue-speed-backend-contract.cjs")
speed = speed_path.read_text(encoding="utf-8")
needle = "  ['bounded fifty-slip payload', live.includes('rows = rows[:50]')],\n"
addition = needle + "  ['worker problems receive queue priority', live.includes('worker_problem = source == \\\"worker_field_problem\\\"') && live.includes('priority = 100 if worker_problem')],\n"
if "worker problems receive queue priority" not in speed:
    if needle not in speed:
        raise SystemExit("Expected queue payload contract entry not found")
    speed = speed.replace(needle, addition, 1)
speed_path.write_text(speed, encoding="utf-8")

print("CHURVOX_WORKER_COMMAND_PRIORITY_REPAIR_APPLIED")
