#!/usr/bin/env bash
set -u

cd "$(dirname "$0")/.."

if [ -z "${CHURVOX_TEST_EMAIL:-}" ]; then
  read -r -p "Login email: " CHURVOX_TEST_EMAIL
  export CHURVOX_TEST_EMAIL
fi

if [ -z "${CHURVOX_TEST_PASSWORD:-}" ]; then
  read -r -s -p "Login password: " CHURVOX_TEST_PASSWORD
  echo ""
  export CHURVOX_TEST_PASSWORD
fi

export CHURVOX_SITE="${CHURVOX_SITE:-https://www.churvox.com}"
export CHURVOX_HEADLESS="${CHURVOX_HEADLESS:-true}"
export CHURVOX_SLOWMO="${CHURVOX_SLOWMO:-70}"

echo "===== Running Churvox DEEP human E2E ====="
echo "Site: $CHURVOX_SITE"
echo "Email: $CHURVOX_TEST_EMAIL"
echo "Headless: $CHURVOX_HEADLESS"
echo ""

cd frontend

echo "===== Ensure Playwright exists without changing package.json ====="
npm install --no-save @playwright/test
npx playwright install chromium

echo "===== Start deep human browser test ====="
node e2e/churvox_deep_human_e2e.mjs
