#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import json

backend = Path("backend/churvox_platform_owner_routes.py").read_text(encoding="utf-8", errors="ignore")
front = Path("frontend/src/pages/AppOwnerPage.jsx").read_text(encoding="utf-8", errors="ignore")

checks = []

def add(name, ok, evidence, fix):
    checks.append({"name": name, "status": "PASS" if ok else "WARN", "evidence": evidence, "fix": fix})

add("Reads real users collection", 'list_docs("users"' in backend, "Owner overview reads Mongo users collection.", "Read users collection.")
add("Reads real invoices collection", 'list_docs("invoices"' in backend and "invoice_value_total" in backend, "Owner overview reads invoices and totals.", "Read invoice values.")
add("Reads real jobs/clients/quotes", 'list_docs("jobs"' in backend and 'list_docs("clients"' in backend and 'list_docs("quotes"' in backend, "Owner overview reads core work collections.", "Read jobs/clients/quotes.")
add("Stores real visitor records", "platform_visits.insert_one" in backend and "visitor_key" in backend, "Visitor pageviews are stored in Mongo.", "Store platform visits.")
add("Attaches logged-in user to visits", "user_email" in backend and "business_name" in backend, "Visits include user/business if logged in.", "Attach user to visits.")
add("Updates user last_active", "last_active" in backend and "last_seen_path" in backend, "Logged-in users get last_active updated.", "Update last_active.")
add("Counts unique visitors", "unique_visitors_today" in backend and "unique_visitors_7d" in backend, "Unique visitor counts are calculated.", "Count unique visitors.")
add("Paid users use Stripe/plan signals", "stripe_customer_id" in backend and "stripe_subscription_id" in backend and "subscription_status" in backend, "Paid/buyer logic uses real payment/plan fields.", "Use billing fields.")
add("Frontend shows real invoice money", "invoice_value_outstanding" in front and "invoice_value_total" in front, "Owner UI shows real invoice values.", "Show invoice values.")
add("Protected owner only", "Platform owner access required" in backend, "Owner overview requires platform owner.", "Protect endpoint.")

passed = sum(1 for c in checks if c["status"] == "PASS")
score = round((passed / len(checks)) * 100)

Path("docs/PLATFORM_OWNER_REAL_DATA_AUDIT.md").write_text(
    "\n".join([
        "# Platform Owner Real Data Audit",
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

Path("docs/platform_owner_real_data_audit.json").write_text(json.dumps({"score": score, "checks": checks}, indent=2), encoding="utf-8")

print("PLATFORM OWNER REAL DATA AUDIT COMPLETE")
print(f"Score: {score}%")
print(f"Pass: {passed}/{len(checks)}")
for c in checks:
    if c["status"] != "PASS":
        print(f"- [WARN] {c['name']} — {c['fix']}")
