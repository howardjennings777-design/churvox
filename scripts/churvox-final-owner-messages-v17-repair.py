from __future__ import annotations

import json
from pathlib import Path

OLD = "churvox-final-owner-messages-v16-20260713"
NEW = "churvox-final-owner-messages-v17-20260714"


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:220]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_all(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if old not in text and new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected marker not found in {path}: {old!r}")
    file.write_text(text.replace(old, new), encoding="utf-8")


patch = "backend/churvox_final_owner_messages_route_patch.py"
replace_once(
    patch,
    "from datetime import datetime\n",
    "from datetime import datetime\n\nfrom fastapi import Request\n",
)
replace_all(patch, OLD, NEW)
replace_once(
    patch,
    '''    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    if app is None or db is None or get_current_user is None or ObjectId is None or Request is None:
        return False''',
    '''    ObjectId = getattr(module, "ObjectId", None)
    if app is None or db is None or get_current_user is None or ObjectId is None:
        return False''',
)

replace_all("backend/server/__init__.py", OLD, NEW)
replace_all("scripts/churvox-paid-launch-live-smoke-v2.cjs", OLD, NEW)

marker_path = Path("frontend/public/churvox-paid-launch-build.json")
marker = json.loads(marker_path.read_text(encoding="utf-8"))
marker["build"] = NEW
marker["owner_message_dedupe"] = NEW
marker["owner_messages_final_route"] = NEW
marker["owner_messages_request_signature"] = "fastapi-request-global-v17-20260714"
includes = list(marker.get("includes") or [])
for value in [
    "final-owner-messages-request-signature",
    "messages-route-no-422-request-query",
]:
    if value not in includes:
        includes.append(value)
marker["includes"] = includes
marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")

contract = Path("scripts/churvox-final-owner-messages-v17-contract.cjs")
contract.write_text(
    '''const fs = require('fs');
const patch = fs.readFileSync('backend/churvox_final_owner_messages_route_patch.py', 'utf8');
const wrapper = fs.readFileSync('backend/server/__init__.py', 'utf8');
const smoke = fs.readFileSync('scripts/churvox-paid-launch-live-smoke-v2.cjs', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const proof = fs.readFileSync('.github/workflows/churvox-worker-command-scope-diagnostic.yml', 'utf8');
const checks = [
  ['v17 marker aligned', patch.includes('churvox-final-owner-messages-v17-20260714') && wrapper.includes('churvox-final-owner-messages-v17-20260714') && smoke.includes('churvox-final-owner-messages-v17-20260714') && marker.includes('churvox-final-owner-messages-v17-20260714')],
  ['FastAPI Request is globally resolvable', patch.includes('from fastapi import Request') && patch.includes('async def list_messages(request: Request):')],
  ['bad local Request dependency removed', !patch.includes('Request = getattr(module, "Request", None)') && !patch.includes('ObjectId is None or Request is None')],
  ['logical completion dedupe retained', patch.includes('job_completion:') && patch.includes('rows = dedupe(rows)[:200]')],
  ['final route ownership retained', patch.includes('remove_route(app, "/api/messages", "GET")') && wrapper.includes('messages_patch.install(legacy, force=True)')],
  ['live smoke requires v17 route', smoke.includes('expectedOwnerMessages') && smoke.includes('final_owner_messages_wrapper')],
  ['exact proof requires v17 and 1/1/0', proof.includes('churvox-final-owner-messages-v17-20260714') && proof.includes('notifications.matches === 1') && proof.includes('messages.matches === 1') && proof.includes('command.matches === 0')],
  ['v15 protections remain', marker.includes('active-worker-jobs-only') && marker.includes('worker-job-queue-bounded-with-show-all')],
  ['owner approval safety remains', marker.includes('Owner approval remains required')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log('CHURVOX_FINAL_OWNER_MESSAGES_V17_CONTRACT_PASS');
''',
    encoding="utf-8",
)

proof_path = Path(".github/workflows/churvox-worker-command-scope-diagnostic.yml")
proof_text = proof_path.read_text(encoding="utf-8")
if OLD in proof_text:
    proof_text = proof_text.replace(OLD, NEW)
proof_path.write_text(proof_text, encoding="utf-8")

print("CHURVOX_FINAL_OWNER_MESSAGES_V17_REPAIR_APPLIED")
