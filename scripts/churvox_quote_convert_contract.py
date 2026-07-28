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

import churvox_quote_convert_exact_patch as patch


class FakeObjectId:
    @staticmethod
    def is_valid(_value):
        return False

    def __new__(cls, value):
        return str(value)


class FakeJSONResponse:
    def __init__(self, content, status_code=200):
        self.content = content
        self.status_code = status_code
        self.headers = {}


class FakeResult:
    def __init__(self, matched_count=0, deleted_count=0, inserted_id=None):
        self.matched_count = matched_count
        self.deleted_count = deleted_count
        self.inserted_id = inserted_id


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
    return all(matches_value(*nested_value(doc, key), expected) for key, expected in query.items())


class FakeCollection:
    def __init__(self, records=None):
        self.records = [dict(record) for record in (records or [])]
        self.fail_update = False

    async def find_one(self, query):
        for record in self.records:
            if matches(record, query):
                return dict(record)
        return None

    async def update_one(self, query, update):
        if self.fail_update:
            raise RuntimeError("forced update failure")
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
        return FakeResult(inserted_id=row["_id"])


class FakeDB:
    def __init__(self):
        self.collections = {
            "quotes": FakeCollection([
                {
                    "_id": "quote-1",
                    "quote_id": "quote-1",
                    "business_id": "biz-1",
                    "user_id": "owner-1",
                    "title": "Garden service quote",
                    "client_name": "Aroha Client",
                    "customer_email": "aroha@example.nz",
                    "address": "1 Test Street",
                    "scope": "Trim hedge and remove green waste",
                    "amount": 230,
                    "status": "Accepted",
                },
                {
                    "_id": "quote-draft",
                    "quote_id": "quote-draft",
                    "business_id": "biz-1",
                    "user_id": "owner-1",
                    "title": "Draft quote",
                    "status": "Draft",
                },
                {
                    "_id": "quote-rollback",
                    "quote_id": "quote-rollback",
                    "business_id": "biz-1",
                    "user_id": "owner-1",
                    "title": "Rollback quote",
                    "status": "Accepted",
                },
            ]),
            "quote_records": FakeCollection(),
            "jobs": FakeCollection(),
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
    def __init__(self, path, method="POST", user=None):
        self.url = SimpleNamespace(path=path)
        self.method = method
        self.user = user
        self.headers = {"origin": "https://www.churvox.com"}


async def get_current_user(request):
    if not request.user:
        raise RuntimeError("not authenticated")
    return request.user


async def downstream(_request):
    return FakeJSONResponse({"source": "downstream"}, status_code=418)


def check(condition, message):
    if not condition:
        raise AssertionError(message)


async def main():
    patch.INSTALLED.clear()
    app = FakeApp()
    db = FakeDB()
    module = SimpleNamespace(
        __name__="quote_convert_contract_module",
        app=app,
        db=db,
        get_current_user=get_current_user,
        ObjectId=FakeObjectId,
        JSONResponse=FakeJSONResponse,
    )
    patch.install(module)
    check(callable(app.http_middleware), "Quote conversion middleware was not installed")

    owner = {"id": "owner-1", "business_id": "biz-1", "email": "howardjennings777@gmail.com"}
    outsider = {"id": "owner-2", "business_id": "biz-2", "email": "other@example.nz"}

    converted = await app.http_middleware(FakeRequest("/api/quotes/quote-1/convert-to-job", user=owner), downstream)
    check(converted.status_code == 200, f"Expected 200, got {converted.status_code}: {converted.content}")
    check(converted.content.get("success") is True, f"Conversion did not report success: {converted.content}")
    check(converted.content.get("idempotent") is False, "First conversion should create a job")
    check(len(db.jobs.records) == 1, f"Expected one job, found {len(db.jobs.records)}")
    job = db.jobs.records[0]
    quote = next(row for row in db.quotes.records if row.get("quote_id") == "quote-1")
    check(job.get("business_id") == "biz-1", "Converted job lost business ownership")
    check(job.get("source_quote_id") == "quote-1", "Converted job lost quote linkage")
    check(job.get("client_name") == "Aroha Client", "Converted job lost client")
    check(job.get("price") == 230, "Converted job lost quote amount")
    check(job.get("status") == "assigned", "Converted job did not start Assigned")
    check(quote.get("status") == "Converted", "Quote was not marked Converted")
    check(quote.get("converted_job_id") == job.get("_id"), "Quote was not linked to the job")

    repeated = await app.http_middleware(FakeRequest("/api/quotes/quote-1/convert", user=owner), downstream)
    check(repeated.status_code == 200, f"Repeat conversion failed: {repeated.status_code}")
    check(repeated.content.get("idempotent") is True, "Repeat conversion was not idempotent")
    check(len(db.jobs.records) == 1, "Repeat conversion created a duplicate job")

    blocked = await app.http_middleware(FakeRequest("/api/quotes/quote-1/convert-to-job", user=outsider), downstream)
    check(blocked.status_code == 404, f"Cross-business conversion should be 404, got {blocked.status_code}")
    check(len(db.jobs.records) == 1, "Cross-business request created a job")

    unauthenticated = await app.http_middleware(FakeRequest("/api/quotes/quote-1/convert-to-job"), downstream)
    check(unauthenticated.status_code == 401, f"Unauthenticated request should be 401, got {unauthenticated.status_code}")

    wrong_method = await app.http_middleware(FakeRequest("/api/quotes/quote-1/convert-to-job", method="GET", user=owner), downstream)
    check(wrong_method.status_code == 405, f"Wrong method should be 405, got {wrong_method.status_code}")

    draft = await app.http_middleware(FakeRequest("/api/quotes/quote-draft/convert-to-job", user=owner), downstream)
    check(draft.status_code == 409, f"Unaccepted quote should be 409, got {draft.status_code}")
    check(len(db.jobs.records) == 1, "Unaccepted quote created a job")

    db.quotes.fail_update = True
    rollback = await app.http_middleware(FakeRequest("/api/quotes/quote-rollback/convert-to-job", user=owner), downstream)
    check(rollback.status_code == 500, f"Broken quote update should be 500, got {rollback.status_code}")
    check(len(db.jobs.records) == 1, "Failed quote update left an orphan job")
    db.quotes.fail_update = False

    passthrough = await app.http_middleware(FakeRequest("/api/unrelated", method="GET", user=owner), downstream)
    check(passthrough.status_code == 418, "Unrelated requests should pass through")

    print(json.dumps({
        "success": True,
        "contract": "owner quote to job conversion",
        "checks": [
            "accepted quote creates one linked assigned job",
            "quote marked converted",
            "repeat conversion is idempotent",
            "business isolation",
            "authentication required",
            "POST required",
            "accepted quote required",
            "failed quote update rolls back job",
            "unrelated requests pass through",
        ],
    }, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
