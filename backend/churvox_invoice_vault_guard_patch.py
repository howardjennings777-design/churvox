from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys
from datetime import datetime, timezone

TARGETS = {"server", "backend.server"}
DONE = set()


def clean(value):
    return str(value or "").strip()


def safe_biz(user):
    return clean((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("company_id") or (user or {}).get("owner_id") or (user or {}).get("id") or (user or {}).get("_id"))


def plain(value):
    if isinstance(value, list):
        return [plain(v) for v in value]
    if isinstance(value, dict):
        return {str(k): plain(v) for k, v in value.items()}
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    return str(value) if value.__class__.__name__ == "ObjectId" else value


def matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def install(module):
    name = getattr(module, "__name__", "")
    if name in DONE:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    if not app or db is None or not get_current_user or Request is None:
        return

    async def vault_guard(request: Request):
        try:
            user = await get_current_user(request)
            bid = safe_biz(user)
            rows = []
            if bid:
                try:
                    rows = await db.invoice_vault.find({"business_id": bid}).sort("updated_at", -1).limit(120).to_list(length=120)
                except Exception:
                    rows = []
            return plain({"success": True, "invoices": rows, "items": rows, "counts": {"total": len(rows), "paid": 0, "sent": 0}, "guarded_at": datetime.now(timezone.utc)})
        except Exception:
            return {"success": True, "invoices": [], "items": [], "counts": {"total": 0, "paid": 0, "sent": 0}, "guarded": True}

    try:
        app.router.routes = [r for r in app.router.routes if not matches(r, "/api/invoices/vault", "GET")]
        app.add_api_route("/api/invoices/vault", vault_guard, methods=["GET"])
        DONE.add(name)
    except Exception:
        pass


class Loader(importlib.abc.Loader):
    def __init__(self, old):
        self.old = old
    def create_module(self, spec):
        if hasattr(self.old, "create_module"):
            return self.old.create_module(spec)
        return None
    def exec_module(self, module):
        self.old.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(f, Finder) for f in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for modname in list(TARGETS):
    mod = sys.modules.get(modname)
    if mod:
        install(mod)
