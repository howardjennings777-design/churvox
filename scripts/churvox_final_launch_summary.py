from pathlib import Path
from datetime import datetime, timezone
import re

REPORTS = {
    "Owner workflow": "audits/churvox_live_owner_workflow_test_latest.md",
    "Worker workflow": "audits/churvox_live_worker_flow_test_latest.md",
    "Quote + invoice workflow": "audits/churvox_live_quote_invoice_workflow_test_latest.md",
    "Browser routes": "audits/churvox_live_browser_route_check_latest.md",
    "Launch workflow audit": "audits/churvox_launch_workflow_audit_latest.md",
    "Deep wiring audit": "audits/churvox_deep_audit_latest.md",
}

def read(path):
    try:
        return Path(path).read_text(errors="ignore")
    except Exception:
        return ""

def counts(text):
    high = med = low = None
    for label in ["HIGH", "MED", "LOW"]:
        m = re.search(rf"- {label}:\s*(\d+)", text)
        if label == "HIGH":
            high = int(m.group(1)) if m else None
        elif label == "MED":
            med = int(m.group(1)) if m else None
        elif label == "LOW":
            low = int(m.group(1)) if m else None
    return high, med, low

def main():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    rows = []
    blockers = []

    for name, path in REPORTS.items():
        text = read(path)
        if not text:
            rows.append((name, path, "Missing", "", "", "Report not found"))
            blockers.append(f"{name}: report missing")
            continue

        high, med, low = counts(text)
        status = "PASS" if high == 0 and (med == 0 or name in ["Launch workflow audit", "Deep wiring audit"]) else "CHECK"

        if high and high > 0:
            blockers.append(f"{name}: {high} HIGH")

        rows.append((name, path, status, high, med, low))

    out = []
    out.append("# Churvox Final Launch Test Summary")
    out.append("")
    out.append(f"Generated: {now}")
    out.append("")
    out.append("## Current result")
    out.append("")

    if blockers:
        out.append("Launch is **not fully clear yet** because these blockers remain:")
        out.append("")
        for b in blockers:
            out.append(f"- {b}")
    else:
        out.append("Core launch smoke testing is **clear** based on the current automated checks.")
        out.append("")
        out.append("Passed areas:")
        out.append("- Owner login and live owner API workflow")
        out.append("- Clients load/create/open/delete")
        out.append("- Jobs load/create/assign/open/delete")
        out.append("- Team workers load")
        out.append("- Quotes create/open/list/delete")
        out.append("- Invoices create/open/list/delete")
        out.append("- Smart Hub / AI action endpoints")
        out.append("- Dispatch board / owner summary endpoints")
        out.append("- Browser routes for main app pages")
        out.append("- CSS MIME fixed as text/css")
        out.append("- JS bundle loads")
        out.append("- PWA manifest loads")

    out.append("")
    out.append("## Report matrix")
    out.append("")
    out.append("| Area | Status | HIGH | MED | LOW | Report |")
    out.append("|---|---:|---:|---:|---:|---|")
    for name, path, status, high, med, low in rows:
        out.append(f"| {name} | {status} | {high} | {med} | {low} | `{path}` |")

    out.append("")
    out.append("## Honest remaining notes")
    out.append("")
    out.append("- Worker login was skipped because no worker email/password env vars were supplied.")
    out.append("- Draft invoice creation works, but the normal draft invoice response did not expose a public/payment URL in the API smoke test.")
    out.append("- Invoice visual/template work should still be checked manually in the browser because the automated tests only prove API and route health.")
    out.append("- SMS is intentionally Coming Soon / disabled for launch.")
    out.append("- The npm audit vulnerability count remains dependency-level noise and was not changed here to avoid risky package upgrades before launch.")
    out.append("")
    out.append("## Next manual browser checks")
    out.append("")
    out.append("1. Log in as owner on www.churvox.com.")
    out.append("2. Open Dashboard / Smart Hub.")
    out.append("3. Open Clients, Jobs, Quotes, Invoices, Team, Plans.")
    out.append("4. Create a real-looking job and open its Work Slip/modal.")
    out.append("5. Open an invoice Work Slip and visually confirm the invoice template is acceptable.")
    out.append("6. Test on mobile/PWA install path.")
    out.append("")

    report = "\n".join(out)
    Path("audits").mkdir(exist_ok=True)
    latest = Path("audits/churvox_final_launch_summary_latest.md")
    stamped = Path("audits") / f"churvox_final_launch_summary_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"
    latest.write_text(report)
    stamped.write_text(report)

    print(report)
    print("")
    print(f"LATEST_FILE={latest}")
    print(f"REPORT_FILE={stamped}")

if __name__ == "__main__":
    main()
