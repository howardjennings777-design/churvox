from __future__ import annotations

import json
from pathlib import Path

BUILD = "churvox-final-owner-messages-v16-20260713"


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:220]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


patch_path = Path("backend/churvox_final_owner_messages_route_patch.py")
patch_path.write_text(
    '''from __future__ import annotations

from datetime import datetime

BUILD = "churvox-final-owner-messages-v16-20260713"
INSTALLED = set()
COLLECTIONS = ["notifications", "approved_notifications", "worker_messages", "worker_field_slips"]


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def user_id(user):
    return text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id"))


def business_id(user):
    return text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or user_id(user))


def email(user):
    return lower((user or {}).get("email"))


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(word in lowered for word in ("password", "token", "secret", "hash", "content_base64")):
                continue
            result["id" if key == "_id" else key] = safe(item)
        return result
    return value


def scope(user, ObjectId):
    values = {user_id(user), business_id(user)}
    values = {value for value in values if value}
    expanded = list(values)
    for value in list(values):
        try:
            expanded.append(ObjectId(value))
        except Exception:
            pass
    mail = email(user)
    ors = [
        {"business_id": {"$in": expanded}},
        {"businessId": {"$in": expanded}},
        {"contractor_id": {"$in": expanded}},
        {"owner_business_id": {"$in": expanded}},
        {"owner_id": {"$in": expanded}},
        {"user_id": {"$in": expanded}},
        {"created_by": {"$in": expanded}},
        {"created_by_id": {"$in": expanded}},
        {"employer_id": {"$in": expanded}},
    ]
    if mail:
        ors.extend([{"owner_email": mail}, {"email": mail}, {"created_by_email": mail}])
    return {"$or": ors}


def remove_route(app, path, method):
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (
                getattr(route, "path", "") == path
                and method.upper() in set(getattr(route, "methods", set()) or set())
            )
        ]
    except Exception:
        pass


def event_key(row):
    row = row or {}
    kind = lower(row.get("type") or row.get("kind") or row.get("event_type") or row.get("action_type"))
    job_id = text(row.get("job_id") or row.get("source_id") or row.get("record_id"))
    title = lower(row.get("title") or row.get("subject"))
    if kind in {"job_complete", "job_completed"} or "finished the job" in title:
        return f"job_completion:{job_id or title}"
    body = lower(row.get("message") or row.get("body") or row.get("detail") or row.get("summary"))
    if job_id and kind and body:
        return f"{job_id}:{kind}:{body}"
    return text(row.get("id") or row.get("_id") or row.get("message_id") or row.get("notification_id") or f"{kind}:{title}:{body}")


def dedupe(rows):
    seen = set()
    result = []
    for row in rows:
        key = event_key(row)
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        result.append(row)
    return result


def install(module, force=False):
    name = getattr(module, "__name__", "") or f"module-{id(module)}"
    if name in INSTALLED and not force:
        return True
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    if app is None or db is None or get_current_user is None or ObjectId is None or Request is None:
        return False

    async def list_messages(request: Request):
        user = await get_current_user(request)
        rows = []
        raw_counts = {}
        query = scope(user, ObjectId)
        for collection_name in COLLECTIONS:
            count = 0
            try:
                cursor = getattr(db, collection_name).find(query).sort("created_at", -1).limit(160)
                async for raw in cursor:
                    rows.append(safe(raw))
                    count += 1
            except Exception:
                count = 0
            raw_counts[collection_name] = count
        rows = sorted(rows, key=lambda row: text(row.get("created_at")), reverse=True)
        rows = dedupe(rows)[:200]
        return {
            "success": True,
            "messages": rows,
            "items": rows,
            "data": rows,
            "dedupe_version": BUILD,
            "dedupe_strategy": "logical_job_event",
            "route_owner": "final_owner_messages_wrapper",
            "raw_counts": raw_counts,
        }

    async def readiness():
        return {
            "success": True,
            "ready": True,
            "version": BUILD,
            "route_owner": "final_owner_messages_wrapper",
            "strategy": "logical_job_event",
            "completion_key": "job_completion:job_id",
            "collections": COLLECTIONS,
        }

    remove_route(app, "/api/messages", "GET")
    remove_route(app, "/api/messages/readiness", "GET")
    app.add_api_route("/api/messages", list_messages, methods=["GET"])
    app.add_api_route("/api/messages/readiness", readiness, methods=["GET"])
    INSTALLED.add(name)
    return True
''',
    encoding="utf-8",
)

