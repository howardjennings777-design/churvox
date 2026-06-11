#!/usr/bin/env python3
from pathlib import Path
import re
import json
from datetime import datetime

ROOT = Path.cwd()
FRONTEND = ROOT / "frontend" / "src"
BACKEND_DIRS = [ROOT / "backend", ROOT / "server", ROOT / "api"]
DOC = ROOT / "docs" / "FULL_WIRING_AUDIT.md"
JSON_OUT = ROOT / "docs" / "full_wiring_audit.json"

TEXT_EXTS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}
FRONT_EXTS = {".js", ".jsx", ".ts", ".tsx"}
BACK_EXTS = {".js", ".ts", ".mjs", ".cjs"}

SKIP_DIRS = {
    "node_modules", "build", "dist", ".git", ".next", ".cache",
    "coverage", ".turbo", ".vercel"
}

def iter_files(base, exts):
    if not base.exists():
        return []
    out = []
    for p in base.rglob("*"):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.suffix in exts:
            out.append(p)
    return sorted(out)

frontend_files = iter_files(FRONTEND, FRONT_EXTS)
backend_files = []
for d in BACKEND_DIRS:
    backend_files += iter_files(d, BACK_EXTS)
backend_files = sorted(set(backend_files))

all_files = frontend_files + backend_files

def read(p):
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""

def rel(p):
    try:
        return str(p.relative_to(ROOT))
    except Exception:
        return str(p)

def find(pattern, files, flags=re.I | re.S):
    rx = re.compile(pattern, flags)
    hits = []
    for p in files:
        text = read(p)
        for m in rx.finditer(text):
            line = text[:m.start()].count("\n") + 1
            sample = " ".join(m.group(0).strip().split())[:240]
            hits.append({"file": rel(p), "line": line, "sample": sample})
    return hits

def contains_any(files, patterns):
    hits = []
    for p in files:
        text = read(p)
        found = []
        for name, pat in patterns:
            if re.search(pat, text, re.I | re.S):
                found.append(name)
        if found:
            hits.append({"file": rel(p), "found": found})
    return hits

def route_inventory():
    routes = []
    route_rx = re.compile(r'(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', re.I)
    app_use_rx = re.compile(r'app\.use\s*\(\s*[\'"`]([^\'"`]+)[\'"`]\s*,\s*([A-Za-z0-9_]+)', re.I)
    for p in backend_files:
        text = read(p)
        for m in route_rx.finditer(text):
            routes.append({
                "method": m.group(1).upper(),
                "path": m.group(2),
                "file": rel(p),
                "line": text[:m.start()].count("\n") + 1,
            })
        for m in app_use_rx.finditer(text):
            routes.append({
                "method": "USE",
                "path": m.group(1),
                "handler": m.group(2),
                "file": rel(p),
                "line": text[:m.start()].count("\n") + 1,
            })
    return routes

def frontend_api_inventory():
    calls = []
    fetch_rx = re.compile(r'(?:fetch|axios\.(?:get|post|put|patch|delete)|api\.(?:get|post|put|patch|delete))\s*\(\s*([`\'"])(.*?)\1', re.I | re.S)
    for p in frontend_files:
        text = read(p)
        for m in fetch_rx.finditer(text):
            url = m.group(2).strip()
            if "/api" in url or url.startswith("${") or "API" in url.upper():
                calls.append({
                    "url": url[:180],
                    "file": rel(p),
                    "line": text[:m.start()].count("\n") + 1,
                    "sample": " ".join(text[m.start():m.start()+220].split())
                })
    return calls

