# Churvox Launch Test Checklist

## Owner Operator OS
- [ ] Approval queue shows real pending items or honest empty state.
- [ ] Operator action drawer opens in-page and supports approve/reject/review.
- [ ] No auto-send, auto-charge, payroll write, or MYOB write occurs without approval.

## Worker App (/worker, /worker/jobs, /worker/dashboard)
- [ ] Assigned jobs load with clear loading/error/empty states.
- [ ] Worker can acknowledge/start/pause/resume/complete safely where endpoint exists.
- [ ] Worker cannot see pricing, invoices, quotes, MYOB, payroll, owner-only metrics.

## Client Portal
- [ ] Public client portal opens by token only and does not leak private business data.
- [ ] Pay Now appears only when a real payment URL exists.

## Public Booking
- [ ] /book works unauthenticated on mobile.
- [ ] Enquiry captures name, phone/email, address, service type, preferred date/time, notes.

## AI Operator Persistence
- [ ] /api/operator/drafts GET/POST/PATCH requires auth and business isolation.
- [ ] /api/operator/approval-log GET/POST works with business scoping.
- [ ] /api/autopilot/replay and /api/money-radar/reviews GET/POST persist safely.

## MYOB Control Centre
- [ ] /api/myob/status-lite returns safe placeholder when not configured.
- [ ] Guardrails clearly state approval requirements for all writes/source changes.

## Mobile/Responsive
- [ ] Dashboard cards, drawers, and worker sheets are readable on phone widths.

## Render / Build
- [ ] `python3 -m py_compile backend/server.py`
- [ ] `python3 -m compileall -q backend`
- [ ] `npm --prefix frontend run build`
- [ ] `bash scripts/churvox_launch_audit.sh`

## Current Demo Script
1. Owner logs in.
2. Dashboard shows Operator OS.
3. Open AI approval action drawer.
4. Review risk/guardrail.
5. Approve saves backend/local draft.
6. Open Proof-to-Paid.
7. Open MYOB Control Centre.
8. Open Autopilot Replay.
9. Open Trust / Quality Scores.
10. Open /worker.
11. Worker cannot see owner-only data.
12. Open /book.
13. Submit enquiry.
14. Mobile tap test.
15. Render deploy check.