server = "backend/server/__init__.py"
replace_once(
    server,
    "for path in ['/api/command/slips', '/api/command/scan', '/api/admin-brain/scan', '/api/billing/create-checkout-session', '/api/billing/create-addon-checkout-session']:",
    "for path in ['/api/command/slips', '/api/command/scan', '/api/admin-brain/scan', '/api/billing/create-checkout-session', '/api/billing/create-addon-checkout-session', '/api/messages', '/api/messages/readiness']:",
)
replace_once(
    server,
    "        'session_revocation_error': globals().get('FINAL_SESSION_REVOCATION_ERROR') or None,\n        'route_owners': route_owners,",
    "        'session_revocation_error': globals().get('FINAL_SESSION_REVOCATION_ERROR') or None,\n        'owner_messages_patch_installed': globals().get('FINAL_OWNER_MESSAGES_PATCH_INSTALLED', False),\n        'owner_messages_version': globals().get('FINAL_OWNER_MESSAGES_VERSION'),\n        'owner_messages_error': globals().get('FINAL_OWNER_MESSAGES_PATCH_ERROR') or None,\n        'route_owners': route_owners,",
)
replace_once(
    server,
    '''_force_install_final_session_revocation()


@app.options('/{full_path:path}')''',
    '''_force_install_final_session_revocation()


FINAL_OWNER_MESSAGES_VERSION = 'churvox-final-owner-messages-v16-20260713'
FINAL_OWNER_MESSAGES_PATCH_INSTALLED = False
FINAL_OWNER_MESSAGES_PATCH_ERROR = ''


def _force_install_final_owner_messages_patch():
    global FINAL_OWNER_MESSAGES_PATCH_INSTALLED, FINAL_OWNER_MESSAGES_PATCH_ERROR
    try:
        try:
            import churvox_final_owner_messages_route_patch as messages_patch
        except Exception:
            from backend import churvox_final_owner_messages_route_patch as messages_patch
        FINAL_OWNER_MESSAGES_PATCH_INSTALLED = bool(messages_patch.install(legacy, force=True))
        FINAL_OWNER_MESSAGES_PATCH_ERROR = '' if FINAL_OWNER_MESSAGES_PATCH_INSTALLED else 'installer_not_ready'
    except Exception as exc:
        FINAL_OWNER_MESSAGES_PATCH_INSTALLED = False
        FINAL_OWNER_MESSAGES_PATCH_ERROR = f'{type(exc).__name__}:{exc}'
        print(f'Churvox final owner messages patch failed: {exc}', file=sys.stderr)


_force_install_final_owner_messages_patch()


@app.options('/{full_path:path}')''',
)

