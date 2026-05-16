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
EMAIL = os.getenv("CHURVOX_TEST_EMAIL", "hello@churvox.com")
PASSWORD = os.getenv("CHURVOX_TEST_PASSWORD", "TempPass123!")

context = ssl.create_default_context()
cookies = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cookies),
    urllib.request.HTTPSHandler(context=context),
)

token = ""

ROUTES = [
    ("GET", "/api/ai/follow-ups"),
    ("GET", "/api/ai/customer-updates"),
    ("GET", "/api/ai-messages"),
    ("GET", "/api/ai/quotes/drafts"),
]

POST_ROUTES_TO_PROBE_WITH_GET = [
    "/api/ai/follow-ups/generate",
    "/api/ai/customer-updates/prepare-for-job/test-job-id",
    "/api/ai/customer-updates/test-update-id/approve",
    "/api/ai/customer-updates/test-update-id/skip",
    "/api/ai-messages/prepare",
    "/api/ai-messages/test-message-id/send",
    "/api/ai/quotes/from-photos",
    "/api/ai/quotes/drafts/test-draft-id/approve",
    "/api/ai/quotes/drafts/test-draft-id/convert-to-quote",
    "/api/ai/quotes/drafts/test-draft-id/dismiss",
    "/api/ai/client-memory/test-client-id/refresh",
]

def req(method, path, body=None, auth=True):
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

    request = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        response = opener.open(request, timeout=25)
        raw = response.read()
        text = raw.decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(text) if text else None
        except Exception:
            parsed = text[:500]
        return {"status": response.status, "ok": 200 <= response.status < 300, "data": parsed, "text": text, "error": ""}
    except urllib.error.HTTPError as e:
        raw = e.read()
        text = raw.decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(text) if text else None
        except Exception:
            parsed = text[:500]
        return {"status": e.code, "ok": False, "data": parsed, "text": text, "error": str(e)}
    except Exception as e:
        return {"status": 0, "ok": False, "data": None, "text": "", "error": str(e)}

def short(data):
    if data is None:
        return ""
    try:
        return json.dumps(data, default=str)[:700]
    except Exception:
        return str(data)[:700]

def extract_token(data):
    if not isinstance(data, dict):
        return ""
    for key in ["token", "access_token", "jwt"]:
        if data.get(key):
            return str(data[key])
    user = data.get("user")
    if isinstance(user, dict):
        for key in ["token", "access_token", "jwt"]:
            if user.get(key):
                return str(user[key])
    return ""

def add(results, name, status, ok, detail):
    results.append({"name": name, "status": status, "ok": bool(ok), "detail": detail})

def main():
    global token

    results = []
    findings = []

    login = req("POST", "/api/auth/login", {"email": EMAIL, "password": PASSWORD}, auth=False)
    if login.status if False else False:
        pass

    if login["status"] != 200:
        login = req("POST", "/api/auth/login", {"username": EMAIL, "password": PASSWORD}, auth=False)

    token = extract_token(login.get("data"))
    add(results, "Owner login", login["status"], login["status"] == 200 and bool(token), short(login.get("data")))

    if login["status"] != 200 or not token:
        findings.append({
            "severity": "HIGH",
            "title": "Owner login failed",
            "detail": f"Cannot verify live AI routes because login returned {login['status']}: {short(login.get('data')) or login.get('error')}",
        })
    else:
        for method, path in ROUTES:
            res = req(method, path)
            ok = res["status"] in [200, 204]
            add(results, f"{method} {path}", res["status"], ok, short(res.get("data")) or res.get("error"))

            if not ok:
                findings.append({
                    "severity": "HIGH",
                    "title": f"Live route failed: {method} {path}",
                    "detail": f"Expected 200/204, got {res['status']}: {short(res.get('data')) or res.get('error')}",
                })

        # For POST-only routes, use GET as a safe existence probe.
        # Existing POST-only routes usually return 405 Method Not Allowed.
        # Missing routes usually return 404.
        for path in POST_ROUTES_TO_PROBE_WITH_GET:
            res = req("GET", path)
            ok = res["status"] in [405, 422, 401, 403]
            add(results, f"Safe existence probe GET {path}", res["status"], ok, short(res.get("data")) or res.get("error"))

            if res["status"] == 404:
                findings.append({
                    "severity": "HIGH",
                    "title": f"POST route appears missing live: {path}",
                    "detail": f"Safe GET probe returned 404, likely route missing or Render not deployed latest backend.",
                })

    high = sum(1 for f in findings if f["severity"] == "HIGH")
    med = sum(1 for f in findings if f["severity"] == "MED")
    low = sum(1 for f in findings if f["severity"] == "LOW")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    out = []
    out.append("# Churvox Live AI Route Prefix Check")
    out.append("")
    out.append(f"Generated: {now}")
    out.append("")
    out.append("## Summary")
    out.append("")
    out.append(f"- HIGH: {high}")
    out.append(f"- MED: {med}")
    out.append(f"- LOW: {low}")
    out.append(f"- Backend: {BACKEND}")
    out.append("")
    out.append("## Checks")
    out.append("")
    for r in results:
        mark = "✅" if r["ok"] else "❌"
        out.append(f"- {mark} **{r['name']}** — status `{r['status']}` — {r['detail']}")
    out.append("")
    out.append("## Findings")
    out.append("")
    if findings:
        for i, f in enumerate(findings, 1):
            out.append(f"### {i}. [{f['severity']}] {f['title']}")
            out.append("")
            out.append(f["detail"])
            out.append("")
    else:
        out.append("No live AI route prefix blockers found.")
        out.append("")
    out.append("## Notes")
    out.append("")
    out.append("- GET routes are tested directly.")
    out.append("- POST-only routes are probed safely with GET. A 405/422/401/403 means the path exists; 404 means likely missing.")
    out.append("- This does not approve/send AI messages, customer updates, quotes, follow-ups, SMS, MYOB, or Stripe actions.")
    out.append("")

    report = "\n".join(out)
    Path("audits").mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    latest = Path("audits/churvox_live_ai_route_prefix_check_latest.md")
    stamped = Path("audits") / f"churvox_live_ai_route_prefix_check_{stamp}.md"
    latest.write_text(report)
    stamped.write_text(report)

    print(report)
    print("")
    print(f"LATEST_FILE={latest}")
    print(f"REPORT_FILE={stamped}")

if __name__ == "__main__":
    main()
