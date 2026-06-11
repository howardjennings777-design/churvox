#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import json

ROOT = Path.cwd()
DOC = ROOT / "docs" / "CHURVOX_APP_HEALTH_AUDIT.md"
JSON_OUT = ROOT / "docs" / "churvox_app_health_audit.json"

def files_under(base, suffixes):
    root = ROOT / base
    if not root.exists():
        return []
    return [p for p in root.rglob("*") if p.is_file() and p.suffix in suffixes]

front_files = files_under("frontend/src", [".js", ".jsx", ".ts", ".tsx", ".css"])
back_files = files_under("backend", [".py", ".js", ".ts"])

front_text = ""
back_text = ""
all_text = ""

for p in front_files:
    t = p.read_text(encoding="utf-8", errors="ignore")
    front_text += "\n" + t
    all_text += "\n" + t

for p in back_files:
    t = p.read_text(encoding="utf-8", errors="ignore")
    back_text += "\n" + t
    all_text += "\n" + t

def exists(path):
    return (ROOT / path).exists()

checks = []

def add(area, name, ok, evidence, fix, level="WARN"):
    checks.append({
        "area": area,
        "name": name,
        "status": "PASS" if ok else level,
        "evidence": evidence,
        "fix": fix,
    })

add("Core", "Frontend package exists", exists("frontend/package.json"), "frontend/package.json found.", "Restore frontend package.", "FAIL")
add("Core", "Backend exists", exists("backend") and len(back_files) > 0, "Backend files found.", "Restore backend app.", "FAIL")
add("Core", "Error boundary exists", "ErrorBoundary" in front_text, "Frontend has ErrorBoundary usage.", "Wrap major routes in ErrorBoundary.")
add("Core", "Loading states exist", "Loading" in front_text or "loading" in front_text, "Loading states detected.", "Add loading states.")
add("Core", "Empty states exist", "empty" in front_text.lower() or "No jobs" in front_text or "No clients" in front_text, "Empty state text detected.", "Add empty states.")

old_refs = [x for x in ["Grassly", "grassly", "grassley", "Grassley"] if x in all_text]
add("Brand", "Old name mostly removed", len(old_refs) == 0, f"Old refs found: {', '.join(old_refs) if old_refs else 'none'}.", "Remove old Grassly/Grassley references.")
add("Brand", "Churvox name present", "Churvox" in all_text, "Churvox name detected.", "Add Churvox brand.", "FAIL")

add("Auth/API", "API base helper exists", "apiBase" in front_text or "REACT_APP_BACKEND_URL" in front_text or "VITE_BACKEND_URL" in front_text, "Frontend API base detected.", "Use central API base helper.")
add("Auth/API", "Credentials/cookies enabled", "withCredentials" in front_text or 'credentials: "include"' in front_text or "allow_credentials" in back_text, "Credentialed requests detected.", "Enable credentials/cookies.")
add("Auth/API", "Login wired", "/auth/login" in all_text or "/api/auth/login" in all_text, "Login route reference detected.", "Wire login.")
add("Auth/API", "Signup/register wired", "/auth/register" in all_text or "/api/auth/register" in all_text, "Register route reference detected.", "Wire signup.")
add("Auth/API", "Forgot/reset password wired", "forgot-password" in all_text and "reset-password" in all_text, "Password recovery detected.", "Wire forgot/reset password.")
add("Auth/API", "Email provider referenced", "POSTMARK" in all_text or "RESEND" in all_text or "Postmark" in all_text or "Resend" in all_text, "Email provider references detected.", "Set email provider env vars on Render.")

add("Roles", "Role source exists", exists("frontend/src/lib/roles.js") and "ROLES" in front_text, "Role source of truth detected.", "Create role source.")
add("Roles", "Worker route guard exists", "WorkerRoute" in front_text and "/worker/jobs" in front_text, "Worker route guard detected.", "Block non-worker access.")
add("Roles", "Business route blocks worker", "isWorker" in front_text and 'Navigate to="/worker/jobs"' in front_text, "Workers redirected away from business shell.", "Block worker from owner app.")
add("Roles", "Payroll route separated", "payroll-board" in front_text, "Payroll board detected.", "Separate payroll workspace.")
add("Roles", "Reports protected", "ReportsRoute" in front_text, "ReportsRoute detected.", "Protect reports.")

add("Command", "Command route/page exists", "FreshCommandOwnerDesk" in front_text or "CommandDesk" in front_text, "Command owner desk detected.", "Add Command desk.")
add("Command", "Command backend slips referenced", "/api/command" in front_text or "/api/command" in back_text or "COMMAND_API_BASE" in front_text, "Command API referenced.", "Wire Command backend.")
add("Command", "Command approve/edit/snooze exists", "approveSlip" in front_text and "saveEdit" in front_text and "snooze" in front_text.lower(), "Command owner controls detected.", "Add owner controls.")
add("Command", "Worker help lands in Command", "worker_help_request" in front_text or "Worker messages" in front_text, "Worker help Command slip detected.", "Send worker help to Command.")

add("Worker", "Worker app routes exist", "/worker/jobs" in front_text and "/worker/jobs/:id" in front_text, "Worker routes detected.", "Add worker routes.")
add("Worker", "Worker job assignment filtering exists", "scopeJobsForWorker" in front_text or "assignedToMe" in front_text, "Worker assignment filtering detected.", "Filter jobs assigned to worker.")
add("Worker", "Worker timers exist", "/timer/start" in front_text and "/timer/resume" in front_text, "Worker timer endpoints detected.", "Wire timers.")
add("Worker", "Worker notes/photos exist", "worker_notes" in front_text and ("handleAddPhoto" in front_text or "photos" in front_text), "Worker evidence detected.", "Add notes/photos.")
add("Worker", "Worker contact office exists", "Contact office" in front_text or "contact-office" in front_text, "Worker contact office detected.", "Add worker help panel.")

