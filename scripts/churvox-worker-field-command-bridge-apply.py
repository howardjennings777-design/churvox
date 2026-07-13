from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:180]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


live = "backend/churvox_paid_launch_live_patch.py"
replace_once(
    live,
    'INSTALLED = set()\nOPEN_STATUSES',
    'INSTALLED = set()\nCOMMAND_QUEUE_CACHES: Dict[str, Dict[str, Dict[str, Any]]] = {}\n\n\ndef invalidate_command_queue(business_id: str):\n    bid = str(business_id or "").strip()\n    if not bid:\n        return\n    for cache in list(COMMAND_QUEUE_CACHES.values()):\n        try:\n            cache.pop(bid, None)\n        except Exception:\n            continue\n\n\nOPEN_STATUSES',
)
replace_once(
    live,
    '''    queue_cache: Dict[str, Dict[str, Any]] = {}
    queue_refresh_tasks: Dict[str, asyncio.Task] = {}
''',
    '''    queue_cache: Dict[str, Dict[str, Any]] = {}
    queue_refresh_tasks: Dict[str, asyncio.Task] = {}
    COMMAND_QUEUE_CACHES[name or f"module-{id(module)}"] = queue_cache
''',
)
replace_once(
    live,
    '''            "command_force_refresh": COMMAND_FORCE_REFRESH_BUILD,
            "routes": ["payroll", "payroll-summary", "command-slips", "command-scan", "admin-brain"],
''',
    '''            "command_force_refresh": COMMAND_FORCE_REFRESH_BUILD,
            "worker_field_command_bridge": "churvox-worker-field-command-bridge-v7-20260713",
            "routes": ["payroll", "payroll-summary", "command-slips", "command-scan", "admin-brain"],
''',
)

