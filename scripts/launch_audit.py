from pathlib import Path
import re
import json

ROOT = Path("/workspaces/grassleyapp")

TEXT_EXTS = {".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".css", ".html"}

def read_text_files(root: Path):
    files = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(x in str(p) for x in ["node_modules", ".git", "dist", "build", "__pycache__"]):
            continue
        if p.suffix.lower() in TEXT_EXTS:
            try:
                files.append((p, p.read_text(errors="ignore")))
            except Exception:
                pass
    return files

FILES = read_text_files(ROOT)
ALL_TEXT = "\n\n".join(text for _, text in FILES)

def find_files(patterns, must_all=False):
    hits = []
    for p, text in FILES:
        low = text.lower()
        checks = [(pat.lower() in low) for pat in patterns]
        ok = all(checks) if must_all else any(checks)
        if ok:
            hits.append(str(p.relative_to(ROOT)))
    return hits

def has_any(*patterns):
    low = ALL_TEXT.lower()
    return any(p.lower() in low for p in patterns)

def has_all(*patterns):
    low = ALL_TEXT.lower()
    return all(p.lower() in low for p in patterns)

def route_exists(path_fragment):
    pats = [
        f'@api_router.get("{path_fragment}"',
        f"@api_router.get('{path_fragment}'",
        f'@api_router.post("{path_fragment}"',
        f"@api_router.post('{path_fragment}'",
        f'@router.get("{path_fragment}"',
        f"@router.get('{path_fragment}'",
        f'@router.post("{path_fragment}"',
        f"@router.post('{path_fragment}'",
        f'path="{path_fragment}"',
        f"path='{path_fragment}'",
        f'to="{path_fragment}"',
        f"to='{path_fragment}'",
        f'navigate("{path_fragment}"',
        f"navigate('{path_fragment}'",
    ]
    return has_any(*pats)

def classify(name, passed, why, files=None):
    status = "PASS" if passed else "FAIL"
    return {
        "item": name,
        "status": status,
        "why": why,
        "files": sorted(set(files or []))[:12],
    }

results = []

# 1. Recurring jobs
recurring_keywords = [
    "recurring", "repeat_interval", "repeat every", "fortnightly", "weekly", "monthly", "custom repeat"
]
recurring_files = find_files(recurring_keywords)
recurring_pass = (
    has_any("recurring", "repeat_interval", "is_recurring")
    and has_any("weekly")
    and has_any("fortnightly", "biweekly")
    and has_any("monthly")
)
results.append(classify(
    "Recurring jobs",
    recurring_pass,
    "Looked for recurring job fields/options and schedule words like weekly, fortnightly, and monthly.",
    recurring_files
))

# 2. Timer routes / actions
timer_files = find_files(["start timer", "pause timer", "resume timer", "complete timer", "/time-entries", "/timer", "time tracking"])
timer_pass = (
    has_any("start timer", "/timer/start", "/time/start", "start_tracking", "start_time_tracking")
    and has_any("pause timer", "/timer/pause", "/time/pause", "pause_tracking", "pause_time_tracking")
    and has_any("resume timer", "/timer/resume", "/time/resume", "resume_tracking", "resume_time_tracking")
    and has_any("complete timer", "/timer/complete", "/time/complete", "complete_tracking", "stop_time_tracking")
)
results.append(classify(
    "Time tracking flow",
    timer_pass,
    "Checked for start, pause, resume, and complete timer actions/endpoints.",
    timer_files
))

# 3. Invoice statuses
invoice_files = find_files(["invoice", "overdue", "viewed", "paid", "draft"])
invoice_pass = has_all("invoice") and has_any("draft") and has_any("paid") and has_any("overdue") and has_any("viewed", "sent")
results.append(classify(
    "Invoice statuses",
    invoice_pass,
    "Checked for invoice support including draft/sent-viewed/paid/overdue markers.",
    invoice_files
))

# 4. Quote -> job
quote_files = find_files(["quote", "convert to job", "quote to job"])
quote_pass = has_any("convert to job", "quote to job", "create job from quote")
results.append(classify(
    "Quote to job conversion",
    quote_pass,
    "Checked for code paths or labels that convert quotes into jobs.",
    quote_files
))

# 5. Owner dashboard / platform
owner_files = find_files(["owner dashboard", "admin dashboard", "platform owner", "total users", "real stats"])
owner_pass = has_any("owner dashboard", "platform owner", "admin dashboard") and has_any("total users", "total businesses", "stats")
results.append(classify(
    "Owner platform stats",
    owner_pass,
    "Checked for owner/admin dashboard plus real stats labels.",
    owner_files
))

# 6. Plans page extra 50 users
plan_files = find_files(["solo", "team", "pro", "enterprise", "50 users", "$100"])
plan_pass = has_any("50 extra users for $100", "+50 users for $100", "$100 per additional 50-user block", "$100 per extra 50 users")
results.append(classify(
    "Plans page extra-user pricing",
    plan_pass,
    "Checked for Enterprise extra-user wording.",
    plan_files
))

# 7. SMS coming soon
sms_files = find_files(["sms", "coming soon", "quick sms"])
sms_pass = has_any("sms") and has_any("coming soon") and has_any("quick sms", "sms reminders", "sms")
results.append(classify(
    "SMS marked Coming Soon",
    sms_pass,
    "Checked that SMS exists and is marked Coming Soon in the UI text.",
    sms_files
))

# 8. Legal / privacy / terms
legal_files = find_files(["privacy policy", "terms", "legal", "policy"])
legal_pass = has_any("privacy policy") and has_any("terms")
results.append(classify(
    "Legal pages present",
    legal_pass,
    "Checked for Privacy Policy and Terms content/routes.",
    legal_files
))

# 9. Tap targets / onClick / links on cards
tap_files = find_files(["onclick", "navigate(", "Link to=", "router-link", "cursor-pointer"])
tap_pass = has_any("onclick", "navigate(", "cursor-pointer", "<Link", "to=")
results.append(classify(
    "General tappable navigation hooks",
    tap_pass,
    "Broad check for click/tap navigation hooks in frontend files.",
    tap_files
))

# 10. Loading / error / empty states
ux_files = find_files(["loading", "error", "empty", "no data", "try again"])
ux_pass = has_any("loading") and has_any("error") and has_any("no data", "empty", "nothing here")
results.append(classify(
    "Loading / error / empty states",
    ux_pass,
    "Checked for loading, error, and empty-state copy/components.",
    ux_files
))

# 11. Client phone for reminders
phone_files = find_files(["phone", "mobile", "client.phone", "phone_number", "reminder"])
phone_pass = has_any("phone_number", "client.phone", "mobile", "phone") and has_any("reminder")
results.append(classify(
    "Client phone/reminder mapping",
    phone_pass,
    "Checked for phone fields and reminder logic references.",
    phone_files
))

# 12. MYOB sync mentions
myob_files = find_files(["myob", "invoice sync", "payment sync"])
myob_pass = has_any("myob")
results.append(classify(
    "MYOB integration present",
    myob_pass,
    "Checked for MYOB integration code or config references.",
    myob_files
))

passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")

report = {
    "summary": {
        "passed": passed,
        "failed": failed,
        "total": len(results),
    },
    "results": results
}

out_json = ROOT / "launch_audit_report.json"
out_txt = ROOT / "launch_audit_report.txt"

out_json.write_text(json.dumps(report, indent=2))

lines = []
lines.append("CHURVOX LAUNCH AUDIT")
lines.append("=" * 60)
lines.append(f"PASS: {passed}   FAIL: {failed}   TOTAL: {len(results)}")
lines.append("")

for r in results:
    lines.append(f"[{r['status']}] {r['item']}")
    lines.append(f"Why: {r['why']}")
    if r["files"]:
        lines.append("Files:")
        for f in r["files"]:
            lines.append(f"  - {f}")
    else:
        lines.append("Files: none found")
    lines.append("")

out_txt.write_text("\n".join(lines))

print(out_txt.read_text())
print(f"\nSaved: {out_txt}")
print(f"Saved: {out_json}")
