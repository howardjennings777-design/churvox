from __future__ import annotations

try:
    import churvox_auto_smart_patch as auto_smart
except Exception:  # pragma: no cover
    auto_smart = None

try:
    import churvox_field_truth_patch as field_truth
except Exception:  # pragma: no cover
    field_truth = None

FAKE_VALUES = {"", "none", "null", "undefined", "unknown", "no customer", "no client", "no client selected", "unassigned", "general-message"}
BOSS_TODO_TYPES = {"cleanup", "pricing", "proof", "worker_update", "recurring_memory", "worker_capacity", "client_credit_check", "archive_prompt"}
REQUIRES_REAL_JOB = {"dispatch", "invoice", "pricing", "proof", "cleanup", "price_memory", "archive_prompt"}
PARK_REASONS = ["Waiting for client", "Need price", "Need worker", "Need photos/proof", "Need job link", "Not doing yet", "Unsure"]


def clean(value):
    return str(value or "").replace("\n", " ").replace("\t", " ").strip()


def lower(value):
    return clean(value).lower()


def as_list(value):
    if isinstance(value, list):
        return [clean(item) for item in value if clean(item)]
    if clean(value):
        return [clean(value)]
    return []


def is_fake(value):
    return lower(value) in FAKE_VALUES


def amount(value):
    try:
        return float(str(value or 0).replace("$", "").replace(",", ""))
    except Exception:
        return 0.0


def real_value(value):
    text = clean(value)
    return text if text and not is_fake(text) else ""


def action_type(item):
    return lower((item or {}).get("type") or (item or {}).get("action_type") or (item or {}).get("kind"))


def text_blob(item):
    item = item or {}
    details = item.get("details") if isinstance(item.get("details"), dict) else {}
    slip = details.get("slip") if isinstance(details.get("slip"), dict) else {}
    parts = []
    for source in [item, details, slip]:
        for key in ["type", "kind", "title", "summary", "reason", "text", "note", "message", "prepared", "check", "source"]:
            parts.append(clean((source or {}).get(key)))
    return lower(" ".join(parts))


def merge_missing(item):
    missing = []
    item = item or {}
    for key in ["missing_fields", "missing", "required_fields"]:
        missing.extend(as_list(item.get(key)))
    details = item.get("details") if isinstance(item.get("details"), dict) else {}
    for key in ["missing_fields", "missing", "missing_proof"]:
        missing.extend(as_list(details.get(key)))
    atype = action_type(item)
    if atype in REQUIRES_REAL_JOB and not real_value(item.get("job_id") or item.get("source_id")):
        missing.append("linked job")
    if atype == "invoice" and amount(item.get("amount")) <= 0:
        missing.append("confirmed price")
    if atype == "price_memory" and amount(item.get("amount")) <= 0:
        missing.append("saved client price")
    if atype == "quote_to_job" and not real_value(item.get("quote_id")):
        missing.append("linked quote")
    seen = set()
    out = []
    for field in missing:
        key = lower(field)
        if key and key not in seen:
            seen.add(key)
            out.append(field)
    return out


def confidence_for(item, missing):
    if item.get("possible_duplicate"):
        return "Needs boss check"
    if missing:
        return "Boss must complete" if any(lower(x) in {"linked job", "confirmed price", "client", "worker", "address"} for x in missing) else "Needs boss check"
    if action_type(item) in BOSS_TODO_TYPES:
        return "Needs boss check"
    return "Ready to approve"


def why_here(item, missing):
    atype = action_type(item)
    if missing:
        return f"Churvox found this because {', '.join(missing)} is missing or unsafe to guess."
    if atype == "invoice":
        return "Churvox found a completed job that can become an invoice draft after owner approval."
    if atype in {"follow", "invoice_followup"}:
        return "Churvox found money or a quote waiting for a follow-up decision."
    if atype == "quote_to_job":
        return "Churvox found an accepted quote that has not become work yet."
    if atype == "recurring_memory":
        return "Churvox found client schedule memory without an upcoming job."
    if atype == "client_credit_check":
        return "Churvox found open work for a client with unpaid money showing."
    if atype == "worker_update":
        return "Churvox found a worker slip that needs the boss to read and decide."
    return clean(item.get("reason") or item.get("summary") or item.get("title") or "Churvox found this from live records.")


