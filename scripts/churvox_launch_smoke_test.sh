#!/usr/bin/env bash
set -u

SITE="${SITE:-https://www.churvox.com}"
API="${API:-https://grassley-backend.onrender.com}"
OUT="${OUT:-frontend/public/deploy-checks/churvox-launch-smoke-test-20260627.txt}"

mkdir -p "$(dirname "$OUT")"

{
  echo "Churvox launch smoke test"
  echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Site: $SITE"
  echo "API: $API"
  echo

  check_url() {
    local label="$1"
    local url="$2"
    echo "--- $label ---"
    echo "$url"
    local status
    status="$(curl -L -s -o /tmp/churvox_smoke_body.txt -w "%{http_code}" "$url" || true)"
    echo "HTTP $status"
    if [ "$status" = "200" ] || [ "$status" = "204" ] || [ "$status" = "401" ] || [ "$status" = "403" ]; then
      echo "PASS"
    else
      echo "CHECK"
    fi
    echo
  }

  check_url "Main site" "$SITE/"
  check_url "Dashboard route fallback" "$SITE/dashboard"
  check_url "Plans route fallback" "$SITE/plans"
  check_url "Invoice CSV template" "$SITE/import-templates/churvox-invoices-template.csv"
  check_url "Clients CSV template" "$SITE/import-templates/churvox-clients-template.csv"
  check_url "Jobs CSV template" "$SITE/import-templates/churvox-jobs-template.csv"
  check_url "Team CSV template" "$SITE/import-templates/churvox-team-template.csv"
  check_url "Quotes CSV template" "$SITE/import-templates/churvox-quotes-template.csv"

  check_url "Backend root" "$API/"
  check_url "Backend auth/me protected check" "$API/api/auth/me"
  check_url "Xero status protected check" "$API/api/xero/status"

  echo "--- Build markers expected live ---"
  for marker in \
    churvox-mobile-tap-polish-20260627.txt \
    churvox-sms-coming-soon-20260627.txt \
    churvox-no-myob-and-archive-cleanup-20260627.txt \
    churvox-accounting-wording-cleanup-20260627.txt \
    churvox-timer-launch-audit-20260627.txt
  do
    url="$SITE/deploy-checks/$marker"
    status="$(curl -L -s -o /dev/null -w "%{http_code}" "$url" || true)"
    echo "$marker -> HTTP $status"
  done

  echo
  echo "--- Notes ---"
  echo "HTTP 200 means public file/page is live."
  echo "HTTP 401/403 on protected API checks is acceptable because it means the backend route exists and is protected."
  echo "HTTP 404 or 5xx needs review."
} | tee "$OUT"

echo
echo "Smoke test report written to: $OUT"
