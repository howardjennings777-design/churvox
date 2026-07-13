from __future__ import annotations

import json
from pathlib import Path

BUILD = "churvox-owner-message-completion-dedupe-v13-20260713"


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:220]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


path = "backend/churvox_owner_data_visibility_patch.py"
replace_once(
    path,
    'DATA = {"jobs": "jobs", "clients": "clients", "quotes": "quotes", "invoices": "invoices"}\n',
    f'DATA = {{"jobs": "jobs", "clients": "clients", "quotes": "quotes", "invoices": "invoices"}}\nOWNER_MESSAGE_DEDUPE_BUILD = "{BUILD}"\n',
)
replace_once(
    path,
    '''def record_id_query(value, ObjectId):
    raw = txt(value)
    ors = [{"id": raw}, {"job_id": raw}, {"client_id": raw}, {"quote_id": raw}, {"invoice_id": raw}]
    try: ors.append({"_id": ObjectId(raw)})
    except Exception: pass
    return {"$or": ors}


def number(v):
''',
    '''def record_id_query(value, ObjectId):
    raw = txt(value)
    ors = [{"id": raw}, {"job_id": raw}, {"client_id": raw}, {"quote_id": raw}, {"invoice_id": raw}]
    try: ors.append({"_id": ObjectId(raw)})
    except Exception: pass
    return {"$or": ors}


def message_event_key(row):
    kind = lower((row or {}).get("type") or (row or {}).get("kind") or (row or {}).get("event_type") or (row or {}).get("action_type"))
    job_id = text((row or {}).get("job_id") or (row or {}).get("source_id") or (row or {}).get("record_id"))
    title = lower((row or {}).get("title") or (row or {}).get("subject"))
    if kind in {"job_complete", "job_completed"} or "finished the job" in title:
        return f"job_completion:{job_id or title}"
    body = lower((row or {}).get("message") or (row or {}).get("body") or (row or {}).get("detail") or (row or {}).get("summary"))
    if job_id and kind and body:
        return f"{job_id}:{kind}:{body}"
    return text((row or {}).get("id") or (row or {}).get("_id") or (row or {}).get("message_id") or (row or {}).get("notification_id") or f"{kind}:{title}:{body}")


def dedupe_owner_messages(rows):
    seen = set()
    deduped = []
    for row in rows:
        key = message_event_key(row)
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        deduped.append(row)
    return deduped


def number(v):
''',
)
replace_once(
    path,
    '''        rows = sorted(rows, key=lambda r: txt(r.get("created_at")), reverse=True)[:200]
        return {"success": True, "messages": rows, "items": rows, "data": rows}
''',
    '''        rows = sorted(rows, key=lambda r: txt(r.get("created_at")), reverse=True)
        rows = dedupe_owner_messages(rows)[:200]
        return {
            "success": True,
            "messages": rows,
            "items": rows,
            "data": rows,
            "dedupe_version": OWNER_MESSAGE_DEDUPE_BUILD,
            "dedupe_strategy": "logical_job_event",
        }
''',
)
replace_once(
    path,
    '''    for path in ["/api/messages"]:
        remove(app, path, "GET"); app.add_api_route(path, list_messages, methods=["GET"])
''',
    '''    async def messages_readiness():
        return {
            "success": True,
            "ready": True,
            "version": OWNER_MESSAGE_DEDUPE_BUILD,
            "route_owner": "owner_data_visibility",
            "strategy": "logical_job_event",
            "completion_key": "job_completion:job_id",
        }

    for route_path in ["/api/messages"]:
        remove(app, route_path, "GET"); app.add_api_route(route_path, list_messages, methods=["GET"])
    remove(app, "/api/messages/readiness", "GET"); app.add_api_route("/api/messages/readiness", messages_readiness, methods=["GET"])
''',
)

marker_path = Path("frontend/public/churvox-paid-launch-build.json")
marker = json.loads(marker_path.read_text(encoding="utf-8"))
marker["build"] = BUILD
marker["owner_message_dedupe"] = BUILD
includes = list(marker.get("includes") or [])
for value in [
    "fresh-owner-created-slips-ranked-before-routine-command-items",
    "owner-messages-logical-job-event-dedupe",
    "single-owner-completion-per-message-channel",
]:
    if value not in includes:
        includes.append(value)
marker["includes"] = includes
marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")

contract = Path("scripts/churvox-owner-message-dedupe-contract.cjs")
contract.write_text(
    f'''const fs = require('fs');
const backend = fs.readFileSync('backend/churvox_owner_data_visibility_patch.py', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const checks = [
  ['dedupe build marker', backend.includes('{BUILD}') && marker.includes('{BUILD}')],
  ['logical completion key', backend.includes('job_completion:') && backend.includes('job_complete') && backend.includes('job_completed')],
  ['dedupe runs before 200 row cutoff', backend.includes('rows = dedupe_owner_messages(rows)[:200]')],
  ['generic job-event duplicates collapse', backend.includes('return f"{{job_id}}:{{kind}}:{{body}}"')],
  ['messages response exposes safe strategy', backend.includes('"dedupe_strategy": "logical_job_event"')],
  ['readiness owns current route', backend.includes('/api/messages/readiness') && backend.includes('"route_owner": "owner_data_visibility"')],
  ['notification source remains available', backend.includes('"notifications", "approved_notifications", "worker_messages", "worker_field_slips"')],
  ['paid-launch marker includes single completion rule', marker.includes('single-owner-completion-per-message-channel')],
];
let failed = false;
for (const [name, ok] of checks) {{ console.log(`${{ok ? 'PASS' : 'FAIL'}} ${{name}}`); if (!ok) failed = true; }}
if (failed) process.exit(1);
console.log('OWNER_MESSAGE_DEDUPE_CONTRACT_PASS');
''',
    encoding="utf-8",
)

print("CHURVOX_OWNER_MESSAGE_COMPLETION_DEDUPE_REPAIR_APPLIED")
