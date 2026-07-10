from __future__ import annotations

import re


FALSE_COMPLETE_STATUSES = {
    "incomplete",
    "pending completion",
    "awaiting completion",
    "not complete",
    "not completed",
}


def _text(value):
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def _number(value):
    if isinstance(value, bool) or value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    raw = _text(value).replace(",", "")
    if not re.fullmatch(r"-?\d+(?:\.\d+)?", raw):
        return 0.0
    try:
        return float(raw)
    except Exception:
        return 0.0


def _normalize_timer(row):
    item = dict(row or {})
    if _number(item.get("hours")) > 0 or _number(item.get("duration_hours")) > 0:
        return item
    minutes = _number(item.get("duration_minutes") or item.get("minutes"))
    seconds = _number(item.get("duration_seconds") or item.get("seconds"))
    raw = _number(item.get("duration"))
    unit = _text(item.get("duration_unit") or item.get("unit")).lower()
    hours = 0.0
    source = ""
    if minutes > 0:
        hours = minutes / 60.0
        source = "duration_minutes"
    elif seconds > 0:
        hours = seconds / 3600.0
        source = "duration_seconds"
    elif raw > 0 and "minute" in unit:
        hours = raw / 60.0
        source = "duration with minute unit"
    elif raw > 0 and "second" in unit:
        hours = raw / 3600.0
        source = "duration with second unit"
    elif 0 < raw <= 24:
        hours = raw
        source = "duration treated as hours"
    if hours > 0:
        item["duration_hours"] = hours
        item["_duration_normalized_from"] = source
    return item


def _normalize_job(row):
    item = dict(row or {})
    raw_status = _text(item.get("status") or item.get("job_status") or item.get("state")).lower()
    words = set(re.findall(r"[a-z0-9]+", raw_status.replace("_", " ").replace("-", " ")))
    false_complete = raw_status in FALSE_COMPLETE_STATUSES or "incomplete" in words or ("not" in words and bool(words & {"complete", "completed"}))
    if false_complete:
        item["_source_status_original"] = raw_status
        item["status"] = "open"
    return item


class _TransformCursor:
    def __init__(self, cursor, transform):
        self.cursor = cursor
        self.transform = transform

    def sort(self, *args, **kwargs):
        self.cursor = self.cursor.sort(*args, **kwargs)
        return self

    def limit(self, *args, **kwargs):
        self.cursor = self.cursor.limit(*args, **kwargs)
        return self

    async def to_list(self, length=None):
        rows = await self.cursor.to_list(length)
        return [self.transform(row) for row in rows]

    def __getattr__(self, name):
        return getattr(self.cursor, name)


class _TransformCollection:
    def __init__(self, collection, transform):
        self.collection = collection
        self.transform = transform

    def find(self, *args, **kwargs):
        return _TransformCursor(self.collection.find(*args, **kwargs), self.transform)

    async def find_one(self, *args, **kwargs):
        row = await self.collection.find_one(*args, **kwargs)
        return self.transform(row) if row else row

    def __getattr__(self, name):
        return getattr(self.collection, name)


class _NormalizedMimicDB:
    JOB_COLLECTIONS = {"jobs", "job_records", "appointments", "bookings"}
    TIMER_COLLECTIONS = {"time_entries", "timers", "worker_time_entries", "timesheets"}

    def __init__(self, real_db):
        self.real_db = real_db
        self.views = {}

    def __getitem__(self, name):
        if name not in self.views:
            collection = self.real_db[name]
            if name in self.JOB_COLLECTIONS:
                collection = _TransformCollection(collection, _normalize_job)
            elif name in self.TIMER_COLLECTIONS:
                collection = _TransformCollection(collection, _normalize_timer)
            self.views[name] = collection
        return self.views[name]

    def __getattr__(self, name):
        return self[name]


def normalize_mimic_source_db(db):
    return _NormalizedMimicDB(db)
