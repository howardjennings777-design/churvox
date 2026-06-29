from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_top_player_patch as top_player

TARGETS = {"server", "backend.server"}
INSTALLED = set()
_ORIGINAL_GET_PORTAL_PAYLOAD = top_player.get_portal_payload


async def fixed_get_portal_payload(db, token, ObjectId=None):
    payload = await _ORIGINAL_GET_PORTAL_PAYLOAD(db, token, ObjectId)
    if not payload.get("success"):
        return payload
    link = payload.get("link") or {}
    if link.get("target_type") == "invoice":
        try:
            rows = await db.invoice_payment_links.find({"business_id": link.get("business_id"), "invoice_id": str(link.get("target_id"))}).sort("updated_at", -1).limit(1).to_list(length=1)
        except Exception:
            rows = []
        if rows:
            payload["payment_link"] = top_player.json_safe(rows[0])
    return payload


top_player.get_portal_payload = fixed_get_portal_payload


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None:
        return

    async def public_payment_endpoint(token: str):
        portal = await fixed_get_portal_payload(db, token, ObjectId)
        if not portal.get("success"):
            return portal
        payment = portal.get("payment_link") or {}
        return {"success": True, "payment_link": payment, "pay_url": payment.get("pay_url") or ""}

    remove_route(app, "/api/customer-portal/{token}/payment", "GET")
    app.add_api_route("/api/customer-portal/{token}/payment", public_payment_endpoint, methods=["GET"])
    INSTALLED.add(name)


class _Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
        install(module)


class _Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, _Loader):
            spec.loader = _Loader(spec.loader)
        return spec


if not any(isinstance(finder, _Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
