# Churvox Hardening V8 source package

This package contains the reviewed Churvox Control Board V8 hardening source. It is materialised before the frontend compiles and before the backend installs its routes.

- Archive SHA-256: `e1bf0047230ac1a02eab0f671dae9efc3791c647c1359fc5e3968e225aba8928`
- Parts: `part_00` through `part_08`
- Python materialiser: `scripts/churvox_hardening_v8_materialize.py`
- Node materialiser: `scripts/churvox_hardening_v8_materialize.cjs`
- Safety: both materialisers validate the checksum and reject paths outside the repository root.

## Materialised files

1. `backend/churvox_hardening_routes.py`
2. `backend/test_churvox_hardening_v8.py`
3. `usercustomize.py`
4. `backend/usercustomize.py`
5. `frontend/src/churvox-product/controlBoardStrong.js`
6. `frontend/src/churvox-product/ControlBoardStrongEditor.jsx`
7. `frontend/src/churvox-product/ProductAppV8.jsx`
8. `frontend/src/churvox-product/productAppV8.css`
9. `frontend/src/churvox-product/ProductAppV7Gate.jsx`
10. `frontend/tests/e2e/churvox-hardening-v8.spec.js`
11. `.github/workflows/churvox-hardening-v8.yml`

## Product coverage

The package implements permanent record IDs, attachment proof, week scheduling, recurring controls, line-item quotes and invoices with NZ GST, proper time entries, threaded messages, expanded settings, safe CSV import and complete export, server audit history, live/offline sync, owner approval guardrails and worker access boundaries.