def button_inventory():
    buttons = []
    rx = re.compile(r'<button\b([^>]*)>(.*?)</button>', re.I | re.S)
    for p in frontend_files:
        text = read(p)
        for m in rx.finditer(text):
            attrs = " ".join(m.group(1).split())
            label = re.sub(r'<[^>]+>', ' ', m.group(2))
            label = " ".join(label.split())[:120]
            line = text[:m.start()].count("\n") + 1
            suspicious = []
            if "onClick" not in attrs and "type=\"submit\"" not in attrs and "type='submit'" not in attrs:
                suspicious.append("no obvious onClick/submit")
            if "onClick" in attrs and ("onNavigate" in attrs or "navigate" in attrs.lower()) and not re.search(r'fetch|axios|api\.', text[max(0,m.start()-500):m.end()+500], re.I):
                suspicious.append("appears navigation-only near button")
            if re.search(r'Send to Command|Approve|Save|Send|Invite|Email|Verify|Checkout|Pay|Create|Delete|Complete|Start', label, re.I):
                important = True
            else:
                important = False
            if important or suspicious:
                buttons.append({
                    "file": rel(p),
                    "line": line,
                    "label": label,
                    "attrs": attrs[:200],
                    "suspicious": suspicious,
                })
    return buttons

routes = route_inventory()
api_calls = frontend_api_inventory()
buttons = button_inventory()

route_text = "\n".join([f'{r["method"]} {r["path"]} {r["file"]}' for r in routes])
front_text = "\n".join(read(p) for p in frontend_files)
back_text = "\n".join(read(p) for p in backend_files)

def has_backend_route(method, path_bits):
    method = method.upper()
    for r in routes:
        if r["method"] != method:
            continue
        full = r["path"].lower()
        if all(bit.lower() in full for bit in path_bits):
            return True
    return False

def has_any_backend_path(bits):
    for r in routes:
        full = (r["path"] + " " + r.get("file", "")).lower()
        if all(bit.lower() in full for bit in bits):
            return True
    return False

def has_front(bits):
    text = front_text.lower()
    return all(bit.lower() in text for bit in bits)

def has_back(bits):
    text = back_text.lower()
    return all(bit.lower() in text for bit in bits)

checks = []

def add(category, name, status, severity, evidence="", recommendation=""):
    checks.append({
        "category": category,
        "name": name,
        "status": status,
        "severity": severity,
        "evidence": evidence,
        "recommendation": recommendation,
    })

# Command checks
add(
    "Command",
    "Command backend route mounted",
    "PASS" if has_any_backend_path(["command"]) and re.search(r'app\.use\s*\(\s*[\'"`]/api/command', back_text, re.I) else "FAIL",
    "High",
    "Looks for app.use('/api/command', ...).",
    "Mount backend commandRoutes at /api/command."
)

add(
    "Command",
    "Command has create slip endpoint",
    "PASS" if has_backend_route("POST", ["slips"]) and has_any_backend_path(["command"]) else "FAIL",
    "High",
    "Looks for POST route containing slips.",
    "Add POST /api/command/slips so Send to Command creates real backend slips."
)

add(
    "Command",
    "Frontend Command reads backend slips",
    "PASS" if re.search(r'/api/command.*/slips|COMMAND_API_BASE\s*=\s*[\'"`]/api/command', front_text, re.I | re.S) else "FAIL",
    "High",
    "Looks for /api/command/slips or COMMAND_API_BASE.",
    "Command page should load slips from backend and only fallback to preview."
)

add(
    "Command",
    "Send to Command bridge exists",
    "PASS" if "sendFreshSlipToCommand" in front_text and "postFreshSlipToCommand" in front_text else "FAIL",
    "High",
    "Looks for shared frontend bridge.",
    "Create shared bridge used by all Send to Command buttons."
)

send_to_command_files = find(r'Send to Command|send.*Command|COMMAND_INBOX_KEY|fresh-command-inbox', frontend_files)
local_storage_command = [h for h in send_to_command_files if "COMMAND_INBOX_KEY" in h["sample"] or "fresh-command-inbox" in h["sample"]]
add(
    "Command",
    "No localStorage-only Command sends left",
    "PASS" if not local_storage_command else "WARN",
    "Medium",
    f"{len(local_storage_command)} localStorage Command references found.",
    "Old preview localStorage can remain as fallback, but every Send to Command button should also call backend bridge."
)

