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

import churvox_conversion_funnel_exact_route_patch as exact


class FakeCollection:
    def __init__(self):
        self.rows = {}
        self.indexes = []

    async def create_index(self, field, **kwargs):
        self.indexes.append((field, kwargs))
        return field

    async def update_one(self, query, update, upsert=False):
        key = query["dedupe_key"]
        current = dict(self.rows.get(key) or {})
        if not current and upsert:
            current.update(update.get("$setOnInsert") or {})
        current.update(update.get("$set") or {})
        for field, value in (update.get("$inc") or {}).items():
            current[field] = int(current.get(field) or 0) + int(value)
        self.rows[key] = current
        return SimpleNamespace(matched_count=1, upserted_id=None)


class FakeDB:
    def __init__(self):
        self.platform_funnel_events = FakeCollection()


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
    def __init__(self, path, method, payload=None, user=None):
        self.url = SimpleNamespace(path=path)
        self.method = method
        self.payload = payload or {}
        self.user = user
        self.client = SimpleNamespace(host="203.0.113.25")
        self.headers = {
            "origin": "https://www.churvox.com",
            "user-agent": "Churvox contract browser",
            "referer": "https://www.churvox.com/pricing/",
        }

    async def json(self):
        return dict(self.payload)


async def get_current_user(request):
    if request.user is None:
        raise RuntimeError("signed out")
    return request.user


async def downstream(_request):
    from fastapi.responses import JSONResponse

    return JSONResponse({"source": "downstream"}, status_code=418)


def response_json(response):
    return json.loads(bytes(response.body).decode("utf-8"))


def check(condition, message):
    if not condition:
        raise AssertionError(message)


async def main():
    exact.INSTALLED.clear()
    app = FakeApp()
    db = FakeDB()
    module = SimpleNamespace(
        __name__="conversion_funnel_exact_route_contract_module",
        app=app,
        db=db,
        get_current_user=get_current_user,
    )
    exact.install(module)
    check(callable(app.http_middleware), "Exact funnel middleware was not installed")

    payload = {
        "event": "pricing_viewed",
        "visitor_id": "visitor-contract-1",
        "path": "/pricing/",
        "source": "contract",
    }
    first = await app.http_middleware(FakeRequest(exact.PATH, "POST", payload), downstream)
    first_body = response_json(first)
    check(first.status_code == 200, f"Valid POST failed: {first.status_code} {first_body}")
    check(first_body.get("recorded") is True, f"Valid POST was not recorded: {first_body}")
    check(first_body.get("source") == "churvox_conversion_funnel_exact_route", "Exact route source marker missing")
    check(first.headers.get("access-control-allow-origin") == "https://www.churvox.com", "Production CORS origin missing")
    check(len(db.platform_funnel_events.rows) == 1, "Valid event did not create one deduplicated record")

    second = await app.http_middleware(FakeRequest(exact.PATH, "POST", payload), downstream)
    check(second.status_code == 200, "Repeated event failed")
    check(len(db.platform_funnel_events.rows) == 1, "Repeated event created a duplicate actor-stage record")
    stored = next(iter(db.platform_funnel_events.rows.values()))
    check(stored.get("event_count") == 2, "Repeated event did not increment event_count")

    auxiliary_payload = {
        "event": "demo_cta_clicked",
        "visitor_id": "visitor-contract-2",
        "path": "/",
        "label": "View demo",
        "href": "/demo",
        "campaign": "contract-campaign",
    }
    auxiliary = await app.http_middleware(FakeRequest(exact.PATH, "POST", auxiliary_payload), downstream)
    auxiliary_body = response_json(auxiliary)
    check(auxiliary.status_code == 200, f"Supported interaction failed: {auxiliary.status_code} {auxiliary_body}")
    auxiliary_row = next(row for row in db.platform_funnel_events.rows.values() if row.get("event") == "demo_cta_clicked")
    check(auxiliary_row.get("label") == "View demo", "Interaction label was not retained")
    check(auxiliary_row.get("campaign") == "contract-campaign", "Campaign context was not retained")

    activation_payload = {
        "event": "activation_client_present",
        "visitor_id": "visitor-contract-3",
        "path": "/dashboard#clients",
        "record_type": "client",
        "count": 4,
    }
    activation = await app.http_middleware(FakeRequest(exact.PATH, "POST", activation_payload), downstream)
    activation_body = response_json(activation)
    check(activation.status_code == 200, f"Activation alias failed: {activation.status_code} {activation_body}")
    check(activation_body.get("event") == "first_client_created", "Client activation was not normalised")
    check(activation_body.get("original_event") == "activation_client_present", "Activation source name was not retained")
    activation_row = next(row for row in db.platform_funnel_events.rows.values() if row.get("event") == "first_client_created")
    check(activation_row.get("count") == 4, "Activation record count was not retained")

    options = await app.http_middleware(FakeRequest(exact.PATH, "OPTIONS"), downstream)
    check(options.status_code == 200, "OPTIONS preflight was not handled")
    check("POST" in options.headers.get("access-control-allow-methods", ""), "POST was missing from CORS methods")

    invalid = await app.http_middleware(FakeRequest(exact.PATH, "POST", {"event": "made_up_event"}), downstream)
    check(invalid.status_code == 400, "Unsupported event should return 400")

    owner = {"email": "hello@churvox.com", "role": "platform_owner"}
    internal = await app.http_middleware(FakeRequest(exact.PATH, "POST", payload, owner), downstream)
    internal_body = response_json(internal)
    check(internal.status_code == 200 and internal_body.get("recorded") is False, "Platform-owner traffic was not excluded")

    get_response = await app.http_middleware(FakeRequest(exact.PATH, "GET"), downstream)
    check(get_response.status_code == 418, "Non-POST funnel method must pass through")
    unrelated = await app.http_middleware(FakeRequest("/api/clients", "POST", payload), downstream)
    check(unrelated.status_code == 418, "Unrelated request must pass through")

    print(json.dumps({
        "success": True,
        "contract": "exact public conversion funnel route",
        "checks": [
            "POST bypasses router collisions",
            "production CORS",
            "deduplicated stage actors",
            "repeat count",
            "supporting interaction events",
            "activation aliases",
            "safe event context",
            "OPTIONS preflight",
            "event allowlist",
            "platform owner exclusion",
            "unrelated pass-through",
        ],
    }, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
