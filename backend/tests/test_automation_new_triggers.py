"""
Smoke tests for Churvox Automation Engine — NEW triggers wired in this session.
Run with: python3 /app/backend/tests/test_automation_new_triggers.py
"""
import os, sys, json, time, urllib.request, urllib.error

API = os.environ.get("API", "http://localhost:8001")
EMAIL = os.environ.get("EMAIL", "launchtest@churvox.com")
PASSWORD = os.environ.get("PASSWORD", "Launch2025!")


def req(method, path, token=None, body=None):
    url = API + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, method=method, headers=headers, data=data)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def login():
    code, body = req("POST", "/api/auth/login", body={"email": EMAIL, "password": PASSWORD})
    assert code == 200, f"login failed {code} {body}"
    return body.get("token") or body.get("access_token")


def assert_ok(code, body, label):
    assert 200 <= code < 300, f"{label} failed status={code} body={body}"


def main():
    tok = login()
    # ---- new endpoints smoke ----
    code, body = req("GET", "/api/automation/templates", token=tok)
    assert_ok(code, body, "templates")
    assert len(body) >= 6, f"expected 6 templates, got {len(body)}"

    code, body = req("GET", "/api/automation/triggers/quote_accepted/schema", token=tok)
    assert_ok(code, body, "trigger schema")
    assert "quote.id" in body.get("paths", [])

    code, body = req("POST", "/api/jobs/generate-recurring", token=tok)
    assert_ok(code, body, "generate-recurring")

    code, body = req("POST", "/api/payroll/timesheets", token=tok,
                     body={"worker_id": "w-auto", "hours": 10, "week_of": "2026-04-21"})
    assert_ok(code, body, "timesheets")

    code, body = req("POST", "/api/payroll/status", token=tok,
                     body={"period": "2026-04", "status": "paid"})
    assert_ok(code, body, "payroll status")

    # ---- create rule on timesheet_updated, then hit the stub again, verify run ----
    rule_payload = {
        "name": "Test: timesheet over 8h",
        "trigger": "timesheet_updated",
        "enabled": True,
        "condition_mode": "all",
        "conditions": [{"path": "timesheet.hours", "op": "gte", "value": 5}],
        "actions": [{"type": "log", "config": {"message": "hours={{timesheet.hours}}"}}],
    }
    code, rule = req("POST", "/api/automation/rules", token=tok, body=rule_payload)
    assert_ok(code, rule, "create rule")
    rid = rule["id"]
    try:
        # Fire the trigger by hitting the stub
        code, body = req("POST", "/api/payroll/timesheets", token=tok,
                         body={"worker_id": "w-auto", "hours": 9, "week_of": "2026-04-28"})
        assert_ok(code, body, "timesheet trigger fire")
        # Allow engine to flush
        time.sleep(0.4)
        code, runs = req("GET", "/api/automation/runs?limit=20&status=completed", token=tok)
        assert_ok(code, runs, "runs list")
        matches = [r for r in runs if r.get("rule_id") == rid and r.get("trigger") == "timesheet_updated"]
        assert matches, f"expected a run for rule {rid}, got: {[(r.get('trigger'), r.get('status')) for r in runs[:5]]}"
        # retry run test
        last_run_id = matches[0]["id"]
        code, body = req("POST", f"/api/automation/runs/{last_run_id}/retry", token=tok)
        assert_ok(code, body, "run retry")
        assert body["run"]["status"] == "completed"

        # Rule list should now include last_run_status + runs_count
        code, rules = req("GET", "/api/automation/rules", token=tok)
        assert_ok(code, rules, "rules list post-run")
        this_rule = next((r for r in rules if r["id"] == rid), None)
        assert this_rule and this_rule.get("runs_count", 0) >= 1, f"stats missing: {this_rule}"
        assert this_rule.get("last_run_status") == "completed"
    finally:
        req("DELETE", f"/api/automation/rules/{rid}", token=tok)

    print("ALL_OK")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print("FAIL:", e)
        sys.exit(1)
