# PHASE_166_FIX_LIVE_WORKFLOW_TEST_HTTPS_CLIENT
from pathlib import Path
from datetime import datetime, timezone
import json
import os
import ssl
import urllib.request
import urllib.error
import http.cookiejar

BACKEND = os.getenv("CHURVOX_BACKEND_URL", "https://grassley-backend.onrender.com").rstrip("/")
FRONTEND = os.getenv("CHURVOX_FRONTEND_URL", "https://www.churvox.com").rstrip("/")
TEST_EMAIL = os.getenv("CHURVOX_TEST_EMAIL", "hello@churvox.com")
TEST_PASSWORD = os.getenv("CHURVOX_TEST_PASSWORD", "TempPass123!")

cookie_jar = http.cookiejar.CookieJar()
context = ssl.create_default_context()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cookie_jar),
    urllib.request.HTTPSHandler(context=context),
)

token = ""

def request(method, path, body=None, auth=True, extra_headers=None, timeout=30):
    global token

    url = path if path.startswith("http") else BACKEND + path
    data = None
    headers = {
        "Accept": "application/json",
        "Origin": FRONTEND,
    }

    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if auth and token:
        headers["Authorization"] = f"Bearer {token}"

    if extra_headers:
        headers.update(extra_headers)

    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        res = opener.open(req, timeout=timeout)
        raw = res.read()
        text = raw.decode("utf-8", errors="ignore")
        parsed = None
        try:
            parsed = json.loads(text) if text else None
        except Exception:
            parsed = text[:400]
        return {
            "ok": 200 <= res.status < 300,
            "status": res.status,
            "headers": dict(res.headers.items()),
            "data": parsed,
            "text": text,
            "error": "",
        }
    except urllib.error.HTTPError as e:
        raw = e.read()
        text = raw.decode("utf-8", errors="ignore")
        parsed = None
        try:
            parsed = json.loads(text) if text else None
        except Exception:
            parsed = text[:400]
        return {
            "ok": False,
            "status": e.code,
            "headers": dict(e.headers.items()),
            "data": parsed,
            "text": text,
            "error": str(e),
        }
    except Exception as e:
        return {
            "ok": False,
            "status": 0,
            "headers": {},
            "data": None,
            "text": "",
            "error": str(e),
        }

def add_result(results, name, res, expected=None, detail=""):
    expected = expected or [200]
    ok = res["status"] in expected
    results.append({
        "name": name,
        "ok": ok,
        "status": res["status"],
        "expected": expected,
        "detail": detail or res.get("error") or short_data(res.get("data")),
    })
    return ok

def short_data(data):
    if data is None:
        return ""
    try:
        text = json.dumps(data, default=str)
    except Exception:
        text = str(data)
    return text[:500]

def extract_token(data):
    if not isinstance(data, dict):
        return ""
    for key in ["access_token", "token", "jwt"]:
        if data.get(key):
            return str(data[key])
    nested = data.get("user") or {}
    if isinstance(nested, dict):
        for key in ["access_token", "token", "jwt"]:
            if nested.get(key):
                return str(nested[key])
    return ""

def pick_id(data):
    if isinstance(data, dict):
        for key in ["id", "_id", "client_id", "job_id", "invoice_id", "quote_id"]:
            if data.get(key):
                return str(data[key])
        for value in data.values():
            found = pick_id(value)
            if found:
                return found
    if isinstance(data, list) and data:
        return pick_id(data[0])
    return ""

