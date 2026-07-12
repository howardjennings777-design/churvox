from pathlib import Path

PATCH = Path('backend/churvox_paid_launch_live_patch.py')
BOOT = Path('backend/churvox_boot.py')


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing anchor: {label}')
    return text.replace(old, new, 1)


text = PATCH.read_text(encoding='utf-8')
text = replace_once(text, 'import asyncio\nfrom datetime import datetime, timezone\n', 'import asyncio\nimport time\nfrom datetime import datetime, timezone\n', 'time import')
text = replace_once(
    text,
    'SAFETY = "Owner approval required. Nothing was sent, synced, charged, filed or paid."\n',
    'SAFETY = "Owner approval required. Nothing was sent, synced, charged, filed or paid."\nQUEUE_CACHE_TTL_SECONDS = 20\nQUEUE_CACHE_STALE_SECONDS = 15 * 60\nQUEUE_STATUS_LIMIT = 12\nQUEUE_QUERY_TIMEOUT_SECONDS = 2.2\n',
    'queue constants',
)
text = replace_once(
    text,
    '''            jobs = [
                ("command_slips", [("business_id", 1), ("status", 1), ("updated_at", -1)]),
                ("command_slips", [("business_id", 1), ("source_type", 1), ("action_type", 1), ("source_id", 1), ("status", 1)]),
''',
    '''            jobs = [
                ("command_slips", [("business_id", 1), ("status", 1), ("updated_at", -1)]),
                ("command_slips", [("business_id", 1), ("updated_at", -1)]),
                ("command_slips", [("business_id", 1), ("source_type", 1), ("action_type", 1), ("source_id", 1), ("status", 1)]),
''',
    'queue indexes',
)
old = '''    async def fast_slips(request: Request):
        user = await require_owner(request)
        bid = business_id(user)
        if not index_ready:
            try:
                asyncio.create_task(ensure_indexes())
            except Exception:
                pass
        query = {"business_id": bid, "status": {"$in": OPEN_STATUSES}}
        cursor = db.command_slips.find(query, {"audit": 0}).sort("updated_at", -1).limit(50)
        try:
            cursor = cursor.max_time_ms(2500)
        except Exception:
            pass
        rows = await bounded(cursor.to_list(length=50), 5, "Command queue")
        return {
            "success": True,
            "source": "paid-launch-fast-command-v2",
            "slips": [_safe(row, ObjectId) for row in rows],
            "scan_complete": True,
            "scan_errors": [],
            "safety": SAFETY,
        }

'''
new = '''    queue_cache: Dict[str, Dict[str, Any]] = {}
    queue_refresh_tasks: Dict[str, asyncio.Task] = {}

    def queue_sort_value(row: Dict[str, Any]) -> str:
        value = row.get("updated_at") or row.get("created_at") or row.get("_id") or ""
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)

    async def read_queue_status(bid: str, status: str):
        query = {"business_id": bid, "status": status}
        cursor = db.command_slips.find(query, {"audit": 0}).sort("updated_at", -1).limit(QUEUE_STATUS_LIMIT)
        try:
            cursor = cursor.hint([("business_id", 1), ("status", 1), ("updated_at", -1)])
        except Exception:
            pass
        try:
            cursor = cursor.max_time_ms(900)
        except Exception:
            pass
        return await cursor.to_list(length=QUEUE_STATUS_LIMIT)

    async def load_queue_rows(bid: str):
        started = time.monotonic()
        batches = await bounded(
            asyncio.gather(*(read_queue_status(bid, status) for status in OPEN_STATUSES)),
            QUEUE_QUERY_TIMEOUT_SECONDS,
            "Command queue",
        )
        rows = [row for batch in batches for row in batch]
        rows.sort(key=queue_sort_value, reverse=True)
        rows = rows[:50]
        queue_cache[bid] = {"at": time.monotonic(), "rows": rows}
        return rows, round((time.monotonic() - started) * 1000)

    async def refresh_queue_cache(bid: str):
        try:
            await load_queue_rows(bid)
        except Exception:
            pass
        finally:
            queue_refresh_tasks.pop(bid, None)

    def schedule_queue_refresh(bid: str):
        task = queue_refresh_tasks.get(bid)
        if task and not task.done():
            return
        try:
            queue_refresh_tasks[bid] = asyncio.create_task(refresh_queue_cache(bid))
        except Exception:
            pass

    def queue_response(rows, *, source: str, elapsed_ms: int = 0, cached: bool = False, stale: bool = False):
        return {
            "success": True,
            "source": source,
            "slips": [_safe(row, ObjectId) for row in rows],
            "cached": cached,
            "stale": stale,
            "elapsed_ms": elapsed_ms,
            "scan_complete": not stale,
            "scan_errors": ["Command queue is showing the last confirmed server cache while a live refresh retries."] if stale else [],
            "safety": SAFETY,
        }

    async def fast_slips(request: Request):
        user = await require_owner(request)
        bid = business_id(user)
        if not index_ready:
            try:
                asyncio.create_task(ensure_indexes())
            except Exception:
                pass

        cached = queue_cache.get(bid)
        age = time.monotonic() - float((cached or {}).get("at") or 0)
        if cached and age <= QUEUE_CACHE_TTL_SECONDS:
            if age > 5:
                schedule_queue_refresh(bid)
            return queue_response(cached.get("rows") or [], source="paid-launch-command-server-cache-v3", cached=True)

        try:
            rows, elapsed_ms = await load_queue_rows(bid)
            return queue_response(rows, source="paid-launch-fast-command-v3", elapsed_ms=elapsed_ms)
        except HTTPException:
            if cached and age <= QUEUE_CACHE_STALE_SECONDS:
                schedule_queue_refresh(bid)
                return queue_response(cached.get("rows") or [], source="paid-launch-command-stale-cache-v3", cached=True, stale=True)
            raise

'''
text = replace_once(text, old, new, 'fast slips implementation')
text = replace_once(
    text,
    '"marker": "churvox-command-fast-load-backend-20260713b",',
    '"marker": "churvox-command-queue-speed-backend-20260713e",',
    'backend readiness marker',
)
PATCH.write_text(text, encoding='utf-8')

boot = BOOT.read_text(encoding='utf-8')
boot = replace_once(
    boot,
    'VERSION = "churvox-command-fast-load-boot-20260713d"',
    'VERSION = "churvox-command-queue-speed-boot-20260713e"',
    'boot version',
)
BOOT.write_text(boot, encoding='utf-8')

print('Applied indexed parallel Command queue and server-cache repair.')