# Auth/signup/email checks
add(
    "Signup/Auth",
    "Signup/register backend route exists",
    "PASS" if has_any_backend_path(["register"]) or has_any_backend_path(["signup"]) else "FAIL",
    "High",
    "Looks for register/signup route.",
    "Add or verify POST /api/auth/register or /api/auth/signup."
)

add(
    "Signup/Auth",
    "Frontend signup calls backend",
    "PASS" if re.search(r'fetch\s*\([^)]*(register|signup)|axios\.post\s*\([^)]*(register|signup)|api\.post\s*\([^)]*(register|signup)', front_text, re.I | re.S) else "FAIL",
    "High",
    "Looks for frontend register/signup API call.",
    "Signup form must POST to backend, not only navigate."
)

email_provider_patterns = [
    ("Postmark", r'postmark|POSTMARK'),
    ("Resend", r'resend|RESEND'),
    ("SendGrid", r'sendgrid|SENDGRID'),
    ("SMTP/Nodemailer", r'nodemailer|SMTP_'),
]
email_provider_hits = contains_any(backend_files + frontend_files, email_provider_patterns)
add(
    "Emails",
    "Email provider code/config present",
    "PASS" if email_provider_hits else "FAIL",
    "High",
    "Looks for Postmark/Resend/SendGrid/Nodemailer.",
    "Wire transactional email provider for verification, welcome, forgot password and invites."
)

add(
    "Emails",
    "Email verification flow present",
    "PASS" if re.search(r'verify.*email|email.*verify|verificationToken|verifyEmail|emailVerified', back_text + front_text, re.I | re.S) else "FAIL",
    "High",
    "Looks for verify email tokens/flags/routes.",
    "Signup should send verification email and block/limit unverified accounts."
)

add(
    "Emails",
    "Forgot password email flow present",
    "PASS" if re.search(r'forgot.*password|reset.*password|password.*reset|resetToken', back_text + front_text, re.I | re.S) else "FAIL",
    "High",
    "Looks for forgot/reset password routes/tokens.",
    "Forgot password should generate token, email link, and reset password safely."
)

add(
    "Emails",
    "Team invite email flow present",
    "PASS" if re.search(r'invite.*email|email.*invite|send.*invite|team.*invite|worker.*invite', back_text + front_text, re.I | re.S) else "WARN",
    "Medium",
    "Looks for team/worker invite email code.",
    "Adding staff should send an invite email automatically."
)

# API/auth/cookies
add(
    "Security/Auth",
    "Credentials/cookies used from frontend",
    "PASS" if re.search(r'credentials\s*:\s*[\'"`]include[\'"`]|withCredentials\s*:\s*true', front_text, re.I) else "WARN",
    "High",
    "Looks for credentials include/withCredentials.",
    "Frontend API calls need credentials for secure-cookie auth."
)

add(
    "Security/Auth",
    "Backend CORS allows credentials",
    "PASS" if re.search(r'credentials\s*:\s*true', back_text, re.I) and re.search(r'cors\s*\(', back_text, re.I) else "WARN",
    "High",
    "Looks for CORS credentials true.",
    "Backend CORS must allow credentials from www.churvox.com."
)

add(
    "Security/Auth",
    "Secure cookie settings present",
    "PASS" if re.search(r'sameSite\s*:\s*[\'"`]none[\'"`]|secure\s*:\s*true|httpOnly\s*:\s*true', back_text, re.I) else "WARN",
    "High",
    "Looks for SameSite/Secure/httpOnly.",
    "Production cookies should be httpOnly, secure, SameSite=None."
)

# Stripe/plans
add(
    "Billing",
    "Stripe checkout/backend route present",
    "PASS" if re.search(r'stripe|checkout\.sessions|create.*checkout|STRIPE', back_text, re.I | re.S) else "WARN",
    "High",
    "Looks for Stripe backend code.",
    "Plan checkout should be backend-created and persist selected plan after success."
)

