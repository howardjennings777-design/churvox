#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import json
import re

ROOT = Path.cwd()
DOC = ROOT / "docs" / "WORKER_PUBLIC_ROLE_AUDIT.md"
JSON_OUT = ROOT / "docs" / "worker_public_role_audit.json"

def read(path):
    p = ROOT / path
    return p.read_text(encoding="utf-8", errors="ignore") if p.exists() else ""

roles = read("frontend/src/lib/roles.js")
app = read("frontend/src/App.js")
worker_jobs = read("frontend/src/pages/worker/WorkerJobsPage.js")
worker_detail = read("frontend/src/pages/worker/WorkerJobDetailPage.js")
public_quote = read("frontend/src/pages/public/PublicQuotePage.js")
public_invoice = read("frontend/src/pages/public/PublicInvoicePage.js")
public_portal = read("frontend/src/pages/public/PublicClientPortalPage.js")
css = read("frontend/src/styles/worker-public-polish.css")

checks = []

def add(name, ok, evidence, fix):
    checks.append({
        "name": name,
        "status": "PASS" if ok else "FAIL",
        "evidence": evidence,
        "fix": fix,
    })

add("Worker routes exist", "/worker/jobs" in app and "/worker/jobs/:id" in app and "WorkerRoute" in app, "App route table includes worker routes.", "Add worker list/detail routes wrapped in WorkerRoute.")
add("Workers blocked from business pages", "if (isWorker) return <Navigate to=\"/worker/jobs\"" in app, "BusinessRoute redirects workers to worker app.", "Block worker role from owner/business shell.")
add("WorkerRoute blocks non-workers", "function WorkerRoute" in app and "if (!isWorker)" in app, "WorkerRoute only allows worker users.", "Add explicit worker-only route guard.")
add("Payroll blocked from reports route", "function ReportsRoute" in app and '["owner", "manager", "office_admin"]' in app and 'reports:    ["owner", "manager", "office_admin"]' in roles, "Reports route and matrix exclude payroll.", "Remove payroll from reports access.")
add("Payroll default route correct", 'if (r === "payroll") return "/payroll-board";' in roles, "Payroll role lands on payroll board.", "Update payroll default route.")
add("Worker app filters assigned jobs", "scopeJobsForWorker" in worker_jobs and "assignedToMe" in worker_jobs, "Worker jobs are scoped to assigned worker keys.", "Filter jobs by assigned worker server-side and client-side.")
add("Worker timer actions wired", "/timer/start" in worker_jobs and "/timer/resume" in worker_jobs and "/timer/start" in worker_detail and "/timer/resume" in worker_detail, "Worker timer start/resume endpoints detected.", "Wire timer endpoints.")
add("Worker notes/photos wired", "handleSaveNotes" in worker_detail and "handleAddPhoto" in worker_detail, "Worker detail supports notes and photo upload.", "Wire worker evidence capture.")
add("Worker theme polish imported", "worker-public-polish.css" in app and "worker-flow-panel" in css and ".px-app" in css, "Worker polish CSS is imported.", "Import worker polish stylesheet.")
add("Public quote not using old fallback", "grassley-backend" not in public_quote and "/api/public/quote" in public_quote, "Public quote uses env/relative API.", "Remove old backend fallback.")
add("Public invoice not using old fallback", "grassley-backend" not in public_invoice and "/api/public/invoice" in public_invoice, "Public invoice uses env/relative API.", "Remove old backend fallback.")
add("Public client portal polished", "PublicDocumentTemplate.css" in public_portal and "cpd-shell" in public_portal and "cpd-photo-grid" in public_portal, "Client portal now uses public document template.", "Polish public client portal.")
add("Public client portal approval wired", "/approve-work" in public_portal and "Approve completed work" in public_portal, "Customer approval action exists.", "Wire approve completed work.")

passed = sum(1 for c in checks if c["status"] == "PASS")
total = len(checks)
score = round((passed / total) * 100) if total else 0

lines = [
    "# Worker / Public / Role Audit",
    "",
    f"Generated: {datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')}",
    "",
    f"**Score:** {score}%",
    f"**Pass:** {passed}/{total}",
    "",
    "| Check | Status | Evidence | Fix |",
    "|---|---:|---|---|",
]

for c in checks:
    lines.append(f"| {c['name']} | **{c['status']}** | {c['evidence']} | {c['fix']} |")

fails = [c for c in checks if c["status"] != "PASS"]
lines += ["", "## Remaining Issues", ""]
if fails:
    for c in fails:
        lines.append(f"- **{c['name']}** — {c['fix']}")
else:
    lines.append("No static worker/public/role issues detected. Move to real device testing.")

DOC.write_text("\n".join(lines), encoding="utf-8")
JSON_OUT.write_text(json.dumps({"score": score, "checks": checks}, indent=2), encoding="utf-8")

print("WORKER / PUBLIC / ROLE AUDIT COMPLETE")
print(f"Score: {score}%")
print(f"Pass: {passed}/{total}")
for c in fails:
    print(f"- [FAIL] {c['name']} — {c['fix']}")
