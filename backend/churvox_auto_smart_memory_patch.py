from __future__ import annotations

from datetime import datetime, timezone, timedelta

try:
    import churvox_auto_smart_patch as auto_smart
except Exception:  # pragma: no cover
    auto_smart = None


if auto_smart is not None:
    _ORIGINAL_MANUAL_SCAN = auto_smart.manual_scan

    def parse_dt(value):
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, str) and value.strip():
            text = value.strip()
            for candidate in [text, text[:10]]:
                try:
                    parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
                    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
                except Exception:
                    pass
        return None

    def date_key(record):
        value = record.get("scheduled_date") or record.get("date") or record.get("start_date") or record.get("scheduled_start") or record.get("start")
        parsed = parse_dt(value)
        if parsed:
            return parsed.date().isoformat()
        return auto_smart.clean(value)[:10]

    def completed_at(record):
        return parse_dt(record.get("completed_at") or record.get("finished_at") or record.get("updated_at") or record.get("created_at"))

    def client_key(value):
        return auto_smart.clean(value).lower()

    def client_name(record):
        return auto_smart.client_of(record)

    def status(record):
        return auto_smart.status_of(record)

    def job_is_open(job):
        return not auto_smart.is_complete(job) and status(job) not in {"cancelled", "archived", "deleted"}

    def frequency(record):
        return auto_smart.clean(record.get("recurring") or record.get("repeat") or record.get("frequency") or record.get("schedule") or record.get("preferred_schedule"))

    def has_recurring_frequency(record):
        return frequency(record).lower() in {"weekly", "fortnightly", "monthly", "custom"}

    def action(action_type, title, summary, priority="medium", payload=None, source="auto_smart_memory"):
        return auto_smart.action(action_type, title, summary, priority, payload or {}, source)

    async def smarter_manual_scan(db, user, ObjectId):
        actions = await _ORIGINAL_MANUAL_SCAN(db, user, ObjectId)
        query = auto_smart.scoped_query(user, ObjectId)
        jobs = await auto_smart.safe_recent(db.jobs, query, 400, "updated_at")
        clients = await auto_smart.safe_recent(db.clients, query, 250, "updated_at")
        invoices = await auto_smart.safe_recent(db.invoices, query, 250, "updated_at")
        quotes = await auto_smart.safe_recent(db.quotes, query, 250, "updated_at")
        today = auto_smart.now_utc().date()

        jobs_by_client = {}
        open_jobs_by_client = {}
        future_jobs_by_client = {}
        jobs_by_worker_day = {}
        completed_jobs = []
        for job in jobs:
            ckey = client_key(client_name(job))
            if ckey:
                jobs_by_client.setdefault(ckey, []).append(job)
                if job_is_open(job):
                    open_jobs_by_client.setdefault(ckey, []).append(job)
                scheduled = parse_dt(job.get("scheduled_start") or job.get("start") or job.get("scheduled_date") or job.get("date"))
                if scheduled and scheduled.date() >= today and job_is_open(job):
                    future_jobs_by_client.setdefault(ckey, []).append(job)
            if auto_smart.is_complete(job):
                completed_jobs.append(job)
            worker = auto_smart.clean(job.get("worker_name") or job.get("assigned_worker_name") or job.get("assigned_to") or job.get("worker_id") or job.get("assigned_worker_id"))
            day = date_key(job)
            if worker and day and job_is_open(job):
                jobs_by_worker_day.setdefault((worker.lower(), day), []).append(job)

        unpaid_by_client = {}
        for invoice in invoices:
            if status(invoice) in {"overdue", "unpaid", "open", "sent", "due", "pending_payment"}:
                unpaid_by_client.setdefault(client_key(client_name(invoice)), []).append(invoice)

        # 1. Client memory: recurring clients with no future job should be prepared, not remembered manually by the owner.
        for client in clients:
            ckey = client_key(client_name(client))
            freq = frequency(client)
            if ckey and freq.lower() in {"weekly", "fortnightly", "monthly", "custom"} and not future_jobs_by_client.get(ckey):
                actions.append(action(
                    "recurring_memory",
                    f"Prepare next {freq} job for {client_name(client)}",
                    f"{client_name(client)} has {freq} service memory but no upcoming job found.",
                    "high",
                    {"client_id": auto_smart.doc_id(client), "client_name": client_name(client), "frequency": freq},
                    "auto_smart_client_memory",
                ))

        # 2. Price memory: saved client prices should help create a safe invoice/job price without hunting.
        client_lookup = {client_key(client_name(client)): client for client in clients if client_key(client_name(client))}
        for job in jobs:
            if auto_smart.amount_of(job) > 0:
                continue
            ckey = client_key(client_name(job))
            client = client_lookup.get(ckey) or {}
            saved_price = auto_smart.amount_of({"amount": client.get("saved_price") or client.get("price") or client.get("usual_price") or client.get("default_price")})
            if saved_price > 0:
                actions.append(action(
                    "price_memory",
                    f"Use saved price for {auto_smart.title_of(job)}",
                    f"{client_name(job)} has a saved price of ${saved_price:.2f}; Churvox can pre-fill it for owner review.",
                    "medium",
                    {"job_id": auto_smart.doc_id(job), "client_id": auto_smart.doc_id(client), "amount": saved_price},
                    "auto_smart_client_memory",
                ))

        # 3. Accepted quote should become work automatically as a draft job, not another admin task.
        for quote in quotes:
            if status(quote) not in {"accepted", "approved", "won", "go ahead", "go_ahead"}:
                continue
            qid = auto_smart.doc_id(quote)
            linked_job = await auto_smart.safe_one(db.jobs, {"business_id": auto_smart.business_id(user), "$or": [
                {"quote_id": qid},
                {"source_quote_id": qid},
                {"converted_from_quote_id": qid},
            ]})
            if not linked_job:
                actions.append(action(
                    "quote_to_job",
                    f"Create job draft from accepted quote",
                    f"{client_name(quote)} accepted a quote; Churvox should prepare the job draft.",
                    "high",
                    {"quote_id": qid, "client_name": client_name(quote), "amount": auto_smart.amount_of(quote)},
                    "auto_smart_quote_memory",
                ))

        # 4. Worker load: warn before one worker gets overloaded on the same day.
        for (worker, day), worker_jobs in jobs_by_worker_day.items():
            if len(worker_jobs) >= 5:
                display_worker = auto_smart.clean(worker_jobs[0].get("worker_name") or worker_jobs[0].get("assigned_worker_name") or worker)
                actions.append(action(
                    "worker_capacity",
                    f"Check {display_worker}'s run sheet",
                    f"{display_worker} has {len(worker_jobs)} open jobs on {day}. Churvox should help rebalance before the day gets messy.",
                    "medium",
                    {"worker": display_worker, "date": day, "job_count": len(worker_jobs), "job_ids": [auto_smart.doc_id(job) for job in worker_jobs[:10]]},
                    "auto_smart_worker_memory",
                ))

        # 5. Credit risk: do not send workers back to a client with overdue invoices without owner seeing it.
        for ckey, open_jobs in open_jobs_by_client.items():
            unpaid = unpaid_by_client.get(ckey) or []
            if unpaid and open_jobs:
                total_due = sum(auto_smart.amount_of(invoice) for invoice in unpaid)
                actions.append(action(
                    "client_credit_check",
                    f"Check unpaid balance before next job",
                    f"{client_name(open_jobs[0])} has ${total_due:.2f} open/overdue and {len(open_jobs)} open job(s).",
                    "high",
                    {"client_name": client_name(open_jobs[0]), "amount": total_due, "job_ids": [auto_smart.doc_id(job) for job in open_jobs[:10]]},
                    "auto_smart_money_memory",
                ))

        # 6. One-off archive prompt: completed one-off jobs should not clutter live operations forever.
        for job in completed_jobs:
            if has_recurring_frequency(job) or status(job) in {"archived", "deleted"}:
                continue
            done_at = completed_at(job)
            if done_at and done_at.date() <= today - timedelta(days=2):
                actions.append(action(
                    "archive_prompt",
                    f"Archive completed one-off job",
                    f"{auto_smart.title_of(job)} looks finished and old enough to clear from live work after owner review.",
                    "low",
                    {"job_id": auto_smart.doc_id(job)},
                    "auto_smart_housekeeping",
                ))

        return actions

    auto_smart.manual_scan = smarter_manual_scan
