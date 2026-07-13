from __future__ import annotations

import json
from pathlib import Path


BUILD = "churvox-worker-field-command-bridge-v9-20260713"

field_path = Path("backend/churvox_field_truth_fix_patch.py")
field = field_path.read_text(encoding="utf-8")
field = field.replace(
    'FIELD_COMMAND_BRIDGE_BUILD = "churvox-worker-field-command-bridge-v8-20260713"',
    f'FIELD_COMMAND_BRIDGE_BUILD = "{BUILD}"',
)
old_invalidator = '''def _invalidate_command_cache(business_id):
    for module_name in ["churvox_paid_launch_live_patch", "backend.churvox_paid_launch_live_patch"]:
        try:
            module = importlib.import_module(module_name)
            invalidate = getattr(module, "invalidate_command_queue", None)
            if callable(invalidate):
                invalidate(business_id)
                return
        except Exception:
            continue
'''
new_invalidator = '''def _invalidate_command_cache(business_id):
    # Startup can load the paid-launch module under both direct and package
    # names. Clear every distinct module cache; stopping after the first alias
    # can leave the live Command route serving its old 20-second queue.
    seen = set()
    invalidated = 0
    for module_name in ["churvox_paid_launch_live_patch", "backend.churvox_paid_launch_live_patch"]:
        try:
            module = importlib.import_module(module_name)
            marker = id(module)
            if marker in seen:
                continue
            seen.add(marker)
            invalidate = getattr(module, "invalidate_command_queue", None)
            if callable(invalidate):
                invalidate(business_id)
                invalidated += 1
        except Exception:
            continue
    return invalidated
'''
if new_invalidator not in field:
    if old_invalidator not in field:
        raise SystemExit("Expected single-alias Command cache invalidator was not found")
    field = field.replace(old_invalidator, new_invalidator, 1)
field = field.replace(
    '            "definitive_route_owner": "field_truth_fix",\n            "mirrors":',
    '            "definitive_route_owner": "field_truth_fix",\n            "cache_alias_strategy": "invalidate_all_loaded_aliases",\n            "mirrors":',
)
field_path.write_text(field, encoding="utf-8")

guard_path = Path("backend/churvox_paid_launch_guard_patch.py")
guard = guard_path.read_text(encoding="utf-8")
guard = guard.replace(
    'FINAL_WORKER_FIELD_BRIDGE_BUILD = "churvox-worker-field-command-bridge-v8-20260713"',
    f'FINAL_WORKER_FIELD_BRIDGE_BUILD = "{BUILD}"',
)
guard = guard.replace(
    '            "definitive_route_owner": "paid_launch_guard_bridge",\n            "mirrors":',
    '            "definitive_route_owner": "paid_launch_guard_bridge",\n            "cache_alias_strategy": "invalidate_all_loaded_aliases",\n            "mirrors":',
)
guard_path.write_text(guard, encoding="utf-8")

live_path = Path("backend/churvox_paid_launch_live_patch.py")
live = live_path.read_text(encoding="utf-8").replace(
    '"worker_field_command_bridge": "churvox-worker-field-command-bridge-v8-20260713"',
    f'"worker_field_command_bridge": "{BUILD}"',
)
live_path.write_text(live, encoding="utf-8")

marker_path = Path("frontend/public/churvox-paid-launch-build.json")
marker = json.loads(marker_path.read_text(encoding="utf-8"))
marker["build"] = BUILD
marker["field_command_backend"] = BUILD
includes = list(marker.get("includes") or [])
if "all-command-cache-aliases-invalidated" not in includes:
    includes.append("all-command-cache-aliases-invalidated")
marker["includes"] = includes
marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")

contract_path = Path("scripts/churvox-worker-field-command-bridge-contract.cjs")
contract = contract_path.read_text(encoding="utf-8")
contract = contract.replace("churvox-worker-field-command-bridge-v8-20260713", BUILD)
needle = "  ['command cache invalidated after problem', field.includes('_invalidate_command_cache(business_id)')],\n"
addition = needle + "  ['every loaded Command cache alias invalidated', field.includes('seen = set()') && field.includes('invalidated += 1') && !field.includes('invalidate(business_id)\\n                return')],\n"
if "every loaded Command cache alias invalidated" not in contract:
    if needle not in contract:
        raise SystemExit("Expected bridge cache contract entry was not found")
    contract = contract.replace(needle, addition, 1)
contract_path.write_text(contract, encoding="utf-8")

print("CHURVOX_COMMAND_CACHE_ALIAS_REPAIR_APPLIED")
