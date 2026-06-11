#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import json

front = Path("frontend/src/pages/AppOwnerPage.jsx").read_text(encoding="utf-8", errors="ignore")
app = Path("frontend/src/App.js").read_text(encoding="utf-8", errors="ignore")
backend = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in Path("backend").rglob("*.py"))

checks = []

def add(name, ok, evidence, fix):
    checks.append({"name": name, "status": "PASS" if ok else "WARN", "evidence": evidence, "fix": fix})

add("Owner overview endpoint exists", "/admin/owner-overview" in backend, "Backend owner overview endpoint exists.", "Add owner overview endpoint.")
add("Visitor tracking endpoint exists", "/platform/visit" in backend, "Public visitor tracking endpoint exists.", "Add visitor tracking endpoint.")
add("Visitor telemetry installed", "trackPlatformVisit" in app and "platformTelemetry" in app, "App calls visitor tracker.", "Call tracker from App.")
add("Owner cockpit uses new overview", "/api/admin/owner-overview" in front, "Owner cockpit loads live overview.", "Load owner overview.")
add("Shows visitors/on now", "Visitors today" in front and "On now" in front, "Visitor and active-now cards exist.", "Add visitor cards.")
add("Shows paid/buyers", "Paid / buyers" in front, "Paid/buyer section exists.", "Add buyers section.")
add("Can delete user", "/api/admin/owner/users/" in front and "DELETE" in front, "Owner can delete user.", "Add delete user action.")
add("Can delete business", "/api/admin/owner/businesses/" in front, "Owner can delete business/workspace.", "Add delete business action.")
add("Can preview/delete test data", "/api/admin/owner/cleanup-tests" in front and "Delete old test data" in front, "Old test cleanup exists.", "Add cleanup action.")
add("Platform owner route protected", "is_platform_owner" in backend and "Platform owner access required" in backend, "Backend owner endpoints require platform owner.", "Protect owner endpoints.")

passed = sum(1 for c in checks if c["status"] == "PASS")
score = round((passed / len(checks)) * 100)

Path("docs/PLATFORM_OWNER_COCKPIT_AUDIT.md").write_text(
    "\n".join([
        "# Platform Owner Cockpit Audit",
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
Path("docs/platform_owner_cockpit_audit.json").write_text(json.dumps({"score": score, "checks": checks}, indent=2), encoding="utf-8")

print("PLATFORM OWNER COCKPIT AUDIT COMPLETE")
print(f"Score: {score}%")
print(f"Pass: {passed}/{len(checks)}")
for c in checks:
    if c["status"] != "PASS":
        print(f"- [WARN] {c['name']} — {c['fix']}")
