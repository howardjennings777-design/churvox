#!/usr/bin/env bash
set -u

ROOT="/workspaces/churvox"
OUT="$ROOT/AUDIT_REPORT.md"
RAW="$ROOT/audit_raw"
mkdir -p "$RAW"

cd "$ROOT" || exit 1

echo "# Churvox Full Audit Report" > "$OUT"
echo "" >> "$OUT"
echo "Generated: $(date)" >> "$OUT"
echo "" >> "$OUT"

section () {
  echo "" >> "$OUT"
  echo "## $1" >> "$OUT"
  echo "" >> "$OUT"
}

run () {
  local name="$1"
  shift
  echo "### $name" >> "$OUT"
  echo '```text' >> "$OUT"
  "$@" >> "$OUT" 2>&1 || true
  echo '```' >> "$OUT"
  echo "" >> "$OUT"
}

section "1. Git state"
run "Current branch and latest commits" bash -lc 'git branch --show-current && git log --oneline -12'
run "Uncommitted changes" bash -lc 'git status --short'
run "Remote main" bash -lc 'git ls-remote origin main'

section "2. Conflict markers and broken merge leftovers"
run "Conflict markers" bash -lc 'grep -RIn "<<<<<<<\|=======\|>>>>>>>" frontend backend package.json render.yaml 2>/dev/null || echo "No conflict markers found"'

section "3. Frontend build"
run "Frontend package scripts" bash -lc 'cat frontend/package.json | sed -n "/\"scripts\"/,/},/p"'
run "Frontend build" bash -lc 'npm run --prefix frontend build'

section "4. Live website deploy trace"
run "Live /plans JS trace" bash -lc '
HTML="$(curl -sL https://www.churvox.com/plans || true)"
JS="$(printf "%s" "$HTML" | grep -o "/static/js/main[^\"[:space:]]*\.js" | head -1)"
echo "JS=$JS"
if [ -n "$JS" ]; then
  curl -sL "https://www.churvox.com$JS" | grep -o "checkout-js-trace[^\"[:space:]]*" | sort -u || echo "No checkout trace found in live JS"
else
  echo "Could not find main JS"
fi
'

section "5. Backend route inventory and duplicates"
python3 - <<'PY' > "$RAW/routes.txt"
import re, pathlib, collections
root = pathlib.Path("/workspaces/churvox/backend")
pat = re.compile(r'@(api_router|router|app)\.(get|post|put|patch|delete)\(["\']([^"\']+)["\']')
routes = []
for p in root.rglob("*.py"):
    try:
        text = p.read_text(errors="ignore").splitlines()
    except Exception:
        continue
    for i, line in enumerate(text, 1):
        m = pat.search(line)
        if m:
            routes.append((m.group(2).upper(), m.group(3), str(p.relative_to(root)), i))
for method, route, file, line in sorted(routes, key=lambda x: (x[1], x[0], x[2], x[3])):
    print(f"{method:6} {route:55} {file}:{line}")
print("\nDUPLICATES:")
count = collections.defaultdict(list)
for item in routes:
    count[(item[0], item[1])].append(item)
for key, vals in sorted(count.items()):
    if len(vals) > 1:
        print(f"{key[0]} {key[1]}")
        for v in vals:
            print(f"  - {v[2]}:{v[3]}")
PY
run "All backend routes and duplicates" cat "$RAW/routes.txt"

section "6. Stripe and Plans audit"
run "All checkout route references" bash -lc 'grep -RIn "create-checkout-session\|start-checkout-form\|confirm-checkout\|billing/success\|checkout.session.create\|checkout.Session.create" backend frontend/src 2>/dev/null || true'
run "Card-forcing Stripe settings" bash -lc 'grep -RIn "payment_method_types=.*card\|payment_method_types.*card\|payment_method_collection\|trial_period_days\|trial_settings" backend frontend/src 2>/dev/null || true'
run "Plans frontend trace and checkout function" bash -lc 'grep -RIn "checkout-js-trace\|function startCheckout\|async function startCheckout\|billing/create-checkout-session\|start-checkout-form" frontend/src/churvox-fresh frontend/src/pages 2>/dev/null || true'

