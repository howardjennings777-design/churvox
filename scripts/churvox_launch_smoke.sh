#!/usr/bin/env bash
set -e

echo "[churvox-smoke] Installing frontend dependencies"
npm --prefix frontend install

echo "[churvox-smoke] Building frontend"
npm --prefix frontend run build

echo "[churvox-smoke] Compiling backend server.py"
python3 -m py_compile backend/server.py

echo "[churvox-smoke] Running backend compileall"
python3 -m compileall -q backend

if [ -n "${E2E_BASE_URL:-}" ]; then
  echo "[churvox-smoke] E2E_BASE_URL set to ${E2E_BASE_URL}; running Playwright launch smoke tests"
  npm --prefix frontend run test:e2e:launch
else
  echo "[churvox-smoke] E2E_BASE_URL not set; skipping browser smoke tests"
fi
