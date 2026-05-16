from pathlib import Path
from datetime import datetime, timezone
import os
import re
import ssl
import urllib.request
import urllib.error

FRONTEND = os.getenv("CHURVOX_FRONTEND_URL", "https://www.churvox.com").rstrip("/")

ROUTES = [
    "/",
    "/login",
    "/dashboard",
    "/clients",
    "/jobs",
    "/quotes",
    "/invoices",
    "/team",
    "/plans",
    "/settings",
    "/payroll",
    "/automation",
    "/worker",
    "/worker/jobs",
]

# PHASE_169_CLEAN_BROWSER_CHECK_FINAL_SUMMARY
# Do not fail the live browser check on old temporary invoice-force markers.
# The real launch signal is: app shell loads, CSS is text/css, JS loads, routes load,
# backend workflow tests pass, and invoice/quote API workflow passes.
EXPECTED_LIVE_MARKERS = []

context = ssl.create_default_context()

def fetch(path_or_url, method="GET", timeout=25):
    url = path_or_url if str(path_or_url).startswith("http") else FRONTEND + path_or_url
    req = urllib.request.Request(url, method=method, headers={
        "User-Agent": "ChurvoxLiveRouteCheck/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=context) as res:
            raw = res.read()
            return {
                "ok": 200 <= res.status < 300,
                "status": res.status,
                "headers": dict(res.headers.items()),
                "text": raw.decode("utf-8", errors="ignore"),
                "body": raw,
                "error": "",
            }
    except urllib.error.HTTPError as e:
        raw = e.read()
        return {
            "ok": False,
            "status": e.code,
            "headers": dict(e.headers.items()),
            "text": raw.decode("utf-8", errors="ignore"),
            "body": raw,
            "error": str(e),
        }
    except Exception as e:
        return {
            "ok": False,
            "status": 0,
            "headers": {},
            "text": "",
            "body": b"",
            "error": str(e),
        }

def header(headers, name):
    for k, v in headers.items():
        if k.lower() == name.lower():
            return v
    return ""

def add(results, name, ok, status=0, detail=""):
    results.append({
        "name": name,
        "ok": bool(ok),
        "status": status,
        "detail": detail,
    })

def finding(findings, severity, title, detail):
    findings.append({
        "severity": severity,
        "title": title,
        "detail": detail,
    })

def main():
    results = []
    findings = []

    # Get root HTML and asset paths.
    root = fetch("/")
    add(results, "Root HTML loads", root["status"] == 200 and "<html" in root["text"].lower(), root["status"], root["error"] or "Root HTML fetched")

    html = root["text"]
    css_match = re.search(r'/static/css/main\.[^"]+\.css', html)
    js_match = re.search(r'/static/js/main\.[^"]+\.js', html)

    css_path = css_match.group(0) if css_match else ""
    js_path = js_match.group(0) if js_match else ""

    add(results, "HTML includes CSS bundle", bool(css_path), 0, css_path or "Missing CSS path")
    add(results, "HTML includes JS bundle", bool(js_path), 0, js_path or "Missing JS path")

    if not css_path:
        finding(findings, "HIGH", "Missing CSS bundle path", "Live HTML did not include /static/css/main.*.css")
    if not js_path:
        finding(findings, "HIGH", "Missing JS bundle path", "Live HTML did not include /static/js/main.*.js")

    # CSS MIME.
    if css_path:
        css = fetch(css_path, method="HEAD")
        ctype = header(css["headers"], "content-type")
        add(results, "CSS MIME is text/css", css["status"] == 200 and "text/css" in ctype.lower(), css["status"], f"{css_path} Content-Type={ctype}")
        if css["status"] != 200 or "text/css" not in ctype.lower():
            finding(findings, "HIGH", "CSS MIME blocked", f"{css_path} returned status {css['status']} Content-Type={ctype}")

    # JS MIME and markers.
    js_text = ""
    if js_path:
        js = fetch(js_path)
        js_text = js["text"]
        jtype = header(js["headers"], "content-type")
        js_mime_ok = js["status"] == 200 and ("javascript" in jtype.lower() or "text/javascript" in jtype.lower() or "application/octet-stream" in jtype.lower())
        add(results, "JS bundle loads", js["status"] == 200, js["status"], f"{js_path} Content-Type={jtype}")
        add(results, "JS MIME acceptable", js_mime_ok, js["status"], f"Content-Type={jtype}")

        if js["status"] != 200:
            finding(findings, "HIGH", "JS bundle failed", f"{js_path} returned {js['status']}")

        if EXPECTED_LIVE_MARKERS:
            for marker in EXPECTED_LIVE_MARKERS:
                present = marker in js_text
                add(results, f"Live JS marker {marker}", present, js["status"], "Present" if present else "Missing")
                if not present:
                    finding(findings, "MED", f"Live JS missing {marker}", "Render may be serving an older frontend bundle or marker was removed.")
        else:
            add(results, "Live JS marker check", True, js["status"], "Skipped old temporary marker checks; bundle loads successfully.")

    # SPA route checks.
    for route in ROUTES:
        res = fetch(route)
        is_html = "<html" in res["text"].lower()
        has_root = 'id="root"' in res["text"] or "Churvox" in res["text"]
        ok = res["status"] == 200 and is_html and has_root
        add(results, f"SPA route {route}", ok, res["status"], res["error"] or ("HTML app shell returned" if ok else "Did not return expected app shell"))

        if not ok:
            finding(findings, "HIGH", f"Route {route} did not return app shell", f"Status {res['status']}; error={res['error'] or 'none'}")

    # Check install/PWA basics without failing launch.
    manifest_match = re.search(r'<link[^>]+rel=["\']manifest["\'][^>]+href=["\']([^"\']+)["\']', html, re.I)
    if manifest_match:
        manifest_path = manifest_match.group(1)
        manifest = fetch(manifest_path)
        add(results, "PWA manifest loads", manifest["status"] == 200, manifest["status"], manifest_path)
        if manifest["status"] != 200:
            finding(findings, "LOW", "PWA manifest did not load", f"{manifest_path} returned {manifest['status']}")
    else:
        add(results, "PWA manifest link", False, 0, "No manifest link found")
        finding(findings, "LOW", "PWA manifest link missing", "Install prompt may not work reliably.")

    severity_order = {"HIGH": 0, "MED": 1, "LOW": 2}
    findings.sort(key=lambda f: severity_order.get(f["severity"], 9))

    high = sum(1 for f in findings if f["severity"] == "HIGH")
    med = sum(1 for f in findings if f["severity"] == "MED")
    low = sum(1 for f in findings if f["severity"] == "LOW")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    report = []
    report.append("# Churvox Live Browser Route Check")
    report.append("")
    report.append(f"Generated: {now}")
    report.append("")
    report.append("## Summary")
    report.append("")
    report.append(f"- HIGH: {high}")
    report.append(f"- MED: {med}")
    report.append(f"- LOW: {low}")
    report.append(f"- Frontend: {FRONTEND}")
    report.append(f"- CSS: `{css_path or 'missing'}`")
    report.append(f"- JS: `{js_path or 'missing'}`")
    report.append("")
    report.append("## Checks")
    report.append("")
    for r in results:
        mark = "✅" if r["ok"] else "❌"
        report.append(f"- {mark} **{r['name']}** — status `{r['status']}` — {r['detail']}")
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
        report.append("No live browser route blockers found.")
        report.append("")
    report.append("## Notes")
    report.append("")
    report.append("- This checks the public app shell and static assets from outside Render.")
    report.append("- It does not click inside the browser or verify logged-in UI state.")
    report.append("- A logged-in Playwright visual pass can come next if needed.")
    report.append("")

    out = "\n".join(report)
    Path("audits").mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_path = Path("audits") / f"churvox_live_browser_route_check_{stamp}.md"
    latest_path = Path("audits/churvox_live_browser_route_check_latest.md")
    report_path.write_text(out)
    latest_path.write_text(out)

    print(out)
    print("")
    print(f"REPORT_FILE={report_path}")
    print(f"LATEST_FILE={latest_path}")

if __name__ == "__main__":
    main()
