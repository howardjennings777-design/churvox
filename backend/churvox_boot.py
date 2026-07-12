from __future__ import annotations

import hashlib
import json
import logging
import traceback
from datetime import datetime, timezone
from typing import Any

VERSION = "churvox-command-queue-speed-boot-20260713e"
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


BOOT_ERROR: BaseException | None = None
PATCH_ERROR: BaseException | None = None
PATCH_STAGE = "not_started"
PATCH_INSTALLED = False
PATCH_ROUTES: dict[str, list[str]] = {}
INNER_APP = None


def _route_owners(inner_app) -> dict[str, list[str]]:
    wanted = {
        "/api/command/slips",
        "/api/command/scan",
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
    PATCH_STAGE = "force_install_fast_command"
    try:
        import churvox_paid_launch_live_patch
    except Exception:
        from backend import churvox_paid_launch_live_patch
    # Procfile boots this module. Reinstall after churvox_start has completed so
    # no legacy server route can shadow the paid-launch Command routes.
    churvox_paid_launch_live_patch.install(churvox_start.server, force=True)
    PATCH_ROUTES = _route_owners(INNER_APP)
    PATCH_INSTALLED = bool(
        any(owner.endswith(":fast_slips") for owner in PATCH_ROUTES.get("/api/command/slips", []))
        and any(owner.endswith(":fast_scan") for owner in PATCH_ROUTES.get("/api/command/scan", []))
        and any(owner.endswith(":admin_brain_bridge") for owner in PATCH_ROUTES.get("/api/admin-brain/scan", []))
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
        logging.critical("Churvox Command fast-load patch failed to install\n%s", traceback.format_exc())


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
