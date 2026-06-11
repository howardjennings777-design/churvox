from pathlib import Path
import re
from datetime import datetime

ROOT = Path(".")
REPORT = ROOT / "docs" / "COMMAND_WIRING_AUDIT.md"

TEXT_EXTS = {
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".py", ".json", ".md", ".css", ".env", ".yml", ".yaml"
}

SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", ".next", ".cache",
    "coverage", ".vercel", ".render", "__pycache__"
}

def should_scan(path: Path) -> bool:
    if any(part in SKIP_DIRS for part in path.parts):
        return False
    if path.suffix not in TEXT_EXTS:
        return False
    return path.is_file()

files = []
for path in ROOT.rglob("*"):
    if should_scan(path):
        try:
            text = path.read_text(errors="ignore")
        except Exception:
            continue
        files.append((path, text))

def rel(path: Path) -> str:
    return str(path).replace("\\", "/")

def find_files(patterns, limit=60):
    out = []
    for path, text in files:
        hay = (rel(path) + "\n" + text).lower()
        if all(p.lower() in hay for p in patterns):
            out.append(rel(path))
    return sorted(set(out))[:limit]

def grep(pattern, limit=80):
    rx = re.compile(pattern, re.I)
    hits = []
    for path, text in files:
        for i, line in enumerate(text.splitlines(), start=1):
            if rx.search(line):
                hits.append((rel(path), i, line.strip()[:220]))
                if len(hits) >= limit:
                    return hits
    return hits

def exists_any(words):
    joined = "\n".join(rel(p) + "\n" + t for p, t in files).lower()
    return any(w.lower() in joined for w in words)

def count_any(words):
    joined = "\n".join(rel(p) + "\n" + t for p, t in files).lower()
    return sum(joined.count(w.lower()) for w in words)

def status(ok, warn=False):
    if ok:
        return "✅ PASS"
    if warn:
        return "⚠️ PARTIAL"
    return "❌ MISSING"

def status_from_hits(hits, partial=False):
    return status(bool(hits), warn=partial and bool(hits))

backend_files = [rel(p) for p, _ in files if rel(p).startswith(("backend/", "server/", "api/"))]
frontend_files = [rel(p) for p, _ in files if rel(p).startswith("frontend/")]

express_routes = grep(r"\b(router|app)\.(get|post|put|patch|delete)\s*\(", 200)
mounted_routes = grep(r"\bapp\.use\s*\(", 120)
frontend_api_calls = grep(r"\b(fetch|axios|api\.)\s*\(", 200)

command_files = find_files(["command"], 120)
job_files = find_files(["job"], 80)
invoice_files = find_files(["invoice"], 80)
quote_files = find_files(["quote"], 80)
worker_files = find_files(["worker"], 80)
client_files = find_files(["client"], 80)

localstorage_command = grep(r"localStorage.*command|COMMAND_INBOX|fresh-command-inbox", 80)
backend_command = [
    h for h in grep(r"command|approval|operator", 250)
    if h[0].startswith(("backend/", "server/", "api/"))
]
frontend_command_backend_calls = [
    h for h in frontend_api_calls
    if re.search(r"command|approval|operator", h[2], re.I)
]

command_model_hits = grep(r"(CommandSlip|ApprovalSlip|OperatorAction|CommandAction|approvalSchema|commandSchema)", 100)
approval_endpoint_hits = grep(r"(approve|approval|decline|ignore|snooze).*(router|app)\.(post|patch|put)|\.(post|patch|put).*(approve|approval|decline|ignore|snooze)", 160)
audit_hits = grep(r"(audit|history|approvedAt|approvedBy|snoozeUntil|ignoredAt)", 160)

job_complete_hits = grep(r"(complete|completed|finish|finished).*(job|jobs)|jobs?.*(complete|completed|finish|finished)", 160)
invoice_overdue_hits = grep(r"(overdue|dueDate|paid|paymentStatus|invoiceStatus)", 180)
quote_followup_hits = grep(r"(quote).*(follow|accepted|sent|status)|(follow).*(quote)", 160)
worker_ack_hits = grep(r"(acknowledge|acknowledged|worker|assignedTo|assignee)", 180)

business_isolation_hits = grep(r"(businessId|business|tenant|req\.user|ownerId|companyId)", 180)
auth_hits = grep(r"(requireAuth|authMiddleware|authenticate|jwt|cookie|session|req\.user)", 180)

csv_hits = grep(r"(csv|import|export|template)", 180)
stripe_hits = grep(r"(stripe|checkout|webhook|plan|subscription)", 180)
myob_xero_hits = grep(r"(myob|xero)", 120)

