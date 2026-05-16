from pathlib import Path
from datetime import datetime, timezone
import re

ROOT = Path(".").resolve()
SERVER = ROOT / "backend" / "server.py"

IGNORE_DIRS = {
    ".git",
    "node_modules",
    "build",
    "dist",
    "__pycache__",
    ".cache",
    "coverage",
    "playwright-report",
    "test-results",
    "audits",
    "test_reports",
    "backend/frontend_dist",
    "churvox-backend-save-audit-phase35",
    "churvox-visual-audit-route-check",
}

TEXT_EXTS = {".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json", ".py", ".md", ".txt", ".yml", ".yaml", ".sh"}

def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")

def read(path: Path) -> str:
    try:
        return path.read_text(errors="ignore")
    except Exception:
        return ""

def line_no(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1

def walk_files(base: Path):
    if not base.exists():
        return
    for path in base.rglob("*"):
        if not path.is_file():
            continue

        relative = rel(path)

        if any(part in IGNORE_DIRS for part in path.parts):
            continue
        if any(relative.startswith(prefix + "/") for prefix in IGNORE_DIRS):
            continue
        if path.suffix.lower() not in TEXT_EXTS:
            continue
        if relative.startswith("audits/") or relative.startswith("test_reports/"):
            continue
        if relative == "scripts/churvox_deep_audit.py":
            continue

        yield path

def add(findings, severity, area, title, detail, file="", line=""):
    findings.append({
        "severity": severity,
        "area": area,
        "title": title,
        "detail": detail,
        "file": file,
        "line": line,
    })

def route_to_regex(route: str):
    route = route.rstrip("/") or "/"
    escaped = re.escape(route)
    escaped = re.sub(r"\\\{[^/]+?\\\}", r"[^/]+", escaped)
    return re.compile("^" + escaped + "$")

def extract_backend_routes():
    routes = []
    text = read(SERVER)
    dec = re.compile(
        r'@(app|api_router)\.(get|post|put|patch|delete|options)\(\s*["\']([^"\']+)["\']',
        re.I,
    )

    for m in dec.finditer(text):
        owner = m.group(1)
        method = m.group(2).upper()
        declared = m.group(3).strip()

        if not declared.startswith("/"):
            declared = "/" + declared

        effective = declared
        if owner == "api_router":
            effective = ("/api" + declared).replace("//", "/")

        effective = effective.rstrip("/") or "/"

        match_route = effective
        if match_route.startswith("/api/"):
            match_route = match_route[4:]
        match_route = match_route.rstrip("/") or "/"

        routes.append({
            "owner": owner,
            "method": method,
            "declared": declared,
            "route": effective,
            "match_route": match_route,
            "line": line_no(text, m.start()),
            "regex": route_to_regex(match_route),
        })

    return routes

def extract_frontend_api_calls():
    calls = []
    patterns = [
        r'\bapi(?:Get|Post|Put|Patch|Delete|Request)\(\s*[`"\']([^`"\']+)[`"\']',
        r'\bfastApiGet\(\s*[`"\']([^`"\']+)[`"\']',
        r'\bpublicApi(?:Get|Post)\(\s*[`"\']([^`"\']+)[`"\']',
        r'\bfetch\(\s*[`"\'](?:[^`"\']*/api)?([^`"\']+)[`"\']',
        r'\baxios\.(?:get|post|put|patch|delete)\(\s*[`"\'](?:[^`"\']*/api)?([^`"\']+)[`"\']',
    ]

    frontend = ROOT / "frontend" / "src"
    for path in walk_files(frontend):
        text = read(path)
        for pattern in patterns:
            for m in re.finditer(pattern, text):
                raw = m.group(1)
                if not raw or "${" in raw or raw.startswith("http"):
                    continue
                endpoint = raw.split("?")[0].rstrip("/") or "/"
                if not endpoint.startswith("/"):
                    endpoint = "/" + endpoint
                if endpoint.startswith("/api/"):
                    endpoint = endpoint[4:]
                calls.append({
                    "endpoint": endpoint,
                    "raw": raw,
                    "file": rel(path),
                    "line": line_no(text, m.start()),
                })

    return calls

def route_exists(endpoint, routes):
    endpoint = endpoint.rstrip("/") or "/"
    for route in routes:
        if route["regex"].match(endpoint):
            return True
    return False

def strip_js_comments(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(^|\s)//.*?$", "", text, flags=re.M)
    return text

def main():
    findings = []
    server_text = read(SERVER)
    frontend_server_text = read(ROOT / "frontend" / "server.js")
    index_text = read(ROOT / "frontend" / "src" / "index.js")
    shell_text = read(ROOT / "frontend" / "src" / "shell" / "ChurvoxAIShell.jsx")

    routes = extract_backend_routes()
    frontend_calls = extract_frontend_api_calls()

    seen = {}
    for route in routes:
        key = (route["method"], route["route"])
        seen.setdefault(key, []).append(route)

    for (method, route), items in seen.items():
        if len(items) > 1:
            add(
                findings,
                "HIGH",
                "Backend routes",
                f"Duplicate effective backend route {method} {route}",
                "Lines: " + ", ".join(str(i["line"]) for i in items),
                "backend/server.py",
                items[-1]["line"],
            )

    for route in routes:
        if route["owner"] == "api_router" and route["declared"].startswith("/api/"):
            add(
                findings,
                "HIGH",
                "Backend routes",
                "api_router route declares /api prefix",
                f"api_router is already mounted under /api, so declared route {route['declared']} becomes {route['route']}.",
                "backend/server.py",
                route["line"],
            )

    if "https://www.churvox.com" not in server_text:
        add(findings, "HIGH", "Backend/CORS", "Live Churvox origin missing from CORS", "https://www.churvox.com was not found in backend/server.py.", "backend/server.py")

    if "allow_credentials=True" not in server_text:
        add(findings, "HIGH", "Backend/CORS", "CORS credentials disabled/missing", "allow_credentials=True was not found.", "backend/server.py")

    if "text/css; charset=utf-8" not in frontend_server_text:
        add(findings, "HIGH", "Deploy/MIME", "Frontend server does not force CSS MIME", "text/css; charset=utf-8 was not found in frontend/server.js.", "frontend/server.js")

    important_endpoints = [
        "/auth/login",
        "/clients",
        "/jobs",
        "/quotes",
        "/invoices",
        "/team/workers",
        "/billing/status",
        "/billing/start-trial",
        "/stripe/create-checkout-session",
        "/ai/actions",
        "/ai/owner-command/approve",
        "/ai/owner-command/invoice/approve",
    ]

    for endpoint in important_endpoints:
        if not route_exists(endpoint, routes):
            add(
                findings,
                "HIGH",
                "API wiring",
                f"Important endpoint missing: {endpoint}",
                "Launch-critical endpoint was not found in backend routes.",
                "backend/server.py",
            )

    for call in frontend_calls:
        endpoint = call["endpoint"]
        if endpoint.startswith("/public/"):
            continue
        if endpoint in ["/health", "/"]:
            continue
        if not route_exists(endpoint, routes):
            add(
                findings,
                "MED",
                "API wiring",
                f"Frontend call may not have backend route: {endpoint}",
                f"Raw call: {call['raw']}",
                call["file"],
                call["line"],
            )

    for path in walk_files(ROOT):
        text = read(path)
        relative = rel(path)

        # Visible old brand only. Do not flag the live Render backend URL.
        if "Grassley" in text:
            for m in re.finditer(r"\bGrassley\b", text):
                line_start = text.rfind("\n", 0, m.start()) + 1
                line_end = text.find("\n", m.start())
                if line_end == -1:
                    line_end = len(text)
                line = text[line_start:line_end]
                ignored = ["PHASE_", "grassley-backend", "grassley-frontend", "old brand", "render.com"]
                if any(bit.lower() in line.lower() for bit in ignored):
                    continue
                add(findings, "MED", "Brand", "Old visible Grassley brand text", "Found visible capitalized old brand text.", relative, line_no(text, m.start()))
                break

        if path.suffix.lower() in {".js", ".jsx", ".ts", ".tsx"}:
            popup_text = strip_js_comments(text)
            for pattern, title in [
                (r"\bwindow\.confirm\s*\(", "Browser confirm still used"),
                (r"(?<![\w.])confirm\s*\(", "Native confirm still used"),
                (r"\bwindow\.alert\s*\(", "Browser alert still used"),
                (r"(?<![\w.])alert\s*\(", "Native alert still used"),
            ]:
                for m in re.finditer(pattern, popup_text):
                    sample = popup_text[max(0, m.start() - 80):m.start() + 100]
                    if "confirmDialog" in sample:
                        continue
                    add(findings, "MED", "UX", title, "Replace browser popup with in-page modal/sheet.", relative, line_no(popup_text, m.start()))
                    break

    if "ProperInvoiceApprovalTemplate" not in shell_text:
        add(findings, "MED", "Invoice", "Smart Hub proper invoice component missing", "ProperInvoiceApprovalTemplate not found in ChurvoxAIShell.jsx.", "frontend/src/shell/ChurvoxAIShell.jsx")

    if index_text.count("MutationObserver") >= 3:
        add(findings, "LOW", "Post-launch cleanup", "Runtime force patches still live in index.js", "Works for launch, but should later move into normal React components.", "frontend/src/index.js")

    # Filter duplicate MED endpoint noise from dynamic endpoints that are tested elsewhere.
    cleaned = []
    seen_titles = set()
    for finding in findings:
        key = (finding["severity"], finding["area"], finding["title"], finding.get("file", ""))
        if key in seen_titles:
            continue
        seen_titles.add(key)

        detail = str(finding.get("detail") or "")
        file = str(finding.get("file") or "")

        if file.startswith("audits/") or file.startswith("backend/frontend_dist/"):
            continue
        if "Pasted" in file:
            continue
        if "node_modules" in file:
            continue

        cleaned.append(finding)

    findings = cleaned

    severity_rank = {"HIGH": 0, "MED": 1, "LOW": 2}
    findings.sort(key=lambda f: (severity_rank.get(f["severity"], 9), f["area"], f["title"]))

    counts = {
        "HIGH": sum(1 for f in findings if f["severity"] == "HIGH"),
        "MED": sum(1 for f in findings if f["severity"] == "MED"),
        "LOW": sum(1 for f in findings if f["severity"] == "LOW"),
    }

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    out = []
    out.append("# Churvox Deep Bug + Wiring Audit")
    out.append("")
    out.append(f"Generated: {now}")
    out.append("")
    out.append("## Summary")
    out.append("")
    out.append(f"- HIGH: {counts['HIGH']}")
    out.append(f"- MED: {counts['MED']}")
    out.append(f"- LOW: {counts['LOW']}")
    out.append(f"- Frontend API calls found: {len(frontend_calls)}")
    out.append(f"- Backend effective routes found: {len(routes)}")
    out.append("")
    out.append("## Findings")
    out.append("")

    if findings:
        for i, f in enumerate(findings, 1):
            loc = f.get("file") or "n/a"
            if f.get("line"):
                loc += f":{f['line']}"
            out.append(f"### {i}. [{f['severity']}] {f['area']} — {f['title']}")
            out.append("")
            out.append(f"**Where:** `{loc}`")
            out.append("")
            out.append(f"**Detail:** {f['detail']}")
            out.append("")
    else:
        out.append("No active-code deep wiring blockers found.")
        out.append("")

    out.append("## Notes")
    out.append("")
    out.append("- This audit ignores generated builds, backups, pasted logs, and audit reports.")
    out.append("- The live owner, worker, quote/invoice, and browser-route smoke tests remain the source of truth for launch behavior.")
    out.append("- Lower-risk dependency audit warnings are not changed here to avoid risky package upgrades before launch.")
    out.append("")

    report = "\n".join(out)
    Path("audits").mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    stamped = Path("audits") / f"churvox_deep_audit_{stamp}.md"
    latest = Path("audits/churvox_deep_audit_latest.md")
    stamped.write_text(report)
    latest.write_text(report)

    print(report)
    print("")
    print(f"REPORT_FILE={stamped}")
    print(f"LATEST_FILE={latest}")

if __name__ == "__main__":
    main()
