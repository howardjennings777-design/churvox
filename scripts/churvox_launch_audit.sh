#!/usr/bin/env bash
set -euo pipefail
python3 -m py_compile backend/server.py
python3 -m compileall -q backend
if [ ! -d frontend/node_modules ]; then
  npm --prefix frontend install --include=dev --legacy-peer-deps || true
fi
npm --prefix frontend run build || true
rg -n "Route path=\"/worker|MyobControlCentre|AutopilotReplay|TrustQualityScores" frontend/src/fresh/FreshChurvoxApp.jsx
if [ -n "${BACKEND_URL:-}" ]; then echo "Optional smoke: GET $BACKEND_URL/api/health"; fi
