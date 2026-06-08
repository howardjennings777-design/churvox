try:
    import builtins
    from fastapi import Body
    builtins.Body = Body
except Exception:
    pass

try:
    from datetime import datetime, timezone
    from pymongo.errors import DuplicateKeyError

    class _ChurvoxIgnoredDuplicateResult:
        acknowledged = True
        matched_count = 1
        modified_count = 0
        upserted_id = None
        raw_result = {"ok": 1, "n": 1, "nModified": 0}

    def _should_ignore(exc):
        text = str(exc).lower()
        return "duplicate key" in text and "email_1" in text

    def _string_id(value):
        if value is None:
            return None
        try:
            return str(value)
        except Exception:
            return None

    def _status_text(value):
        try:
            raw = getattr(value, "value", value)
            return str(raw or "").lower()
        except Exception:
            return ""

    def _pick(*values):
        for value in values:
            if value is not None and str(value).strip():
                return value
        return None

    def _event_doc(before, after, event_type, title, detail, source="job_update_hook"):
        job = after or before or {}
        business_raw = _pick(job.get("business_id"), job.get("contractor_id"))
        contractor_raw = job.get("contractor_id")
        worker_id = _pick(job.get("assigned_worker_id"), job.get("worker_id"))
        worker_name = _pick(job.get("assigned_worker_name"), job.get("worker_name"), "Worker")
        return {
            "business_id": _string_id(business_raw),
            "contractor_id": contractor_raw,
            "event_type": event_type,
            "title": title,
            "detail": detail,
            "record_type": "job",
            "record_id": _string_id(job.get("_id") or job.get("id")),
            "worker_id": _string_id(worker_id),
            "worker_name": str(worker_name),
            "status": "new",
            "source": source,
            "created_at": datetime.now(timezone.utc),
        }

    async def _record_job_activity(collection, filter_doc, update_doc, before, result):
        try:
            if not getattr(result, "matched_count", 0):
                return
            if not isinstance(update_doc, dict):
                return

            set_data = update_doc.get("$set") if isinstance(update_doc.get("$set"), dict) else {}
            push_data = update_doc.get("$push") if isinstance(update_doc.get("$push"), dict) else {}
            inc_data = update_doc.get("$inc") if isinstance(update_doc.get("$inc"), dict) else {}
            after = None
            if before and before.get("_id"):
                after = await collection.find_one({"_id": before["_id"]})
            if after is None and isinstance(filter_doc, dict):
                after = await collection.find_one(filter_doc)
            job = after or before or {}
            job_title = _pick(job.get("title"), job.get("job_title"), job.get("service_type"), "Job")
            worker_name = _pick(job.get("assigned_worker_name"), job.get("worker_name"), "Worker")

            events = []
            time_entry = push_data.get("time_entries") if isinstance(push_data.get("time_entries"), dict) else {}
            time_action = _status_text(time_entry.get("action"))
            status = _status_text(set_data.get("status"))

            if set_data.get("assigned_worker_id") or set_data.get("assigned_worker_name"):
                assigned_name = _pick(set_data.get("assigned_worker_name"), worker_name, "Worker")
                events.append(("worker_assigned", "Worker assigned", f"{assigned_name} was assigned to {job_title}."))

            if time_action == "start" or ("progress" in status and set_data.get("started_at")):
                events.append(("job_started", "Worker started job", f"{worker_name} started {job_title}."))
            elif time_action == "pause":
                events.append(("job_paused", "Worker paused job", f"{worker_name} paused {job_title}."))
            elif time_action == "resume":
                events.append(("job_resumed", "Worker resumed job", f"{worker_name} resumed {job_title}."))

            completed = bool(set_data.get("completed") is True or set_data.get("completed_at") or "complete" in status)
            if completed:
                events.append(("job_completed", "Worker finished job", f"{worker_name} finished {job_title}."))
                events.append(("ready_to_invoice", "Ready to invoice", f"{job_title} is ready for invoice review."))
                if job.get("total_time_seconds") or set_data.get("total_time_seconds"):
                    events.append(("ready_for_payroll", "Ready for payroll", f"{worker_name} has time ready for payroll review."))

            photo_keys = ("photos", "photo_urls", "job_photos", "completion_photos", "uploaded_photos")
            if any(key in push_data for key in photo_keys) or any(key in set_data for key in ("photos_updated_at", "photo_count")):
                events.append(("photos_uploaded", "Photos uploaded", f"{worker_name} uploaded job photos for {job_title}."))

            note_keys = ("worker_note", "latest_worker_note", "completion_note", "field_note", "message")
            if any(key in set_data and set_data.get(key) for key in note_keys) or any(key in push_data for key in ("notes", "messages", "job_notes")):
                events.append(("worker_note_added", "Worker note/message", f"{worker_name} added a note on {job_title}."))

            gps_keys = ("location_status", "gps_status", "site_check_status", "start_location_status", "location_checked_at")
            if any(key in set_data and set_data.get(key) for key in gps_keys):
                gps_status = _pick(set_data.get("location_status"), set_data.get("gps_status"), set_data.get("site_check_status"), set_data.get("start_location_status"), "site check saved")
                events.append(("gps_site_check", "GPS/site check", f"{job_title}: {gps_status}."))

            if set_data.get("payroll_reviewed") or set_data.get("pay_status") or set_data.get("payroll_approval_status"):
                events.append(("payroll_time_ready", "Payroll time reviewed", f"{worker_name} time was reviewed for {job_title}."))

            if not events:
                return

            activity = collection.database.field_activity_events
            for event_type, title, detail in events:
                await activity.insert_one(_event_doc(before, after, event_type, title, detail))
        except Exception:
            return

    try:
        from motor.motor_asyncio import AsyncIOMotorCollection
        _old_motor_update_one = AsyncIOMotorCollection.update_one

        async def _safe_motor_update_one(self, *args, **kwargs):
            collection_name = getattr(self, "name", "")
            filter_doc = args[0] if len(args) > 0 else kwargs.get("filter", {})
            update_doc = args[1] if len(args) > 1 else kwargs.get("update", {})
            before = None
            if collection_name == "jobs" and isinstance(filter_doc, dict):
                try:
                    before = await self.find_one(filter_doc)
                except Exception:
                    before = None
            try:
                result = await _old_motor_update_one(self, *args, **kwargs)
            except DuplicateKeyError as exc:
                if _should_ignore(exc):
                    return _ChurvoxIgnoredDuplicateResult()
                raise
            if collection_name == "jobs":
                await _record_job_activity(self, filter_doc, update_doc, before, result)
            return result

        AsyncIOMotorCollection.update_one = _safe_motor_update_one
    except Exception:
        pass