def triage_label(item):
    text = text_blob(item)
    if any(word in text for word in ["blocked", "problem", "issue", "stuck", "can't", "cannot"]):
        return "Issue"
    if any(word in text for word in ["extra", "material", "materials", "additional", "more work"]):
        return "Extra work"
    if any(word in text for word in ["customer asked", "client asked", "request", "wants", "asked for"]):
        return "Customer request"
    if any(word in text for word in ["photo", "proof", "before", "after"]):
        return "Proof/photo"
    if any(word in text for word in ["time", "late", "delay", "hours", "timesheet"]):
        return "Time problem"
    return "General note"


def job_health(item, missing):
    atype = action_type(item)
    text = text_blob(item)
    if any(lower(x) in {"linked job", "address", "date", "time", "worker", "client"} for x in missing):
        return "Needs admin"
    if any(word in text for word in ["blocked", "issue", "problem", "stuck"]):
        return "Worker blocked"
    if atype in {"invoice", "price_memory"} and not missing:
        return "Ready to invoice"
    if atype in {"proof", "worker_update"}:
        return "Waiting on boss"
    if atype == "dispatch":
        return "Ready to run after worker assigned"
    return "Owner check"


def invoice_guard(item, missing):
    atype = action_type(item)
    text = text_blob(item)
    looks_invoice = atype in {"invoice", "pricing", "price_memory"} or "invoice" in text
    if not looks_invoice:
        return "Not an invoice slip"
    blockers = [field for field in missing if lower(field) in {"linked job", "confirmed price", "saved client price", "client", "proof", "photos", "address"}]
    if blockers:
        return f"Cannot invoice yet: boss must add/check {', '.join(blockers)}."
    return "Invoice guard passed for Command review. Owner approval still required before sending or sync."


def client_memory(item):
    atype = action_type(item)
    if atype == "price_memory":
        return "Client has saved price memory; boss should confirm before using it."
    if atype == "recurring_memory":
        return "Client has recurring schedule memory; Churvox found no upcoming job."
    if atype == "client_credit_check":
        return "Client has open/unpaid money showing before more work goes ahead."
    return clean(item.get("client_memory_warning"))


def duplicate_signature(item):
    atype = action_type(item) or "command"
    strong = real_value(item.get("job_id") or item.get("invoice_id") or item.get("quote_id") or item.get("source_id"))
    if strong:
        return f"{atype}:{strong}"
    return ":".join([atype, lower(item.get("client_name") or item.get("client") or item.get("customer_name")), lower(item.get("title") or item.get("action") or item.get("summary"))[:80]])


def audit_trail(item):
    trail = []
    trail.extend(as_list(item.get("audit_trail")))
    trail.append("Churvox scanned live records.")
    trail.append("Truth guard checked for fake placeholders and missing fields.")
    if item.get("possible_duplicate"):
        trail.append("Duplicate guard flagged a possible repeated slip.")
    if item.get("needs_owner_input"):
        trail.append("Marked as boss-to-do because Churvox must not guess missing details.")
    else:
        trail.append("Marked as prepared admin for owner approval.")
    seen = set()
    out = []
    for line in trail:
        key = lower(line)
        if key and key not in seen:
            seen.add(key)
            out.append(line)
    return out[-8:]


