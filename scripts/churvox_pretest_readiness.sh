#!/usr/bin/env bash
set -u

SITE="${SITE:-https://www.churvox.com}"
API="${API:-https://grassley-backend.onrender.com}"
OUT="${OUT:-frontend/public/deploy-checks/churvox-pretest-readiness-20260627.txt}"

mkdir -p "$(dirname "$OUT")"

pass_count=0
check_count=0
warn_count=0
fail_count=0

line() { echo "$*" | tee -a "$OUT"; }

reset_report() {
  : > "$OUT"
  line "Churvox pre-test readiness report"
  line "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  line "Site: $SITE"
  line "API: $API"
  line ""
}

record() {
  local status="$1"
  local label="$2"
  local detail="${3:-}"
  case "$status" in
    PASS) pass_count=$((pass_count+1));;
    CHECK) check_count=$((check_count+1));;
    WARN) warn_count=$((warn_count+1));;
    FAIL) fail_count=$((fail_count+1));;
  esac
  if [ -n "$detail" ]; then
    line "[$status] $label — $detail"
  else
    line "[$status] $label"
  fi
}

check_file() {
  local label="$1"
  local file="$2"
  if [ -f "$file" ]; then
    record PASS "$label" "$file exists"
  else
    record FAIL "$label" "$file missing"
  fi
}

check_url() {
  local label="$1"
  local url="$2"
  local good_codes="$3"
  local status
  status="$(curl -L -s -o /tmp/churvox_pretest_body.txt -w "%{http_code}" "$url" || true)"
  if echo "$good_codes" | grep -qw "$status"; then
    record PASS "$label" "HTTP $status"
  else
    record CHECK "$label" "HTTP $status at $url"
  fi
}

check_grep_absent() {
  local label="$1"
  local pattern="$2"
  shift 2
  local result
  result="$(grep -RIn "$pattern" "$@" 2>/dev/null || true)"
  if [ -z "$result" ]; then
    record PASS "$label" "no matches"
  else
    record CHECK "$label" "matches found:"
    echo "$result" | tee -a "$OUT"
  fi
}

reset_report

line "===== A) Required files ====="
check_file "Command operating system" "frontend/src/churvox-fresh/FreshCommandOperatingSystem.jsx"
check_file "Top 9 owner layer" "frontend/src/churvox-fresh/FreshTopNineOperatingLayer.jsx"
check_file "Top 9 styles" "frontend/src/churvox-fresh/freshTopNineOperatingLayer.css"
check_file "Plans page" "frontend/src/churvox-fresh/FreshPlans.jsx"
check_file "Jobs page" "frontend/src/churvox-fresh/FreshJobs.jsx"
check_file "Worker Command" "frontend/src/churvox-fresh/FreshWorkerCommand.jsx"
check_file "Xero page" "frontend/src/churvox-fresh/FreshXero.jsx"
check_file "Backend server" "backend/server.py"
check_file "Timer backend patch" "backend/churvox_job_timer_routes_patch.py"
line ""

line "===== B) Backend compile ====="
python3 - <<'PY' 2>&1 | tee /tmp/churvox_pretest_backend_compile.txt
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
  record FAIL "Backend compile" "see compile output above"
fi
line ""

line "===== C) Static source audits ====="
check_grep_absent "No old visible MYOB wording" "MYOB included\|For bigger teams needing MYOB\|MYOB and Xero clarity\|Xero or MYOB sync\|Choose MYOB or Xero\|Adds Xero or MYOB\|MYOB live sync" frontend/src/churvox-fresh frontend/src/config
check_grep_absent "No old non-Xero-page Xero sync wording" "No send or Xero sync\|Draft only .* Xero sync\|Xero sync help" frontend/src/churvox-fresh
line ""

