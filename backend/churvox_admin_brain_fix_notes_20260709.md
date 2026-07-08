# Admin Brain 422 fix notes

This marker file records why the Admin Brain request signature fix exists.

Console symptom:

- `/api/admin-brain/scan` returned 422
- `/api/ai/actions` returned 422

Cause:

FastAPI was treating the runtime-patched route argument as a request body/query parameter instead of the Starlette/FastAPI `Request` object on this deployment path.

Fix:

`backend/churvox_admin_brain_request_signature_fix_patch.py` imports `Request` directly from FastAPI and re-registers the Admin Brain scan/read routes after the older scan patch. It also re-registers owner decision routes so Approve/Edit/Park remains owner-controlled and does not auto-send, auto-sync, or change money.

Frontend warning fix:

`frontend/src/runtime/churvoxDateInputIsoGuardRuntime.js` loads before the React app and clips ISO date-time strings for native date inputs from `yyyy-MM-ddTHH:mm:ss.sssZ` to `yyyy-MM-dd`.
