#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from bson import ObjectId
from fastapi import HTTPException

from churvox_paid_launch_readiness_routes import build_paid_launch_readiness_router


def equivalent(left, right):
    return left == right or str(left) == str(right)


def matches(row, query):
    if not query:
        return True
    for key, expected in query.items():
        if key == "$or":
            if not any(matches(row, branch) for branch in expected):
                return False
            continue
        actual = row.get(key)
        if isinstance(expected, dict) and "$in" in expected:
            if not any(equivalent(actual, candidate) for candidate in expected["$in"]):
                return False
        elif not equivalent(actual, expected):
            return False
    return True


class Cursor:
    def __init__(self, rows):
        self.rows = list(rows)
        self.limit_value = None

    def sort(self, *_args):
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    async def to_list(self, length=None):
        limit = self.limit_value or length or len(self.rows)
        return list(self.rows[:limit])


class Collection:
    def __init__(self, rows=None):
        self.rows = list(rows or [])

    def find(self, query):
        return Cursor([row for row in self.rows if matches(row, query)])


class DB:
    def __init__(self, data):
        self.data = {name: Collection(rows) for name, rows in data.items()}

    def __getitem__(self, name):
        return self.data.setdefault(name, Collection())


def endpoint(router, path):
    for route in router.routes:
        if route.path == path and "GET" in route.methods:
            return route.endpoint
    raise AssertionError(f"missing GET {path}")


async def run():
    business_id = str(ObjectId())
    worker_id = str(ObjectId())
    db = DB({
        "users": [
            {"_id": ObjectId(worker_id), "business_id": business_id, "role": "worker", "name": "Cam", "hourly_rate": 30, "status": "active"},
            {"_id": ObjectId(), "business_id": business_id, "role": "employer", "name": "Owner", "status": "active"},
        ],
        "time_entries": [
            {
                "_id": ObjectId(),
                "business_id": business_id,
                "worker_id": worker_id,
                "worker_name": "Cam",
                "hours": 8,
                "hourly_rate": 30,
                "started_at": "2026-07-13T08:00:00Z",
                "ended_at": "2026-07-13T16:00:00Z",
                "status": "review",
                "note": "Normal shift",
            },
            {
                "_id": ObjectId(),
                "business_id": business_id,
                "worker_id": worker_id,
                "worker_name": "Cam",
                "duration_minutes": 90,
                "started_at": "2026-07-14T08:00:00Z",
                "status": "open",
            },
        ],
    })

    async def owner_user(_request):
        return {"id": business_id, "business_id": business_id, "role": "employer"}

    router = build_paid_launch_readiness_router(db, owner_user, ObjectId)
    payroll = await endpoint(router, "/payroll")(object())
    summary = await endpoint(router, "/payroll/summary")(object())

    assert payroll["success"] is True
    assert payroll["source"] == "paid-launch-payroll-readiness"
    assert payroll["read_only"] is True
    assert payroll["no_tax_filing"] is True
    assert payroll["no_government_submission"] is True
    assert payroll["no_bank_file"] is True
    assert payroll["no_payment"] is True
    assert len(payroll["items"]) == 2
    assert payroll["summary"]["total_hours"] == 9.5
    assert payroll["summary"]["gross_total"] == 285.0
    assert payroll["summary"]["review_count"] >= 1
    assert summary["periods"] == summary["items"]

    async def worker_user(_request):
        return {"id": worker_id, "business_id": business_id, "role": "worker"}

    worker_router = build_paid_launch_readiness_router(db, worker_user, ObjectId)
    try:
        await endpoint(worker_router, "/payroll")(object())
    except HTTPException as exc:
        assert exc.status_code == 403
    else:
        raise AssertionError("worker accessed owner payroll route")

    print("PASS — payroll GET routes return read-only owner-scoped hours and gross totals")
    print("PASS — no tax filing, government submission, bank file or payment capability")
    print("PASS — worker role is denied")


if __name__ == "__main__":
    asyncio.run(run())
