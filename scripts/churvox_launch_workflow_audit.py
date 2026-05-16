from pathlib import Path
from datetime import datetime, timezone
import re
import json

ROOT = Path(".")
FRONTEND = ROOT / "frontend" / "src"
BACKEND = ROOT / "backend"
SERVER = BACKEND / "server.py"

LAUNCH_FLOWS = {
    "auth_login": {
        "label": "Owner/user login",
        "frontend": ["login", "auth"],
        "backend_routes": ["/auth/login", "/owner/login", "/admin/login"],
        "critical": True,
    },
    "signup": {
        "label": "User signup",
        "frontend": ["signup", "register"],
        "backend_routes": ["/auth/register", "/register"],
        "critical": True,
    },
    "clients": {
        "label": "Clients load/add/open",
        "frontend": ["clients"],
        "backend_routes": ["/clients"],
        "critical": True,
    },
    "clients_csv": {
        "label": "Client CSV import",
        "frontend": ["import", "csv", "clients"],
        "backend_routes": ["/clients/import-csv"],
        "critical": False,
    },
    "jobs": {
        "label": "Jobs load/create/open",
        "frontend": ["jobs"],
        "backend_routes": ["/jobs"],
        "critical": True,
    },
    "job_assignment": {
        "label": "Assign worker to job",
        "frontend": ["assigned_worker", "worker"],
        "backend_routes": ["/jobs", "/team/workers"],
        "critical": True,
    },
    "quotes": {
        "label": "Quotes load/create/open",
        "frontend": ["quotes"],
        "backend_routes": ["/quotes"],
        "critical": True,
    },
    "invoices": {
        "label": "Invoices load/create/open",
        "frontend": ["invoices"],
        "backend_routes": ["/invoices"],
        "critical": True,
    },
    "invoice_approve_pdf": {
        "label": "Invoice approve/email/PDF",
        "frontend": ["Approve & email PDF", "invoice", "PDF"],
        "backend_routes": ["/ai/owner-command/invoice/approve"],
        "critical": True,
    },
    "team_invite": {
        "label": "Team invite/add worker",
        "frontend": ["team", "invite", "worker"],
        "backend_routes": ["/team/workers", "/team/invite"],
        "critical": True,
    },
    "worker_app": {
        "label": "Worker app job flow",
        "frontend": ["WorkerCockpit", "WorkerJob"],
        "backend_routes": ["/worker/jobs", "/jobs"],
        "critical": True,
    },
    "worker_photos": {
        "label": "Worker photo upload",
        "frontend": ["photo", "upload"],
        "backend_routes": ["/jobs/{job_id}/photos", "/worker/jobs/{job_id}/photos"],
        "critical": False,
    },
    "plans": {
        "label": "Plans and billing gate",
        "frontend": ["plans", "billing"],
        "backend_routes": ["/billing/plans", "/billing/start-trial", "/stripe/create-checkout-session"],
        "critical": True,
    },
    "stripe_webhook": {
        "label": "Stripe webhook plan update",
        "frontend": ["stripe", "checkout"],
        "backend_routes": ["/billing/webhook"],
        "critical": True,
    },
    "smart_hub_actions": {
        "label": "Smart Hub owner approval actions",
        "frontend": ["Smart Hub", "approval", "approve"],
        "backend_routes": ["/ai/actions", "/ai/owner-command/approve"],
        "critical": True,
    },
    "cors_mime": {
        "label": "Deploy CORS/MIME safety",
        "frontend": ["PHASE_144_FORCE_CSS_MIME_AND_CACHE_CLEAR"],
        "backend_routes": [],
        "critical": True,
    },
}

IMPORTANT_FILES = [
    "frontend/src/index.js",
    "frontend/src/shell/ChurvoxAIShell.jsx",
    "frontend/src/lib/api.js",
    "frontend/src/operator-machine/OperatorMachine.jsx",
    "frontend/src/pages/clients/ClientsPage.js",
    "frontend/src/pages/jobs/JobsPage.js",
    "frontend/src/pages/jobs/JobDetailPage.js",
    "frontend/src/pages/invoices/InvoicesPage.js",
    "frontend/src/pages/invoices/InvoiceFormPage.js",
    "frontend/src/pages/quotes/QuotesPage.js",
    "frontend/src/pages/TeamPage.js",
    "frontend/src/pages/worker/WorkerCockpitPage.js",
    "frontend/src/pages/worker/WorkerJobDetailPage.js",
    "frontend/server.js",
    "backend/server.py",
    "backend/email_provider.py",
]

