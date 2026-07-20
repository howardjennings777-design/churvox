#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "backend" / "server.py"
WORKER_COMMAND_PATCH = ROOT / "backend" / "churvox_worker_help_command_patch.py"
PATCH_LOADER = ROOT / "backend" / "churvox_startup_patch_loader.py"
PANEL = ROOT / "frontend" / "src" / "components" / "worker" / "WorkerContactOfficePanel.js"
OWNER_DESK = ROOT / "frontend" / "src" / "churvox-fresh" / "FreshCommandOwnerDesk.jsx"
VISIBILITY_PATCH = ROOT / "backend" / "churvox_worker_command_visibility_patch.py"
DECISION_PATCH = ROOT / "backend" / "churvox_worker_field_slip_decision_patch.py"

server = SERVER.read_text(encoding="utf-8")
worker_patch = WORKER_COMMAND_PATCH.read_text(encoding="utf-8")
loader = PATCH_LOADER.read_text(encoding="utf-8")
panel = PANEL.read_text(encoding="utf-8")
owner_desk = OWNER_DESK.read_text(encoding="utf-8")
visibility = VISIBILITY_PATCH.read_text(encoding="utf-8")
decisions = DECISION_PATCH.read_text(encoding="utf-8")

failures = []


def check(name, ok, detail):
    if ok:
        print(f"PASS — {name}")
    else:
        print(f"FAIL — {name}: {detail}")
        failures.append(f"{name}: {detail}")


route_match = re.search(r'@api_router\.post\(\s*["\']/worker/contact-office["\'][^)]*\)', server)
route_start = route_match.start() if route_match else -1
next_route = server.find("\n@api_router.", route_start + 1) if route_start >= 0 else -1
route_block = server[route_start: next_route if next_route > route_start else route_start + 12000] if route_start >= 0 else ""
route_line = server.count("\n", 0, route_start) + 1 if route_start >= 0 else 0

print(f"Worker contact route line: {route_line or 'missing'}")
if route_block:
    print("Worker contact route markers:")
    for marker in ["support_tickets", "worker_office_contact", "worker_message", "command_slips", "request_id", "source_id"]:
        print(f"- {marker}: {marker in route_block}")

check(
    "worker contact endpoint exists",
    route_start >= 0,
    "POST /worker/contact-office is missing from backend/server.py",
)
check(
    "worker message is stored durably for the office bell",
    "support_tickets" in route_block
    and "insert_one" in route_block
    and ("worker_office_contact" in route_block or "worker_message" in route_block),
    "the office route must persist one support-ticket record for owner notifications and audit",
)
check(
    "office route does not create a second Command item",
    "command_slips" not in route_block and "db.command" not in route_block,
    "the dedicated worker Command route owns the Command record",
)
check(
    "worker sends one shared request id to both durable paths",
    "const clientRequestId = requestId()" in panel
    and "request_id: clientRequestId" in panel
    and "source_id: clientRequestId" in panel,
    "office ticket and Command item must be traceable to the same worker request",
)
check(
    "worker uses the participant-safe update route",
    'post("/command/worker-update-request"' in panel
    and "sendFreshSlipToCommand" not in panel,
    "workers must not call the owner-only generic Command-slip endpoint",
)
check(
    "worker and job context stay attached",
    all(marker in panel for marker in ["worker_id", "worker_name", "worker_email", "job_id", "job_title", "update_type"]),
    "owner messages need worker and job context for action",
)
check(
    "final route accepts business participants but keeps owner review",
    "PARTICIPANT_ROLES" in worker_patch
    and 'path = "/api/command/worker-update-request"' in worker_patch
    and '"owner_review_only": True' in worker_patch
    and '"no_auto_send": True' in worker_patch
    and '"no_auto_record_change": True' in worker_patch,
    "worker submission must be allowed without granting action authority",
)
check(
    "Command write is idempotent",
    "deterministic_object_id" in worker_patch
    and "hashlib.sha256" in worker_patch
    and 'existing = await db.command_slips.find_one({"_id": slip_id})' in worker_patch
    and '"idempotent": True' in worker_patch,
    "retries with the same request id must return the same Command item",
)
check(
    "final route wins startup precedence",
    '"churvox_worker_command_visibility_patch"' in loader
    and '"churvox_worker_help_command_patch"' in loader
    and loader.index('"churvox_worker_help_command_patch"') > loader.index('"churvox_worker_command_visibility_patch"'),
    "the participant-safe route must load after competing Command visibility patches",
)
check(
    "owner desk reloads durable Command slips",
    'get("/command/slips"' in owner_desk
    and "normaliseCommandSlip" in owner_desk
    and "dedupeItems" in owner_desk,
    "a fresh owner login on another device must see worker Command items",
)
check(
    "owner decisions use the matching durable endpoint",
    '/command/slips/${id}/' in owner_desk
    and '/command/field-slips/${id}/' in owner_desk
    and 'item.source === "command"' in owner_desk,
    "normal Command slips and older worker field slips need separate safe decision routes",
)
check(
    "backend Command GET includes durable and worker field slips",
    'for collection_name in ("command_slips", "ai_approval_actions")' in visibility
    and "db.worker_field_slips" in visibility
    and 'app.add_api_route("/api/command/slips", command_slips_get, methods=["GET"])' in visibility,
    "owner reload must aggregate all durable Command sources",
)
check(
    "field-slip decisions stay record-only",
    'path = "/api/command/field-slips/{slip_id}/{decision}"' in decisions
    and "Nothing was sent, synced, charged or changed" in decisions,
    "older worker field updates must remain safely reviewable",
)

if failures:
    print(f"\nWorker-to-owner message contract failed: {len(failures)} issue(s).")
    for failure in failures:
        print(f"- {failure}")
    raise SystemExit(1)

print("\nWorker-to-owner message contract passed: one durable office ticket, one idempotent Command item, cross-device owner reload, and safe owner decisions.")