checks = [
    ("Command visible in frontend", bool(command_files), "Command files/routes exist in the frontend."),
    ("Command backend routes", bool(backend_command), "Backend has command/approval/operator references."),
    ("Command uses backend API", bool(frontend_command_backend_calls), "Frontend Command calls backend for slips/actions."),
    ("Command currently uses localStorage", bool(localstorage_command), "Preview/local storage is present. Fine for demo, not enough for launch."),
    ("Command/approval data model", bool(command_model_hits), "There is a dedicated Command/Approval/Operator action model/schema."),
    ("Approve/ignore/snooze endpoints", bool(approval_endpoint_hits), "Backend has owner decision endpoints."),
    ("Audit/history wiring", bool(audit_hits), "Approvals/snoozes/owner actions are recorded."),
    ("Job complete trigger", bool(job_complete_hits), "Jobs can create Command slips after completion."),
    ("Invoice overdue trigger", bool(invoice_overdue_hits), "Invoices have due/paid/overdue fields or logic."),
    ("Quote follow-up trigger", bool(quote_followup_hits), "Quotes can trigger follow-up actions."),
    ("Worker acknowledge trigger", bool(worker_ack_hits), "Worker acknowledgement/assignment exists."),
    ("Business isolation", bool(business_isolation_hits), "Business/tenant scoping appears in code."),
    ("Auth wiring", bool(auth_hits), "Protected endpoints/session/user auth appears in code."),
    ("CSV import/export", bool(csv_hits), "CSV import/export/template wiring exists somewhere."),
    ("Stripe plan/payment wiring", bool(stripe_hits), "Stripe/plan/subscription wiring exists somewhere."),
    ("MYOB/Xero integration references", bool(myob_xero_hits), "Accounting integration references exist."),
]

def list_block(title, items, max_items=25):
    lines = [f"### {title}", ""]
    if not items:
        lines.append("_No matches found._")
        lines.append("")
        return lines
    for item in items[:max_items]:
        if isinstance(item, tuple):
            path, line, snippet = item
            lines.append(f"- `{path}:{line}` — `{snippet}`")
        else:
            lines.append(f"- `{item}`")
    if len(items) > max_items:
        lines.append(f"- …and {len(items) - max_items} more")
    lines.append("")
    return lines

passes = sum(1 for _, ok, _ in checks if ok)
missing = len(checks) - passes

likely_preview_only = bool(localstorage_command) and not bool(frontend_command_backend_calls)
real_command_ready = bool(backend_command and frontend_command_backend_calls and command_model_hits and approval_endpoint_hits)

lines = []
lines.append("# Command Wiring Audit")
lines.append("")
lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
lines.append("")
lines.append("## Executive summary")
lines.append("")
lines.append(f"- Checks passed by keyword/route scan: **{passes}/{len(checks)}**")
lines.append(f"- Checks missing or unclear: **{missing}/{len(checks)}**")
lines.append(f"- Frontend files scanned: **{len(frontend_files)}**")
lines.append(f"- Backend/API files scanned: **{len(backend_files)}**")
lines.append("")

if real_command_ready:
    lines.append("**Audit result:** Command appears to have real backend wiring. Next step is test each action end-to-end.")
elif likely_preview_only:
    lines.append("**Audit result:** Command still looks mostly preview/localStorage based. Next step is backend Command slips + approval endpoints.")
else:
    lines.append("**Audit result:** Command is partly wired, but backend action flow needs confirming and testing.")
lines.append("")

lines.append("## Wiring checklist")
lines.append("")
lines.append("| Area | Status | Meaning |")
lines.append("|---|---:|---|")
for name, ok, meaning in checks:
    if name == "Command currently uses localStorage" and ok:
        st = "⚠️ PREVIEW"
    else:
        st = status(ok)
    lines.append(f"| {name} | {st} | {meaning} |")
lines.append("")

lines.append("## Command launch wiring target")
lines.append("")
lines.append("For Command to be real, this chain must work:")
lines.append("")
lines.append("1. Backend scans real business data.")
lines.append("2. Backend creates Command slips from jobs, invoices, quotes, workers, customers, messages and setup gaps.")
lines.append("3. Frontend Command loads slips from backend, not localStorage only.")
lines.append("4. Owner approves/edits/snoozes/ignores.")
lines.append("5. Backend performs the real action or stores the owner decision.")
lines.append("6. Audit/history records who did what and when.")
lines.append("7. Command updates counts immediately.")
lines.append("")

lines.append("## Required backend slip rules")
lines.append("")
lines.append("| Source | Creates slip when | Needed action type |")
lines.append("|---|---|---|")
lines.append("| Jobs | completed job has no invoice | `create_invoice_from_job` / `review_invoice` |")
lines.append("| Jobs | worker note/photo suggests extra work | `approve_invoice_extra` |")
lines.append("| Invoices | due date passed and not paid | `send_payment_reminder` |")
lines.append("| Quotes | sent but no reply after X days | `send_quote_followup` |")
lines.append("| Workers | assigned job not acknowledged | `send_worker_brief` / `worker_ack_reminder` |")
lines.append("| Clients | recurring customer overdue | `send_rebooking_message` |")
lines.append("| Messages | booking/payment/complaint detected | `send_customer_message` |")
lines.append("| Setup | GST/invoice/business details missing | `fix_setup_step` |")
lines.append("")

