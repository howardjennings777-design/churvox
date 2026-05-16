# Churvox Live Browser Route Check

Generated: 2026-05-16 21:30:11 UTC

## Summary

- HIGH: 0
- MED: 2
- LOW: 0
- Frontend: https://www.churvox.com
- CSS: `/static/css/main.a4a470be.css`
- JS: `/static/js/main.8b302cfa.js`

## Checks

- ✅ **Root HTML loads** — status `200` — Root HTML fetched
- ✅ **HTML includes CSS bundle** — status `0` — /static/css/main.a4a470be.css
- ✅ **HTML includes JS bundle** — status `0` — /static/js/main.8b302cfa.js
- ✅ **CSS MIME is text/css** — status `200` — /static/css/main.a4a470be.css Content-Type=text/css; charset=utf-8
- ✅ **JS bundle loads** — status `200` — /static/js/main.8b302cfa.js Content-Type=application/javascript
- ✅ **JS MIME acceptable** — status `200` — Content-Type=application/javascript
- ❌ **Live JS marker PHASE_146_FORCE_EXACT_OLD_INVOICE_READY_MODAL** — status `200` — Missing
- ❌ **Live JS marker PHASE_147_PROFESSIONAL_INVOICE_OVERLAY** — status `200` — Missing
- ✅ **SPA route /** — status `200` — HTML app shell returned
- ✅ **SPA route /login** — status `200` — HTML app shell returned
- ✅ **SPA route /dashboard** — status `200` — HTML app shell returned
- ✅ **SPA route /clients** — status `200` — HTML app shell returned
- ✅ **SPA route /jobs** — status `200` — HTML app shell returned
- ✅ **SPA route /quotes** — status `200` — HTML app shell returned
- ✅ **SPA route /invoices** — status `200` — HTML app shell returned
- ✅ **SPA route /team** — status `200` — HTML app shell returned
- ✅ **SPA route /plans** — status `200` — HTML app shell returned
- ✅ **SPA route /settings** — status `200` — HTML app shell returned
- ✅ **SPA route /payroll** — status `200` — HTML app shell returned
- ✅ **SPA route /automation** — status `200` — HTML app shell returned
- ✅ **SPA route /worker** — status `200` — HTML app shell returned
- ✅ **SPA route /worker/jobs** — status `200` — HTML app shell returned
- ✅ **PWA manifest loads** — status `200` — /manifest.json

## Findings

### 1. [MED] Live JS missing PHASE_146_FORCE_EXACT_OLD_INVOICE_READY_MODAL

Render may be serving an older frontend bundle or marker was removed.

### 2. [MED] Live JS missing PHASE_147_PROFESSIONAL_INVOICE_OVERLAY

Render may be serving an older frontend bundle or marker was removed.

## Notes

- This checks the public app shell and static assets from outside Render.
- It does not click inside the browser or verify logged-in UI state.
- A logged-in Playwright visual pass can come next if needed.
