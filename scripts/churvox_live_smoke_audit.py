from pathlib import Path
from datetime import datetime, timezone
import json
import re
import ssl
import urllib.request
import urllib.error

FRONTEND = "https://www.churvox.com"
BACKEND = "https://grassley-backend.onrender.com"
ORIGIN = "https://www.churvox.com"

TEST_ENDPOINTS = [
    "/api/jobs",
    "/api/clients",
    "/api/invoices",
    "/api/quotes",
    "/api/team/workers",
    "/api/reports/owner-summary",
    "/api/ai/actions",
    "/api/dispatch/board",
]

EXPECTED_JS_MARKERS = [
    "PHASE_147_PROFESSIONAL_INVOICE_OVERLAY",
    "PHASE_146_FORCE_EXACT_OLD_INVOICE_READY_MODAL",
]

context = ssl.create_default_context()

def fetch(url, method="GET", headers=None, timeout=25):
    headers = headers or {}
    req = urllib.request.Request(url, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=context) as res:
            body = res.read()
            return {
                "ok": True,
                "status": res.status,
                "headers": dict(res.headers.items()),
                "body": body,
                "error": "",
            }
    except urllib.error.HTTPError as e:
        try:
            body = e.read()
        except Exception:
            body = b""
        return {
            "ok": False,
            "status": e.code,
            "headers": dict(e.headers.items()),
            "body": body,
            "error": str(e),
        }
    except Exception as e:
        return {
            "ok": False,
            "status": 0,
            "headers": {},
            "body": b"",
            "error": str(e),
        }

def header(headers, name):
    for k, v in headers.items():
        if k.lower() == name.lower():
            return v
    return ""

def add(findings, severity, title, detail):
    findings.append({
        "severity": severity,
        "title": title,
        "detail": detail,
    })

def main():
    findings = []
    checks = []

    html_res = fetch(FRONTEND)
    html = html_res["body"].decode("utf-8", errors="ignore") if html_res["body"] else ""

    checks.append({
        "name": "Frontend HTML",
        "status": html_res["status"],
        "ok": html_res["status"] == 200 and "<html" in html.lower(),
        "detail": html_res["error"] or "HTML fetched",
    })

    if html_res["status"] != 200:
        add(findings, "HIGH", "Frontend did not return 200", f"Status {html_res['status']} error {html_res['error']}")

    css_match = re.search(r'/static/css/main\.[^"]+\.css', html)
    js_match = re.search(r'/static/js/main\.[^"]+\.js', html)

    css_path = css_match.group(0) if css_match else ""
    js_path = js_match.group(0) if js_match else ""

    checks.append({"name": "Live CSS path", "status": 0, "ok": bool(css_path), "detail": css_path or "Missing CSS path"})
    checks.append({"name": "Live JS path", "status": 0, "ok": bool(js_path), "detail": js_path or "Missing JS path"})

    if not css_path:
        add(findings, "HIGH", "Live HTML missing CSS bundle", "Could not find /static/css/main.*.css")
    if not js_path:
        add(findings, "HIGH", "Live HTML missing JS bundle", "Could not find /static/js/main.*.js")

    if css_path:
        css_res = fetch(FRONTEND + css_path, method="HEAD")
        content_type = header(css_res["headers"], "content-type")
        checks.append({
            "name": "CSS MIME",
            "status": css_res["status"],
            "ok": css_res["status"] == 200 and "text/css" in content_type.lower(),
            "detail": f"Content-Type: {content_type}",
        })
        if css_res["status"] != 200 or "text/css" not in content_type.lower():
            add(findings, "HIGH", "CSS MIME is wrong", f"{css_path} returned status {css_res['status']} Content-Type {content_type}")

    if js_path:
        js_res = fetch(FRONTEND + js_path)
        js_text = js_res["body"].decode("utf-8", errors="ignore") if js_res["body"] else ""
        js_type = header(js_res["headers"], "content-type")
        checks.append({
            "name": "JS MIME",
            "status": js_res["status"],
            "ok": js_res["status"] == 200 and ("javascript" in js_type.lower() or "text/javascript" in js_type.lower()),
            "detail": f"Content-Type: {js_type}",
        })

        for marker in EXPECTED_JS_MARKERS:
            present = marker in js_text
            checks.append({
                "name": f"JS marker {marker}",
                "status": js_res["status"],
                "ok": present,
                "detail": "Present" if present else "Missing",
            })
            if not present:
                add(findings, "MED", f"Live JS missing {marker}", "Render may be serving older bundle or marker was removed.")

    # Backend CORS preflight checks.
    for endpoint in TEST_ENDPOINTS:
        url = BACKEND + endpoint
        res = fetch(
            url,
            method="OPTIONS",
            headers={
                "Origin": ORIGIN,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        allow_origin = header(res["headers"], "access-control-allow-origin")
        allow_credentials = header(res["headers"], "access-control-allow-credentials")
        ok = res["status"] in (200, 204) and allow_origin == ORIGIN and allow_credentials.lower() == "true"
        checks.append({
            "name": f"CORS OPTIONS {endpoint}",
            "status": res["status"],
            "ok": ok,
            "detail": f"allow-origin={allow_origin or 'missing'} allow-credentials={allow_credentials or 'missing'}",
        })
        if not ok:
            add(findings, "HIGH", f"CORS preflight failed for {endpoint}", f"Status {res['status']} origin={allow_origin} credentials={allow_credentials}")

    # Auth-protected GET checks should normally be 401/403/200, but must not fail network/CORS.
    for endpoint in TEST_ENDPOINTS:
        url = BACKEND + endpoint
        res = fetch(url, headers={"Origin": ORIGIN})
        allow_origin = header(res["headers"], "access-control-allow-origin")
        acceptable = res["status"] in (200, 401, 403, 404)
        has_cors = allow_origin in (ORIGIN, "*", "")
        ok = acceptable and has_cors
        checks.append({
            "name": f"Backend GET {endpoint}",
            "status": res["status"],
            "ok": ok,
            "detail": f"origin={allow_origin or 'none'} error={res['error'] or 'none'}",
        })
        if not acceptable:
            add(findings, "HIGH", f"Backend endpoint failed hard {endpoint}", f"Status {res['status']} error={res['error']}")

    severity_rank = {"HIGH": 0, "MED": 1, "LOW": 2}
    findings.sort(key=lambda f: severity_rank.get(f["severity"], 9))

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    high = sum(1 for f in findings if f["severity"] == "HIGH")
    med = sum(1 for f in findings if f["severity"] == "MED")
    low = sum(1 for f in findings if f["severity"] == "LOW")

    report = []
    report.append("# Churvox Live Smoke Audit")
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
    report.append(f"- Live CSS: `{css_path or 'missing'}`")
    report.append(f"- Live JS: `{js_path or 'missing'}`")
    report.append("")
    report.append("## Checks")
    report.append("")
    for c in checks:
        mark = "✅" if c["ok"] else "❌"
        report.append(f"- {mark} **{c['name']}** — status `{c['status']}` — {c['detail']}")
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
        report.append("No live smoke blockers found.")
        report.append("")

    out = "\n".join(report)
    Path("audits").mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_file = Path("audits") / f"churvox_live_smoke_audit_{stamp}.md"
    latest_file = Path("audits/churvox_live_smoke_audit_latest.md")
    report_file.write_text(out)
    latest_file.write_text(out)

    print(out)
    print("")
    print(f"REPORT_FILE={report_file}")
    print(f"LATEST_FILE={latest_file}")

if __name__ == "__main__":
    main()
