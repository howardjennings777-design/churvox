from pathlib import Path
import re
import json
from datetime import datetime, timezone

ROOT = Path(".").resolve()
FRONTEND = ROOT / "frontend" / "src"
BACKEND = ROOT / "backend"
SERVER = BACKEND / "server.py"

IGNORE_DIRS = {
    "node_modules", ".git", "build", "dist", ".cache", "__pycache__",
    ".next", "coverage", "playwright-report", "test-results"
}

CRITICAL_FILES = [
    "frontend/src/index.js",
    "frontend/src/shell/ChurvoxAIShell.jsx",
    "frontend/src/shell/ChurvoxAIShell.css",
    "frontend/src/shell/ChurvoxOperatorOS.css",
    "frontend/server.js",
    "frontend/public/_headers",
    "frontend/public/static.json",
    "frontend/package.json",
    "backend/server.py",
    "backend/email_provider.py",
]

CRITICAL_FRONTEND_STRINGS = [
    "PHASE_146_FORCE_EXACT_OLD_INVOICE_READY_MODAL",
    "PHASE_147_PROFESSIONAL_INVOICE_OVERLAY",
    "Approve & email PDF",
    "ProperInvoiceApprovalTemplate",
    "beforeinstallprompt",
    "serviceWorker",
]

CRITICAL_BACKEND_STRINGS = [
    "https://www.churvox.com",
    "allow_credentials=True",
    "CORSMiddleware",
    "send_email",
    "PDF",
    "invoice",
]

TEXT_EXTS = {
    ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json",
    ".py", ".md", ".txt", ".yml", ".yaml", ".toml", ".env", ".sh"
}

def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")

def read(path: Path) -> str:
    try:
        return path.read_text(errors="ignore")
    except Exception:
        return ""

def walk_files(base: Path):
    if not base.exists():
        return
    for path in base.rglob("*"):
        if any(part in IGNORE_DIRS for part in path.parts):
            continue
        if path.is_file() and path.suffix.lower() in TEXT_EXTS:
            yield path