except Exception:
    pass

try:
    import importlib
    import importlib.abc
    import importlib.machinery
    import logging
    import sys

    logger = logging.getLogger(__name__)
    _AI_OPERATOR_TARGETS = {"server", "backend.server"}
    _AI_OPERATOR_INSTALLED = set()

    def _install_ai_operator_for_module(module):
        name = getattr(module, "__name__", "")
        if name in _AI_OPERATOR_INSTALLED:
            return
        app = getattr(module, "app", None)
        db = getattr(module, "db", None)
        get_current_user = getattr(module, "get_current_user", None)
        require_employer = getattr(module, "require_employer", None)
        if not app or db is None or not get_current_user:
            return
        try:
            try:
                routes = importlib.import_module("backend.ai_operator_routes")
            except Exception:
                routes = importlib.import_module("ai_operator_routes")
            routes.install(app, db, get_current_user, require_employer)
            _AI_OPERATOR_INSTALLED.add(name)
            logger.info("Installed AI Operator routes for %s", name)
        except Exception as exc:
            logger.exception("Could not install AI Operator routes: %s", exc)

    class _ChurvoxAiOperatorLoader(importlib.abc.Loader):
        def __init__(self, original_loader):
            self.original_loader = original_loader

        def create_module(self, spec):
            if hasattr(self.original_loader, "create_module"):
                return self.original_loader.create_module(spec)
            return None

        def exec_module(self, module):
            self.original_loader.exec_module(module)
            _install_ai_operator_for_module(module)

    class _ChurvoxAiOperatorFinder(importlib.abc.MetaPathFinder):
        def find_spec(self, fullname, path=None, target=None):
            if fullname not in _AI_OPERATOR_TARGETS:
                return None
            spec = importlib.machinery.PathFinder.find_spec(fullname, path)
            if spec and spec.loader and not isinstance(spec.loader, _ChurvoxAiOperatorLoader):
                spec.loader = _ChurvoxAiOperatorLoader(spec.loader)
            return spec

    if not any(isinstance(finder, _ChurvoxAiOperatorFinder) for finder in sys.meta_path):
        sys.meta_path.insert(0, _ChurvoxAiOperatorFinder())

    for _module_name in list(_AI_OPERATOR_TARGETS):
        _module = sys.modules.get(_module_name)
        if _module:
            _install_ai_operator_for_module(_module)
except Exception:
    pass
