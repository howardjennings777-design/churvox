#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "backend" / "server.py"
PANEL = ROOT / "frontend" / "src" / "components" / "worker" / "WorkerContactOfficePanel.js"
BRIDGE = ROOT / "frontend" / "src" / "churvox-fresh" / "commandBridge.js"
OWNER_DESK = ROOT / "frontend" / "src" / "churvox-fresh" / "FreshCommandOwnerDesk.jsx"

server = SERVER.read_text(encoding="utf-8")
panel = PANEL.read_text(encoding="utf-8")
bridge = BRIDGE.read_text(encoding="utf-8")
owner_desk = OWNER_DESK.read_text(encoding="utf-8")

failures = []


def check(name, ok, detail):
    if ok:
        print(f"PASS — {name}")
    else:
        print(f"FAIL — {name}: {detail}")
        failures.append(f"{name}: {detail}")


route_match = re.search(r'@api_router\.post\(["\']/worker/contact-office["\']\)', server)
route_start = route_match.start() if route_match else -1
next_route = server.find("\n@api_router.", route_start + 1) if route_start >= 0 else -1
route_block = server[route_start: next_route if next_route > route_start else route_start + 9000] if route_start >= 0 else ""
route_line = server.count("\n", 0, route_start) + 1 if route_start >= 0 else 0

print(f"Worker contact route line: {route_line or 'missing'}")
if route_block:
    print("Worker contact route markers:")
    for marker in ["support_tickets", "worker_office_contact", "command_slips", "notifications", "request_id", "source_id"]:
        print(f"- {marker}: {marker in route_block}")

check(
    "worker contact endpoint exists",
    route_start >= 0,
    "POST /worker/contact-office is missing from backend/server.py",
)
check(
    "worker contact requires an authenticated worker",
    "Depends(get_current_user)" in route_block
    and ("Worker access required" in route_block or 'role") != "worker"' in route_block or "role') != 'worker'" in route_block),
    "the endpoint must reject unauthenticated or non-worker submissions",
)
check(
    "worker message is stored durably",
    "support_tickets" in route_block and "insert_one" in route_block and "worker_office_contact" in route_block,
    "the endpoint must persist one support-ticket record for the owner bell and audit trail",
)
check(
    "backend does not create a second Command slip",
    "command_slips" not in route_block and "db.command" not in route_block,
    "the frontend Command bridge is the Command-slip writer; the backend ticket route must not duplicate it",
)
check(
    "frontend sends the durable office ticket first",
    'post("/worker/contact-office"' in panel,
    "WorkerContactOfficePanel must post the durable ticket endpoint",
)
check(
    "frontend creates owner Command visibility",
    "sendFreshSlipToCommand" in panel and "worker_help_request" in panel,
    "the worker panel must also create the owner-facing Command item",
)
check(
    "Command bridge writes through the backend",
    "postFreshSlipToCommand" in bridge and "/api/command/slips" in bridge,
    "Command slips must not remain browser-only",
)
check(
    "owner Command reads durable slips",
    "/api/command/slips" in owner_desk or "COMMAND_API_BASE" in owner_desk,
    "the owner desk must reload worker slips after refresh",
)
check(
    "worker and job context stay attached",
    all(marker in panel for marker in ["worker_id", "worker_name", "worker_email", "job_id", "job_title", "sourceId"]),
    "owner messages need worker and job context for action",
)

if failures:
    print(f"\nWorker-to-owner message contract failed: {len(failures)} issue(s).")
    for failure in failures:
        print(f"- {failure}")
    raise SystemExit(1)

print("\nWorker-to-owner message contract passed: one durable ticket plus one durable Command item, with worker/job context and no backend duplicate Command write.")