def truth_guard_item(item):
    item = dict(item or {})
    atype = action_type(item)
    for key in ["client", "client_name", "customer", "customer_name", "worker", "worker_name", "assigned_worker_name", "job_id", "source_id", "invoice_id", "quote_id"]:
        if key in item and is_fake(item.get(key)):
            item[key] = ""

    missing = merge_missing(item)
    needs_boss = bool(missing) or atype in BOSS_TODO_TYPES or bool(item.get("possible_duplicate"))
    confidence = confidence_for(item, missing)
    why = why_here(item, missing)
    triage = triage_label(item)
    health = job_health(item, missing)
    inv_guard = invoice_guard(item, missing)
    memory = client_memory(item)
    safe_ready = confidence == "Ready to approve" and not needs_boss

    item["truth_checked"] = True
    item["requires_owner_approval"] = True
    item["real_review_layer"] = True
    item["confidence"] = confidence
    item["confidence_label"] = confidence
    item["why_here"] = why
    item["missing_fields"] = missing
    item["missing_field_highlights"] = ", ".join(missing) if missing else "No missing fields found by Churvox."
    item["worker_slip_type"] = triage
    item["job_health"] = health
    item["invoice_guard"] = inv_guard
    item["client_memory_warning"] = memory
    item["duplicate_signature"] = duplicate_signature(item)
    item["duplicate_warning"] = item.get("duplicate_warning") or ""
    item["park_reasons"] = PARK_REASONS
    item["safe_to_complete"] = safe_ready
    item["can_complete_without_more_info"] = safe_ready
    item["needs_owner_input"] = needs_boss
    item["boss_todo"] = needs_boss
    item["command_slip_kind"] = "boss_to_do" if needs_boss else "prepared_admin"
    item["status"] = item.get("status") or "waiting_owner_review"

    if needs_boss:
        reason = ", ".join(missing) if missing else "owner decision or duplicate check"
        item["owner"] = "Boss to add/check"
        item["check"] = f"Confidence: {confidence}. Why: {why} Boss needs to add/check: {reason}. Invoice guard: {inv_guard}. Suggested park reasons: {', '.join(PARK_REASONS[:5])}."
        item["prepared"] = f"Churvox found the admin gap, but it cannot safely complete it yet because: {reason}."
        item["filled"] = item.get("filled") or "Not auto-filled. This is a boss-to-do slip, not a fake prepared action."
        item["evidence"] = item.get("evidence") or f"Missing/highlighted: {reason}. Job health: {health}. Worker triage: {triage}."
        item["next"] = "Open this slip, add the missing detail, then approve/edit/park."
    else:
        item["owner"] = item.get("owner") or "Approve, edit or park"
        item["check"] = item.get("check") or f"Confidence: {confidence}. Why: {why} Invoice guard: {inv_guard}. Owner approval still required."
        item["prepared"] = item.get("prepared") or "Churvox prepared this from live records. Nothing is sent, synced, filed or paid automatically."
        item["filled"] = item.get("filled") or "Prepared from live linked records; boss can still edit before approving."
        item["evidence"] = item.get("evidence") or f"Job health: {health}. Duplicate guard clear."
        item["next"] = item.get("next") or "Owner approval required before Churvox completes anything."

    item["audit_trail"] = audit_trail(item)
    return item


def apply_duplicate_guard(items):
    guarded = [truth_guard_item(item) for item in (items or []) if isinstance(item, dict)]
    counts = {}
    for item in guarded:
        sig = item.get("duplicate_signature")
        if sig:
            counts[sig] = counts.get(sig, 0) + 1
    out = []
    for item in guarded:
        sig = item.get("duplicate_signature")
        if sig and counts.get(sig, 0) > 1:
            item["possible_duplicate"] = True
            item["duplicate_warning"] = "Possible duplicate Command slip. Boss should check before approving."
            item = truth_guard_item(item)
        out.append(item)
    return out


if auto_smart is not None:
    _ORIGINAL_ACTION = auto_smart.action
    _ORIGINAL_STORE_ACTIONS = auto_smart.store_actions

    def guarded_action(action_type, title, summary, priority="medium", payload=None, source="auto_smart"):
        return truth_guard_item(_ORIGINAL_ACTION(action_type, title, summary, priority, payload or {}, source))

    async def guarded_store_actions(db, bid, actions):
        return await _ORIGINAL_STORE_ACTIONS(db, bid, apply_duplicate_guard(actions))

    auto_smart.action = guarded_action
    auto_smart.store_actions = guarded_store_actions


if field_truth is not None:
    _ORIGINAL_COMMAND_ITEM_FROM_SLIP = field_truth.command_item_from_slip

    def guarded_command_item_from_slip(slip):
        item = _ORIGINAL_COMMAND_ITEM_FROM_SLIP(slip)
        slip = slip or {}
        job_id = real_value(slip.get("job_id"))
        item["worker_slip_type"] = triage_label({"details": {"slip": slip}, **item})
        item["truth_checked"] = True
        item["requires_owner_approval"] = True
        item["safe_to_complete"] = False
        item["can_complete_without_more_info"] = False
        item["needs_owner_input"] = True
        item["boss_todo"] = True
        item["command_slip_kind"] = "worker_slip_boss_to_do"
        item["owner"] = "Boss to read and decide"
        item["check"] = "Worker slip only. Boss must decide before Churvox changes a job, sends a customer message, prices extras or invoices."
        if not job_id:
            item["found"] = "Worker message with no linked job yet"
            item["missing_fields"] = ["linked job"]
            item["prepared"] = "Churvox received the worker note, but it cannot link it to a real job yet. Boss needs to link or file it."
        else:
            item["found"] = f"Job {job_id}"
            item["missing_fields"] = []
            item["prepared"] = "Churvox converted real worker field input into a Command slip. Nothing is sent or changed without owner approval."
        return truth_guard_item(item)

    field_truth.command_item_from_slip = guarded_command_item_from_slip
