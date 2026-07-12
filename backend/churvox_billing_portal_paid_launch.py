from __future__ import annotations

import importlib.abc
import importlib.machinery
import os
import sys
from typing import Any

from fastapi import HTTPException, Request

VERSION = "churvox-billing-portal-paid-launch-20260712b"
TARGETS = {"server", "backend.server", "churvox_legacy_server"}
OWNER_ROLES = {"owner", "business_owner", "employer", "admin", "manager", "office_admin", "superadmin"}
ROUTE_PATHS = {"/api/billing/create-portal-session", "/billing/create-portal-session"}
INSTALLED = set()


def _text(value: Any) -> str:
    return str(value or "").strip()


def _role(user: dict[str, Any]) -> str:
    return _text(user.get("role") or user.get("user_role") or user.get("account_type") or "owner").lower().replace("-", "_").replace(" ", "_")


def _route_present(app, path: str, method: str = "POST") -> bool:
    return any(
        getattr(route, "path", "") == path
        and method in set(getattr(route, "methods", set()) or set())
        for route in list(getattr(app.router, "routes", []) or [])
    )


def _routes_ready(app) -> bool:
    return all(_route_present(app, path, "POST") for path in ROUTE_PATHS)


def _remove_routes(app) -> None:
    kept = []
    for route in list(getattr(app.router, "routes", []) or []):
        path = getattr(route, "path", "")
        methods = set(getattr(route, "methods", set()) or set())
        if path in ROUTE_PATHS and "POST" in methods:
            continue
        kept.append(route)
    app.router.routes = kept


def install(module) -> None:
    name = getattr(module, "__name__", "")
    app = getattr(module, "app", None)
    get_current_user = getattr(module, "get_current_user", None)
    stripe_module = getattr(module, "stripe", None)
    if app is None or not callable(get_current_user) or stripe_module is None:
        return
    if name in INSTALLED and _routes_ready(app):
        return
    INSTALLED.discard(name)

    _remove_routes(app)

    async def create_portal_session(request: Request):
        user = await get_current_user(request)
        if not isinstance(user, dict):
            raise HTTPException(status_code=401, detail="Not authenticated")
        email = _text(user.get("email")).lower()
        role = _role(user)
        if email != "hello@churvox.com" and role not in OWNER_ROLES:
            raise HTTPException(status_code=403, detail="Only a business owner or admin can manage billing")

        customer_id = _text(user.get("stripe_customer_id"))
        if not customer_id:
            raise HTTPException(status_code=409, detail="No Stripe customer is linked to this account yet. Complete checkout or contact support.")

        secret = _text(os.environ.get("STRIPE_SECRET_KEY"))
        if not secret.startswith("sk_"):
            raise HTTPException(status_code=503, detail="Stripe billing is not configured")
        stripe_module.api_key = secret

        frontend = _text(os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
        return_url = f"{frontend}/plans?billing=returned"
        try:
            session = stripe_module.billing_portal.Session.create(customer=customer_id, return_url=return_url)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe billing portal could not be opened: {str(exc)[:400]}")

        url = _text(getattr(session, "url", "") or (session.get("url") if isinstance(session, dict) else ""))
        if not url.startswith("https://"):
            raise HTTPException(status_code=502, detail="Stripe did not return a secure billing portal URL")
        return {"success": True, "url": url, "portal_url": url, "version": VERSION}

    app.add_api_route("/api/billing/create-portal-session", create_portal_session, methods=["POST"])
    app.add_api_route("/billing/create-portal-session", create_portal_session, methods=["POST"])
    if _routes_ready(app):
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
