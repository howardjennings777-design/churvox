#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import json

app = Path("frontend/src/App.js").read_text(encoding="utf-8", errors="ignore")

checks = [
    {
        "name": "Fresh shell-free route exists",
        "ok": "function FreshBusinessRoute" in app and "return <AppPage>{children}</AppPage>;" in app,
        "evidence": "FreshBusinessRoute returns AppPage without CommandShell.",
        "fix": "Add shell-free Fresh route guard.",
    },
    {
        "name": "Dashboard uses shell-free Fresh route",
        "ok": 'path="/dashboard" element={<FreshBusinessRoute><FreshApp /></FreshBusinessRoute>}' in app,
        "evidence": "/dashboard opens FreshApp without old CommandShell.",
        "fix": "Use FreshBusinessRoute on /dashboard.",
    },
    {
        "name": "Plans uses shell-free Fresh route",
        "ok": 'path="/plans" element={<FreshBusinessRoute><FreshApp /></FreshBusinessRoute>}' in app,
        "evidence": "/plans opens FreshApp without old CommandShell.",
        "fix": "Use FreshBusinessRoute on /plans.",
    },
    {
        "name": "Old legacy dashboard retained",
        "ok": 'path="/legacy/dashboard"' in app,
        "evidence": "Old dashboard still kept as emergency backup.",
        "fix": "Keep /legacy/dashboard until live testing passes.",
    },
]

passed = sum(1 for c in checks if c["ok"])
score = round((passed / len(checks)) * 100)

Path("docs/FRESH_NO_DOUBLE_SHELL_AUDIT.md").write_text(
    "\n".join([
        "# Fresh No Double Shell Audit",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')}",
        "",
        f"**Score:** {score}%",
        f"**Pass:** {passed}/{len(checks)}",
        "",
        "| Check | Status | Evidence | Fix |",
        "|---|---:|---|---|",
        *[f"| {c['name']} | **{'PASS' if c['ok'] else 'WARN'}** | {c['evidence']} | {c['fix']} |" for c in checks],
    ]),
    encoding="utf-8",
)

Path("docs/fresh_no_double_shell_audit.json").write_text(
    json.dumps({"score": score, "checks": checks}, indent=2),
    encoding="utf-8",
)

print("FRESH NO DOUBLE SHELL AUDIT COMPLETE")
print(f"Score: {score}%")
print(f"Pass: {passed}/{len(checks)}")
for c in checks:
    if not c["ok"]:
        print(f"- [WARN] {c['name']} — {c['fix']}")
