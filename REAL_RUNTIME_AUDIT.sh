#!/usr/bin/env bash
set -u

echo "===== GIT ====="
git log -1 --oneline
git status --short

echo ""
echo "===== WHICH SERVER MODULE PYTHON IMPORTS ====="
cd /workspaces/churvox/backend || exit 1
python3 - <<'PY'
import importlib.util
spec = importlib.util.find_spec("server")
print("server spec:", spec)
print("origin:", getattr(spec, "origin", None))
print("submodule locations:", getattr(spec, "submodule_search_locations", None))
PY

echo ""
echo "===== SERVER FILES THAT EXIST ====="
find /workspaces/churvox/backend -maxdepth 3 \( -name "server.py" -o -path "*/server/__init__.py" \) -print -exec sed -n '1,8p' {} \;

echo ""
echo "===== STRIPE ROUTES / CARD-FORCING SETTINGS ====="
cd /workspaces/churvox || exit 1
grep -RIn \
  "create-checkout-session\|start-checkout-form\|confirm-checkout\|billing/success\|payment_method_types=.*card\|payment_method_collection=.*always\|card_required" \
  backend frontend/src 2>/dev/null || true

echo ""
echo "===== BROKEN JS PATTERNS ====="
grep -RIn "{ \\.payload\|{ \\.sendForm\|\\.payload,\|\\.sendForm," frontend/src 2>/dev/null || true

echo ""
echo "===== BUILD ====="
npm run --prefix frontend build
