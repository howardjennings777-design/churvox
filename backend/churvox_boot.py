from __future__ import annotations

import hashlib
import json
import logging
import traceback
from datetime import datetime, timezone
from typing import Any

VERSION = "churvox-command-runs-office-boot-20260715a"
ALLOWED_ORIGINS = {
    "https://www.churvox.com",
    "https://churvox.com",
    "https://www.churvox.onrender.com",
    "https://churvox.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
}


def _text(value: Any) -> str:
    return str(value or "").strip().rstrip("/")


def _allowed(origin: str) -> bool:
    origin = _text(origin)
    return bool(origin in ALLOWED_ORIGINS or (origin.startswith("https://") and origin.endswith(".churvox.com")))


def _headers(scope) -> dict[str, str]:
    return {
        key.decode("latin1").lower(): value.decode("latin1")
        for key, value in scope.get("headers", [])
    }


def _cors(origin: str, requested_headers: str = "") -> list[tuple[bytes, bytes]]:
    if not _allowed(origin):
        return []
    return [
        (b"access-control-allow-origin", origin.encode("latin1")),
        (b"access-control-allow-credentials", b"true"),
        (b"access-control-allow-methods", b"GET,POST,PUT,PATCH,DELETE,OPTIONS"),
        (b"access-control-allow-headers", (_text(requested_headers) or "Authorization,Content-Type,X-Requested-With").encode("latin1")),
        (b"access-control-expose-headers", b"Retry-After,X-Churvox-Boot-Version,X-Churvox-Boot-Fingerprint"),
        (b"vary", b"Origin"),
    ]


def _fingerprint(error: BaseException | None) -> str:
    if error is None:
        return "ready"
    material = f"{type(error).__name__}:{error}"
    return hashlib.sha256(material.encode("utf-8", "ignore")).hexdigest()[:16]


def _import_patch(name: str):
    try:
        return __import__(name)
    except Exception:
        package = __import__(f"backend.{name}", fromlist=[name])
        return package


def _module_name(module) -> str:
    return str(getattr(module, "__name__", "") or "server")


def _ensure_installed(patch, target):
    name = _module_name(target)
    installed = getattr(patch, "INSTALLED", None)
    if isinstance(installed, set) and name in installed:
        return False
    patch.install(target)
    return True


def _force_reinstall(patch, target):
    name = _module_name(target)
    installed = getattr(patch, "INSTALLED", None)
    if isinstance(installed, set):
        installed.discard(name)
    patch.install(target)


BOOT_ERROR: BaseException | None = None
PATCH_ERROR: BaseException | None = None
PATCH_STAGE = "not_started"
PATCH_INSTALLED = False
PATCH_ROUTES: dict[str, list[str]] = {}
INNER_APP = None
RECOMMENDATION_CONTRACT_VERSION = ""
RECOMMENDATION_ENGINE_VERSION = ""
RECOMMENDATION_FINALIZER_VERSION = ""


def _route_owners(inner_app) -> dict[str, list[str]]:
    wanted = {
        "/api/command/slips",
        "/api/command/scan",
        "/api/command/slips/{slip_id}/approve",
        "/api/admin-brain/scan",
        "/api/paid-launch/backend-readiness",
    }
    owners: dict[str, list[str]] = {path: [] for path in sorted(wanted)}
    try:
        routes = list(getattr(getattr(inner_app, "router", None), "routes", []) or [])
    except Exception:
        routes = []
    for route in routes:
        path = str(getattr(route, "path", "") or "")
        if path not in wanted:
            continue
        endpoint = getattr(route, "endpoint", None)
        name = str(getattr(endpoint, "__name__", "") or getattr(route, "name", "") or "unknown")
        methods = sorted(str(method) for method in (getattr(route, "methods", set()) or set()))
        owners[path].append(f"{','.join(methods)}:{name}")
    return owners


try:
    PATCH_STAGE = "import_churvox_start"
    import churvox_start

    INNER_APP = churvox_start.app
    target = churvox_start.server

    PATCH_STAGE = "force_install_fast_command"
    fast_patch = _import_patch("churvox_paid_launch_live_patch")
    # Procfile boots this module. Install the fast base routes after the legacy
    # server finishes, then put the recommendation layer on top of those routes.
    fast_patch.install(target, force=True)

    PATCH_STAGE = "install_command_recommendations"
    recommendation_engine = _import_patch("churvox_command_runs_office_patch")
    recommendation_finalizer = _import_patch("churvox_command_runs_office_finalizer_patch")
    # The finalizer owns ranking aliases, backup approval mapping and the public
    # contract version. It may already be installed by sitecustomize; do not
    # double-wrap approval. The engine itself must always be reinstalled because
    # the fast-route install above deliberately replaced GET /slips and POST /scan.
    _ensure_installed(recommendation_finalizer, target)
    _force_reinstall(recommendation_engine, target)

    RECOMMENDATION_CONTRACT_VERSION = str(getattr(recommendation_engine, "VERSION", "") or "")
    RECOMMENDATION_ENGINE_VERSION = RECOMMENDATION_CONTRACT_VERSION
    RECOMMENDATION_FINALIZER_VERSION = str(getattr(recommendation_finalizer, "VERSION", "") or "")
    PATCH_ROUTES = _route_owners(INNER_APP)
    PATCH_INSTALLED = bool(
        any(owner.endswith(":command_slips_run_office") for owner in PATCH_ROUTES.get("/api/command/slips", []))
        and any(owner.endswith(":command_scan_runs_office") for owner in PATCH_ROUTES.get("/api/command/scan", []))
        and any(owner.endswith(":admin_brain_bridge") for owner in PATCH_ROUTES.get("/api/admin-brain/scan", []))
        and RECOMMENDATION_CONTRACT_VERSION == "churvox-command-runs-office-v2-20260715"
    )
    PATCH_STAGE = "ready" if PATCH_INSTALLED else "route_owner_mismatch"
