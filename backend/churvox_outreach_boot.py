from __future__ import annotations

import logging
import traceback
from datetime import datetime, timezone

import churvox_boot as guarded_boot

VERSION = "churvox-tester-outreach-live-boot-v1-20260715"
STATUS_PATH = "/api/tester-outreach/boot"
ROUTES = (
    ("GET", "/api/admin/owner/tester-outreach", "list_outreach"),
    ("POST", "/api/admin/owner/tester-outreach/draft", "save_draft"),
    ("POST", "/api/admin/owner/tester-outreach/send", "send_outreach"),
    ("POST", "/api/admin/owner/tester-outreach/status", "update_status"),
    ("POST", "/api/admin/owner/tester-outreach/import-drafts", "import_drafts"),
)

INNER_APP = getattr(guarded_boot, "INNER_APP", None)
INSTALL_ERROR = None
ROUTE_OWNERS = {}
OUTREACH_READY = False


def _import_patch(name: str):
    try:
        return __import__(name)
    except Exception:
        return __import__(f"backend.{name}", fromlist=[name])


def _force_install(patch, target):
    installed = getattr(patch, "INSTALLED", None)
    if isinstance(installed, set):
        installed.discard(str(getattr(target, "__name__", "") or "server"))
    patch.install(target)


def _route_owner(inner_app, method: str, path: str):
    method = method.upper()
    owners = []
    for route in list(getattr(getattr(inner_app, "router", None), "routes", []) or []):
        if getattr(route, "path", "") != path:
            continue
        methods = {str(item).upper() for item in (getattr(route, "methods", set()) or set())}
        if method not in methods:
            continue
        endpoint = getattr(route, "endpoint", None)
        owners.append(str(getattr(endpoint, "__name__", "") or getattr(route, "name", "") or "unknown"))
    return owners


def _remove_route(inner_app, method: str, path: str):
    method = method.upper()
    inner_app.router.routes = [
        route
        for route in list(inner_app.router.routes)
        if not (
            getattr(route, "path", "") == path
            and method in {str(item).upper() for item in (getattr(route, "methods", set()) or set())}
        )
    ]


if INNER_APP is not None:
    try:
        import churvox_start

        target = churvox_start.server
        outreach_patch = _import_patch("churvox_tester_outreach_desk_patch")
        import_patch = _import_patch("churvox_tester_outreach_import_patch")

        # Production boot force-installs other route layers after sitecustomize.
        # Reinstall Outreach last so every expected HTTP method is owned by the
        # current Outreach implementation on the actual Render entrypoint.
        _force_install(outreach_patch, target)
        _force_install(import_patch, target)

        ROUTE_OWNERS = {
            f"{method} {path}": _route_owner(INNER_APP, method, path)
            for method, path, _expected in ROUTES
        }
        OUTREACH_READY = all(
            expected in ROUTE_OWNERS.get(f"{method} {path}", [])
            for method, path, expected in ROUTES
        )
    except BaseException as exc:
        INSTALL_ERROR = exc
        logging.critical("Churvox tester Outreach production boot failed\n%s", traceback.format_exc())

    async def outreach_boot_status():
        return {
            "ok": bool(OUTREACH_READY),
            "success": bool(OUTREACH_READY),
            "ready": bool(OUTREACH_READY),
            "version": VERSION,
            "route_owners": ROUTE_OWNERS,
            "error_type": type(INSTALL_ERROR).__name__ if INSTALL_ERROR else None,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    _remove_route(INNER_APP, "GET", STATUS_PATH)
    INNER_APP.add_api_route(STATUS_PATH, outreach_boot_status, methods=["GET"])

app = guarded_boot.app