section "7. Auth/session audit"
run "Frontend auth token storage and API helper" bash -lc 'grep -RIn "localStorage.getItem\|localStorage.setItem\|Authorization:.*Bearer\|withCredentials\|auth/me\|auth/login" frontend/src/context frontend/src/hooks frontend/src/lib 2>/dev/null || true'
run "Backend auth dependencies" bash -lc 'grep -RIn "def get_current_user\|async def get_current_user\|require_employer\|JWT_SECRET\|Authorization\|access_token\|set_cookie" backend 2>/dev/null || true'

section "8. Hardcoded URLs and proxy audit"
run "Hardcoded backend/frontend URLs" bash -lc 'grep -RIn "grassley-backend\|churvox-backend\|onrender.com\|localhost:3000\|localhost:8000\|www.churvox.com\|churvox.com" frontend backend render.yaml 2>/dev/null || true'
run "Frontend proxy server" bash -lc 'sed -n "1,240p" frontend/server.cjs'

section "9. Pages/routes/navigation audit"
run "Frontend route/page references" bash -lc 'grep -RIn "case \"/\|case \"plans\|plans\|Business Pulse\|Command\|Team Access\|onNavigate\|readPageFromHash" frontend/src 2>/dev/null | head -400'
run "Important page files" bash -lc 'find frontend/src -maxdepth 4 -type f \( -name "*Plans*" -o -name "*Dashboard*" -o -name "*Command*" -o -name "*Client*" -o -name "*Job*" -o -name "*Invoice*" -o -name "*Quote*" -o -name "*Team*" -o -name "*Payroll*" \) | sort'

section "10. API error handling audit"
run "Frontend request/error handling" bash -lc 'grep -RIn "catch (err)\|catch(err)\|throw new Error\|success === false\|setError\|Network Error" frontend/src 2>/dev/null | head -400'
run "Backend broad exceptions" bash -lc 'grep -RIn "except Exception\|raise HTTPException" backend 2>/dev/null | head -500'

section "11. Security/business isolation audit"
run "Business isolation filters" bash -lc 'grep -RIn "business_id\|get_user_business_id\|business_filter\|contractor_id\|current_user" backend frontend/src 2>/dev/null | head -700'
run "Dangerous client-trusted fields" bash -lc 'grep -RIn "payload.*business_id\|business_id.*payload\|user_id.*payload\|role.*payload\|is_admin" backend 2>/dev/null | head -300'

section "12. Billing env names expected"
run "Stripe env vars referenced in code" bash -lc 'grep -Roh "STRIPE_[A-Z0-9_]*" backend frontend render.yaml 2>/dev/null | sort -u'
run "Accounting env vars referenced in code" bash -lc 'grep -Roh "XERO_[A-Z0-9_]*\|MYOB_[A-Z0-9_]*" backend frontend render.yaml 2>/dev/null | sort -u'

section "13. File size / risky monster files"
run "Largest frontend/backend files" bash -lc 'find frontend/src backend -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.css" \) -print0 | xargs -0 wc -l | sort -nr | head -40'

section "14. Quick findings summary"
{
  echo "### Auto flags"
  echo '```text'

  grep -RIn "<<<<<<<\|=======\|>>>>>>>" frontend backend >/tmp/churvox_conflicts 2>/dev/null || true
  if [ -s /tmp/churvox_conflicts ]; then echo "FAIL: conflict markers found"; else echo "OK: no conflict markers found"; fi

  if grep -RIn "/stripe/create-checkout-session" backend frontend/src >/tmp/churvox_stripe_dup 2>/dev/null; then
    echo "WARN: /stripe/create-checkout-session still referenced"
    cat /tmp/churvox_stripe_dup
  else
    echo "OK: no /stripe/create-checkout-session references found"
  fi

  if grep -RIn "payment_method_types.*card\|payment_method_types=.*card" backend frontend/src >/tmp/churvox_card_forced 2>/dev/null; then
    echo "WARN: card-forcing Stripe config found"
    cat /tmp/churvox_card_forced
  else
    echo "OK: no obvious card-forcing Stripe config found"
  fi

  if grep -RIn "billing/success" backend frontend/src >/tmp/churvox_billing_success 2>/dev/null; then
    echo "WARN: old /billing/success references found"
    cat /tmp/churvox_billing_success
  else
    echo "OK: no /billing/success references found"
  fi

  echo '```'
} >> "$OUT"

echo ""
echo "DONE. Audit written to:"
echo "$OUT"
echo ""
echo "Open it with:"
echo "code AUDIT_REPORT.md"
