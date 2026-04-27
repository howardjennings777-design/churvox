#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

section() {
  printf '\n\033[1;36m===== %s =====\033[0m\n' "$1"
}

pass() {
  printf '\033[1;32m✅ %s\033[0m\n' "$1"
}

fail() {
  printf '\033[1;31m❌ %s\033[0m\n' "$1"
}

section "CHURVOX LAUNCH READY CHECK"
echo "Root: $ROOT_DIR"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

section "GIT STATUS"
if command -v git >/dev/null 2>&1; then
  git status --short || true
  git rev-parse --abbrev-ref HEAD || true
  git rev-parse --short HEAD || true
fi

section "BACKEND PYTHON COMPILE"
if [ -d backend ]; then
  python3 -m py_compile backend/*.py
  python3 -m compileall -q backend
  pass "Backend Python syntax compiled"
else
  fail "backend folder missing"
  exit 1
fi

section "BOOT LAYER PRESENCE"
required_boot_files=(
  backend/sitecustomize.py
  backend/top_player_boot.py
  backend/notifications_boot.py
  backend/recurring_jobs_boot.py
  backend/job_invoice_boot.py
  backend/quote_job_boot.py
  backend/client_360_boot.py
  backend/checklist_automation_boot.py
  backend/launch_audit_boot.py
  backend/launch_ops_boot.py
)
for file in "${required_boot_files[@]}"; do
  if [ -f "$file" ]; then
    pass "$file"
  else
    fail "$file missing"
    exit 1
  fi
done

section "FRONTEND INSTALL"
if [ -d frontend ]; then
  if [ -f frontend/package-lock.json ]; then
    npm --prefix frontend ci --legacy-peer-deps
  else
    npm --prefix frontend install --legacy-peer-deps
  fi
  pass "Frontend dependencies installed"
else
  fail "frontend folder missing"
  exit 1
fi

section "FRONTEND BUILD"
CI=false npm --prefix frontend run build
pass "Frontend production build passed"

section "PLAYWRIGHT LAUNCH AUDIT"
if [ -n "${CHURVOX_AUDIT_EMAIL:-}" ] && [ -n "${CHURVOX_AUDIT_PASSWORD:-}" ]; then
  npx --prefix frontend playwright install chromium
  npm --prefix frontend run audit:launch
  pass "Authenticated Playwright launch audit passed"
else
  echo "Skipping authenticated Playwright audit because CHURVOX_AUDIT_EMAIL and CHURVOX_AUDIT_PASSWORD are not set."
  echo "Set them and rerun this script for the full live audit."
fi

section "READY"
pass "Local launch-ready checks completed"
echo "Next: commit + push to main so Render auto-deploy starts, then open /admin/launch-audit and run sweep-all."
