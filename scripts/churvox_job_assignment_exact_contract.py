#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import churvox_job_assignment_exact_patch as patch


class FakeObjectId(str):
    @staticmethod
    def is_valid(value):
        return False


class FakeJSONResponse:
    def __init__(self, content, status_code=200):
        self.content = content
        self.status_code = status_code
        self.headers = {}


class FakeResult:
    def __init__(self, matched_count=0):
        self.matched_count = matched_count


def nested(doc, path):
    value = doc
    for part in str(path).split("."):
        if not isinstance(value, dict) or part not in value:
            return None, False
        value = value[part]
    return value, True


def matches(doc, query):
    if not query:
        return True
    if "$and" in query:
        return all(matches(doc, item) for item in query["$and"])
    if "$or" in query:
        return any(matches(doc, item) for item in query["$or"])
    for key, expected in query.items():
        actual, exists = nested(doc, key)
        if isinstance(expected, dict) and "$in" in expected:
            if not exists or actual not in expected["$in"]:
                return False
        elif not exists or actual != expected:
            return False
    return True


class FakeCollection:
    def __init__(self, rows=None):
        self.rows = [dict(row) for row in (rows or [])]

    async def find_one(self, query):
        for row in self.rows:
            if matches(row, query):
                return dict(row)
        return None

    async def update_one(self, query, update):
        for row in self.rows:
            if matches(row, query):
                row.update(dict(update.get("$set") or {}))
                return FakeResult(matched_count=1)
        return FakeResult(matched_count=0)


class FakeDB:
    def __init__(self):
        self.collections = {
            "jobs": FakeCollection([
                {"_id": "job-1", "job_id": "job-1", "business_id": "biz-1", "owner_email": "owner@example.com", "title": "Converted quote job"},
                {"_id": "job-2", "job_id": "job-2", "business_id": "biz-2", "owner_email": "other@example.com", "title": "Other business job"},
            ]),
            "team_workers": FakeCollection([
                {"_id": "worker-1", "worker_id": "worker-1", "business_id": "biz-1", "email": "worker@example.com", "name": "Linked Worker"},
                {"_id": "worker-2", "worker_id": "worker-2", "business_id": "biz-2", "email": "other-worker@example.com", "name": "Other Worker"},
            ]),
        }

    def __getitem__(self, name):
        return self.collections.setdefault(name, FakeCollection())


class FakeApp:
    def __init__(self):
        self.http_middleware = None

    def middleware(self, kind):
        assert kind == "http"
        def decorator(func):
            self.http_middleware = func
            return func
        return decorator


class FakeRequest:
    def __init__(self, path, method, user=None, payload=None):
        self.url = SimpleNamespace(path=path)
        self.method = method
        self.user = user
        self.headers = {"origin": "https://www.churvox.com"}
        self.payload = payload or {}

    async def json(self):
        return dict(self.payload)


async def get_current_user(request):
    if not request.user:
        raise RuntimeError("not authenticated")
    return request.user


async def downstream(_request):
    return FakeJSONResponse({"source": "downstream"}, status_code=418)


def assert_true(value, message):
    if not value:
        raise AssertionError(message)


async def main():
    patch.INSTALLED.clear()
    app = FakeApp()
    db = FakeDB()
    module = SimpleNamespace(
        __name__="job_assignment_contract_module",
        app=app,
        db=db,
        get_current_user=get_current_user,
        JSONResponse=FakeJSONResponse,
        ObjectId=FakeObjectId,
    )
    patch.install(module)
    assert_true(callable(app.http_middleware), "Assignment middleware was not installed")

    owner = {"id": "owner-1", "business_id": "biz-1", "email": "owner@example.com"}
    payload = {
        "assigned_worker_id": "worker-1",
        "worker_email": "worker@example.com",
        "status": "assigned",
        "scheduled_date": "2026-07-28",
        "scheduled_time": "09:00",
        "worker_instructions": "Complete and attach proof",
    }
    patched = await app.http_middleware(FakeRequest("/api/jobs/job-1", "PATCH", owner, payload), downstream)
    assert_true(patched.status_code == 200, f"PATCH assignment failed: {patched.status_code} {patched.content}")
    assert_true(patched.content.get("success") is True, f"PATCH assignment did not report success: {patched.content}")
    stored = db["jobs"].rows[0]
    assert_true(stored.get("assigned_worker_id") == "worker-1", "Canonical worker id was not stored")
    assert_true(stored.get("worker_email") == "worker@example.com", "Worker email was not stored")
    assert_true(stored.get("status") == "assigned", "Assigned status was not stored")

    posted = await app.http_middleware(FakeRequest("/api/jobs/job-1/assign", "POST", owner, payload), downstream)
    assert_true(posted.status_code == 200, f"POST assignment failed: {posted.status_code} {posted.content}")

    outsider = {"id": "owner-2", "business_id": "biz-2", "email": "other@example.com"}
    blocked_job = await app.http_middleware(FakeRequest("/api/jobs/job-1", "PATCH", outsider, {**payload, "assigned_worker_id": "worker-2", "worker_email": "other-worker@example.com"}), downstream)
    assert_true(blocked_job.status_code == 404, f"Cross-business job assignment should be 404, got {blocked_job.status_code}")

    blocked_worker = await app.http_middleware(FakeRequest("/api/jobs/job-1", "PATCH", owner, {**payload, "assigned_worker_id": "worker-2", "worker_email": "other-worker@example.com"}), downstream)
    assert_true(blocked_worker.status_code == 404, f"Cross-business worker assignment should be 404, got {blocked_worker.status_code}")

    unauthenticated = await app.http_middleware(FakeRequest("/api/jobs/job-1", "PATCH", None, payload), downstream)
    assert_true(unauthenticated.status_code == 401, f"Unauthenticated assignment should be 401, got {unauthenticated.status_code}")

    delete_passthrough = await app.http_middleware(FakeRequest("/api/jobs/job-1", "DELETE", owner), downstream)
    assert_true(delete_passthrough.status_code == 418, "DELETE must pass through to the existing record-delete middleware")
    unrelated = await app.http_middleware(FakeRequest("/api/clients/client-1", "PATCH", owner, payload), downstream)
    assert_true(unrelated.status_code == 418, "Unrelated PATCH must pass through")

    print(json.dumps({
        "success": True,
        "contract": "business-isolated exact job assignment",
        "checks": [
            "PATCH converted job assignment",
            "POST assign alias",
            "canonical worker queue fields",
            "job business isolation",
            "worker business isolation",
            "authentication required",
            "DELETE and unrelated requests pass through",
        ],
    }, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
