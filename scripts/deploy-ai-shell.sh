#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "===== CHURVOX AI SHELL DEPLOY ====="

echo "1) Run AI shell smoke test"
if [ -x scripts/churvox-ai-shell-smoke-test.sh ]; then
  scripts/churvox-ai-shell-smoke-test.sh
else
  npm --prefix frontend run build
fi

echo "2) Write Render deploy marker"
date -u +"ai-shell-deploy-%Y-%m-%dT%H:%M:%SZ" > frontend/public/ai-shell-deploy-marker.txt

echo "3) Commit and push"
git add frontend/public/ai-shell-deploy-marker.txt
git commit -m "Deploy AI shell update"
git push origin main

echo "===== DONE ====="
echo "Render auto-deploy should start from the push to main."