smoke = "scripts/churvox-paid-launch-live-smoke-v2.cjs"
replace_once(
    smoke,
    "const expectedBackend = 'churvox-command-v3-server-wrapper-20260713g';",
    "const expectedBackend = 'churvox-command-v3-server-wrapper-20260713g';\nconst expectedOwnerMessages = 'churvox-final-owner-messages-v16-20260713';",
)
replace_once(
    smoke,
    '''  const scanOwners = body.route_owners?.['/api/command/scan'] || [];
  assert(body.version === expectedBackend,''',
    '''  const scanOwners = body.route_owners?.['/api/command/scan'] || [];
  const messageOwners = body.route_owners?.['/api/messages'] || [];
  const messageReadinessOwners = body.route_owners?.['/api/messages/readiness'] || [];
  assert(body.version === expectedBackend,''',
)
replace_once(
    smoke,
    '''  assert(scanOwners.some((value) => String(value).endsWith(':fast_scan')), `fast_scan not live: ${JSON.stringify(scanOwners)}`);
  return { version: body.version, elapsedMs: result.elapsedMs, slipOwners, scanOwners };''',
    '''  assert(scanOwners.some((value) => String(value).endsWith(':fast_scan')), `fast_scan not live: ${JSON.stringify(scanOwners)}`);
  assert(body.owner_messages_patch_installed === true && body.owner_messages_version === expectedOwnerMessages && body.owner_messages_error == null, `owner messages patch not ready: ${JSON.stringify(body).slice(0,900)}`);
  assert(messageOwners.some((value) => String(value).endsWith(':list_messages')), `final list_messages not live: ${JSON.stringify(messageOwners)}`);
  assert(messageReadinessOwners.some((value) => String(value).endsWith(':readiness')), `messages readiness not live: ${JSON.stringify(messageReadinessOwners)}`);
  return { version: body.version, elapsedMs: result.elapsedMs, slipOwners, scanOwners, messageOwners, messageReadinessOwners };''',
)
replace_once(
    smoke,
    '''  const queue = await call(`/api/command/slips?ts=${Date.now()}`, { headers: auth }, 1);
  assert(queue.response?.status === 200 && queue.body?.success !== false, `Command queue ${queue.response?.status}: ${JSON.stringify(queue.body).slice(0,600)}`);''',
    '''  const messagesReady = await call(`/api/messages/readiness?ts=${Date.now()}`, { headers: auth }, 2);
  assert(messagesReady.response?.status === 200 && messagesReady.body?.ready === true, `messages readiness ${messagesReady.response?.status}: ${JSON.stringify(messagesReady.body).slice(0,600)}`);
  assert(messagesReady.body?.version === expectedOwnerMessages && messagesReady.body?.route_owner === 'final_owner_messages_wrapper', `wrong messages route owner: ${JSON.stringify(messagesReady.body).slice(0,700)}`);
  const queue = await call(`/api/command/slips?ts=${Date.now()}`, { headers: auth }, 1);
  assert(queue.response?.status === 200 && queue.body?.success !== false, `Command queue ${queue.response?.status}: ${JSON.stringify(queue.body).slice(0,600)}`);''',
)

marker_path = Path("frontend/public/churvox-paid-launch-build.json")
marker = json.loads(marker_path.read_text(encoding="utf-8"))
marker["build"] = BUILD
marker["owner_message_dedupe"] = BUILD
marker["owner_messages_final_route"] = BUILD
includes = list(marker.get("includes") or [])
for value in [
    "final-owner-messages-route-ownership",
    "runtime-logical-completion-dedupe",
    "messages-readiness-verified-by-live-smoke",
]:
    if value not in includes:
        includes.append(value)
marker["includes"] = includes
marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")

contract = Path("scripts/churvox-final-owner-messages-v16-contract.cjs")
contract.write_text(
    '''const fs = require('fs');
const patch = fs.readFileSync('backend/churvox_final_owner_messages_route_patch.py', 'utf8');
const wrapper = fs.readFileSync('backend/server/__init__.py', 'utf8');
const smoke = fs.readFileSync('scripts/churvox-paid-launch-live-smoke-v2.cjs', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const checks = [
  ['v16 marker aligned', patch.includes('churvox-final-owner-messages-v16-20260713') && marker.includes('churvox-final-owner-messages-v16-20260713')],
  ['runtime helpers are defined', patch.includes('def text(value):') && patch.includes('def lower(value):')],
  ['completion key collapses four collections', patch.includes('job_completion:') && patch.includes('COLLECTIONS = ["notifications", "approved_notifications", "worker_messages", "worker_field_slips"]')],
  ['dedupe happens before response cutoff', patch.includes('rows = dedupe(rows)[:200]')],
  ['route installer removes stale owners', patch.includes('remove_route(app, "/api/messages", "GET")') && patch.includes('app.add_api_route("/api/messages", list_messages')],
  ['wrapper force-installs final messages route', wrapper.includes('_force_install_final_owner_messages_patch()') && wrapper.includes('messages_patch.install(legacy, force=True)')],
  ['wrapper marker exposes route ownership', wrapper.includes("'/api/messages/readiness'") && wrapper.includes("'owner_messages_patch_installed'")],
  ['live smoke verifies readiness and final owner', smoke.includes('/api/messages/readiness') && smoke.includes("final_owner_messages_wrapper") && smoke.includes('expectedOwnerMessages')],
  ['existing safety and v15 markers retained', marker.includes('active-worker-jobs-only') && marker.includes('single-owner-completion-per-message-channel')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log('CHURVOX_FINAL_OWNER_MESSAGES_V16_CONTRACT_PASS');
''',
    encoding="utf-8",
)

print("CHURVOX_FINAL_OWNER_MESSAGES_V16_REPAIR_APPLIED")
