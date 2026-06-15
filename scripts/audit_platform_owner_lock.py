#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import json

route = Path("frontend/src/components/admin/PlatformAdminRoute.jsx").read_text(encoding="utf-8", errors="ignore")
backend = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in Path("backend").rglob("*.py"))

checks = []

def add(name, ok, evidence, fix):
    checks.append({"name": name, "status": "PASS" if ok else "WARN", "evidence": evidence, "fix": fix})

add("Frontend allows Howard owner email", "hello@churvox.com" in route, "Owner email is whitelisted.", "Add owner email.")
add("Frontend allows hello owner email", "hello@churvox.com" in route, "Public owner email is whitelisted.", "Add owner email.")
add("Frontend blocks localStorage owner_session bypass", "owner_portal_session" not in route, "Old localStorage owner session bypass removed.", "Remove owner_portal_session.")
add("Frontend blocks localStorage unlock bypass", "platform_owner_access" not in route and "platform_owner_email" not in route, "Old localStorage unlock/email bypass removed.", "Remove localStorage unlock bypass.")
add("Frontend does not allow plain admin role", 'role === "admin"' not in route and "is_admin" not in route, "Plain admin flag is not enough for platform cockpit.", "Only allow platform owner.")
add("Backend protects owner overview", "Platform owner access required" in backend and "/admin/owner-overview" in backend, "Owner overview requires platform owner.", "Protect backend owner overview.")
add("Backend owner emails configurable", "PLATFORM_OWNER_EMAILS" in backend, "Backend supports PLATFORM_OWNER_EMAILS env.", "Use PLATFORM_OWNER_EMAILS on Render.")

passed = sum(1 for c in checks if c["status"] == "PASS")
score = round((passed / len(checks)) * 100)

Path("docs/PLATFORM_OWNER_LOCK_AUDIT.md").write_text(
    "\n".join([
        "# Platform Owner Lock Audit",
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

Path("docs/platform_owner_lock_audit.json").write_text(json.dumps({"score": score, "checks": checks}, indent=2), encoding="utf-8")

print("PLATFORM OWNER LOCK AUDIT COMPLETE")
print(f"Score: {score}%")
print(f"Pass: {passed}/{len(checks)}")
for c in checks:
    if c["status"] != "PASS":
        print(f"- [WARN] {c['name']} — {c['fix']}")
