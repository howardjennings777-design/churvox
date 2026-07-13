from __future__ import annotations

import json
from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:220]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


BRIDGE = "churvox-worker-field-command-bridge-v8-20260713"

# The paid-launch guard is the last owner of /api/worker/field-slip. Make that
# final route call the proven field-truth function instead of bypassing it.
guard = "backend/churvox_paid_launch_guard_patch.py"
replace_once(
    guard,
    "from fastapi import Request as FastAPIRequest\n",
    "from fastapi import HTTPException, Request as FastAPIRequest\n",
)
replace_once(
    guard,
    "INSTALLED = set()\n",
    f'INSTALLED = set()\nFINAL_WORKER_FIELD_BRIDGE_BUILD = "{BRIDGE}"\n',
)
replace_once(
    guard,
    '''    Request = getattr(module, "Request", None)
    if not app or db is None or not get_current_user or Request is None:
        return
''',
    '''    Request = getattr(module, "Request", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or not get_current_user or Request is None or ObjectId is None:
        return

    try:
        import churvox_field_truth_fix_patch as field_truth_fix
    except Exception:
        try:
            from backend import churvox_field_truth_fix_patch as field_truth_fix
        except Exception:
            field_truth_fix = None
''',
)
replace_once(
    guard,
    '''    async def general_worker_field_slip_endpoint(request: FastAPIRequest):
        user = await get_current_user(request)
        payload = await read_payload(request)
        slip = await create_general_slip(db, user, payload)
        item = command_item_from_slip(slip)
        return json_safe({"success": True, "slip": slip, "command_item": item, "item": item, "action": item})

    remove_route(app, "/api/worker/field-slip", "POST")
    app.add_api_route("/api/worker/field-slip", general_worker_field_slip_endpoint, methods=["POST"])
    INSTALLED.add(name)
''',
    '''    async def general_worker_field_slip_endpoint(request: FastAPIRequest):
        user = await get_current_user(request)
        payload = await read_payload(request)
        if field_truth_fix is None:
            raise HTTPException(status_code=503, detail="Worker Command bridge is unavailable. Nothing was sent or changed.")
        job_id = clean(
            (payload or {}).get("job_id")
            or (payload or {}).get("jobId")
            or (payload or {}).get("record_id")
            or (payload or {}).get("recordId")
            or "general-message"
        )
        slip = await field_truth_fix.fixed_create_field_slip(db, user, ObjectId, job_id, payload)
        item = field_truth_fix.base.command_item_from_slip(slip)
        return json_safe({
            "success": True,
            "slip": slip,
            "command_item": item,
            "item": item,
            "action": item,
            "bridge_version": FINAL_WORKER_FIELD_BRIDGE_BUILD,
            "definitive_route_owner": "paid_launch_guard_bridge",
        })

    async def final_worker_field_bridge_readiness():
        return {
            "success": True,
            "ready": field_truth_fix is not None,
            "version": FINAL_WORKER_FIELD_BRIDGE_BUILD,
            "definitive_route_owner": "paid_launch_guard_bridge",
            "mirrors": ["worker_problem", "worker_issue", "blocked", "owner_check"],
            "excludes": ["job_proof", "routine_worker_message"],
            "safety": "Problems are prepared for owner review only. Nothing is sent, synced, charged or changed.",
        }

    for method, path, endpoint in [
        ("POST", "/api/worker/field-slip", general_worker_field_slip_endpoint),
        ("GET", "/api/worker/field-command-readiness", final_worker_field_bridge_readiness),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])
    INSTALLED.add(name)
''',
)

# Keep the underlying bridge and every readiness marker aligned with the final
# route owner. Required worker problems must fail rather than report a false send.
field = "backend/churvox_field_truth_fix_patch.py"
field_path = Path(field)
field_text = field_path.read_text(encoding="utf-8").replace(
    'FIELD_COMMAND_BRIDGE_BUILD = "churvox-worker-field-command-bridge-v7-20260713"',
    f'FIELD_COMMAND_BRIDGE_BUILD = "{BRIDGE}"',
)
field_text = field_text.replace(
    '''    try:
        result = await db.command_slips.update_one(
            {"business_id": business_id, "source_type": "worker_field_problem", "source_id": slip_id},
            {"$setOnInsert": command_doc},
            upsert=True,
        )
        created = bool(getattr(result, "upserted_id", None))
    except Exception:
        created = False
''',
    '''    try:
        result = await db.command_slips.update_one(
            {"business_id": business_id, "source_type": "worker_field_problem", "source_id": slip_id},
            {"$setOnInsert": command_doc},
            upsert=True,
        )
        created = bool(getattr(result, "upserted_id", None))
    except Exception as exc:
        raise RuntimeError("Worker problem could not be prepared in Command. Nothing was sent or changed.") from exc
''',
)
field_text = field_text.replace(
    '            "version": FIELD_COMMAND_BRIDGE_BUILD,\n            "mirrors":',
    '            "version": FIELD_COMMAND_BRIDGE_BUILD,\n            "definitive_route_owner": "field_truth_fix",\n            "mirrors":',
)
field_path.write_text(field_text, encoding="utf-8")

