#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import json
import re

ROOT = Path.cwd()

def read(path):
    p = ROOT / path
    return p.read_text(encoding="utf-8", errors="ignore") if p.exists() else ""

front = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in (ROOT / "frontend/src").rglob("*.*") if p.suffix in [".js", ".jsx", ".ts", ".tsx"])
back = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in (ROOT / "backend").rglob("*.py"))
invoice_detail = read("frontend/src/pages/invoices/InvoiceDetailPage.js")
invoice_pdf = read("backend/churvox_invoice_pdf_routes.py")
roles = read("frontend/src/lib/roles.js")
app = read("frontend/src/App.js")
kit = read("frontend/src/lib/tradieLaunchKit.js")

checks = []

def add(area, name, ok, evidence, fix):
    checks.append({
        "area": area,
        "name": name,
        "status": "PASS" if ok else "WARN",
        "evidence": evidence,
        "fix": fix,
    })

add("Invoice PDF", "Backend PDF generator exists", "build_invoice_pdf_bytes" in invoice_pdf and "application/pdf" in invoice_pdf, "PDF bytes route exists.", "Add backend PDF generator.")
add("Invoice PDF", "Send-with-PDF endpoint exists", "send-with-pdf" in invoice_pdf and "pdf_attached" in invoice_pdf, "Invoice PDF email endpoint exists.", "Add POST /api/invoices/:id/send-with-pdf.")
add("Invoice PDF", "PDF route mounted", "invoice_pdf_router" in back and "include_router(invoice_pdf_router" in back, "Invoice PDF router mounted in backend app.", "Mount invoice PDF router.")
add("Invoice PDF", "Owner invoice send uses PDF endpoint", "send-with-pdf" in invoice_detail and "pdf_attached" in invoice_detail, "Invoice detail sends through backend PDF endpoint.", "Replace mailto-only send with backend send-with-PDF.")
add("Invoice PDF", "Email provider support exists", "POSTMARK_SERVER_TOKEN" in invoice_pdf and "RESEND_API_KEY" in invoice_pdf, "Postmark and Resend providers supported.", "Set provider env vars on Render.")

add("Worker", "Worker app routes exist", "/worker/jobs" in app and "/worker/jobs/:id" in app, "Worker route table exists.", "Add worker routes.")
add("Worker", "Worker app has timer actions", "/timer/start" in front and "/timer/resume" in front, "Worker timer endpoints used.", "Wire worker timers.")
add("Worker", "Worker evidence capture exists", "handleSaveNotes" in front and "handleAddPhoto" in front, "Worker notes/photos exist.", "Wire worker evidence.")
add("Worker", "Worker help reaches owner Command", "worker_help_request" in front and "Worker messages" in front, "Worker help creates Command slip.", "Wire worker help to Command.")

add("Owner Command", "Command reads backend slips", "/api/command/slips" in front, "Command backend slip API referenced.", "Load backend Command slips.")
add("Owner Command", "Owner notification centre covers worker issues", "Worker messages" in front, "Worker messages category exists.", "Show worker messages in Command.")
add("Owner Review", "Send-back flow exists", "sent_back" in front and "send_back_note" in front, "Worker sees sent-back jobs.", "Wire owner send-back action.")
add("Customer", "Public quote accept/decline exists", "/api/public/quote" in front and "Accept quote" in front and "Decline quote" in front, "Public quote actions exist.", "Wire public quote.")
add("Customer", "Public invoice pay link exists", "/api/public/invoice" in front and "Pay now" in front, "Public invoice has payment path.", "Wire public invoice.")
add("Customer", "Public client approval exists", "/approve-work" in front and "Approve completed work" in front, "Public client portal approval exists.", "Wire client portal.")

add("Roles", "Worker blocked from owner/business shell", "if (isWorker) return <Navigate to=\"/worker/jobs\"" in app, "Worker redirected away from business shell.", "Add worker route guard.")
add("Roles", "Payroll default route clean", 'return "/payroll-board"' in roles, "Payroll default route is payroll board.", "Fix payroll route.")
add("Roles", "Reports excludes payroll", 'reports:    ["owner", "manager", "office_admin"]' in roles and '["owner", "manager", "office_admin"].includes(normalizedRole)' in app, "Reports route/matrix excludes payroll.", "Block payroll from reports.")

add("Tradie basics", "Onboarding steps exist", "TRADIE_ONBOARDING_STEPS" in kit and "send_invoice_pdf" in kit, "Launch onboarding checklist exists.", "Add onboarding checklist.")
add("Tradie basics", "Customer message templates exist", "TRADIE_MESSAGE_TEMPLATES" in kit and "invoice_reminder" in kit, "Common tradie templates exist.", "Add templates.")
add("Tradie basics", "Client memory exists", "CLIENT_MEMORY_FIELDS" in kit and "gate_code" in kit, "Client memory fields exist.", "Add client memory.")
add("Tradie basics", "Price memory exists", "PRICE_MEMORY_FIELDS" in kit and "normal_price" in kit, "Price memory fields exist.", "Add price memory.")
add("Tradie basics", "Offline queue helper exists", "queueOfflineAction" in kit and "readOfflineQueue" in kit, "Offline queue helper exists.", "Add offline queue helper.")

passed = sum(1 for c in checks if c["status"] == "PASS")
score = round((passed / len(checks)) * 100)

doc = [
    "# Churvox Launch Done Audit",
    "",
    f"Generated: {datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')}",
    "",
    f"**Score:** {score}%",
    f"**Pass:** {passed}/{len(checks)}",
    "",
    "| Area | Check | Status | Evidence | Fix |",
    "|---|---|---:|---|---|",
]
for c in checks:
    doc.append(f"| {c['area']} | {c['name']} | **{c['status']}** | {c['evidence']} | {c['fix']} |")

doc += [
    "",
    "## Real testing still required",
    "",
    "- Send invoice and confirm the customer email has a PDF attachment.",
    "- Open PDF on phone and desktop.",
    "- Complete a worker job with notes/photos.",
    "- Confirm owner sees the proof/worker issue in Command.",
    "- Approve work, send invoice PDF, confirm status becomes sent.",
    "- Test owner, manager, office_admin, worker, payroll and public customer links.",
]

Path("docs/CHURVOX_LAUNCH_DONE_AUDIT.md").write_text("\n".join(doc), encoding="utf-8")
Path("docs/churvox_launch_done_audit.json").write_text(json.dumps({"score": score, "checks": checks}, indent=2), encoding="utf-8")

print("CHURVOX LAUNCH DONE AUDIT COMPLETE")
print(f"Score: {score}%")
print(f"Pass: {passed}/{len(checks)}")
for c in checks:
    if c["status"] != "PASS":
        print(f"- [WARN] {c['area']} / {c['name']} — {c['fix']}")
