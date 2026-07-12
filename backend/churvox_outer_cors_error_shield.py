from __future__ import annotations

import importlib
import logging
from typing import Any

VERSION = "churvox-outer-cors-error-shield-20260712h"
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


def origin_allowed(origin: str) -> bool:
    origin = _text(origin)
    return bool(
        origin in ALLOWED_ORIGINS
        or (origin.startswith("https://") and origin.endswith(".churvox.com"))
    )


def cors_headers(origin: str, request_headers: str = "") -> list[tuple[bytes, bytes]]:
    if not origin_allowed(origin):
        return []
    return [
        (b"access-control-allow-origin", _text(origin).encode("latin1")),
        (b"access-control-allow-credentials", b"true"),
        (b"access-control-allow-methods", b"GET,POST,PUT,PATCH,DELETE,OPTIONS"),
        (b"access-control-allow-headers", (_text(request_headers) or "Authorization,Content-Type,X-Requested-With").encode("latin1")),
        (
            b"access-control-expose-headers",
            b"Retry-After,X-Churvox-Cors-Shield,X-Churvox-Auth-Version,X-Churvox-Boot-Fingerprint,X-Churvox-Login-Route,X-Churvox-Login-Stage,X-Churvox-Auth-Gate",
        ),
        (b"vary", b"Origin"),
        (b"x-churvox-cors-shield", VERSION.encode("latin1")),
    ]


class OuterCorsErrorShield:
    def __init__(self, app, module=None):
        self.app = app
        self.module = module

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            return await self.app(scope, receive, send)

        request_headers = {
            key.decode("latin1").lower(): value.decode("latin1")
            for key, value in scope.get("headers", [])
        }
        origin = _text(request_headers.get("origin"))
        allow_headers = request_headers.get("access-control-request-headers", "")

        if scope.get("method", "GET").upper() == "OPTIONS" and origin_allowed(origin):
            headers = [(b"content-length", b"0"), *cors_headers(origin, allow_headers)]
            await send({"type": "http.response.start", "status": 204, "headers": headers})
            await send({"type": "http.response.body", "body": b""})
            return

        response_started = False

        async def shielded_send(message):
            nonlocal response_started
            if message.get("type") == "http.response.start":
                response_started = True
                existing = list(message.get("headers", []))
                existing_names = {key.lower() for key, _ in existing}
                for key, value in cors_headers(origin, allow_headers):
                    if key.lower() not in existing_names:
                        existing.append((key, value))
                message = {**message, "headers": existing}
            await send(message)

        try:
            await self.app(scope, receive, shielded_send)
        except Exception:
            logging.exception("Unhandled Churvox request error outside normal middleware")
            if response_started:
                raise
            body = b'{"success":false,"detail":"Churvox is restarting. Please try again shortly.","retryable":true,"stage":"outer-shield","version":"churvox-outer-cors-error-shield-20260712h"}'
            headers = [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode("ascii")),
                (b"cache-control", b"no-store"),
                (b"retry-after", b"3"),
                *cors_headers(origin, allow_headers),
            ]
            await send({"type": "http.response.start", "status": 503, "headers": headers})
            await send({"type": "http.response.body", "body": body})


def _install_patch(module, names: tuple[str, ...], label: str) -> None:
    patch = None
    for name in names:
        try:
            patch = importlib.import_module(name)
            break
        except Exception:
            continue
    if patch is None:
        logging.getLogger(__name__).warning("[Churvox] %s module could not be imported", label)
        return
    try:
        patch.install(module)
    except Exception as exc:
        logging.getLogger(__name__).warning("[Churvox] %s install skipped: %s", label, exc)


def install(module) -> None:
    # Re-install the definitive route, then replace it with the isolated emergency
    # handler. This hook runs from the final wrapper patch, after legacy auth routes.
    _install_patch(
        module,
        ("churvox_login_route_finalizer", "backend.churvox_login_route_finalizer"),
        "definitive login route",
    )
    _install_patch(
        module,
        ("churvox_login_emergency_final", "backend.churvox_login_emergency_final"),
        "isolated emergency login route",
    )
    # Re-assert protected customer routes after legacy route registration. Their
    # installers verify the methods still exist instead of trusting stale markers.
    _install_patch(
        module,
        ("churvox_billing_portal_paid_launch", "backend.churvox_billing_portal_paid_launch"),
        "secure billing portal route",
    )
    _install_patch(
        module,
        ("churvox_account_deletion_paid_launch", "backend.churvox_account_deletion_paid_launch"),
        "secure account deletion route",
    )
    # Worker field truth and owner Command must also be final-route owners. Older
    # Command routers register the same paths during startup and can otherwise hide
    # a successfully saved worker issue from the owner's current Command screen.
    _install_patch(
        module,
        ("churvox_worker_command_visibility_patch", "backend.churvox_worker_command_visibility_patch"),
        "worker-to-Command visibility route",
    )
    _install_patch(
        module,
        ("churvox_worker_field_slip_decision_patch", "backend.churvox_worker_field_slip_decision_patch"),
        "worker field-slip owner decision route",
    )
    # This must run after the emergency route so startup order cannot overwrite
    # the persistent-source fields or the safe restart fingerprint.
    _install_patch(
        module,
        ("churvox_jwt_health_fingerprint_patch", "backend.churvox_jwt_health_fingerprint_patch"),
        "JWT health fingerprint",
    )

    app = getattr(module, "app", None)
    if app is None:
        return

    state = getattr(app, "state", None)
    if state is not None and getattr(state, "churvox_outer_cors_error_shield", False):
        return

    try:
        app.add_middleware(OuterCorsErrorShield, module=module)
        if state is not None:
            state.churvox_outer_cors_error_shield = VERSION
    except Exception as exc:
        try:
            getattr(module, "logger", logging.getLogger(__name__)).warning("[Churvox] Outer CORS middleware install skipped: %s", exc)
        except Exception:
            pass
