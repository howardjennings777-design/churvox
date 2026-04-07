from pathlib import Path
import json
import re

ROOT = Path("/workspaces/grassleyapp")

TEXT_EXTS = {".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".html", ".md"}

EXCLUDE_PARTS = [
    "node_modules",
    ".git",
    "dist",
    "build",
    "__pycache__",
    ".next",
    "coverage",
]

EXCLUDE_NAME_PARTS = [
    "_backup",
    "backup_",
    "_before",
    "before_",
    "_old",
    "old_",
    "_temp",
    "temp_",
    "_fix",
    "fix_",
    "_rewrite",
    "rewrite_",
    "_v2",
    "_v3",
    "_v4",
    "_copy",
    "copy_",
]

ALLOWED_TOP = {"backend", "frontend"}

def should_skip(p: Path):
    s = str(p).lower()
    name = p.name.lower()
    if any(part in s for part in EXCLUDE_PARTS):
        return True
    if p.suffix.lower() not in TEXT_EXTS:
        return True
    if not any(part in p.parts for part in ALLOWED_TOP):
        return True
    if any(x in name for x in EXCLUDE_NAME_PARTS):
        return True
    return False

FILES = []
for p in ROOT.rglob("*"):
    if p.is_file() and not should_skip(p):
        try:
            FILES.append((p, p.read_text(errors="ignore")))
        except Exception:
            pass

ALL_TEXT = "\n\n".join(text for _, text in FILES).lower()

def rel(p):
    return str(p.relative_to(ROOT))

def find_files_any(patterns, folder=None):
    hits = []
    for p, text in FILES:
        if folder and folder not in p.parts:
            continue
        low = text.lower()
        if any(pat.lower() in low for pat in patterns):
            hits.append(rel(p))
    return sorted(set(hits))

def find_files_all(patterns, folder=None):
    hits = []
    for p, text in FILES:
        if folder and folder not in p.parts:
            continue
        low = text.lower()
        if all(pat.lower() in low for pat in patterns):
            hits.append(rel(p))
    return sorted(set(hits))

def any_text(*patterns):
    return any(p.lower() in ALL_TEXT for p in patterns)

def count_text(*patterns):
    return sum(1 for p in patterns if p.lower() in ALL_TEXT)

def result(item, passed, why, files=None):
    return {
        "item": item,
        "status": "PASS" if passed else "FAIL",
        "why": why,
        "files": (files or [])[:15]
    }

results = []

# 1. Recurring jobs strict
backend_recurring = find_files_any(["recurring", "repeat_interval", "is_recurring"], folder="backend")
frontend_recurring = find_files_any(["recurring", "weekly", "fortnightly", "monthly"], folder="frontend")
recurring_pass = bool(backend_recurring) and bool(frontend_recurring) and any_text("weekly") and any_text("monthly") and any_text("fortnightly", "biweekly")
results.append(result(
    "Recurring jobs",
    recurring_pass,
    "Needs backend recurring fields/logic and frontend recurring options, not just old scripts.",
    sorted(set(backend_recurring + frontend_recurring))
))

# 2. Time tracking strict
backend_timer = find_files_any([
    "/timer/start", "/timer/pause", "/timer/resume", "/timer/complete",
    "start_tracking", "pause_tracking", "resume_tracking", "complete_tracking",
    "time_entries", "time tracking"
], folder="backend")
frontend_timer = find_files_any([
    "start timer", "pause timer", "resume timer", "complete timer",
    "handleStart", "handlePause", "handleResume", "handleComplete",
    "/timer/", "time tracking"
], folder="frontend")
timer_pass = bool(backend_timer) and bool(frontend_timer)
results.append(result(
    "Time tracking flow",
    timer_pass,
    "Needs backend timer logic and frontend controls.",
    sorted(set(backend_timer + frontend_timer))
))

# 3. Quote to job
backend_quote = find_files_any(["convert to job", "quote to job", "create job from quote"], folder="backend")
frontend_quote = find_files_any(["convert to job", "quote to job"], folder="frontend")
quote_pass = bool(backend_quote) or bool(frontend_quote)
results.append(result(
    "Quote to job conversion",
    quote_pass,
    "Looked for real quote-to-job code in frontend/backend.",
    sorted(set(backend_quote + frontend_quote))
))

# 4. Invoice statuses
invoice_files = find_files_any(["invoice", "draft", "paid", "overdue", "viewed", "sent"])
invoice_pass = any_text("draft") and any_text("paid") and any_text("overdue") and any_text("invoice") and any_text("viewed", "sent")
results.append(result(
    "Invoice statuses",
    invoice_pass,
    "Looked for invoice status support in current files.",
    invoice_files
))

# 5. Plans page extra 50 users
plan_files = find_files_any(["enterprise", "50 users", "$100", "extra user"], folder="frontend")
plan_pass = any_text("50 extra users for $100", "+50 users for $100", "$100 per additional 50-user block", "$100 per extra 50 users")
results.append(result(
    "Plans page extra-user pricing",
    plan_pass,
    "Looked for visible Enterprise extra-user wording in frontend.",
    plan_files
))

# 6. SMS coming soon
sms_frontend = find_files_any(["sms", "coming soon", "quick sms"], folder="frontend")
sms_pass = bool(sms_frontend) and any_text("coming soon")
results.append(result(
    "SMS marked Coming Soon",
    sms_pass,
    "Looked for SMS text in current frontend only.",
    sms_frontend
))

# 7. Legal pages
legal_frontend = find_files_any(["privacy policy", "terms", "legal"], folder="frontend")
legal_backend = find_files_any(["privacy policy", "terms"], folder="backend")
legal_pass = any_text("privacy policy") and any_text("terms")
results.append(result(
    "Legal pages present",
    legal_pass,
    "Looked for current Privacy Policy and Terms content/routes.",
    sorted(set(legal_frontend + legal_backend))
))

# 8. Owner dashboard
owner_frontend = find_files_any(["owner dashboard", "admin dashboard", "platform owner", "total users", "total businesses"], folder="frontend")
owner_backend = find_files_any(["total users", "total businesses", "stats", "admin"], folder="backend")
owner_pass = bool(owner_frontend) and bool(owner_backend)
results.append(result(
    "Owner platform stats",
    owner_pass,
    "Needs owner/admin UI plus backend stats source.",
    sorted(set(owner_frontend + owner_backend))
))

# 9. Tappable navigation
tap_frontend = find_files_any(["onClick", "navigate(", "<Link", "to=", "cursor-pointer"], folder="frontend")
tap_pass = bool(tap_frontend)
results.append(result(
    "General tappable navigation hooks",
    tap_pass,
    "Broad check for clickable/tappable frontend hooks.",
    tap_frontend
))

# 10. Loading/error/empty states
ux_frontend = find_files_any(["loading", "error", "empty", "no data", "try again"], folder="frontend")
ux_pass = bool(ux_frontend) and any_text("loading") and any_text("error")
results.append(result(
    "Loading / error / empty states",
    ux_pass,
    "Looked for visible UI state handling in frontend.",
    ux_frontend
))

# 11. Client phone + reminder mapping
phone_backend = find_files_any(["phone", "phone_number", "mobile", "reminder"], folder="backend")
phone_frontend = find_files_any(["phone", "phone_number", "mobile", "reminder"], folder="frontend")
phone_pass = bool(phone_backend) and bool(phone_frontend)
results.append(result(
    "Client phone/reminder mapping",
    phone_pass,
    "Needs phone fields and reminder references in current app files.",
    sorted(set(phone_backend + phone_frontend))
))

# 12. MYOB
myob_files = find_files_any(["myob"], folder="backend") + find_files_any(["myob"], folder="frontend")
myob_pass = len(myob_files) > 0
results.append(result(
    "MYOB integration present",
    myob_pass,
    "Looked for current MYOB references only.",
    sorted(set(myob_files))
))

passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")

report = {
    "summary": {
        "passed": passed,
        "failed": failed,
        "total": len(results),
        "files_checked": len(FILES),
    },
    "results": results,
}

txt_lines = []
txt_lines.append("CHURVOX STRICT LAUNCH AUDIT")
txt_lines.append("=" * 60)
txt_lines.append(f"FILES CHECKED: {len(FILES)}")
txt_lines.append(f"PASS: {passed}   FAIL: {failed}   TOTAL: {len(results)}")
txt_lines.append("")

for r in results:
    txt_lines.append(f"[{r['status']}] {r['item']}")
    txt_lines.append(f"Why: {r['why']}")
    if r["files"]:
        txt_lines.append("Files:")
        for f in r["files"]:
            txt_lines.append(f"  - {f}")
    else:
        txt_lines.append("Files: none found")
    txt_lines.append("")

(ROOT / "launch_audit_strict_report.json").write_text(json.dumps(report, indent=2))
(ROOT / "launch_audit_strict_report.txt").write_text("\n".join(txt_lines))

print("\n".join(txt_lines))
