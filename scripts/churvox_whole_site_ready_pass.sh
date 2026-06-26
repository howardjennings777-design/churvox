#!/usr/bin/env bash
set -u

SITE="${SITE:-https://www.churvox.com}"
API="${API:-https://grassley-backend.onrender.com}"
OUT="${OUT:-frontend/public/deploy-checks/churvox-whole-site-ready-pass-20260627.txt}"

mkdir -p "$(dirname "$OUT")"
: > "$OUT"

pass=0
warn=0
check=0
fail=0

line() { echo "$*" | tee -a "$OUT"; }

record() {
  local status="$1"
  local label="$2"
  local detail="${3:-}"
  case "$status" in
    PASS) pass=$((pass+1));;
    WARN) warn=$((warn+1));;
    CHECK) check=$((check+1));;
    FAIL) fail=$((fail+1));;
  esac
  if [ -n "$detail" ]; then
    line "[$status] $label — $detail"
  else
    line "[$status] $label"
  fi
}

file_ok() {
  local label="$1"
  local file="$2"
  if [ -f "$file" ]; then
    record PASS "$label" "$file"
  else
    record FAIL "$label" "$file missing"
  fi
}

url_ok() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local status
  status="$(curl -L -s -o /tmp/churvox_whole_site_body.txt -w "%{http_code}" "$url" || true)"
  if echo "$expected" | grep -qw "$status"; then
    record PASS "$label" "HTTP $status"
  else
    record CHECK "$label" "HTTP $status at $url"
  fi
}

grep_absent() {
  local label="$1"
  local pattern="$2"
  shift 2
  local hits
  hits="$(grep -RIn "$pattern" "$@" 2>/dev/null || true)"
  if [ -z "$hits" ]; then
    record PASS "$label" "no matches"
  else
    record CHECK "$label" "matches found"
    echo "$hits" | tee -a "$OUT"
  fi
}

grep_present() {
  local label="$1"
  local pattern="$2"
  shift 2
  local hits
  hits="$(grep -RIn "$pattern" "$@" 2>/dev/null | head -8 || true)"
  if [ -n "$hits" ]; then
    record PASS "$label" "found"
    echo "$hits" | tee -a "$OUT"
  else
    record CHECK "$label" "not found"
  fi
}

line "Churvox whole-site ready pass"
line "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
line "Site: $SITE"
line "API: $API"
line ""
line "Promise being tested: Job done. Admin prepared. Owner approves."
line ""

line "===== A) Core app files exist ====="
file_ok "App shell / navigation" "frontend/src/churvox-fresh/FreshShell.jsx"
file_ok "Plan rules / navigation gating" "frontend/src/churvox-fresh/planRules.js"
file_ok "Command operating system" "frontend/src/churvox-fresh/FreshCommandOperatingSystem.jsx"
file_ok "Owner Health Check layer" "frontend/src/churvox-fresh/FreshTopNineOperatingLayer.jsx"
file_ok "Owner Health Check styles" "frontend/src/churvox-fresh/freshTopNineOperatingLayer.css"
file_ok "Jobs page" "frontend/src/churvox-fresh/FreshJobs.jsx"
file_ok "Clients page" "frontend/src/churvox-fresh/FreshClients.jsx"
file_ok "Quotes page" "frontend/src/churvox-fresh/FreshQuotes.jsx"
file_ok "Invoices page" "frontend/src/churvox-fresh/FreshInvoices.jsx"
file_ok "Team page" "frontend/src/churvox-fresh/FreshTeam.jsx"
file_ok "Worker proof / worker command" "frontend/src/churvox-fresh/FreshWorkerCommand.jsx"
file_ok "Plans page" "frontend/src/churvox-fresh/FreshPlans.jsx"
file_ok "Imports page" "frontend/src/churvox-fresh/FreshImports.jsx"
file_ok "Support / help page" "frontend/src/churvox-fresh/FreshHelpDesk.jsx"
file_ok "Accounting sync / Xero page" "frontend/src/churvox-fresh/FreshXero.jsx"
file_ok "Backend server" "backend/server.py"
file_ok "Timer backend patch" "backend/churvox_job_timer_routes_patch.py"
line ""

line "===== B) Product flow checks in source ====="
grep_present "Smart Hub labels exist" "Smart Hub" frontend/src/churvox-fresh
grep_present "Mobile quick actions exist" "New job\|Add client\|Approve" frontend/src/churvox-fresh/FreshShell.jsx
grep_present "Owner approval language exists" "Owner approval\|owner approval\|approve" frontend/src/churvox-fresh
grep_present "Worker proof language exists" "Worker Proof\|proof\|Acknowledge\|acknowledge" frontend/src/churvox-fresh
grep_present "Invoice-ready/admin debt language exists" "invoice-ready\|Admin Debt\|admin debt\|Ready to invoice\|ready to invoice" frontend/src/churvox-fresh
grep_present "Accounting sync owner wording exists" "Accounting Sync\|Accounting sync\|owner-approved\|draft sync" frontend/src/churvox-fresh
line ""

line "===== C) Customer-facing wording cleanup ====="
grep_absent "No builder-facing Top 9 title" "Top 9 owner operating layer\|Build Churvox around what owners actually want" frontend/src/churvox-fresh
grep_absent "No public launch wording in Owner Health UI" "Launch checklist for the 9 things\|Launch readiness report\|Build/test next" frontend/src/churvox-fresh/FreshTopNineOperatingLayer.jsx
grep_absent "No old visible MYOB sales wording" "MYOB included\|For bigger teams needing MYOB\|MYOB and Xero clarity\|Xero or MYOB sync\|Choose MYOB or Xero\|Adds Xero or MYOB\|MYOB live sync" frontend/src/churvox-fresh frontend/src/config
grep_absent "No old non-Xero-page Xero sync wording" "No send or Xero sync\|Draft only .* Xero sync\|Xero sync help" frontend/src/churvox-fresh
line ""

