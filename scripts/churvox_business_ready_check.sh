#!/usr/bin/env bash
set -u

cd /workspaces/churvox || exit 1

echo "===== CHURVOX BUSINESS-READY CHECK ====="
echo "This checks code, build, backend syntax, login, pages, buttons, quick actions, wording, console errors and API errors."
echo ""

mkdir -p business-ready-audit/screenshots

STATIC_EXIT=0
BACKEND_EXIT=0
BUILD_EXIT=0
RUNTIME_EXIT=0

echo "===== 1/6 STATIC CODE + WIRING AUDIT ====="
npm --prefix frontend run audit:business-ready-static || STATIC_EXIT=$?

echo ""
echo "===== 2/6 BACKEND SYNTAX CHECK ====="
python3 -m py_compile backend/server.py || BACKEND_EXIT=$?

echo ""
echo "===== 3/6 FRONTEND BUILD CHECK ====="
REACT_APP_BACKEND_URL="https://grassley-backend.onrender.com" npm --prefix frontend run build || BUILD_EXIT=$?

echo ""
echo "===== 4/6 RUNTIME BROWSER AUDIT SETUP ====="
if [ "$BUILD_EXIT" -eq 0 ]; then
  if [ -z "${CHURVOX_TEST_EMAIL:-}" ]; then
    read -r -p "Churvox test login email: " CHURVOX_TEST_EMAIL
  fi

  if [ -z "${CHURVOX_TEST_PASSWORD:-}" ]; then
    read -sr -p "Churvox test login password: " CHURVOX_TEST_PASSWORD
    echo ""
  fi

  export CHURVOX_TEST_EMAIL
  export CHURVOX_TEST_PASSWORD
  export CHURVOX_AUDIT_URL="http://127.0.0.1:4297"

  echo ""
  echo "===== 5/6 START LOCAL BUILD + RUN RUNTIME AUDIT ====="
  set +e
  cd frontend/build && python3 -m http.server 4297 --bind 127.0.0.1 >/tmp/churvox_business_ready_static_server.log 2>&1 &
  SERVER_PID=$!
  cd /workspaces/churvox || exit 1
  sleep 2
  npm --prefix frontend run audit:business-ready-runtime
  RUNTIME_EXIT=$?
  kill "$SERVER_PID" 2>/dev/null || true
  set -e
else
  echo "Skipping runtime audit because frontend build failed."
  RUNTIME_EXIT=1
fi

echo ""
echo "===== 6/6 BUSINESS-READY REPORT TOP ====="
sed -n '1,260p' BUSINESS_READY_AUDIT.md 2>/dev/null || true

echo ""
echo "===== SUMMARY ====="
echo "Static audit exit:  $STATIC_EXIT"
echo "Backend syntax:     $BACKEND_EXIT"
echo "Frontend build:     $BUILD_EXIT"
echo "Runtime audit exit: $RUNTIME_EXIT"

if [ "$STATIC_EXIT" -ne 0 ] || [ "$BACKEND_EXIT" -ne 0 ] || [ "$BUILD_EXIT" -ne 0 ] || [ "$RUNTIME_EXIT" -ne 0 ]; then
  echo ""
  echo "❌ NOT READY TO RUN A BUSINESS TOMORROW."
  echo "Open BUSINESS_READY_AUDIT.md and fix blockers from the top down."
  exit 1
fi

echo ""
echo "✅ BUSINESS-READY AUDIT PASSED."
exit 0