except BaseException as exc:  # keep Render up even when an import-time patch fails
    if INNER_APP is None:
        BOOT_ERROR = exc
        logging.critical("Churvox production app failed to import\n%s", traceback.format_exc())
    else:
        PATCH_ERROR = exc
        PATCH_STAGE = "force_install_failed"
        PATCH_ROUTES = _route_owners(INNER_APP)
        logging.critical("Churvox Command recommendation boot failed to install\n%s", traceback.format_exc())


class BootSafeApp:
    def __init__(self, inner_app=None, boot_error: BaseException | None = None):
        self.inner_app = inner_app
        self.boot_error = boot_error
        self.boot_fingerprint = _fingerprint(boot_error)

    async def _json(self, scope, send, status: int, payload: dict[str, Any], retry_after: int | None = None):
        request_headers = _headers(scope)
        origin = _text(request_headers.get("origin"))
        body = json.dumps(payload, separators=(",", ":"), default=str).encode("utf-8")
        headers = [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode("ascii")),
            (b"cache-control", b"no-store"),
            (b"x-churvox-boot-version", VERSION.encode("latin1")),
            (b"x-churvox-boot-fingerprint", self.boot_fingerprint.encode("latin1")),
            *_cors(origin, request_headers.get("access-control-request-headers", "")),
        ]
        if retry_after is not None:
            headers.append((b"retry-after", str(retry_after).encode("ascii")))
        await send({"type": "http.response.start", "status": status, "headers": headers})
        await send({"type": "http.response.body", "body": body})

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            if self.inner_app is not None:
                return await self.inner_app(scope, receive, send)
            return

        request_headers = _headers(scope)
        origin = _text(request_headers.get("origin"))
        method = scope.get("method", "GET").upper()
        path = scope.get("path", "")

        if method == "GET" and path == "/api/command-fast-load/boot":
            payload = {
                "ok": bool(self.inner_app is not None and PATCH_INSTALLED),
                "success": bool(self.inner_app is not None and PATCH_INSTALLED),
                "ready": bool(self.inner_app is not None and PATCH_INSTALLED),
                "version": VERSION,
                "boot_ready": self.inner_app is not None,
                "patch_installed": PATCH_INSTALLED,
                "patch_stage": PATCH_STAGE,
                "recommendation_contract_version": RECOMMENDATION_CONTRACT_VERSION,
                "recommendation_engine_version": RECOMMENDATION_ENGINE_VERSION,
                "recommendation_finalizer_version": RECOMMENDATION_FINALIZER_VERSION,
                "patch_error_type": type(PATCH_ERROR).__name__ if PATCH_ERROR else None,
                "patch_error_fingerprint": _fingerprint(PATCH_ERROR) if PATCH_ERROR else "ready",
                "route_owners": PATCH_ROUTES,
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
            return await self._json(scope, send, 200, payload)

        if method == "OPTIONS" and _allowed(origin):
            headers = [
                (b"content-length", b"0"),
                (b"x-churvox-boot-version", VERSION.encode("latin1")),
                (b"x-churvox-boot-fingerprint", self.boot_fingerprint.encode("latin1")),
                *_cors(origin, request_headers.get("access-control-request-headers", "")),
            ]
            await send({"type": "http.response.start", "status": 204, "headers": headers})
            await send({"type": "http.response.body", "body": b""})
            return

        if self.inner_app is None:
            payload = {
                "ok": False,
                "success": False,
                "ready": False,
                "detail": "Churvox backend failed to start. The deployment is being held safely for diagnosis.",
                "retryable": True,
                "boot_error_type": type(self.boot_error).__name__ if self.boot_error else "Unknown",
                "boot_fingerprint": self.boot_fingerprint,
                "version": VERSION,
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
            return await self._json(scope, send, 503, payload, retry_after=5)

        response_started = False

        async def outer_send(message):
            nonlocal response_started
            if message.get("type") == "http.response.start":
                response_started = True
                existing = list(message.get("headers", []))
                names = {key.lower() for key, _ in existing}
                additions = [
                    (b"x-churvox-boot-version", VERSION.encode("latin1")),
                    (b"x-churvox-boot-fingerprint", self.boot_fingerprint.encode("latin1")),
                    *_cors(origin, request_headers.get("access-control-request-headers", "")),
                ]
                for key, value in additions:
                    if key.lower() not in names:
                        existing.append((key, value))
                message = {**message, "headers": existing}
            await send(message)

        try:
            await self.inner_app(scope, receive, outer_send)
        except BaseException as exc:
            logging.exception("Unhandled Churvox ASGI failure at %s", path)
            if response_started:
                raise
            payload = {
                "ok": False,
                "success": False,
                "detail": "Churvox is restarting. Please try again shortly.",
                "retryable": True,
                "error_type": type(exc).__name__,
                "error_fingerprint": _fingerprint(exc),
                "version": VERSION,
            }
            await self._json(scope, send, 503, payload, retry_after=3)


app = BootSafeApp(INNER_APP, BOOT_ERROR)
