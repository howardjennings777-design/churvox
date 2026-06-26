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
export CHURVOX_SLOWMO="${CHURVOX_SLOWMO:-80}"

echo "Running human browser E2E against: $CHURVOX_SITE"
echo "Email: $CHURVOX_TEST_EMAIL"
echo "Headless: $CHURVOX_HEADLESS"
echo ""

cd frontend

if [ ! -d node_modules/@playwright/test ]; then
  echo "Installing Playwright test dependency in frontend..."
  npm install --save-dev @playwright/test
fi

npx playwright install chromium

node ../scripts/churvox_human_browser_e2e.mjs
