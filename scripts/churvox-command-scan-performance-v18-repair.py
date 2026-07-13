from __future__ import annotations

import json
from pathlib import Path

PERFORMANCE = "churvox-command-scan-performance-v18-20260714"


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:240]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


v3 = "backend/churvox_command_human_mimic_v3_routes.py"
replace_once(
    v3,
    '''from collections import Counter
from copy import deepcopy
from datetime import datetime, timezone, timedelta
import hashlib
import json
import re''',
    '''from collections import Counter
from copy import deepcopy
from datetime import datetime, timezone, timedelta
import asyncio
import hashlib
import json
import re
import time''',
)
replace_once(
    v3,
    '''HUMAN_MIMIC_VERSION = "human-mimic-intelligence-v3"
HUMAN_MIMIC_GUARD = "human-mimic-strict-preflight-v3"''',
    f'''HUMAN_MIMIC_VERSION = "human-mimic-intelligence-v3"
HUMAN_MIMIC_GUARD = "human-mimic-strict-preflight-v3"
HUMAN_MIMIC_PERFORMANCE = "{PERFORMANCE}"''',
)
replace_once(
    v3,
    '''    async def scoped_rows(user_business_id, names, limit=240, errors=None):
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
        return rows[:limit]''',
    '''    async def scoped_rows(user_business_id, names, limit=240, errors=None):
        query = business_clause(user_business_id)

        async def load_collection(name):
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                try:
                    cursor = cursor.max_time_ms(1800)
                except Exception:
                    pass
                found = await asyncio.wait_for(cursor.limit(limit).to_list(limit), timeout=2.5)
                return [{**dict(item), "_collection": name} for item in found]
            except Exception as exc:
                if errors is not None:
                    errors.append(f"{name}: {exc.__class__.__name__}")
                return []

        batches = await asyncio.gather(*(load_collection(name) for name in names))
        rows = [row for batch in batches for row in batch]
        return rows[:limit]''',
)
replace_once(
    v3,
    '''    async def linked_invoice_exists(user_business_id, job, invoices):
        refs = row_ids(job)
        if not refs:
            return False
        for invoice in invoices:
            if cancelled(invoice):
                continue
            linked = set()
            for key in ["job_id", "jobId", "source_job_id", "related_job_id"]:
                linked.update(str(value) for value in id_values((invoice or {}).get(key)))
            if refs & linked:
                return True
        return False''',
    '''    def linked_invoice_exists(user_business_id, job, invoices):
        refs = row_ids(job)
        if not refs:
            return False
        for invoice in invoices:
            if cancelled(invoice):
                continue
            linked = set()
            for key in ["job_id", "jobId", "source_job_id", "related_job_id"]:
                linked.update(str(value) for value in id_values((invoice or {}).get(key)))
            if refs & linked:
                return True
        return False''',
)
replace_once(
    v3,
    '''    async def retire_legacy(user_business_id):
        try:
            rows = await db.command_slips.find({
                "business_id": user_business_id,
                "status": {"$in": OPEN_STATUSES},
                "office_engine": True,
                "payload.human_mimic_intelligence_v3": {"$ne": True},
            }).limit(400).to_list(400)
        except Exception:
            rows = []
        count = 0
        for row in rows:
            if await supersede(row, "Strict human mimic v3 replaced an older judgement before launch. No business record changed."):
                count += 1
        return count''',
    '''    async def retire_legacy(user_business_id):
        try:
            cursor = db.command_slips.find({
                "business_id": user_business_id,
                "status": {"$in": OPEN_STATUSES},
                "office_engine": True,
                "payload.human_mimic_intelligence_v3": {"$ne": True},
            })
            try:
                cursor = cursor.max_time_ms(1800)
            except Exception:
                pass
            rows = await asyncio.wait_for(cursor.limit(400).to_list(400), timeout=2.5)
        except Exception:
            rows = []
        semaphore = asyncio.Semaphore(8)

        async def retire(row):
            async with semaphore:
                return await supersede(row, "Strict human mimic v3 replaced an older judgement before launch. No business record changed.")

        results = await asyncio.gather(*(retire(row) for row in rows))
        return sum(1 for result in results if result)''',
)
replace_once(
    v3,
    '''    @router.post("/command/scan")
    async def strict_human_mimic_scan(request: Request, payload: Optional[Dict[str, Any]] = None):
        user = await require_owner(request)
        user_business_id = business_id(user)
        retired = await retire_legacy(user_business_id)

        capture_db = _CaptureDB(db, ObjectId)''',
    '''    @router.post("/command/scan")
    async def strict_human_mimic_scan(request: Request, payload: Optional[Dict[str, Any]] = None):
        scan_started = time.monotonic()
        stage_timings = {}
        user = await require_owner(request)
        user_business_id = business_id(user)
        stage_started = time.monotonic()
        retired = await retire_legacy(user_business_id)
        stage_timings["retire_legacy_ms"] = round((time.monotonic() - stage_started) * 1000)

        capture_db = _CaptureDB(db, ObjectId)''',
)
replace_once(
    v3,
    '''        base_result = await base_scan(payload=payload, request=request)
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
        scan_errors = list(dict.fromkeys(scan_errors))''',
    '''        stage_started = time.monotonic()
        base_result = await base_scan(payload=payload, request=request)
        stage_timings["base_scan_ms"] = round((time.monotonic() - stage_started) * 1000)
        captured = capture_db.capture.get("command_slips", [])
        scan_errors = list(base_result.get("scan_errors") or [])

        stage_started = time.monotonic()
        jobs, invoices, clients, messages, timers, settings = await asyncio.gather(
            scoped_rows(user_business_id, ["jobs", "job_records", "appointments", "bookings"], 260, scan_errors),
            scoped_rows(user_business_id, ["invoices", "invoice_records"], 220, scan_errors),
            scoped_rows(user_business_id, ["clients", "customers"], 180, scan_errors),
            scoped_rows(user_business_id, ["messages", "client_messages", "inbox_messages"], 180, scan_errors),
            scoped_rows(user_business_id, ["time_entries", "timers", "worker_time_entries", "timesheets"], 180, scan_errors),
            scoped_rows(user_business_id, ["businesses", "business_settings", "settings"], 60, scan_errors),
        )
        context = {
            "jobs": jobs,
            "invoices": invoices,
            "clients": clients,
            "messages": messages,
            "timers": timers,
            "settings": settings,
        }
        stage_timings["context_load_ms"] = round((time.monotonic() - stage_started) * 1000)
        scan_errors = list(dict.fromkeys(scan_errors))''',
)
replace_once(
    v3,
    '''        linked_jobs = {}
        for job in context["jobs"]:
            source = next(iter(row_ids(job)), "")
            linked_jobs[source] = await linked_invoice_exists(user_business_id, job, context["invoices"])
        context["linked_jobs"] = linked_jobs''',
    '''        stage_started = time.monotonic()
        linked_jobs = {}
        for job in context["jobs"]:
            source = next(iter(row_ids(job)), "")
            linked_jobs[source] = linked_invoice_exists(user_business_id, job, context["invoices"])
        context["linked_jobs"] = linked_jobs
        stage_timings["link_index_ms"] = round((time.monotonic() - stage_started) * 1000)''',
)
replace_once(
    v3,
    '''        created = []
        existing = []
        for doc in regular[:100]:
            item, old, _ = await insert_hardened(user, doc)
            if item:
                created.append(item)
            elif old:
                existing.append(old)

        role_counts = Counter''',
    '''        stage_started = time.monotonic()
        created = []
        existing = []
        store_semaphore = asyncio.Semaphore(8)

        async def store_hardened(doc):
            async with store_semaphore:
                return await insert_hardened(user, doc)

        stored = await asyncio.gather(*(store_hardened(doc) for doc in regular[:100]))
        for item, old, _ in stored:
            if item:
                created.append(item)
            elif old:
                existing.append(old)
        stage_timings["store_ms"] = round((time.monotonic() - stage_started) * 1000)
        stage_timings["total_ms"] = round((time.monotonic() - scan_started) * 1000)

        role_counts = Counter''',
)
replace_once(
    v3,
    '''            "source": HUMAN_MIMIC_VERSION,
            "guard": HUMAN_MIMIC_GUARD,
            "created_count": len(created),''',
    '''            "source": HUMAN_MIMIC_VERSION,
            "guard": HUMAN_MIMIC_GUARD,
            "performance_version": HUMAN_MIMIC_PERFORMANCE,
            "stage_timings_ms": stage_timings,
            "created_count": len(created),''',
)