line "===== D) CSV/import readiness ====="
for f in \
  frontend/public/import-templates/churvox-clients-template.csv \
  frontend/public/import-templates/churvox-team-template.csv \
  frontend/public/import-templates/churvox-jobs-template.csv \
  frontend/public/import-templates/churvox-quotes-template.csv \
  frontend/public/import-templates/churvox-invoices-template.csv
do
  file_ok "CSV template" "$f"
done
line ""

line "===== E) Backend compile ====="
python3 - <<'PY' 2>&1 | tee /tmp/churvox_whole_site_backend_compile.txt
from pathlib import Path
import py_compile
import sys

files = [
    "backend/server.py",
    "backend/churvox_ai_action_limit.py",
    "backend/churvox_billing_plan_confirm_patch.py",
    "backend/churvox_job_timer_routes_patch.py",
    "backend/churvox_monthly_job_limit.py",
    "backend/churvox_plan_checkout_form_patch.py",
    "backend/churvox_plan_usage_routes.py",
    "backend/churvox_team_client_limit_patch.py",
]
failed = []
for file in files:
    p = Path(file)
    if not p.exists():
        print(f"SKIP missing {file}")
        continue
    try:
        py_compile.compile(str(p), doraise=True)
        print(f"OK compile {file}")
    except Exception as e:
        print(f"FAIL compile {file}: {e}")
        failed.append(file)
if failed:
    sys.exit(1)
PY

if [ "${PIPESTATUS[0]}" = "0" ]; then
  record PASS "Backend compile" "key backend files compile"
else
  record FAIL "Backend compile" "see output above"
fi
line ""

line "===== F) Live route smoke ====="
url_ok "Main site" "$SITE/" "200"
url_ok "Dashboard / Smart Hub route" "$SITE/dashboard" "200"
url_ok "Plans route" "$SITE/plans" "200"
url_ok "Clients CSV live" "$SITE/import-templates/churvox-clients-template.csv" "200"
url_ok "Team CSV live" "$SITE/import-templates/churvox-team-template.csv" "200"
url_ok "Jobs CSV live" "$SITE/import-templates/churvox-jobs-template.csv" "200"
url_ok "Quotes CSV live" "$SITE/import-templates/churvox-quotes-template.csv" "200"
url_ok "Invoices CSV live" "$SITE/import-templates/churvox-invoices-template.csv" "200"
url_ok "Auth/me protected route" "$API/api/auth/me" "200 401 403"
url_ok "Accounting/Xero status protected route" "$API/api/xero/status" "200 401 403"
line ""

line "===== G) Whole-site manual test order ====="
record CHECK "1. Signup/login/logout" "Create user, verify session, logout, login again."
record CHECK "2. Setup/business basics" "Business name, branding/settings, timezone/GST where relevant."
record CHECK "3. Client flow" "Add client, edit client, open detail modal/sheet, import client CSV."
record CHECK "4. Team/worker flow" "Add worker, confirm worker can see assigned work only."
record CHECK "5. Job flow" "Create job, assign worker, schedule it, edit it, open details."
record CHECK "6. Worker proof flow" "Acknowledge, start, pause, resume, add note/photo/proof, complete."
record CHECK "7. Quote flow" "Create quote, review it, convert or continue to job."
record CHECK "8. Invoice flow" "Completed job becomes invoice-ready, draft invoice review works."
record CHECK "9. Command flow" "Check for work, review proof, approve, needs edit, park for now."
record CHECK "10. Money/admin debt" "Unpaid/overdue/payment status/admin debt makes sense."
record CHECK "11. Accounting sync" "Xero page says draft sync only and owner-approved."
record CHECK "12. Plans/pricing" "Start/Crew/Operator/Command and add-on wording are clear."
record CHECK "13. Imports/exports" "CSV templates download and imports handle comma/semicolon/tab."
record CHECK "14. Help/support" "Owner can ask for help and support wording feels human."
record CHECK "15. Mobile pass" "Phone/tablet: buttons tappable, modals scroll, bottom nav does not block actions."
record CHECK "16. Public/customer portal" "Public quote/client links do not expose owner-only controls."
line ""

line "===== H) What still needs polish if tests feel rough ====="
line "- If users feel lost: make Smart Hub simpler and put only Today, Money waiting, Approvals, and Setup gaps first."
line "- If workers struggle: strip worker view down to My Jobs, Acknowledge, Start/Pause, Complete, Proof."
line "- If Command feels busy: show fewer slips and make the approve/edit/park buttons bigger."
line "- If invoicing feels hidden: add a louder Ready to invoice badge on completed jobs."
line "- If pricing feels scary: make trial/no-card/no-surprise-sync wording clearer."
line "- If support feels cold: add a simple 'Need help setting this up?' card."
line ""

line "===== Summary ====="
line "PASS: $pass"
line "WARN: $warn"
line "CHECK: $check"
line "FAIL: $fail"
line ""

if [ "$fail" -gt 0 ]; then
  line "Result: FIX FAIL ITEMS BEFORE MANUAL TEST."
elif [ "$check" -gt 0 ]; then
  line "Result: READY FOR WHOLE-SITE MANUAL TEST PASS."
else
  line "Result: READY."
fi