add(
    "Billing",
    "Frontend plans/checkout present",
    "PASS" if re.search(r'checkout|stripe|plans', front_text, re.I) else "WARN",
    "Medium",
    "Looks for checkout/plans frontend.",
    "Plans page should create checkout session and show current plan."
)

# Forms/buttons
important_buttons = [b for b in buttons if re.search(r'Send to Command|Approve|Save|Send|Invite|Email|Verify|Checkout|Pay|Create|Delete|Complete|Start', b["label"], re.I)]
suspicious_buttons = [b for b in important_buttons if b["suspicious"]]
add(
    "Frontend buttons",
    "Important buttons have handlers",
    "PASS" if not suspicious_buttons else "WARN",
    "High",
    f"{len(important_buttons)} important buttons scanned; {len(suspicious_buttons)} suspicious.",
    "Review suspicious buttons so no important button is visual-only."
)

# Backend/frontend endpoint matching rough pass
backend_paths = set()
for r in routes:
    if r["method"] in {"GET","POST","PUT","PATCH","DELETE"}:
        p = r["path"]
        if p != "/":
            backend_paths.add(p)

front_api_urls = [c["url"] for c in api_calls]
add(
    "Frontend/API",
    "Frontend API calls inventory found",
    "PASS" if front_api_urls else "WARN",
    "Medium",
    f"{len(front_api_urls)} frontend API calls found.",
    "Every API call should map to a backend route and handle loading/error states."
)

# Local preview/data checks
local_storage_hits = find(r'localStorage|sessionStorage|demo|preview|mock|starter-|sample', frontend_files + backend_files)
add(
    "Launch readiness",
    "Preview/demo/localStorage usage reviewed",
    "WARN" if local_storage_hits else "PASS",
    "Medium",
    f"{len(local_storage_hits)} preview/demo/storage references found.",
    "Keep fallback storage only where intentional; remove fake demo data from launch-critical flows."
)

# Score
weights = {"High": 3, "Medium": 2, "Low": 1}
score_total = sum(weights.get(c["severity"], 1) for c in checks)
score_pass = sum(weights.get(c["severity"], 1) for c in checks if c["status"] == "PASS")
score_warn = sum(weights.get(c["severity"], 1) for c in checks if c["status"] == "WARN")
score_fail = sum(weights.get(c["severity"], 1) for c in checks if c["status"] == "FAIL")
percent = round((score_pass / score_total) * 100) if score_total else 0

# Detail sections
def section_hits(title, hits, limit=80):
    lines = [f"## {title}", ""]
    if not hits:
        lines.append("No hits found.")
        lines.append("")
        return lines
    for h in hits[:limit]:
        if "sample" in h:
            lines.append(f"- `{h['file']}:{h.get('line','')}` — {h['sample']}")
        else:
            lines.append(f"- `{h['file']}` — {h}")
    if len(hits) > limit:
        lines.append(f"- … {len(hits)-limit} more")
    lines.append("")
    return lines

lines = []
lines.append("# Full Backend / Frontend Wiring Audit")
lines.append("")
lines.append(f"Generated: {datetime.utcnow().isoformat(timespec='seconds')}Z")
lines.append("")
lines.append("## Verdict")
lines.append("")
if percent >= 85 and score_fail == 0:
    verdict = "Strong wiring position. Mostly launch-polish and live testing remain."
elif percent >= 65:
    verdict = "Partly wired. Some important launch flows still need verification/fixes."
else:
    verdict = "Not launch-ready. Too many important flows are missing or preview-only."
lines.append(f"**Score:** {percent}%")
lines.append(f"**Weighted pass:** {score_pass}/{score_total}")
lines.append(f"**Weighted warn:** {score_warn}")
lines.append(f"**Weighted fail:** {score_fail}")
lines.append(f"**Verdict:** {verdict}")
lines.append("")
lines.append("## Check Results")
lines.append("")
lines.append("| Category | Check | Status | Severity | Evidence | Recommendation |")
lines.append("|---|---|---:|---:|---|---|")
for c in checks:
    lines.append(f"| {c['category']} | {c['name']} | **{c['status']}** | {c['severity']} | {c['evidence']} | {c['recommendation']} |")