add("Money", "Public quote exists", "/public/quote" in front_text and "Accept quote" in front_text, "Public quote detected.", "Add public quote.")
add("Money", "Public invoice exists", "/public/invoice" in front_text and "Pay now" in front_text, "Public invoice detected.", "Add public invoice.")
add("Money", "Invoice PDF sending exists", "send-with-pdf" in all_text and "pdf_attached" in all_text, "Invoice PDF sending detected.", "Wire invoice PDF sending.")
add("Money", "GST/totals visible", "gst" in all_text.lower() and "total" in all_text.lower(), "GST/total references detected.", "Show GST/totals.")
add("Money", "Stripe/plan flow exists", "stripe" in all_text.lower() or "checkout" in all_text.lower(), "Checkout/Stripe references detected.", "Wire Stripe checkout.")

add("Tradie Flow", "Recurring concepts exist", "recurring" in all_text.lower() or "repeat" in all_text.lower(), "Recurring/repeat references detected.", "Add recurring jobs.")
add("Tradie Flow", "CSV import concepts exist", "csv" in all_text.lower() or "import" in all_text.lower(), "CSV/import references detected.", "Add CSV import.")
add("Tradie Flow", "Client memory fields exist", "gate_code" in all_text or "dogs_or_pets" in all_text or "access_notes" in all_text, "Client memory references detected.", "Add client memory.")
add("Tradie Flow", "Price memory fields exist", "normal_price" in all_text or "last_price" in all_text, "Price memory references detected.", "Add price memory.")
add("Tradie Flow", "Offline queue helper exists", "offline-action-queue" in all_text or "queueOfflineAction" in all_text, "Offline queue helper detected.", "Add offline queue.")

add("UI", "Mobile worker nav exists", "WorkerBottomNav" in front_text, "Worker bottom nav detected.", "Add mobile worker nav.")
add("UI", "Premium components used", "PremiumCard" in front_text and "PremiumButton" in front_text, "Premium components detected.", "Use consistent UI components.")
add("UI", "Light/off-white styling exists", "#f" in front_text or "off-white" in front_text.lower() or "freshCommandLightMode" in front_text, "Light/polish styling detected.", "Polish theme.")
add("UI", "Text visibility safeguards exist", "-webkit-text-fill-color" in front_text or "text-[var(--cx-text)]" in front_text or "freshCommandSlipTitle" in front_text, "Text visibility styles detected.", "Fix hidden text.")
add("UI", "Public pages share document template", "PublicDocumentTemplate.css" in front_text, "Public document template detected.", "Use shared public template.")

add("Launch", "Launch audit exists", exists("docs/CHURVOX_LAUNCH_DONE_AUDIT.md"), "Launch done audit exists.", "Create launch audit.")
add("Launch", "Full wiring audit exists", exists("docs/FULL_WIRING_AUDIT.md") or exists("scripts/audit_full_wiring.py"), "Full wiring audit exists.", "Create wiring audit.")
add("Launch", "Real testing reminders exist", "Real testing still required" in all_text or "real testing" in all_text.lower(), "Real testing reminders detected.", "Add test plan.")

warns = [c for c in checks if c["status"] == "WARN"]
fails = [c for c in checks if c["status"] == "FAIL"]
passes = [c for c in checks if c["status"] == "PASS"]
score = round((len(passes) / len(checks)) * 100)
verdict = "HEARTY ENOUGH FOR REAL TESTING" if score >= 90 and not fails else "NEEDS CORE FIXES BEFORE REAL TESTING"

lines = [
    "# Churvox App Health Audit",
    "",
    f"Generated: {datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')}",
    "",
    f"**Verdict:** {verdict}",
    f"**Score:** {score}%",
    f"**Pass:** {len(passes)}/{len(checks)}",
    f"**Warnings:** {len(warns)}",
    f"**Fails:** {len(fails)}",
    "",
    "| Area | Check | Status | Evidence | Fix |",
    "|---|---|---:|---|---|",
]

for c in checks:
    lines.append(f"| {c['area']} | {c['name']} | **{c['status']}** | {c['evidence']} | {c['fix']} |")

lines += [
    "",
    "## Real testing order",
    "",
    "1. Signup / login / forgot password.",
    "2. Owner creates client, job and worker invite.",
    "3. Worker acknowledges, starts, completes, adds note/photo.",
    "4. Worker sends contact office message; owner sees Command slip.",
    "5. Owner approves work and sends invoice PDF.",
    "6. Customer receives email with PDF attached and public invoice link works.",
]

DOC.write_text("\n".join(lines), encoding="utf-8")
JSON_OUT.write_text(json.dumps({"score": score, "verdict": verdict, "checks": checks}, indent=2), encoding="utf-8")

print("CHURVOX APP HEALTH AUDIT COMPLETE")
print(f"Verdict: {verdict}")
print(f"Score: {score}%")
print(f"Pass: {len(passes)}/{len(checks)}")
print(f"Warnings: {len(warns)}")
print(f"Fails: {len(fails)}")
for c in warns + fails:
    print(f"- [{c['status']}] {c['area']} / {c['name']} — {c['fix']}")