def read(path):
    try:
        return Path(path).read_text(errors="ignore")
    except Exception:
        return ""

def line_no(text, idx):
    return text.count("\n", 0, idx) + 1

def route_to_regex(route):
    route = route.rstrip("/") or "/"
    escaped = re.escape(route)
    escaped = re.sub(r"\\\{[^/]+?\\\}", r"[^/]+", escaped)
    return re.compile("^" + escaped + "$")

def effective_backend_routes():
    text = read(SERVER)
    out = []
    dec = re.compile(r'@(app|api_router)\.(get|post|put|patch|delete|options)\(\s*["\']([^"\']+)["\']', re.I)
    for m in dec.finditer(text):
        owner, method, route = m.group(1), m.group(2).upper(), m.group(3)
        if not route.startswith("/"):
            route = "/" + route
        effective = route
        if owner == "api_router":
            effective = ("/api" + route).replace("//", "/")
        out.append({
            "owner": owner,
            "method": method,
            "route": effective.rstrip("/") or "/",
            "declared": route,
            "line": line_no(text, m.start()),
        })
    return out

def route_exists(route, routes):
    candidates = []
    if route.startswith("/api/"):
        candidates.append(route.rstrip("/") or "/")
    else:
        candidates.append(("/api" + route).replace("//", "/").rstrip("/") or "/")
        candidates.append(route.rstrip("/") or "/")

    for candidate in candidates:
        regex = route_to_regex(candidate)
        if any(regex.match(r["route"]) for r in routes):
            return True, candidate
    return False, candidates[0]

def source_hits(keywords):
    hits = []
    for f in IMPORTANT_FILES:
        path = Path(f)
        if not path.exists():
            continue
        text = read(path)
        lower = text.lower()
        for kw in keywords:
            if kw.lower() in lower:
                idx = lower.find(kw.lower())
                hits.append({"file": f, "keyword": kw, "line": line_no(text, idx)})
                break
    return hits

