from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys

from starlette.requests import Request

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    try:
        from churvox_nav_attention_counts_patch import (
            scope,
            worker_scope,
            real_command_waiting,
            is_attention_job,
            is_attention_worker,
            is_unread_message,
            is_attention_quote,
            is_attention_invoice,
            office_to_worker,
            count_rows,
            build_response,
            remove_route,
        )
    except Exception:
        return

    async def owner_nav_counts(request: Request):
        user = await get_current_user(request)
        base = scope(user, ObjectId)
        owner_counts = {
            "command": await count_rows(db, "ai_approval_actions", base, real_command_waiting, 200)
            + await count_rows(
                db,
                "worker_field_slips",
                {"$and": [base, {"status": {"$in": ["waiting_owner", "waiting_owner_review", "pending", "new"]}}]},
                lambda row: True,
                200,
            ),
            "jobs": await count_rows(db, "jobs", base, is_attention_job, 300),
            "workers": await count_rows(
                db,
                "users",
                {"$and": [base, {"role": {"$in": ["worker", "staff", "employee", "subcontractor", "contractor", "payroll"]}}]},
                is_attention_worker,
                200,
            ),
            "messages": await count_rows(db, "worker_messages", base, is_unread_message, 200)
            + await count_rows(db, "messages", base, is_unread_message, 200)
            + await count_rows(db, "customer_messages", base, is_unread_message, 100)
            + await count_rows(db, "client_messages", base, is_unread_message, 100),
            "quotes": await count_rows(db, "quotes", base, is_attention_quote, 200),
            "invoices": await count_rows(db, "invoices", base, is_attention_invoice, 200),
        }
        response = build_response(owner_counts)
        response["source"] = "churvox_nav_attention_request_signature_fix"
        return response

    async def worker_nav_counts(request: Request):
        user = await get_current_user(request)
        query = worker_scope(user, ObjectId)
        worker_counts = {
            "jobs": await count_rows(db, "jobs", query, is_attention_job, 200),
            "messages": await count_rows(db, "worker_messages", query, lambda row: office_to_worker(row) and is_unread_message(row), 200),
        }
        response = build_response({"command": 0, "jobs": 0, "workers": 0, "messages": 0, "quotes": 0, "invoices": 0}, worker_counts)
        response["source"] = "churvox_nav_attention_request_signature_fix"
        return response

    for path, endpoint in [
        ("/api/nav/attention-counts", owner_nav_counts),
        ("/api/nav-counts", owner_nav_counts),
        ("/api/worker/nav/attention-counts", worker_nav_counts),
        ("/api/worker/nav-counts", worker_nav_counts),
    ]:
        remove_route(app, path, "GET")
        app.add_api_route(path, endpoint, methods=["GET"])

    try:
        try:
            import churvox_quote_convert_exact_patch as quote_convert_patch
        except Exception:
            from backend import churvox_quote_convert_exact_patch as quote_convert_patch
        quote_convert_patch.install(module)
    except Exception as exc:
        print(f"Churvox quote conversion install skipped: {exc}", file=sys.stderr)

    # Install after the generic record-delete middleware so PATCH /api/jobs/{id}
    # and POST /api/jobs/{id}/assign are handled by the exact assignment guard
    # before the legacy delete-only bypass can incorrectly return 405.
    try:
        try:
            import churvox_job_assignment_exact_patch as job_assignment_patch
        except Exception:
            from backend import churvox_job_assignment_exact_patch as job_assignment_patch
        job_assignment_patch.install(module)
    except Exception as exc:
        print(f"Churvox exact job assignment install skipped: {exc}", file=sys.stderr)

    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None

    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())
for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
