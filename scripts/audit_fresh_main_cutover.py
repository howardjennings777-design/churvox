#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import json

app = Path("frontend/src/App.js").read_text(encoding="utf-8", errors="ignore")
checks = []

def add(name, ok, evidence, fix):
    checks.append({"name": name, "status": "PASS" if ok else "WARN", "evidence": evidence, "fix": fix})

add("Dashboard opens FreshApp", 'path="/dashboard" element={<BusinessRoute><FreshApp /></BusinessRoute>}' in app, "/dashboard uses FreshApp.", "Promote FreshApp to /dashboard.")
add("Fresh route redirects to dashboard", 'path="/fresh" element={<Navigate to="/dashboard" replace />}' in app, "/fresh redirects to /dashboard.", "Redirect /fresh.")
add("Legacy dashboard retained", 'path="/legacy/dashboard"' in app and "CommandDeskRoute" in app, "Old dashboard kept as backup.", "Keep legacy route until real testing passes.")
add("Public quote retained", 'path="/public/quote/:token"' in app, "Public quote route retained.", "Keep public quote route.")
add("Public invoice retained", 'path="/public/invoice/:token"' in app, "Public invoice route retained.", "Keep public invoice route.")
add("Worker app retained", 'path="/worker/jobs"' in app and 'path="/worker/jobs/:id"' in app, "Worker routes retained.", "Keep worker routes.")
add("Auth retained", 'path="/login"' in app and 'path="/signup"' in app, "Auth routes retained.", "Keep auth routes.")
add("Admin retained", 'path="/admin"' in app, "Admin route retained.", "Keep platform admin.")
add("Old board routes redirect to Fresh", "/dashboard#jobs" in app and "/dashboard#clients" in app and "/dashboard#invoices" in app, "Old board routes redirect to Fresh hash pages.", "Redirect board routes to Fresh.")

passed = sum(1 for c in checks if c["status"] == "PASS")
score = round((passed / len(checks)) * 100)

Path("docs/FRESH_MAIN_CUTOVER_AUDIT.md").write_text(
    "\n".join([
        "# Fresh Main Cutover Audit",
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
Path("docs/fresh_main_cutover_audit.json").write_text(json.dumps({"score": score, "checks": checks}, indent=2), encoding="utf-8")

print("FRESH MAIN CUTOVER AUDIT COMPLETE")
print(f"Score: {score}%")
print(f"Pass: {passed}/{len(checks)}")
for c in checks:
    if c["status"] != "PASS":
        print(f"- [WARN] {c['name']} — {c['fix']}")
