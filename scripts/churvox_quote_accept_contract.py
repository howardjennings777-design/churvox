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

import churvox_records_exact_bypass_patch as patch


class FakeJSONResponse:
    def __init__(self, content, status_code=200):
        self.content = content
        self.status_code = status_code
        self.headers = {}


class FakeResult:
    def __init__(self, matched_count=0, deleted_count=0):
        self.matched_count = matched_count
        self.deleted_count = deleted_count


def nested_value(doc, path):
    current = doc
    for part in str(path).split("."):
        if not isinstance(current, dict) or part not in current:
            return None, False
        current = current[part]
    return current, True


def matches_value(actual, exists, expected):
    if isinstance(expected, dict):
        if "$exists" in expected:
            return exists is bool(expected["$exists"])
        if "$in" in expected:
            return actual in expected["$in"]
    return exists and actual == expected


def matches(doc, query):
    if not query:
        return True
    if "$and" in query:
        return all(matches(doc, clause) for clause in query["$and"])
    if "$or" in query:
        return any(matches(doc, clause) for clause in query["$or"])
    for key, expected in query.items():
        actual, exists = nested_value(doc, key)
        if not matches_value(actual, exists, expected):
            return False
    return True


class FakeCollection:
    def __init__(self, records=None):
        self.records = [dict(record) for record in (records or [])]

    async def find_one(self, query):
        for record in self.records:
            if matches(record, query):
                return dict(record)
        return None

    async def update_one(self, query, update):
        for record in self.records:
            if matches(record, query):
                record.update(dict(update.get("$set") or {}))
                return FakeResult(matched_count=1)
        return FakeResult(matched_count=0)

    async def delete_one(self, query):
        for index, record in enumerate(self.records):
            if matches(record, query):
                self.records.pop(index)
                return FakeResult(deleted_count=1)
        return FakeResult(deleted_count=0)

    async def insert_one(self, document):
        row = dict(document)
        row.setdefault("_id", f"created-{len(self.records) + 1}")
        self.records.append(row)
        return SimpleNamespace(inserted_id=row["_id"])


class FakeDB:
    def __init__(self):
        self.collections = {
            "quotes": FakeCollection([
                {
                    "_id": "quote-1",
                    "quote_id": "quote-1",
                    "business_id": "biz-1",
                    "title": "Garden service quote",
                    "status": "Draft",
                }
            ]),
            "quote_records": FakeCollection(),
            "message_replies": FakeCollection(),
        }

    def __getitem__(self, name):
        return self.collections.setdefault(name, FakeCollection())

    def __getattr__(self, name):
        return self.__getitem__(name)


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
    def __init__(self, path, method="POST", user=None, payload=None):
        self.url = SimpleNamespace(path=path)
        self.method = method
        self.user = user
        self.headers = {"origin": "https://www.churvox.com"}
        self._payload = payload or {}

    async def json(self):
        return dict(self._payload)


async def get_current_user(request):
    if not request.user:
        raise RuntimeError("not authenticated")
    return request.user


async def downstream(_request):
    return FakeJSONResponse({"source": "downstream"}, status_code=418)


def assert_true(condition, message):
    if not condition:
        raise AssertionError(message)


async def main():
    patch.INSTALLED.clear()
    app = FakeApp()
    db = FakeDB()
    module = SimpleNamespace(
        __name__="quote_accept_contract_module",
        app=app,
        db=db,
        get_current_user=get_current_user,
        JSONResponse=FakeJSONResponse,
    )
    patch.install(module)
    assert_true(callable(app.http_middleware), "Quote acceptance middleware was not installed")

    owner = {"id": "owner-1", "business_id": "biz-1", "email": "howardjennings777@gmail.com"}
    accepted = await app.http_middleware(
        FakeRequest("/api/quotes/quote-1/accept", user=owner, payload={"owner_approved": True, "note": "Customer confirmed by phone"}),
        downstream,
    )
    assert_true(accepted.status_code == 200, f"Expected 200, got {accepted.status_code}: {accepted.content}")
    assert_true(accepted.content.get("success") is True, f"Acceptance did not report success: {accepted.content}")
    stored = db.quotes.records[0]
    assert_true(stored.get("status") == "Accepted", f"Stored quote status is {stored.get('status')!r}")
    assert_true(stored.get("accepted_by_owner") is True, "Owner acceptance truth was not stored")
    assert_true(stored.get("owner_approved") is True, "Explicit owner approval was not stored")
    assert_true(stored.get("acceptance_note") == "Customer confirmed by phone", "Acceptance note was not stored")

    stored["status"] = "Draft"
    outsider = {"id": "owner-2", "business_id": "biz-2", "email": "other@example.com"}
    blocked = await app.http_middleware(FakeRequest("/api/quotes/quote-1/accept", user=outsider), downstream)
    assert_true(blocked.status_code == 404, f"Cross-business acceptance should be 404, got {blocked.status_code}")
    assert_true(stored.get("status") == "Draft", "Cross-business request changed the quote")

    unauthenticated = await app.http_middleware(FakeRequest("/api/quotes/quote-1/accept"), downstream)
    assert_true(unauthenticated.status_code == 401, f"Unauthenticated request should be 401, got {unauthenticated.status_code}")

    wrong_method = await app.http_middleware(FakeRequest("/api/quotes/quote-1/accept", method="GET", user=owner), downstream)
    assert_true(wrong_method.status_code == 405, f"Wrong method should be 405, got {wrong_method.status_code}")

    passthrough = await app.http_middleware(FakeRequest("/api/unrelated", method="GET", user=owner), downstream)
    assert_true(passthrough.status_code == 418, "Unrelated requests should pass through")

    print(json.dumps({
        "success": True,
        "contract": "authenticated owner quote acceptance",
        "checks": [
            "registered middleware path",
            "owner acceptance persisted",
            "business isolation",
            "authentication required",
            "POST required",
            "unrelated requests pass through",
        ],
    }, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