def main():
    global token

    results = []
    findings = []

    print("Testing frontend:", FRONTEND)
    print("Testing backend:", BACKEND)
    print("Testing login email:", TEST_EMAIL)

    # 1) Frontend reachable.
    frontend_res = request("GET", FRONTEND, auth=False)
    results.append({
        "name": "Frontend reachable",
        "ok": frontend_res["status"] == 200 and "<html" in frontend_res["text"].lower(),
        "status": frontend_res["status"],
        "expected": [200],
        "detail": "HTML loaded" if frontend_res["status"] == 200 else frontend_res["error"],
    })

    # 2) Login.
    login_payloads = [
        {"email": TEST_EMAIL, "password": TEST_PASSWORD},
        {"username": TEST_EMAIL, "password": TEST_PASSWORD},
    ]

    login_res = None
    for payload in login_payloads:
        login_res = request("POST", "/api/auth/login", payload, auth=False)
        if login_res["ok"]:
            break

    add_result(results, "Owner login /api/auth/login", login_res, [200], short_data(login_res.get("data")))

    token = extract_token(login_res.get("data"))
    if not token:
        # Cookies may still be enough.
        cookie_names = [c.name for c in cookie_jar]
        results.append({
            "name": "Auth token/cookie captured",
            "ok": bool(cookie_names),
            "status": login_res["status"],
            "expected": [200],
            "detail": "Cookies: " + ", ".join(cookie_names) if cookie_names else "No token or cookie found",
        })
    else:
        results.append({
            "name": "Auth token captured",
            "ok": True,
            "status": 200,
            "expected": [200],
            "detail": "Bearer token captured from login response",
        })

    if not login_res["ok"]:
        findings.append({
            "severity": "HIGH",
            "title": "Owner login failed",
            "detail": f"/api/auth/login returned {login_res['status']}: {short_data(login_res.get('data')) or login_res.get('error')}",
        })

    # 3) Core read endpoints.
    core_gets = [
        ("Clients list", "/api/clients", [200]),
        ("Jobs list", "/api/jobs", [200]),
        ("Quotes list", "/api/quotes", [200]),
        ("Invoices list", "/api/invoices", [200]),
        ("Team workers list", "/api/team/workers", [200]),
        ("Billing status", "/api/billing/status", [200]),
        ("AI actions", "/api/ai/actions", [200, 404]),
        ("Dispatch board", "/api/dispatch/board", [200, 404]),
        ("Owner summary", "/api/reports/owner-summary", [200, 404]),
    ]

    for name, path, expected in core_gets:
        res = request("GET", path)
        ok = add_result(results, name, res, expected, short_data(res.get("data")))

        if not ok and expected == [200]:
            findings.append({
                "severity": "HIGH",
                "title": f"{name} failed",
                "detail": f"{path} returned {res['status']}: {short_data(res.get('data')) or res.get('error')}",
            })

    # 4) Safe write/read cleanup test for client.
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    test_client = {
        "name": f"Churvox Live Test Client {stamp}",
        "email": f"live-test-{stamp}@example.com",
        "phone": "0200000000",
        "address": "1 Test Street, Wellington",
        "notes": "Created by Churvox live workflow smoke test. Safe to delete.",
    }

    create_client = request("POST", "/api/clients", test_client)
    client_ok = add_result(results, "Create test client", create_client, [200, 201], short_data(create_client.get("data")))

    client_id = pick_id(create_client.get("data"))

    if client_ok and client_id:
        read_client = request("GET", f"/api/clients/{client_id}")
        add_result(results, "Open/read test client", read_client, [200], short_data(read_client.get("data")))

        delete_client = request("DELETE", f"/api/clients/{client_id}")
        add_result(results, "Delete test client cleanup", delete_client, [200, 204], short_data(delete_client.get("data")))
    else:
        findings.append({
            "severity": "MED",
            "title": "Client create/open/delete smoke incomplete",
            "detail": f"Create returned {create_client['status']} with id={client_id}. Data: {short_data(create_client.get('data'))}",
        })

    # 5) Optional create tests for job/quote/invoice are skipped unless client succeeded;
    # avoid dirty data if the app schema needs exact fields.

    high = sum(1 for f in findings if f["severity"] == "HIGH")
    med = sum(1 for f in findings if f["severity"] == "MED")
    low = sum(1 for f in findings if f["severity"] == "LOW")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    report = []
    report.append("# Churvox Live Owner Workflow Test")
    report.append("")
    report.append(f"Generated: {now}")
    report.append("")
    report.append("## Summary")
    report.append("")
    report.append(f"- HIGH: {high}")
    report.append(f"- MED: {med}")
    report.append(f"- LOW: {low}")
    report.append(f"- Frontend: {FRONTEND}")
    report.append(f"- Backend: {BACKEND}")
    report.append("")
    report.append("## Checks")
    report.append("")
    for r in results:
        mark = "✅" if r["ok"] else "❌"
        report.append(f"- {mark} **{r['name']}** — status `{r['status']}` expected `{r['expected']}` — {r['detail']}")
    report.append("")
    report.append("## Findings")
    report.append("")
    if findings:
        for i, f in enumerate(findings, 1):
            report.append(f"### {i}. [{f['severity']}] {f['title']}")
            report.append("")
            report.append(f["detail"])
            report.append("")
    else:
        report.append("No live owner workflow blockers found in this API smoke test.")
        report.append("")
    report.append("## Notes")
    report.append("")
    report.append("- This test logs into the live backend and checks core API wiring.")
    report.append("- It creates then deletes one test client to prove basic write/open/delete.")
    report.append("- It does not send real customer email/SMS or create Stripe charges.")
    report.append("")

    out = "\n".join(report)
    Path("audits").mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_path = Path("audits") / f"churvox_live_owner_workflow_test_{stamp}.md"
    latest_path = Path("audits/churvox_live_owner_workflow_test_latest.md")
    report_path.write_text(out)
    latest_path.write_text(out)

    print(out)
    print("")
    print(f"REPORT_FILE={report_path}")
    print(f"LATEST_FILE={latest_path}")

if __name__ == "__main__":
    main()
