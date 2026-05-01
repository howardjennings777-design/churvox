#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

npm --prefix frontend install
npm --prefix frontend run build
python3 -m py_compile backend/server.py
python3 -m compileall -q backend
if [ -f scripts/churvox_seed_launch_test_data.py ]; then
  python3 -m py_compile scripts/churvox_seed_launch_test_data.py
fi

if [ -n "${E2E_BASE_URL:-}" ]; then
  npm --prefix frontend run test:e2e:launch
else
  echo "E2E_BASE_URL not set; skipping browser smoke tests."
fi
