# Churvox Deep Bug + Wiring Audit

Generated: 2026-05-17 00:37:21 UTC

## Summary

- HIGH: 0
- MED: 0
- LOW: 1
- Frontend API calls found: 49
- Backend effective routes found: 374

## Findings

### 1. [LOW] Post-launch cleanup — Runtime force patches still live in index.js

**Where:** `frontend/src/index.js`

**Detail:** Works for launch, but should later move into normal React components.

## Notes

- This audit ignores generated builds, backups, pasted logs, and audit reports.
- The live owner, worker, quote/invoice, and browser-route smoke tests remain the source of truth for launch behavior.
- Lower-risk dependency audit warnings are not changed here to avoid risky package upgrades before launch.
