#!/usr/bin/env bash
set -u

echo "===== Churvox customer-ready source audit ====="

BAD_PUBLIC_WORDING='Top 9 owner operating layer|Build Churvox around what owners actually want|Launch readiness report|Launch checklist|Build/test next|Human E2E|human test|test pass|deploy marker|deploy-checks|test-data/churvox-test'

echo ""
echo "===== 1) Customer UI build/test wording ====="
if grep -RInE "$BAD_PUBLIC_WORDING" frontend/src/churvox-fresh frontend/src/pages frontend/src/components 2>/dev/null; then
  echo "CHECK: customer-facing build/test wording still found above."
else
  echo "PASS: no obvious customer-facing build/test wording found."
fi

echo ""
echo "===== 2) Public clutter ====="
PUBLIC_HITS="$(find frontend/public -maxdepth 3 -type f \( -path "*/deploy-checks/*" -o -path "*/test-data/*" \) -print 2>/dev/null || true)"
if [ -n "$PUBLIC_HITS" ]; then
  echo "$PUBLIC_HITS"
  echo "CHECK: public test/deploy clutter still exists above."
else
  echo "PASS: no public deploy-check or test-data files found."
fi

echo ""
echo "===== 3) Old visible accounting wording ====="
if grep -RInE "MYOB included|For bigger teams needing MYOB|MYOB and Xero clarity|Xero or MYOB sync|Choose MYOB or Xero|Adds Xero or MYOB|MYOB live sync" frontend/src/churvox-fresh frontend/src/config 2>/dev/null; then
  echo "CHECK: old visible accounting wording still found above."
else
  echo "PASS: old visible accounting sales wording not found."
fi

echo ""
echo "===== 4) Business Health marker ====="
grep -RIn "CHURVOX_BUSINESS_HEALTH_MARKER_20260627\|Business Health" frontend/src/churvox-fresh/FreshTopNineOperatingLayer.jsx frontend/src/churvox-fresh/freshTopNineOperatingLayer.css || true

echo ""
echo "===== 5) Core approval promise check ====="
grep -RIn "Churvox prepares the admin\|owner approves\|Owner approves\|approve" frontend/src/churvox-fresh/FreshCommandOperatingSystem.jsx frontend/src/churvox-fresh/FreshTopNineOperatingLayer.jsx | head -40 || true

echo ""
echo "===== DONE ====="
