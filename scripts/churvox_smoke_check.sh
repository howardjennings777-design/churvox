#!/usr/bin/env bash
set -euo pipefail

npm --prefix frontend install
npm --prefix frontend run build
python3 -m py_compile backend/server.py
python3 -m compileall -q backend

grep -R "SafeAIAssistantPage" frontend/src/App.js frontend/src || true
grep -R "ComingSoonPage" frontend/src/App.js || true
grep -R "text-slate-300\|text-slate-400\|opacity-50\|opacity-60" frontend/src/pages/SmartHubPage.js frontend/src/pages/ReportsPage.js frontend/src/pages/SMSPage.js frontend/src/pages/LaunchCheckPage.js frontend/src/pages/IntegrationsPage.js frontend/src/pages/AutomationPage.js frontend/src/pages/AutomationRunsPage.js || true
