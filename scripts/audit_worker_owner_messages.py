#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import json

ROOT = Path.cwd()
DOC = ROOT / "docs" / "WORKER_OWNER_MESSAGES_AUDIT.md"
JSON_OUT = ROOT / "docs" / "worker_owner_messages_audit.json"

def read(path):
    p = ROOT / path
    return p.read_text(encoding="utf-8", errors="ignore") if p.exists() else ""

panel = read("frontend/src/components/worker/WorkerContactOfficePanel.js")
command_bridge = read("frontend/src/churvox-fresh/commandBridge.js")
command_page = read("frontend/src/churvox-fresh/FreshCommandOwnerDesk.jsx")
command_routes = read("backend/routes/commandRoutes.js")
worker_jobs = read("frontend/src/pages/worker/WorkerJobsPage.js")
worker_detail = read("frontend/src/pages/worker/WorkerJobDetailPage.js")

checks = []

def add(name, ok, evidence, fix):
    checks.append({
        "name": name,
        "status": "PASS" if ok else "FAIL",
        "evidence": evidence,
        "fix": fix,
    })

add(
    "Worker help box exists",
    "WorkerContactOfficePanel" in panel and "Need help now?" in panel and "Send help request" in panel,
    "Worker app has a contact office panel with message textarea and send button.",
    "Add worker contact office panel."
)

add(
    "Worker help opens from worker app",
    "setShowContactOffice(true)" in worker_jobs or "setShowContactOffice(true)" in worker_detail,
    "Worker pages can open the contact office panel.",
    "Wire Contact office buttons into worker list/detail pages."
)

add(
    "Worker help posts office request",
    'post("/worker/contact-office"' in panel,
    "Panel posts to /worker/contact-office.",
    "Post worker message to backend office endpoint."
)

add(
    "Worker help creates Command slip",
    "sendFreshSlipToCommand" in panel and "worker_help_request" in panel and "Worker messages" in panel,
    "Panel also creates a Command slip for owner visibility.",
    "Create owner Command slip when worker sends help request."
)

add(
    "Command bridge posts backend slips",
    "postFreshSlipToCommand" in command_bridge and "/api/command/slips" in command_bridge,
    "Shared Command bridge posts slips to backend.",
    "Wire Command bridge to backend."
)

add(
    "Command backend create endpoint exists",
    'router.post("/slips"' in command_routes or "router.post('/slips'" in command_routes,
    "Backend Command create slip endpoint exists.",
    "Add POST /api/command/slips."
)

add(
    "Owner Command reads backend slips",
    "/api/command/slips" in command_page or "COMMAND_API_BASE" in command_page,
    "Owner Command page loads backend slips.",
    "Make owner Command read backend slips."
)

add(
    "Worker help includes job context",
    "job_id" in panel and "job_title" in panel and "sourceId" in panel,
    "Worker message includes job id/title when available.",
    "Attach job context to worker help messages."
)

add(
    "Worker help includes worker context",
    "worker_name" in panel and "worker_email" in panel and "worker_id" in panel,
    "Worker message includes worker identity fields.",
    "Attach worker identity to Command slip payload."
)

passed = sum(1 for c in checks if c["status"] == "PASS")
total = len(checks)
score = round((passed / total) * 100)

lines = [
    "# Worker → Owner Message Audit",
    "",
    f"Generated: {datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')}",
    "",
    f"**Score:** {score}%",
    f"**Pass:** {passed}/{total}",
    "",
    "## Verdict",
    "",
    "Worker help requests should land in owner Command, not disappear into a hidden inbox.",
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
    lines.append("No static worker-to-owner message gaps detected. Real test: worker sends help request, owner sees Command slip after refresh.")

DOC.write_text("\n".join(lines), encoding="utf-8")
JSON_OUT.write_text(json.dumps({"score": score, "checks": checks}, indent=2), encoding="utf-8")

print("WORKER → OWNER MESSAGE AUDIT COMPLETE")
print(f"Score: {score}%")
print(f"Pass: {passed}/{total}")
for c in fails:
    print(f"- [FAIL] {c['name']} — {c['fix']}")