def line_no(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1

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
    # /jobs/{job_id}/photos -> ^/jobs/[^/]+/photos$
    route = route.rstrip("/") or "/"
    escaped = re.escape(route)
    escaped = re.sub(r"\\\{[^/]+?\\\}", r"[^/]+", escaped)
    return re.compile("^" + escaped + "$")

def normalise_frontend_endpoint(value: str) -> str:
    value = value.strip()
    value = re.sub(r"`.*?\$\{.*?\}.*?`", "", value)
    value = value.split("?")[0]
    value = value.rstrip("/")
    if not value.startswith("/"):
        value = "/" + value
    if value.startswith("/api/"):
        value = value[4:]
    return value or "/"

def extract_frontend_endpoints():
    endpoints = []
    patterns = [
        r'\bapi(?:Get|Post|Put|Patch|Delete|Request)\(\s*[`"\']([^`"\']+)[`"\']',
        r'\bfastApiGet\(\s*[`"\']([^`"\']+)[`"\']',
        r'\bpublicApi(?:Get|Post)\(\s*[`"\']([^`"\']+)[`"\']',
        r'\bfetch\(\s*[`"\'](?:[^`"\']*/api)?([^`"\']+)[`"\']',
        r'\baxios\.(?:get|post|put|patch|delete)\(\s*[`"\'](?:[^`"\']*/api)?([^`"\']+)[`"\']',
    ]
    for path in walk_files(FRONTEND):
        text = read(path)
        for pattern in patterns:
            for m in re.finditer(pattern, text):
                endpoint = m.group(1)
                if not endpoint or endpoint.startswith("http") or "${" in endpoint:
                    continue
                endpoints.append({
                    "endpoint": normalise_frontend_endpoint(endpoint),
                    "raw": endpoint,
                    "file": rel(path),
                    "line": line_no(text, m.start()),
                })
    return endpoints

def extract_backend_routes():
    routes = []
    text = read(SERVER)
    decorator_re = re.compile(r'@(?:app|api_router)\.(get|post|put|patch|delete|options)\(\s*["\']([^"\']+)["\']', re.I)
    for m in decorator_re.finditer(text):
        route = m.group(2).strip()
        if route.startswith("/api/"):
            route = route[4:]
        if not route.startswith("/"):
            route = "/" + route
        route = route.rstrip("/") or "/"
        routes.append({
            "method": m.group(1).upper(),
            "route": route,
            "file": "backend/server.py",
            "line": line_no(text, m.start()),
            "regex": route_to_regex(route),
        })
    return routes

def route_matches(endpoint, routes):
    endpoint = endpoint.rstrip("/") or "/"
    for r in routes:
        if r["regex"].match(endpoint):
            return True
    return False

def audit():
    findings = []

    # Critical files
    for f in CRITICAL_FILES:
        path = ROOT / f
        if not path.exists():
            add(findings, "HIGH", "Files", "Missing critical file", f, f)

    # Frontend / backend build markers
    index_text = read(ROOT / "frontend/src/index.js")
    shell_text = read(ROOT / "frontend/src/shell/ChurvoxAIShell.jsx")
    server_text = read(SERVER)
    frontend_server_text = read(ROOT / "frontend/server.js")

    if "PHASE_147_PROFESSIONAL_INVOICE_OVERLAY" not in index_text:
        add(findings, "HIGH", "Invoice", "Phase 147 professional invoice overlay missing from index.js", "Live invoice may revert to old rough modal.", "frontend/src/index.js")
    if "PHASE_146_FORCE_EXACT_OLD_INVOICE_READY_MODAL" not in index_text:
        add(findings, "HIGH", "Invoice", "Phase 146 old invoice modal force missing from index.js", "The exact screenshot modal may not be patched.", "frontend/src/index.js")
    if "ProperInvoiceApprovalTemplate" not in shell_text:
        add(findings, "MED", "Invoice", "Smart Hub proper invoice component missing", "Smart Hub invoice approval branch may use old markup.", "frontend/src/shell/ChurvoxAIShell.jsx")

    # CSS MIME / server checks
    if '".css": "text/css' not in frontend_server_text and "text/css; charset=utf-8" not in frontend_server_text:
        add(findings, "HIGH", "Deploy/MIME", "Frontend server does not clearly serve CSS as text/css", "Browser may refuse CSS with strict MIME checking.", "frontend/server.js")
    if "sendMissingAsset" in frontend_server_text and "text/css; charset=utf-8" not in frontend_server_text:
        add(findings, "HIGH", "Deploy/MIME", "Missing CSS fallback may return wrong MIME", "Stale hashed CSS can break styling.", "frontend/server.js")
    if not (ROOT / "frontend/public/_headers").exists():
        add(findings, "MED", "Deploy/MIME", "Missing public _headers file", "Static host headers may not enforce CSS MIME.", "frontend/public/_headers")
    if not (ROOT / "frontend/public/static.json").exists():
        add(findings, "LOW", "Deploy/MIME", "Missing public static.json", "Some static hosts use this for MIME/header config.", "frontend/public/static.json")

    # CORS checks
    if "https://www.churvox.com" not in server_text:
        add(findings, "HIGH", "Backend/CORS", "www.churvox.com missing from backend CORS", "Live frontend may be blocked from API.", "backend/server.py")
    if "allow_credentials=True" not in server_text:
        add(findings, "HIGH", "Backend/CORS", "allow_credentials=True missing", "Cookie/auth requests may fail cross-site.", "backend/server.py")
    if "churvox_force_cors_headers" not in server_text:
        add(findings, "MED", "Backend/CORS", "Hard CORS header middleware missing", "Error responses may still miss CORS headers.", "backend/server.py")

    # Endpoint wiring
    frontend_endpoints = extract_frontend_endpoints()
    backend_routes = extract_backend_routes()

    missing = []
    for ep in frontend_endpoints:
        endpoint = ep["endpoint"]
        if endpoint.startswith("/public/"):
            # still should be backend, but public APIs may have dynamic variants; keep if absent
            pass
        if not route_matches(endpoint, backend_routes):
            missing.append(ep)

    # Deduplicate endpoint findings
    seen = set()
    for ep in missing:
        key = (ep["endpoint"], ep["file"])
        if key in seen:
            continue
        seen.add(key)
        add(
            findings,
            "HIGH" if ep["endpoint"] in ["/jobs", "/clients", "/invoices", "/quotes", "/team/workers"] else "MED",
            "API wiring",
            f"Frontend endpoint may not have backend route: {ep['endpoint']}",
            f"Raw call: {ep['raw']}",
            ep["file"],
            ep["line"],
        )

    # Hardcoded old brand / URLs
    for path in walk_files(ROOT):
        if "node_modules" in path.parts or "build" in path.parts:
            continue
        text = read(path)

        for term, severity, area, msg in [
            ("grassley-frontend", "MED", "Brand/Deploy", "Old Grassley frontend reference"),
            ("grassley-backend", "LOW", "Brand/Deploy", "Backend URL still uses grassley-backend"),
            ("Grassley", "MED", "Brand", "Old Grassley brand text"),
            ("Coming Soon", "LOW", "Launch polish", "Coming Soon text still visible"),
            ("TODO", "LOW", "Code cleanup", "TODO marker remains"),
            ("FIXME", "LOW", "Code cleanup", "FIXME marker remains"),
            ("placeholder", "LOW", "Launch polish", "Placeholder wording remains"),
            ("lorem", "LOW", "Launch polish", "Lorem/sample text remains"),
            ("window.confirm", "MED", "UX", "Browser confirm still used instead of in-page modal"),
            ("alert(", "MED", "UX", "Browser alert still used instead of in-page modal"),
        ]:
            idx = text.lower().find(term.lower())
            if idx != -1:
                add(findings, severity, area, msg, f"Found `{term}`", rel(path), line_no(text, idx))

    # PWA install warning likely cause
    for path in walk_files(FRONTEND):
        text = read(path)
        if "beforeinstallprompt" in text and ".preventDefault()" in text and ".prompt(" not in text:
            idx = text.find("beforeinstallprompt")
            add(
                findings,
                "MED",
                "PWA",
                "beforeinstallprompt preventDefault without prompt call nearby",
                "This causes the Chrome console warning and may block install banner.",
                rel(path),
                line_no(text, idx),
            )

    # Suspicious force patches
    force_count = index_text.count("PHASE_")
    if force_count >= 20:
        add(
            findings,
            "MED",
            "Technical debt",
            "index.js has many phase force patches",
            f"Found {force_count} PHASE markers in index.js. Some runtime patches should later be moved into real components.",
            "frontend/src/index.js",
        )

    # Backend duplicate route names/routes
    route_seen = {}
    for r in backend_routes:
        key = (r["method"], r["route"])
        if key in route_seen:
            prev = route_seen[key]
            add(
                findings,
                "HIGH",
                "Backend routes",
                f"Duplicate backend route {r['method']} {r['route']}",
                f"Also defined at line {prev['line']}. Last registration may shadow earlier handler.",
                "backend/server.py",
                r["line"],
            )
        route_seen[key] = r

    # Report
    severity_rank = {"HIGH": 0, "MED": 1, "LOW": 2}
    findings.sort(key=lambda x: (severity_rank.get(x["severity"], 9), x["area"], x["title"]))

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
    out.append(f"- Frontend API calls found: {len(frontend_endpoints)}")
    out.append(f"- Backend routes found: {len(backend_routes)}")
    out.append("")
    out.append("## Findings")
    out.append("")

    if not findings:
        out.append("No obvious wiring bugs found by the static audit.")
    else:
        for i, f in enumerate(findings, 1):
            loc = f"{f['file']}" + (f":{f['line']}" if f.get("line") else "")
            out.append(f"### {i}. [{f['severity']}] {f['area']} — {f['title']}")
            out.append("")
            out.append(f"**Where:** `{loc or 'n/a'}`")
            out.append("")
            out.append(f"**Detail:** {f['detail']}")
            out.append("")

    out.append("## Next sensible fix order")
    out.append("")
    out.append("1. Fix HIGH API wiring / missing backend routes first.")
    out.append("2. Fix deploy/MIME/CORS issues next because they make good code look broken live.")
    out.append("3. Fix invoice/runtime force patches by moving them into real components after launch-critical flows are stable.")
    out.append("4. Replace browser alert/confirm with in-page modal flows.")
    out.append("5. Remove placeholder/Coming Soon text from launch-critical areas.")
    out.append("")

    report = "\n".join(out)
    audits = ROOT / "audits"
    audits.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_path = audits / f"churvox_deep_audit_{stamp}.md"
    latest_path = audits / "churvox_deep_audit_latest.md"
    report_path.write_text(report)
    latest_path.write_text(report)

    print(report)
    print("")
    print(f"REPORT_FILE={rel(report_path)}")
    print(f"LATEST_FILE={rel(latest_path)}")

if __name__ == "__main__":
    audit()
