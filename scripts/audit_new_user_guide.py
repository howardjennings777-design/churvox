#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import json

backend = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in Path("backend").rglob("*.py"))
fresh_app = Path("frontend/src/churvox-fresh/FreshApp.jsx").read_text(encoding="utf-8", errors="ignore")
smart = Path("frontend/src/churvox-fresh/FreshSmartHub.jsx").read_text(encoding="utf-8", errors="ignore")
guide = Path("frontend/src/churvox-fresh/FreshNewUserGuide.jsx").read_text(encoding="utf-8", errors="ignore")
wizard = Path("frontend/src/churvox-fresh/FreshFirstRunWizard.jsx").read_text(encoding="utf-8", errors="ignore")

checks = []

def add(name, ok, evidence, fix):
    checks.append({"name": name, "status": "PASS" if ok else "WARN", "evidence": evidence, "fix": fix})

add("Backend progress endpoint exists", "/onboarding/progress" in backend, "Backend returns guide progress.", "Add /api/onboarding/progress.")
add("Backend stores progress", "onboarding_progress" in backend and "manual_done" in backend, "Guide progress is stored in Mongo.", "Store guide progress.")
add("Backend checks real data", 'count_any("clients"' in backend and 'count_any("jobs"' in backend and 'count_any("invoices"' in backend, "Guide checks clients/jobs/invoices.", "Use real data counts.")
add("Backend checks Command", "command_slips" in backend, "Command progress is checked.", "Check command slips.")
add("Smart Hub shows guide", "FreshNewUserGuide" in smart and 'mode="compact"' in smart, "Guide appears on Smart Hub.", "Add compact guide to Smart Hub.")
add("Full wizard uses guide", "FreshNewUserGuide" in wizard and 'mode="full"' in wizard, "First Run Wizard uses real guide.", "Use real guide in wizard.")
add("Guide has one next action", "next_step" in guide and "Next best step" in guide, "Guide focuses one next action.", "Show one next action.")
add("Guide can mark manual done", "/api/onboarding/step/" in guide and "I’ve done this" in guide, "User can mark a step done.", "Add manual done.")
add("Guide can skip/resume", "/api/onboarding/state" in guide and "Resume guide" in guide, "User can skip/resume guide.", "Add skip/resume.")
add("Guide sends to Command", "Send to Command" in guide and "COMMAND_INBOX_KEY" in guide, "Setup help can be sent to Command.", "Add Command slip.")
add("Guide CSS imported", "freshNewUserGuide.css" in fresh_app, "Guide CSS imported.", "Import CSS.")

passed = sum(1 for c in checks if c["status"] == "PASS")
score = round((passed / len(checks)) * 100)

Path("docs/NEW_USER_GUIDE_AUDIT.md").write_text(
    "\n".join([
        "# New User Guide Audit",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')}",
        "",
        f"**Score:** {score}%",
        f"**Pass:** {passed}/{len(checks)}",
        "",
        "| Check | Status | Evidence | Fix |",
        "|---|---:|---|---|",
        *[f"| {c['name']} | **{c['status']}** | {c['evidence']} | {c['fix']} |" for c in checks],
    ]),
    encoding="utf-8",
)

Path("docs/new_user_guide_audit.json").write_text(json.dumps({"score": score, "checks": checks}, indent=2), encoding="utf-8")

print("NEW USER GUIDE AUDIT COMPLETE")
print(f"Score: {score}%")
print(f"Pass: {passed}/{len(checks)}")
for c in checks:
    if c["status"] != "PASS":
        print(f"- [WARN] {c['name']} — {c['fix']}")