paid = "backend/churvox_paid_launch_live_patch.py"
replace_once(
    paid,
    '''            "owner_manual_command_priority": "churvox-owner-manual-command-priority-v12-20260713",
            "routes": ["payroll", "payroll-summary", "command-slips", "command-scan", "admin-brain"],''',
    f'''            "owner_manual_command_priority": "churvox-owner-manual-command-priority-v12-20260713",
            "command_scan_performance": "{PERFORMANCE}",
            "command_scan_timeout_seconds": 25,
            "routes": ["payroll", "payroll-summary", "command-slips", "command-scan", "admin-brain"],''',
)

marker_path = Path("frontend/public/churvox-paid-launch-build.json")
marker = json.loads(marker_path.read_text(encoding="utf-8"))
marker["command_scan_performance"] = PERFORMANCE
marker["command_scan_timeout_seconds"] = 25
includes = list(marker.get("includes") or [])
for value in [
    "parallel-command-context-load",
    "bounded-command-collection-reads",
    "parallel-command-decision-storage",
    "command-scan-stage-timings",
]:
    if value not in includes:
        includes.append(value)
marker["includes"] = includes
marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")

contract = Path("scripts/churvox-command-scan-performance-v18-contract.cjs")
contract.write_text(
    f'''const fs = require('fs');
const v3 = fs.readFileSync('backend/churvox_command_human_mimic_v3_routes.py', 'utf8');
const paid = fs.readFileSync('backend/churvox_paid_launch_live_patch.py', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const smoke = fs.readFileSync('scripts/churvox-paid-launch-live-smoke-v2.cjs', 'utf8');
const checks = [
  ['v18 performance marker aligned', v3.includes('{PERFORMANCE}') && paid.includes('{PERFORMANCE}') && marker.includes('{PERFORMANCE}')],
  ['collection reads are concurrent and bounded', v3.includes('batches = await asyncio.gather(*(load_collection(name) for name in names))') && v3.includes('timeout=2.5') && v3.includes('max_time_ms(1800)')],
  ['six context groups load concurrently', v3.includes('jobs, invoices, clients, messages, timers, settings = await asyncio.gather(')],
  ['linked invoices use loaded context only', v3.includes('def linked_invoice_exists(') && !v3.includes('linked_jobs[source] = await linked_invoice_exists')],
  ['legacy retirement is bounded and parallel', v3.includes('rows = await asyncio.wait_for(cursor.limit(400).to_list(400), timeout=2.5)') && v3.includes('semaphore = asyncio.Semaphore(8)')],
  ['decision storage is parallel but bounded', v3.includes('store_semaphore = asyncio.Semaphore(8)') && v3.includes('stored = await asyncio.gather(*(store_hardened(doc) for doc in regular[:100]))')],
  ['stage timings are exposed', v3.includes('"stage_timings_ms": stage_timings') && v3.includes('"total_ms"') && v3.includes('"context_load_ms"')],
  ['25 second fail-safe remains', paid.includes('guarded_scan(request=request, payload=payload or {{}}), 25, "Command brain scan"') && paid.includes('"command_scan_timeout_seconds": 25')],
  ['owner approval and no-action safety remain', v3.includes('Owner approval required. Nothing was sent, synced, charged or changed.') && smoke.includes('no_auto_send') && smoke.includes('no_auto_sync') && smoke.includes('no_auto_charge')],
  ['v17 Messages truth remains', marker.includes('churvox-final-owner-messages-v17-20260714') && marker.includes('single-owner-completion-per-message-channel')],
];
let failed = false;
for (const [name, ok] of checks) {{ console.log(`${{ok ? 'PASS' : 'FAIL'}} ${{name}}`); if (!ok) failed = true; }}
if (failed) process.exit(1);
console.log('CHURVOX_COMMAND_SCAN_PERFORMANCE_V18_CONTRACT_PASS');
''',
    encoding="utf-8",
)

print("CHURVOX_COMMAND_SCAN_PERFORMANCE_V18_REPAIR_APPLIED")