lines.append("")

lines.append("## Backend Route Inventory")
lines.append("")
if routes:
    lines.append("| Method | Path | File | Line |")
    lines.append("|---|---|---|---:|")
    for r in routes[:220]:
        lines.append(f"| {r['method']} | `{r['path']}` | `{r['file']}` | {r['line']} |")
    if len(routes) > 220:
        lines.append(f"| … | … | {len(routes)-220} more routes | |")
else:
    lines.append("No backend routes found.")
lines.append("")

lines.append("## Frontend API Call Inventory")
lines.append("")
if api_calls:
    lines.append("| URL/Target | File | Line |")
    lines.append("|---|---|---:|")
    for c in api_calls[:220]:
        lines.append(f"| `{c['url']}` | `{c['file']}` | {c['line']} |")
    if len(api_calls) > 220:
        lines.append(f"| … | {len(api_calls)-220} more API calls | |")
else:
    lines.append("No frontend API calls found.")
lines.append("")

lines.append("## Important Button Inventory")
lines.append("")
if important_buttons:
    lines.append("| Label | File | Line | Notes |")
    lines.append("|---|---|---:|---|")
    for b in important_buttons[:250]:
        notes = ", ".join(b["suspicious"]) if b["suspicious"] else "handler/submit detected"
        lines.append(f"| {b['label'] or '(empty)'} | `{b['file']}` | {b['line']} | {notes} |")
    if len(important_buttons) > 250:
        lines.append(f"| … | {len(important_buttons)-250} more buttons | | |")
else:
    lines.append("No important buttons found.")
lines.append("")

lines += section_hits("Send to Command / Local Command Storage Hits", send_to_command_files, 120)
lines += section_hits("Preview / Demo / Local Storage Hits", local_storage_hits, 120)

lines.append("## What To Fix First")
lines.append("")
failures = [c for c in checks if c["status"] == "FAIL"]
warnings = [c for c in checks if c["status"] == "WARN"]
priority = failures + warnings
if not priority:
    lines.append("No major wiring failures detected by static audit. Next step is live browser/API testing.")
else:
    for i, c in enumerate(priority[:12], 1):
        lines.append(f"{i}. **{c['category']} — {c['name']}**: {c['recommendation']}")
lines.append("")

report = "\n".join(lines)
DOC.write_text(report, encoding="utf-8")

raw = {
    "generated": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    "score_percent": percent,
    "score_pass": score_pass,
    "score_warn": score_warn,
    "score_fail": score_fail,
    "score_total": score_total,
    "checks": checks,
    "routes": routes,
    "api_calls": api_calls,
    "important_buttons": important_buttons,
    "send_to_command_hits": send_to_command_files,
    "preview_storage_hits": local_storage_hits,
}
JSON_OUT.write_text(json.dumps(raw, indent=2), encoding="utf-8")

print("")
print("FULL WIRING AUDIT COMPLETE")
print(f"Score: {percent}%")
print(f"Pass weight: {score_pass}/{score_total}")
print(f"Warn weight: {score_warn}")
print(f"Fail weight: {score_fail}")
print(f"Backend routes: {len(routes)}")
print(f"Frontend API calls: {len(api_calls)}")
print(f"Important buttons: {len(important_buttons)}")
print(f"Send to Command hits: {len(send_to_command_files)}")
print(f"Preview/demo/storage hits: {len(local_storage_hits)}")
print("")
print(f"Report: {DOC}")
print(f"JSON:   {JSON_OUT}")
print("")
print("Top issues:")
for c in (failures + warnings)[:10]:
    print(f"- [{c['status']}] {c['category']} / {c['name']} — {c['recommendation']}")
