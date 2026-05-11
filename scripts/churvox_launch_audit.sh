#!/usr/bin/env bash
set -euo pipefail

python3 -m py_compile backend/server.py
python3 -m compileall -q backend

if [ ! -x frontend/node_modules/.bin/craco ]; then
  npm --prefix frontend install --include=dev --legacy-peer-deps
fi

npm --prefix frontend run build

rg -n "MyobControlCentre|AutopilotReplay|TrustQualityScores|/worker" frontend/src/fresh/FreshChurvoxApp.jsx

echo "Launch audit passed."
