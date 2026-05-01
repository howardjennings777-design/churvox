# Launch Smoke Tests

## Run locally
```bash
bash scripts/churvox_launch_smoke.sh
```

## Run against live
```bash
E2E_BASE_URL=https://www.churvox.com E2E_EMAIL=you@example.com E2E_PASSWORD='***' bash scripts/churvox_launch_smoke.sh
```

## What is tested
- Frontend install/build
- Backend Python compile checks
- Launch seed script Python compile check
- Playwright launch smoke routes (public + authenticated when creds are provided)
- Blank-screen and fatal runtime text detection

## Not tested on purpose
- No SMS sends
- No MYOB sync
- No Stripe checkout
- No payroll approval
- No create/update/delete business data from test actions

## Failure reading guide
- Build/compile failures stop immediately (`set -e`).
- If `E2E_BASE_URL` is not set, browser tests are skipped with:
  - `E2E_BASE_URL not set; skipping browser smoke tests.`
- Authenticated Playwright checks are skipped when `E2E_EMAIL`/`E2E_PASSWORD` are missing.
