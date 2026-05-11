#!/usr/bin/env bash
set -euo pipefail

python3 -m py_compile backend/server.py
python3 -m compileall -q backend

if [ ! -x frontend/node_modules/.bin/craco ]; then
npm --prefix frontend install --include=dev --legacy-peer-deps
fi

npm --prefix frontend run build

if command -v rg >/dev/null 2>&1; then
rg -n "MyobControlCentre|AutopilotReplay|TrustQualityScores|/worker" frontend/src/fresh/FreshChurvoxApp.jsx
else
grep -RInE "MyobControlCentre|AutopilotReplay|TrustQualityScores|/worker" frontend/src/fresh/FreshChurvoxApp.jsx
fi

echo "Launch audit passed."