live = Path("backend/churvox_paid_launch_live_patch.py")
live.write_text(
    live.read_text(encoding="utf-8").replace(
        '"worker_field_command_bridge": "churvox-worker-field-command-bridge-v7-20260713"',
        f'"worker_field_command_bridge": "{BRIDGE}"',
    ),
    encoding="utf-8",
)

# A higher-specificity owner rule was overriding the 46px open-slip target.
css = Path("frontend/src/churvox-office-lab/OfficeTeamOwnerReady.css")
css_text = css.read_text(encoding="utf-8")
old_css = '''.cvOwnerReady .cvSiteDecisionCard footer button {
  min-height: 34px;
  border-radius: 10px;
}
'''
new_css = '''.cvOwnerReady .cvSiteDecisionCard footer button {
  min-height: 48px;
  padding: 0 14px;
  border-radius: 12px;
}
'''
if new_css not in css_text:
    if old_css not in css_text:
        raise SystemExit("Expected owner Command button rule was not found")
    css_text = css_text.replace(old_css, new_css, 1)
css.write_text(css_text, encoding="utf-8")

marker = {
    "build": BRIDGE,
    "backend": "worker-jobs-current-first-v4-20260713",
    "command_backend": "churvox-command-force-refresh-v4-20260713",
    "field_command_backend": BRIDGE,
    "includes": [
        "definitive-worker-jobs-route",
        "current-assignment-first",
        "expanded-worker-live-queue",
        "worker-message-job-context-guard",
        "new-command-slip-force-refresh",
        "worker-problem-command-bridge",
        "final-field-slip-route-delegates-to-command-bridge",
        "mobile-command-touch-targets",
        "concise-command-cards",
        "current-wrapper-contract",
    ],
    "safety": "Owner approval remains required. This marker performs no action.",
}
Path("frontend/public/churvox-paid-launch-build.json").write_text(
    json.dumps(marker, indent=2) + "\n", encoding="utf-8"
)

# Keep the older repair entrypoint safe: future reruns apply this definitive v8
# repair rather than trying to restore the superseded v7 implementation.
Path("scripts/churvox-worker-field-command-bridge-apply.py").write_text(
    '''from runpy import run_path\n\nrun_path("scripts/churvox-paid-launch-last-two-blockers-apply.py", run_name="__main__")\n''',
    encoding="utf-8",
)

# Strengthen the existing contract so it proves the final route owner—not only
# the underlying helper—uses the Command bridge.
Path("scripts/churvox-worker-field-command-bridge-contract.cjs").write_text(
    f'''const fs = require('fs');

const field = fs.readFileSync('backend/churvox_field_truth_fix_patch.py', 'utf8');
const guard = fs.readFileSync('backend/churvox_paid_launch_guard_patch.py', 'utf8');
const live = fs.readFileSync('backend/churvox_paid_launch_live_patch.py', 'utf8');
const workerUi = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx', 'utf8');
const ownerCss = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamOwnerReady.css', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');

const checks = [
  ['bridge build marker', field.includes('{BRIDGE}') && marker.includes('{BRIDGE}')],
  ['problem-only classification', field.includes('def _needs_command(kind)') && field.includes('"problem"') && field.includes('"issue"')],
  ['proof remains outside Command', field.includes('"excludes": ["job_proof", "routine_worker_message"]')],
  ['deduplicated command upsert', field.includes('db.command_slips.update_one') && field.includes('"$setOnInsert": command_doc') && field.includes('upsert=True')],
  ['business scoped mirror', field.includes('"business_id": business_id') && field.includes('"source_type": "worker_field_problem"')],
  ['owner review safety fields', field.includes('"owner_review_only": True') && field.includes('"no_auto_send": True') && field.includes('"no_auto_sync": True') && field.includes('"no_auto_charge": True')],
  ['bridge failure is not reported as success', field.includes('raise RuntimeError("Worker problem could not be prepared in Command')],
  ['command cache invalidated after problem', field.includes('_invalidate_command_cache(business_id)')],
  ['shared queue invalidator exists', live.includes('def invalidate_command_queue(business_id: str)') && live.includes('COMMAND_QUEUE_CACHES')],
  ['final route delegates to bridge', guard.includes('field_truth_fix.fixed_create_field_slip') && guard.includes('paid_launch_guard_bridge')],
  ['final readiness owns live route', guard.includes('/api/worker/field-command-readiness') && guard.includes('FINAL_WORKER_FIELD_BRIDGE_BUILD')],
  ['paid launch readiness marker aligned', live.includes('{BRIDGE}')],
  ['worker problem route remains field slip', workerUi.includes('sendFieldSlip(needsDecision ? "worker_problem" : "worker_message"')],
  ['mobile open-slip target is at least 48px', ownerCss.includes('.cvOwnerReady .cvSiteDecisionCard footer button') && ownerCss.includes('min-height: 48px')],
  ['owner approval statement remains', field.includes('owner must approve, edit, park or dismiss')],
];

let failed = false;
for (const [name, ok] of checks) {{
  console.log(`${{ok ? 'PASS' : 'FAIL'}} ${{name}}`);
  if (!ok) failed = true;
}}
if (failed) process.exit(1);
console.log('WORKER_FIELD_COMMAND_BRIDGE_CONTRACT_PASS');
''',
    encoding="utf-8",
)

print("CHURVOX_PAID_LAUNCH_LAST_TWO_BLOCKERS_PATCH_APPLIED")