lines.append("## Minimum backend endpoints needed")
lines.append("")
lines.append("```txt")
lines.append("GET    /api/command/slips")
lines.append("POST   /api/command/scan")
lines.append("POST   /api/command/slips/:id/approve")
lines.append("PATCH  /api/command/slips/:id/edit")
lines.append("POST   /api/command/slips/:id/snooze")
lines.append("POST   /api/command/slips/:id/ignore")
lines.append("GET    /api/command/events")
lines.append("GET    /api/command/audit")
lines.append("```")
lines.append("")

lines.append("## Minimum CommandSlip fields")
lines.append("")
lines.append("```js")
lines.append("{")
lines.append("  businessId,")
lines.append("  sourceType,      // job | invoice | quote | worker | client | message | setup")
lines.append("  sourceId,")
lines.append("  actionType,")
lines.append("  title,")
lines.append("  found,")
lines.append("  prepared,")
lines.append("  why,")
lines.append("  urgency,")
lines.append("  status,          // open | edited | approved | snoozed | ignored | completed")
lines.append("  payload,         // invoice/message/job fields")
lines.append("  snoozeUntil,")
lines.append("  audit: [{ by, action, at, before, after }],")
lines.append("}")
lines.append("```")
lines.append("")

lines += list_block("Command-related files", command_files, 40)
lines += list_block("Backend command/operator/approval matches", backend_command, 40)
lines += list_block("Command localStorage/preview matches", localstorage_command, 40)
lines += list_block("Frontend API calls mentioning Command/approval/operator", frontend_command_backend_calls, 40)
lines += list_block("Possible route definitions", express_routes, 60)
lines += list_block("Mounted Express routes", mounted_routes, 40)
lines += list_block("Job completion wiring hits", job_complete_hits, 40)
lines += list_block("Invoice overdue/payment hits", invoice_overdue_hits, 40)
lines += list_block("Quote follow-up hits", quote_followup_hits, 40)
lines += list_block("Worker acknowledge/assignment hits", worker_ack_hits, 40)
lines += list_block("Auth/business isolation hits", business_isolation_hits[:80], 60)
lines += list_block("CSV/import/export hits", csv_hits, 40)
lines += list_block("Stripe/plan/payment hits", stripe_hits, 40)
lines += list_block("MYOB/Xero hits", myob_xero_hits, 40)

lines.append("## Recommended build order")
lines.append("")
lines.append("### Step 1 — Backend Command model")
lines.append("- Add `CommandSlip` model/schema.")
lines.append("- Include `businessId`, `sourceType`, `sourceId`, `actionType`, `payload`, `status`, `urgency`, `audit`.")
lines.append("")
lines.append("### Step 2 — Backend Command routes")
lines.append("- Add list, scan, approve, edit, snooze, ignore and events endpoints.")
lines.append("- Every route must require auth and filter by business.")
lines.append("")
lines.append("### Step 3 — Source scanners")
lines.append("- Jobs scanner: completed/no invoice, extra notes/photos.")
lines.append("- Invoices scanner: overdue/unpaid.")
lines.append("- Quotes scanner: sent/no reply.")
lines.append("- Workers scanner: not acknowledged.")
lines.append("- Setup scanner: missing invoice/business/GST/accounting settings.")
lines.append("")
lines.append("### Step 4 — Frontend Command API")
lines.append("- Replace localStorage read/write with backend calls.")
lines.append("- Keep localStorage only as demo fallback.")
lines.append("")
lines.append("### Step 5 — Action execution")
lines.append("- Approval must either perform the real action or create a safe pending action.")
lines.append("- Edit must update the payload before approval.")
lines.append("- Snooze must reappear after `snoozeUntil`.")
lines.append("")
lines.append("### Step 6 — End-to-end test")
lines.append("- Create client → job → complete → invoice slip appears.")
lines.append("- Mark invoice overdue → payment reminder slip appears.")
lines.append("- Send quote → wait/force stale → quote follow-up slip appears.")
lines.append("- Assign worker → not acknowledged → worker reminder slip appears.")
lines.append("")

REPORT.write_text("\n".join(lines), encoding="utf-8")

print("")
print("COMMAND WIRING AUDIT COMPLETE")
print(f"Report: {REPORT}")
print(f"Checks passed: {passes}/{len(checks)}")
print(f"Missing/unclear: {missing}/{len(checks)}")
if real_command_ready:
    print("Result: real backend Command wiring appears present; test end-to-end.")
elif likely_preview_only:
    print("Result: Command looks mostly preview/localStorage based; backend wiring needed.")
else:
    print("Result: Command is partly wired; inspect report for gaps.")
print("")
