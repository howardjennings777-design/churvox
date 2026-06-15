#!/usr/bin/env bash
set -u

echo "===== 1. LATEST GIT / LOCAL CHANGES ====="
git log -1 --oneline
git status --short

echo ""
echo "===== 2. WHICH BACKEND MODULE RENDER IMPORTS ====="
cd /workspaces/churvox/backend || exit 1
python3 - <<'PY'
import importlib.util
spec = importlib.util.find_spec("server")
print("server origin:", getattr(spec, "origin", None))
print("server package locations:", getattr(spec, "submodule_search_locations", None))
PY

cd /workspaces/churvox || exit 1

echo ""
echo "===== 3. EVERY FILE THAT CAN TOUCH CHECKOUT ====="
grep -RIn \
  "billing/create-checkout-session\|billing/unified-checkout\|start-checkout-form\|confirm-checkout\|checkout.Session.create\|checkout.session.create\|payment_method_collection\|payment_method_types\|billing/success\|card_required\|checkout_url\|session.url\|return .*data" \
  backend frontend/src 2>/dev/null || true

echo ""
echo "===== 4. EMPTY SUCCESS RESPONSE SOURCES ====="
grep -RIn \
  "success.*true.*data.*\"\"\|success.*True.*data.*\"\"\|data.*\"\".*success.*true\|return.*\"\"\|JSONResponse.*\"\"" \
  backend frontend/src 2>/dev/null || true

echo ""
echo "===== 5. FRONTEND USEAPI WRAPPER THAT CAN HIDE EMPTY RESPONSES ====="
sed -n '1,110p' frontend/src/hooks/useApi.js

echo ""
echo "===== 6. CURRENT LIVE PLANS COMPONENT ====="
grep -RIn "checkout-js-trace\|create-checkout-session\|Stripe checkout did not return" frontend/src/churvox-fresh frontend/src/pages 2>/dev/null || true

echo ""
echo "===== 7. BACKEND WRAPPER CHECKOUT MIDDLEWARE ====="
sed -n '40,125p' backend/server/__init__.py

echo ""
echo "===== 8. NORMAL SERVER CHECKOUT ROUTES STILL PRESENT ====="
grep -n "billing/create-checkout-session\|stripe/create-checkout-session\|start-checkout-form\|billing/success\|payment_method_collection\|payment_method_types" backend/server.py || true

echo ""
echo "===== 9. PYTHON ROUTE ORDER AFTER IMPORT ====="
cd /workspaces/churvox/backend || exit 1
python3 - <<'PY'
try:
    import server
    app = server.app
    print("app:", app)
    for i, route in enumerate(getattr(app, "routes", [])):
        path = getattr(route, "path", "")
        methods = ",".join(sorted(getattr(route, "methods", []) or []))
        if "billing" in path or "stripe" in path:
            print(f"{i:03d} {methods:12} {path} -> {getattr(route, 'endpoint', None)}")
    print("\nMiddleware stack user_middleware:")
    for m in getattr(app, "user_middleware", []):
        print(m)
except Exception as e:
    print("IMPORT FAILED:", repr(e))
PY

echo ""
echo "===== 10. BUILD CHECK ====="
cd /workspaces/churvox || exit 1
npm run --prefix frontend build
