#!/usr/bin/env python3
from pathlib import Path

source = Path("scripts/churvox_paid_launch_readiness_apply_v3.py").read_text(encoding="utf-8")
exec(compile(source, "scripts/churvox_paid_launch_readiness_apply_v3.py", "exec"), {"__name__": "__main__"})

path = Path("backend/churvox_command_human_mimic_live_routes.py")
text = path.read_text(encoding="utf-8")

helper_old = '''    def text(value):
        try:
            return str(value or "").strip()
        except Exception:
            return ""

    def maybe_oid(value):
'''
helper_new = '''    def text(value):
        try:
            return str(value or "").strip()
        except Exception:
            return ""

    def status_text(row):
        return text((row or {}).get("status") or (row or {}).get("job_status") or (row or {}).get("state")).lower()

    def unresolved_completion(row):
        status = status_text(row)
        normalized = status.replace("_", " ").replace("-", " ").replace("/", " ")
        words = {word for word in normalized.split() if word}
        return (
            "incomplete" in words
            or ("not" in words and bool(words & {"complete", "completed"}))
            or status in {"pending completion", "awaiting completion"}
        )

    def maybe_oid(value):
'''
if helper_new in text:
    print("already patched: strict live completion helper")
elif helper_old in text:
    text = text.replace(helper_old, helper_new, 1)
    print("patched: strict live completion helper")
else:
    raise SystemExit("missing anchor for strict live completion helper")

loop_old = '''        retired_ids = set()
        for slip in list(result.get("slips") or []) + list(result.get("existing") or []):
            if text(slip.get("action_type")) != "prepare_invoice":
                continue
            job = await source_job(user, slip.get("source_id"))
            if job and await linked_invoice(user, job, slip.get("source_id")):
                reason = "A live invoice already links to this job, so the duplicate invoice decision was removed. " + SAFE_NOTE
                if await supersede(slip, reason):
                    retired_ids.add(text(slip.get("id") or slip.get("_id")))
'''
loop_new = '''        retired_ids = set()
        job_actions = {"prepare_invoice", "prepare_recurring_next_date", "complete_job_setup", "request_completion_proof", "prepare_client_memory"}
        for slip in list(result.get("slips") or []) + list(result.get("existing") or []):
            action = text(slip.get("action_type"))
            job = await source_job(user, slip.get("source_id")) if action in job_actions else None
            if job and unresolved_completion(job):
                reason = "The source job has an unresolved completion status, so no normal booking, invoice, proof, assignment or memory decision is safe yet. " + SAFE_NOTE
                if await supersede(slip, reason):
                    retired_ids.add(text(slip.get("id") or slip.get("_id")))
                continue
            if action != "prepare_invoice":
                continue
            if job and await linked_invoice(user, job, slip.get("source_id")):
                reason = "A live invoice already links to this job, so the duplicate invoice decision was removed. " + SAFE_NOTE
                if await supersede(slip, reason):
                    retired_ids.add(text(slip.get("id") or slip.get("_id")))
'''
if loop_new in text:
    print("already patched: strict live unresolved completion queue guard")
elif loop_old in text:
    text = text.replace(loop_old, loop_new, 1)
    print("patched: strict live unresolved completion queue guard")
else:
    raise SystemExit("missing anchor for strict live unresolved completion queue guard")

path.write_text(text, encoding="utf-8")
final = path.read_text(encoding="utf-8")
for needle in ["def unresolved_completion(row):", "job_actions =", "if job and unresolved_completion(job):"]:
    if needle not in final:
        raise SystemExit(f"strict live completion guard missing: {needle}")