line "===== D) Required public templates ====="
for f in \
  frontend/public/import-templates/churvox-clients-template.csv \
  frontend/public/import-templates/churvox-team-template.csv \
  frontend/public/import-templates/churvox-jobs-template.csv \
  frontend/public/import-templates/churvox-quotes-template.csv \
  frontend/public/import-templates/churvox-invoices-template.csv
do
  check_file "CSV template" "$f"
done
line ""

line "===== E) Live site smoke ====="
check_url "Main site" "$SITE/" "200"
check_url "Dashboard route" "$SITE/dashboard" "200"
check_url "Plans route" "$SITE/plans" "200"
check_url "Clients template live" "$SITE/import-templates/churvox-clients-template.csv" "200"
check_url "Team template live" "$SITE/import-templates/churvox-team-template.csv" "200"
check_url "Jobs template live" "$SITE/import-templates/churvox-jobs-template.csv" "200"
check_url "Quotes template live" "$SITE/import-templates/churvox-quotes-template.csv" "200"
check_url "Invoices template live" "$SITE/import-templates/churvox-invoices-template.csv" "200"
check_url "Backend auth/me protected route" "$API/api/auth/me" "401 403 200"
check_url "Xero status protected route" "$API/api/xero/status" "401 403 200"
line ""

line "===== F) Recent deploy markers ====="
for marker in \
  churvox-mobile-tap-polish-20260627.txt \
  churvox-sms-coming-soon-20260627.txt \
  churvox-no-myob-and-archive-cleanup-20260627.txt \
  churvox-accounting-wording-cleanup-20260627.txt \
  churvox-timer-launch-audit-20260627.txt \
  churvox-launch-smoke-test-20260627.txt \
  churvox-top-9-owner-layer-20260627.txt \
  churvox-top-9-pain-playbook-20260627.txt \
  churvox-top-9-launch-checklist-20260627.txt \
  churvox-top-9-checklist-progress-20260627.txt \
  churvox-top-9-launch-report-20260627.txt
do
  status="$(curl -L -s -o /dev/null -w "%{http_code}" "$SITE/deploy-checks/$marker" || true)"
  if [ "$status" = "200" ]; then
    record PASS "Marker $marker" "HTTP 200"
  elif [ "$status" = "404" ]; then
    record WARN "Marker $marker" "HTTP 404; likely pending deploy or skipped marker"
  else
    record CHECK "Marker $marker" "HTTP $status"
  fi
done
line ""

line "===== G) Manual test list still required ====="
record CHECK "Manual test 1" "Create a client, edit it, open details modal/sheet."
record CHECK "Manual test 2" "Create a worker, check worker view, acknowledge job."
record CHECK "Manual test 3" "Create job, assign worker, start/pause/resume/complete."
record CHECK "Manual test 4" "Completed job creates/appears as invoice-ready."
record CHECK "Manual test 5" "Create quote, convert/continue to job flow."
record CHECK "Manual test 6" "Command: Check for work, approve/edit/park an item."
record CHECK "Manual test 7" "Top 9 checklist ticks save after refresh."
record CHECK "Manual test 8" "Launch report copies/saves locally."
record CHECK "Manual test 9" "Plans page shows correct pricing and accounting wording."
record CHECK "Manual test 10" "Xero connection/status page stays owner-approved draft sync only."
record CHECK "Manual test 11" "Mobile: sidebar, modal taps, buttons, and scroll behaviour."
record CHECK "Manual test 12" "Signup/login/logout/forgot password flow."
line ""

line "===== Summary ====="
line "PASS: $pass_count"
line "WARN: $warn_count"
line "CHECK: $check_count"
line "FAIL: $fail_count"
line ""

if [ "$fail_count" -gt 0 ]; then
  line "Result: NOT READY FOR MANUAL TEST PASS — fix FAIL items first."
elif [ "$check_count" -gt 0 ]; then
  line "Result: READY FOR MANUAL TEST PASS — code/build checks passed, now do the manual tests above."
else
  line "Result: READY."
fi