def main():
    findings = []
    routes = effective_backend_routes()
    route_dupes = {}

    for r in routes:
        key = (r["method"], r["route"])
        route_dupes.setdefault(key, []).append(r)

    for (method, route), items in route_dupes.items():
        if len(items) > 1:
            findings.append({
                "severity": "HIGH",
                "area": "Backend routes",
                "title": f"Duplicate effective backend route {method} {route}",
                "detail": "Lines: " + ", ".join(str(i["line"]) for i in items),
            })

    flow_rows = []
    for key, flow in LAUNCH_FLOWS.items():
        frontend_hits = source_hits(flow["frontend"])
        route_results = []
        for route in flow["backend_routes"]:
            exists, matched = route_exists(route, routes)
            route_results.append({"route": route, "exists": exists, "matched": matched})

        frontend_ok = bool(frontend_hits) if flow["frontend"] else True
        routes_ok = all(r["exists"] for r in route_results) if route_results else True
        ok = frontend_ok and routes_ok

        if not ok and flow["critical"]:
            missing_bits = []
            if not frontend_ok:
                missing_bits.append("frontend wiring keywords not found")
            missing_routes = [r["route"] for r in route_results if not r["exists"]]
            if missing_routes:
                missing_bits.append("missing routes: " + ", ".join(missing_routes))
            findings.append({
                "severity": "HIGH",
                "area": "Launch flow",
                "title": f"{flow['label']} may be incomplete",
                "detail": "; ".join(missing_bits),
            })

        flow_rows.append({
            "key": key,
            "label": flow["label"],
            "critical": flow["critical"],
            "frontend_ok": frontend_ok,
            "routes_ok": routes_ok,
            "ok": ok,
            "frontend_hits": frontend_hits[:5],
            "route_results": route_results,
        })

    # Specific risky technical-debt checks.
    index = read("frontend/src/index.js")
    server = read("backend/server.py")
    shell = read("frontend/src/shell/ChurvoxAIShell.jsx")

    runtime_forces = index.count("MutationObserver") + index.count("PHASE_146_FORCE_EXACT_OLD_INVOICE_READY_MODAL") + index.count("PHASE_147_PROFESSIONAL_INVOICE_OVERLAY")
    if runtime_forces >= 4:
        findings.append({
            "severity": "MED",
            "area": "Technical debt",
            "title": "Invoice/runtime force patches still live in index.js",
            "detail": "Works for launch, but should be moved into real React invoice components after critical flows are stable.",
        })

    if "text/css; charset=utf-8" not in read("frontend/server.js"):
        findings.append({
            "severity": "HIGH",
            "area": "Deploy",
            "title": "Frontend server does not clearly force CSS MIME",
            "detail": "CSS strict MIME issue may return.",
        })

    if "allow_credentials=True" not in server or "https://www.churvox.com" not in server:
        findings.append({
            "severity": "HIGH",
            "area": "Backend/CORS",
            "title": "Backend CORS may not allow live Churvox with credentials",
            "detail": "Check backend CORS origin list and credentials setting.",
        })

    if "PHASE_147_PROFESSIONAL_INVOICE_OVERLAY" not in index:
        findings.append({
            "severity": "MED",
            "area": "Invoice",
            "title": "Professional invoice overlay marker missing",
            "detail": "The exact old invoice modal may revert to the rough design.",
        })

    if "ProperInvoiceApprovalTemplate" not in shell:
        findings.append({
            "severity": "MED",
            "area": "Invoice",
            "title": "Smart Hub proper invoice component missing",
            "detail": "Smart Hub invoice branch may still rely on force overlay.",
        })

    severity_order = {"HIGH": 0, "MED": 1, "LOW": 2}
    findings.sort(key=lambda f: (severity_order.get(f["severity"], 9), f["area"], f["title"]))

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    counts = {
        "HIGH": sum(1 for f in findings if f["severity"] == "HIGH"),
        "MED": sum(1 for f in findings if f["severity"] == "MED"),
        "LOW": sum(1 for f in findings if f["severity"] == "LOW"),
    }

    out = []
    out.append("# Churvox Launch Workflow Audit")
    out.append("")
    out.append(f"Generated: {now}")
    out.append("")
    out.append("## Summary")
    out.append("")
    out.append(f"- HIGH: {counts['HIGH']}")
    out.append(f"- MED: {counts['MED']}")
    out.append(f"- LOW: {counts['LOW']}")
    out.append(f"- Backend effective routes found: {len(routes)}")
    out.append("")
    out.append("## Launch flow matrix")
    out.append("")
    out.append("| Flow | Critical | Frontend | Backend routes | Status |")
    out.append("|---|---:|---:|---:|---|")
    for row in flow_rows:
        out.append(
            f"| {row['label']} | {'Yes' if row['critical'] else 'No'} | "
            f"{'✅' if row['frontend_ok'] else '❌'} | "
            f"{'✅' if row['routes_ok'] else '❌'} | "
            f"{'✅ OK' if row['ok'] else '❌ Check'} |"
        )

    out.append("")
    out.append("## Findings")
    out.append("")
    if findings:
        for i, f in enumerate(findings, 1):
            out.append(f"### {i}. [{f['severity']}] {f['area']} — {f['title']}")
            out.append("")
            out.append(f["detail"])
            out.append("")
    else:
        out.append("No launch workflow blockers found by this static workflow audit.")
        out.append("")

    out.append("## Notes")
    out.append("")
    out.append("- This audit is static. It proves route/component wiring exists, not that a logged-in browser flow succeeds.")
    out.append("- Next best step after this is live browser workflow testing with an owner account and worker account.")
    out.append("- SMS Coming Soon is not treated as a launch blocker because SMS is intentionally greyed out for launch.")
    out.append("")

    report = "\n".join(out)
    Path("audits").mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_path = Path("audits") / f"churvox_launch_workflow_audit_{stamp}.md"
    latest_path = Path("audits/churvox_launch_workflow_audit_latest.md")
    report_path.write_text(report)
    latest_path.write_text(report)

    print(report)
    print("")
    print(f"REPORT_FILE={report_path}")
    print(f"LATEST_FILE={latest_path}")

if __name__ == "__main__":
    main()
