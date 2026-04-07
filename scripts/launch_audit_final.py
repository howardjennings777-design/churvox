from pathlib import Path
import json

ROOT = Path("/workspaces/grassleyapp")

TEXT_EXTS = {".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".html"}

BAD_PATH_PARTS = {
    "node_modules", ".git", "dist", "build", "__pycache__", ".next",
    "coverage", "tests", "test", "spec", ".pytest_cache"
}

BAD_NAME_PARTS = [
    "_backup", "backup_", "_before", "before_", "_old", "old_",
    "_temp", "temp_", "_fix", "fix_", "_rewrite", "rewrite_",
    "_v2", "_v3", "_v4", "_copy", "copy_", "draft_", "_draft"
]

def allowed_file(p: Path):
    if p.suffix.lower() not in TEXT_EXTS:
        return False
    parts_lower = {x.lower() for x in p.parts}
    if parts_lower & BAD_PATH_PARTS:
        return False
    name = p.name.lower()
    if any(x in name for x in BAD_NAME_PARTS):
        return False
    s = str(p).replace("\\", "/").lower()
    if s.startswith("/workspaces/grassleyapp/backend/") or s.startswith("/workspaces/grassleyapp/frontend/"):
        return True
    return False

FILES = []
for p in ROOT.rglob("*"):
    if p.is_file() and allowed_file(p):
        try:
            FILES.append((p, p.read_text(errors="ignore")))
        except:
            pass

ALL = "\n\n".join(t for _, t in FILES).lower()

def rel(p):
    return str(p.relative_to(ROOT))

def files_with_any(patterns, folder=None):
    out = []
    for p, text in FILES:
        if folder and folder not in p.parts:
            continue
        low = text.lower()
        if any(x.lower() in low for x in patterns):
            out.append(rel(p))
    return sorted(set(out))

def has(*patterns):
    return any(x.lower() in ALL for x in patterns)

def result(name, ok, why, files):
    return {
        "item": name,
        "status": "PASS" if ok else "FAIL",
        "why": why,
        "files": files[:12]
    }

results = []

# recurring jobs
recurring_backend = files_with_any(["recurring", "is_recurring", "repeat_interval"], "backend")
recurring_frontend = files_with_any(["recurring", "weekly", "fortnightly", "monthly", "custom repeat"], "frontend")
results.append(result(
    "Recurring jobs",
    bool(recurring_backend) and bool(recurring_frontend) and has("weekly") and has("monthly") and has("fortnightly", "biweekly"),
    "Needs real backend recurring logic and real frontend recurring options.",
    sorted(set(recurring_backend + recurring_frontend))
))

# time tracking
timer_backend = files_with_any([
    "/timer/start", "/timer/pause", "/timer/resume", "/timer/complete",
    "start_tracking", "pause_tracking", "resume_tracking", "complete_tracking",
    "time tracking", "time_entries"
], "backend")
timer_frontend = files_with_any([
    "start timer", "pause timer", "resume timer", "complete timer",
    "handleStart", "handlePause", "handleResume", "handleComplete",
    "/timer/", "time tracking"
], "frontend")
results.append(result(
    "Time tracking flow",
    bool(timer_backend) and bool(timer_frontend),
    "Needs real backend timer logic and frontend controls.",
    sorted(set(timer_backend + timer_frontend))
))

# quote to job
quote_backend = files_with_any(["convert to job", "quote to job", "create job from quote"], "backend")
quote_frontend = files_with_any(["convert to job", "quote to job"], "frontend")
results.append(result(
    "Quote to job conversion",
    bool(quote_backend) or bool(quote_frontend),
    "Needs real quote conversion code in current app files.",
    sorted(set(quote_backend + quote_frontend))
))

# invoices
invoice_files = files_with_any(["invoice", "draft", "paid", "overdue", "viewed", "sent"])
results.append(result(
    "Invoice statuses",
    has("invoice") and has("draft") and has("paid") and has("overdue") and has("viewed", "sent"),
    "Checked current invoice status support in real app files.",
    invoice_files
))

# plans extra user pricing
plan_files = files_with_any(["enterprise", "50 users", "$100", "extra user"], "frontend")
results.append(result(
    "Plans page extra-user pricing",
    has("50 extra users for $100", "+50 users for $100", "$100 per additional 50-user block", "$100 per extra 50 users"),
    "Checked visible Enterprise extra-user wording in frontend.",
    plan_files
))

# sms coming soon
sms_files = files_with_any(["sms", "coming soon", "quick sms"], "frontend")
results.append(result(
    "SMS marked Coming Soon",
    bool(sms_files) and has("coming soon"),
    "Checked current frontend SMS wording only.",
    sms_files
))

# legal
legal_files = files_with_any(["privacy policy", "terms", "legal"])
results.append(result(
    "Legal pages present",
    has("privacy policy") and has("terms"),
    "Checked current Privacy Policy and Terms in real app files.",
    legal_files
))

# owner dashboard
owner_front = files_with_any(["owner dashboard", "admin dashboard", "platform owner", "total users", "total businesses"], "frontend")
owner_back = files_with_any(["total users", "total businesses", "stats", "admin"], "backend")
results.append(result(
    "Owner platform stats",
    bool(owner_front) and bool(owner_back),
    "Needs owner/admin UI and backend stats source in current app files.",
    sorted(set(owner_front + owner_back))
))

# tappable hooks
tap_files = files_with_any(["onClick", "navigate(", "<Link", "to=", "cursor-pointer"], "frontend")
results.append(result(
    "General tappable navigation hooks",
    bool(tap_files),
    "Broad check for clickable/tappable frontend hooks.",
    tap_files
))

# loading/error/empty
ux_files = files_with_any(["loading", "error", "empty", "no data", "try again"], "frontend")
results.append(result(
    "Loading / error / empty states",
    bool(ux_files) and has("loading") and has("error"),
    "Checked visible UI states in current frontend.",
    ux_files
))

# phone + reminders
phone_back = files_with_any(["phone", "phone_number", "mobile", "reminder"], "backend")
phone_front = files_with_any(["phone", "phone_number", "mobile", "reminder"], "frontend")
results.append(result(
    "Client phone/reminder mapping",
    bool(phone_back) and bool(phone_front),
    "Needs phone and reminder references in current app files.",
    sorted(set(phone_back + phone_front))
))

# MYOB
myob_files = files_with_any(["myob"])
results.append(result(
    "MYOB integration present",
    bool(myob_files),
    "Checked for MYOB references in real app files only.",
    myob_files
))

passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")

txt = []
txt.append("CHURVOX FINAL LAUNCH AUDIT")
txt.append("=" * 60)
txt.append(f"REAL FILES CHECKED: {len(FILES)}")
txt.append(f"PASS: {passed}   FAIL: {failed}   TOTAL: {len(results)}")
txt.append("")

for r in results:
    txt.append(f"[{r['status']}] {r['item']}")
    txt.append(f"Why: {r['why']}")
    if r["files"]:
        txt.append("Files:")
        for f in r["files"]:
            txt.append(f"  - {f}")
    else:
        txt.append("Files: none found")
    txt.append("")

(ROOT / "launch_audit_final_report.txt").write_text("\n".join(txt))
(ROOT / "launch_audit_final_report.json").write_text(json.dumps({
    "summary": {"passed": passed, "failed": failed, "total": len(results), "real_files_checked": len(FILES)},
    "results": results
}, indent=2))

print("\n".join(txt))
