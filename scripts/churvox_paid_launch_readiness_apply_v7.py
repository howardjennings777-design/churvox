#!/usr/bin/env python3
from pathlib import Path

source = Path("scripts/churvox_paid_launch_readiness_apply_v6.py").read_text(encoding="utf-8")
exec(compile(source, "scripts/churvox_paid_launch_readiness_apply_v6.py", "exec"), {"__name__": "__main__"})

path = Path("backend/churvox_command_human_mimic_v3_routes.py")
text = path.read_text(encoding="utf-8")

old_rows = '''    async def scoped_rows(user_business_id, names, limit=240):
        rows = []
        query = business_clause(user_business_id)
        for name in names:
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                found = await cursor.limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": name} for item in found])
            except Exception:
                continue
        return rows[:limit]
'''
new_rows = '''    async def scoped_rows(user_business_id, names, limit=240, errors=None):
        rows = []
        query = business_clause(user_business_id)
        for name in names:
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                found = await cursor.limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": name} for item in found])
            except Exception as exc:
                if errors is not None:
                    errors.append(f"{name}: {exc.__class__.__name__}")
        return rows[:limit]
'''
if new_rows in text:
    print("already patched: strict v3 source error collection")
elif old_rows in text:
    text = text.replace(old_rows, new_rows, 1)
    print("patched: strict v3 source error collection")
else:
    raise SystemExit("missing anchor for strict v3 source error collection")

old_context = '''        base_result = await base_scan(payload=payload, request=request)
        captured = capture_db.capture.get("command_slips", [])

        context = {
            "jobs": await scoped_rows(user_business_id, ["jobs", "job_records", "appointments", "bookings"], 260),
            "invoices": await scoped_rows(user_business_id, ["invoices", "invoice_records"], 220),
            "clients": await scoped_rows(user_business_id, ["clients", "customers"], 180),
            "messages": await scoped_rows(user_business_id, ["messages", "client_messages", "inbox_messages"], 180),
            "timers": await scoped_rows(user_business_id, ["time_entries", "timers", "worker_time_entries", "timesheets"], 180),
            "settings": await scoped_rows(user_business_id, ["businesses", "business_settings", "settings"], 60),
        }
'''
new_context = '''        base_result = await base_scan(payload=payload, request=request)
        captured = capture_db.capture.get("command_slips", [])
        scan_errors = list(base_result.get("scan_errors") or [])

        context = {
            "jobs": await scoped_rows(user_business_id, ["jobs", "job_records", "appointments", "bookings"], 260, scan_errors),
            "invoices": await scoped_rows(user_business_id, ["invoices", "invoice_records"], 220, scan_errors),
            "clients": await scoped_rows(user_business_id, ["clients", "customers"], 180, scan_errors),
            "messages": await scoped_rows(user_business_id, ["messages", "client_messages", "inbox_messages"], 180, scan_errors),
            "timers": await scoped_rows(user_business_id, ["time_entries", "timers", "worker_time_entries", "timesheets"], 180, scan_errors),
            "settings": await scoped_rows(user_business_id, ["businesses", "business_settings", "settings"], 60, scan_errors),
        }
        scan_errors = list(dict.fromkeys(scan_errors))
'''
if new_context in text:
    print("already patched: strict v3 combined scan health")
elif old_context in text:
    text = text.replace(old_context, new_context, 1)
    print("patched: strict v3 combined scan health")
else:
    raise SystemExit("missing anchor for strict v3 combined scan health")

old_return = '''            "roles_checked": ROLE_NAMES,
            "slips": created,
            "existing": existing,
            "message": f"Strict human mimic v3 prepared {len(created)} new decision(s), kept {len(existing)} current decision(s), and rejected or superseded {retired} weak/stale candidate(s).",
            "safety": SAFE_RESULT,
'''
new_return = '''            "roles_checked": ROLE_NAMES,
            "slips": created,
            "existing": existing,
            "scan_complete": not scan_errors,
            "scan_errors": scan_errors,
            "message": (
                f"Strict human mimic v3 prepared {len(created)} new decision(s), kept {len(existing)} current decision(s), and rejected or superseded {retired} weak/stale candidate(s)."
                if not scan_errors
                else f"Strict human mimic v3 prepared {len(created)} new decision(s), but part of the live source scan failed. Do not treat an empty queue as all clear."
            ),
            "safety": SAFE_RESULT,
'''
if new_return in text:
    print("already patched: strict v3 scan health response")
elif old_return in text:
    text = text.replace(old_return, new_return, 1)
    print("patched: strict v3 scan health response")
else:
    raise SystemExit("missing anchor for strict v3 scan health response")

path.write_text(text, encoding="utf-8")
final = path.read_text(encoding="utf-8")
for needle in ['"scan_complete": not scan_errors', '"scan_errors": scan_errors', 'errors.append(f"{name}: {exc.__class__.__name__}")']:
    if needle not in final:
        raise SystemExit(f"strict v3 health patch missing: {needle}")
