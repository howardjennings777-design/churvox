# Worker → Owner Message Audit

Generated: 2026-06-11T03:47:04Z

**Score:** 89%
**Pass:** 8/9

## Verdict

Worker help requests should land in owner Command, not disappear into a hidden inbox.

| Check | Status | Evidence | Fix |
|---|---:|---|---|
| Worker help box exists | **PASS** | Worker app has a contact office panel with message textarea and send button. | Add worker contact office panel. |
| Worker help opens from worker app | **PASS** | Worker pages can open the contact office panel. | Wire Contact office buttons into worker list/detail pages. |
| Worker help posts office request | **PASS** | Panel posts to /worker/contact-office. | Post worker message to backend office endpoint. |
| Worker help creates Command slip | **PASS** | Panel also creates a Command slip for owner visibility. | Create owner Command slip when worker sends help request. |
| Command bridge posts backend slips | **FAIL** | Shared Command bridge posts slips to backend. | Wire Command bridge to backend. |
| Command backend create endpoint exists | **PASS** | Backend Command create slip endpoint exists. | Add POST /api/command/slips. |
| Owner Command reads backend slips | **PASS** | Owner Command page loads backend slips. | Make owner Command read backend slips. |
| Worker help includes job context | **PASS** | Worker message includes job id/title when available. | Attach job context to worker help messages. |
| Worker help includes worker context | **PASS** | Worker message includes worker identity fields. | Attach worker identity to Command slip payload. |

## Remaining Issues

- **Command bridge posts backend slips** — Wire Command bridge to backend.