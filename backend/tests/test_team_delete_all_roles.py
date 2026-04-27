"""
Verifies the fix for "Worker not found" on Team delete.

Before fix: DELETE /api/team/workers/{id} only matched role=worker, so deleting
a manager / office_admin / payroll team member failed with 404.

After fix: delete must succeed for every role the GET /api/team/workers list
returns, with strict business isolation preserved.

Run: python3 /app/backend/tests/test_team_delete_all_roles.py
"""
import os, json, time, urllib.request, urllib.error, sys

API = os.environ.get("API", "http://localhost:8001")


def req(method, path, token=None, body=None):
    url = API + path
    h = {"Content-Type": "application/json"}
    if token: h["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, method=method, headers=h, data=data)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def main():
    code, body = req("POST", "/api/auth/login", body={"email": "launchtest@churvox.com", "password": "Launch2025!"})
    assert code == 200, f"login failed {code} {body}"
    tok = body["token"]

    created_ids = []
    roles = ["worker", "manager", "office_admin", "payroll"]
    suffix = int(time.time())
    for role in roles:
        email = f"e2e_{role}_{suffix}@churvox.com"
        code, res = req("POST", "/api/team/workers", token=tok, body={
            "name": f"E2E {role}",
            "email": email,
            "phone": "",
            "country": "New Zealand",
            "region": "Auckland",
            "role": role,
        })
        assert 200 <= code < 300, f"create {role} failed {code} {res}"
        wid = (res.get("worker") or {}).get("id") or res.get("id")
        assert wid, f"no id in create response: {res}"
        created_ids.append((role, wid))
        print(f"[ok] created {role} id={wid}")

    # Confirm the GET list returns all 4
    code, workers = req("GET", "/api/team/workers", token=tok)
    assert 200 <= code < 300, f"GET workers failed {code} {workers}"
    by_id = {w.get("id"): w for w in workers}
    for role, wid in created_ids:
        assert wid in by_id, f"{role} worker {wid} not in GET response"
    print(f"[ok] GET /team/workers lists all 4 created team members")

    # Delete each — was previously broken for non-worker roles
    for role, wid in created_ids:
        code, res = req("DELETE", f"/api/team/workers/{wid}", token=tok)
        assert code == 200, f"DELETE {role} {wid} failed {code} {res}"
        assert res.get("success"), f"delete {role} returned no success flag: {res}"
        print(f"[ok] deleted {role} id={wid} → message='{res.get('message')}'")

    # Verify they're gone
    code, workers_after = req("GET", "/api/team/workers", token=tok)
    remaining_ids = {w.get("id") for w in workers_after}
    for role, wid in created_ids:
        assert wid not in remaining_ids, f"{role} {wid} still present after delete"
    print(f"[ok] all 4 removed from GET response")

    # Second delete of already-removed ID should 404 (not crash)
    for role, wid in created_ids:
        code, res = req("DELETE", f"/api/team/workers/{wid}", token=tok)
        assert code == 404, f"deleting gone {role} should be 404, got {code} {res}"

    # Non-ObjectId id path should also 404 cleanly (no 500)
    code, res = req("DELETE", "/api/team/workers/definitely-not-an-id", token=tok)
    assert code == 404, f"non-objectid should 404, got {code} {res}"
    print(f"[ok] missing/invalid IDs return 404 cleanly")

    print("\nTEAM_DELETE_ALL_ROLES_OK — delete works for worker/manager/office_admin/payroll")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print("FAIL:", e)
        sys.exit(1)
    except Exception as e:
        import traceback; traceback.print_exc()
        sys.exit(2)