field = "backend/churvox_field_truth_fix_patch.py"
replace_once(
    field,
    'INSTALLED = set()\n',
    'INSTALLED = set()\nFIELD_COMMAND_BRIDGE_BUILD = "churvox-worker-field-command-bridge-v7-20260713"\n',
)
replace_once(
    field,
    '''async def fixed_create_field_slip(db, user, ObjectId, job_id, payload):
''',
    '''def _needs_command(kind):
    text = base.lower(kind)
    return any(token in text for token in ["problem", "issue", "blocked", "decision", "extra_work", "owner_check"])


def _invalidate_command_cache(business_id):
    for module_name in ["churvox_paid_launch_live_patch", "backend.churvox_paid_launch_live_patch"]:
        try:
            module = importlib.import_module(module_name)
            invalidate = getattr(module, "invalidate_command_queue", None)
            if callable(invalidate):
                invalidate(business_id)
                return
        except Exception:
            continue


async def _mirror_problem_to_command(db, user, ObjectId, slip):
    kind = base.lower((slip or {}).get("type") or (slip or {}).get("kind"))
    if not _needs_command(kind):
        return None
    business_id = base.clean((slip or {}).get("business_id") or base.business_id_string(user))
    slip_id = base.clean((slip or {}).get("id") or (slip or {}).get("_id"))
    if not business_id or not slip_id:
        return None
    now = (slip or {}).get("updated_at") or base.now_utc()
    text = base.clean((slip or {}).get("text") or (slip or {}).get("summary") or "Worker needs an owner decision.")
    try:
        contractor_id = ObjectId(business_id)
    except Exception:
        contractor_id = business_id
    command_doc = {
        "business_id": business_id,
        "contractor_id": contractor_id,
        "source_type": "worker_field_problem",
        "source_id": slip_id,
        "action_type": "review_worker_problem",
        "title": "Worker issue needs owner decision",
        "found": text,
        "prepared": "Churvox kept the worker moving and prepared the field issue for owner review. Nothing was sent, synced, charged or changed.",
        "why": "The owner must approve, edit, park or dismiss the field issue before business records or customer communication change.",
        "urgency": "Top priority",
        "status": "open",
        "payload": {
            "worker_field_problem": True,
            "worker_field_slip_id": slip_id,
            "job_id": base.clean((slip or {}).get("job_id")),
            "worker_id": base.clean((slip or {}).get("worker_id")),
            "worker_name": base.clean((slip or {}).get("worker_name")),
            "text": text,
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
        },
        "owner_review_only": True,
        "prepared_only": True,
        "no_auto_send": True,
        "no_auto_sync": True,
        "no_auto_charge": True,
        "no_auto_record_change": True,
        "created_by": base.user_id_string(user),
        "created_at": (slip or {}).get("created_at") or now,
        "updated_at": now,
        "audit": [{
            "by": base.user_id_string(user),
            "role": base.clean((user or {}).get("role") or "worker"),
            "action": "worker_problem_created",
            "note": "Worker problem mirrored to Command for owner review only.",
            "at": now,
            "safety": "Nothing was sent, synced, charged or changed.",
        }],
    }
    try:
        result = await db.command_slips.update_one(
            {"business_id": business_id, "source_type": "worker_field_problem", "source_id": slip_id},
            {"$setOnInsert": command_doc},
            upsert=True,
        )
        created = bool(getattr(result, "upserted_id", None))
    except Exception:
        created = False
    if created:
        try:
            await db.command_events.insert_one({
                "business_id": business_id,
                "contractor_id": contractor_id,
                "event_type": "worker_problem_created",
                "title": command_doc["title"],
                "detail": text,
                "slip_id": slip_id,
                "safety": "Nothing was sent, synced, charged or changed.",
                "created_by": base.user_id_string(user),
                "created_at": now,
            })
        except Exception:
            pass
    _invalidate_command_cache(business_id)
    return command_doc


async def fixed_create_field_slip(db, user, ObjectId, job_id, payload):
''',
)
replace_once(
    field,
    '''    await base.save_passport(db, user, ObjectId, job_id, {"steps": {"worker_note": True}, "note": text})
    return set_doc
''',
    '''    await base.save_passport(db, user, ObjectId, job_id, {"steps": {"worker_note": True}, "note": text})
    await _mirror_problem_to_command(db, user, ObjectId, set_doc)
    return set_doc
''',
)
replace_once(
    field,
    '''    async def offline_sync_endpoint(request: Request):
        user = await get_current_user(request)
        return base.json_safe(await fixed_offline_sync(db, user, ObjectId, await base.read_payload(request)))

    for method, path, endpoint in [
''',
    '''    async def offline_sync_endpoint(request: Request):
        user = await get_current_user(request)
        return base.json_safe(await fixed_offline_sync(db, user, ObjectId, await base.read_payload(request)))

    async def field_command_readiness():
        return {
            "success": True,
            "ready": True,
            "version": FIELD_COMMAND_BRIDGE_BUILD,
            "mirrors": ["worker_problem", "worker_issue", "blocked", "owner_check"],
            "excludes": ["job_proof", "routine_worker_message"],
            "safety": "Problems are prepared for owner review only. Nothing is sent, synced, charged or changed.",
        }

    for method, path, endpoint in [
''',
)
replace_once(
    field,
    '''        ("POST", "/api/worker/offline-sync", offline_sync_endpoint),
    ]:
''',
    '''        ("POST", "/api/worker/offline-sync", offline_sync_endpoint),
        ("GET", "/api/worker/field-command-readiness", field_command_readiness),
    ]:
''',
)

marker = Path("frontend/public/churvox-paid-launch-build.json")
marker.write_text(
    '''{
  "build": "churvox-worker-field-command-bridge-v7-20260713",
  "backend": "worker-jobs-current-first-v4-20260713",
  "command_backend": "churvox-command-force-refresh-v4-20260713",
  "field_command_backend": "churvox-worker-field-command-bridge-v7-20260713",
  "includes": [
    "definitive-worker-jobs-route",
    "current-assignment-first",
    "expanded-worker-live-queue",
    "worker-message-job-context-guard",
    "new-command-slip-force-refresh",
    "worker-problem-command-bridge",
    "concise-command-cards",
    "current-wrapper-contract"
  ],
  "safety": "Owner approval remains required. This marker performs no action."
}
''',
    encoding="utf-8",
)

print("CHURVOX_WORKER_FIELD_COMMAND_BRIDGE_PATCH_APPLIED")
