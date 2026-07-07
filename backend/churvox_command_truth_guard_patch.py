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


def clean(value):
    return str(value or "").replace("\n", " ").replace("\t", " ").strip()


def lower(value):
    return clean(value).lower()


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


def merge_missing(item):
    missing = []
    item = item or {}
    for key in ["missing_fields", "missing", "required_fields"]:
        raw = item.get(key)
        if isinstance(raw, list):
            missing.extend([clean(x) for x in raw if clean(x)])
        elif clean(raw):
            missing.append(clean(raw))
    details = item.get("details") if isinstance(item.get("details"), dict) else {}
    for key in ["missing_fields", "missing", "missing_proof"]:
        raw = details.get(key)
        if isinstance(raw, list):
            missing.extend([clean(x) for x in raw if clean(x)])
        elif clean(raw):
            missing.append(clean(raw))
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


def truth_guard_item(item):
    item = dict(item or {})
    atype = action_type(item)
    missing = merge_missing(item)
    needs_boss = bool(missing) or atype in BOSS_TODO_TYPES
    safe_ready = not needs_boss

    for key in ["client", "client_name", "customer", "customer_name", "worker", "worker_name", "assigned_worker_name", "job_id", "source_id", "invoice_id", "quote_id"]:
        if key in item and is_fake(item.get(key)):
            item[key] = ""

    item["truth_checked"] = True
    item["requires_owner_approval"] = True
    item["real_review_layer"] = True
    item["safe_to_complete"] = safe_ready
    item["can_complete_without_more_info"] = safe_ready
    item["needs_owner_input"] = needs_boss
    item["boss_todo"] = needs_boss
    item["missing_fields"] = missing
    item["command_slip_kind"] = "boss_to_do" if needs_boss else "prepared_admin"
    item["status"] = item.get("status") or "waiting_owner_review"

    if needs_boss:
        reason = ", ".join(missing) if missing else "owner decision"
        item["owner"] = "Boss to add/check"
        item["check"] = f"Boss needs to add/check: {reason}. Churvox must not guess this."
        item["prepared"] = f"Churvox found the admin gap, but it cannot safely complete it yet because: {reason}."
        item["next"] = "Open this slip, add the missing detail, then approve/edit/park."
    else:
        item["owner"] = item.get("owner") or "Approve, edit or park"
        item["check"] = item.get("check") or "Churvox found real linked records. Owner still approves before anything happens."
        item["prepared"] = item.get("prepared") or "Churvox prepared this from live records. Nothing is sent, synced, filed or paid automatically."
        item["next"] = item.get("next") or "Owner approval required before Churvox completes anything."
    return item


if auto_smart is not None:
    _ORIGINAL_ACTION = auto_smart.action
    _ORIGINAL_STORE_ACTIONS = auto_smart.store_actions

    def guarded_action(action_type, title, summary, priority="medium", payload=None, source="auto_smart"):
        return truth_guard_item(_ORIGINAL_ACTION(action_type, title, summary, priority, payload or {}, source))

    async def guarded_store_actions(db, bid, actions):
        guarded = [truth_guard_item(action) for action in (actions or []) if isinstance(action, dict)]
        return await _ORIGINAL_STORE_ACTIONS(db, bid, guarded)

    auto_smart.action = guarded_action
    auto_smart.store_actions = guarded_store_actions


if field_truth is not None:
    _ORIGINAL_COMMAND_ITEM_FROM_SLIP = field_truth.command_item_from_slip

    def guarded_command_item_from_slip(slip):
        item = _ORIGINAL_COMMAND_ITEM_FROM_SLIP(slip)
        slip = slip or {}
        job_id = real_value(slip.get("job_id"))
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
        return item

    field_truth.command_item_from_slip = guarded_command_item_from_slip
