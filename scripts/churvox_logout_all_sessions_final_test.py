from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
for path in (str(ROOT), str(BACKEND)):
    if path not in sys.path:
        sys.path.insert(0, path)

import churvox_logout_all_sessions_final_patch as patch


class FakeRequest:
    def __init__(self, user):
        self.user = user


class FakeUsers:
    def __init__(self):
        self.calls = []

    async def update_one(self, query, update):
        self.calls.append((query, update))
        return SimpleNamespace(matched_count=1)


class FakeDB:
    def __init__(self):
        self.users = FakeUsers()


class FakeObjectId(str):
    pass


def route(app, path, method):
    matches = [item for item in app.router.routes if getattr(item, "path", "") == path and method in set(getattr(item, "methods", set()) or set())]
    assert len(matches) == 1, (path, method, len(matches))
    return matches[0].endpoint


async def main():
    app = FastAPI()
    db = FakeDB()
    cookie_calls = []

    async def current_user(request):
        return request.user

    def clear_cookies(response):
        cookie_calls.append(response)
        response.headers["x-test-cookies-cleared"] = "true"

    module = SimpleNamespace(
        app=app,
        db=db,
        get_current_user=current_user,
        ObjectId=FakeObjectId,
        clear_auth_cookies=clear_cookies,
    )
    assert patch.install(module, force=True) is True

    endpoint = route(app, "/api/auth/logout-all", "POST")
    response = await endpoint(FakeRequest({"id": "owner-1", "role": "employer"}))
    assert response.status_code == 200
    payload = json.loads(response.body)
    assert payload["success"] is True
    assert payload["sessions_revoked"] is True
    assert "Sign in again" in payload["message"]
    assert response.headers["x-test-cookies-cleared"] == "true"
    assert len(cookie_calls) == 1

    assert len(db.users.calls) == 1
    query, update = db.users.calls[0]
    assert query == {"_id": FakeObjectId("owner-1")}
    fields = update["$set"]
    assert fields["session_invalid_before"] < fields["sessions_revoked_at"]
    delta = fields["sessions_revoked_at"] - fields["session_invalid_before"]
    assert 0.9 <= delta.total_seconds() <= 1.1
    assert "password_hash" not in fields

    readiness_endpoint = route(app, "/api/auth/logout-all-readiness", "GET")
    readiness = await readiness_endpoint()
    assert readiness["success"] is True
    assert readiness["ready"] is True
    assert readiness["route_owners"] == ["POST:logout_all_sessions"]

    print("LOGOUT_ALL_SESSIONS_FINAL_BEHAVIOR_PASS")


if __name__ == "__main__":
    asyncio.run(main())
