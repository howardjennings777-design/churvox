#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
if [ -f backend/.env ]; then
  set -a
  . backend/.env
  set +a
fi
python3 scripts/churvox_seed_launch_test_data.py
