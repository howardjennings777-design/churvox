#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "===== CHURVOX AI SHELL SMOKE TEST ====="

echo "1) App entry"
grep -q 'ChurvoxAIShell' frontend/src/App.js
grep -q 'ChurvoxErrorBoundary' frontend/src/App.js
echo "✅ App.js uses Churvox AI shell and crash boundary"

echo "2) AI shell core components"
grep -q 'function Workspace' frontend/src/shell/ChurvoxAIShell.jsx
grep -q 'function WorkspaceHero' frontend/src/shell/ChurvoxAIShell.jsx
grep -q 'selectedRecord' frontend/src/shell/ChurvoxAIShell.jsx
grep -q 'cx-action-board' frontend/src/shell/ChurvoxAIShell.jsx
grep -q 'cx-record-modal' frontend/src/shell/ChurvoxAIShell.jsx
echo "✅ Main AI shell workspace, cards, and record popups exist"

echo "3) AI dock"
grep -q 'AIActionDock' frontend/src/App.js
grep -q 'AI Operator' frontend/src/shell/AIActionDock.jsx
grep -q 'Refresh AI check' frontend/src/shell/AIActionDock.jsx
echo "✅ AI operator dock is wired"

echo "4) Build"
npm --prefix frontend run build
echo "✅ Frontend build completed"

echo "===== SMOKE TEST PASSED ====="
