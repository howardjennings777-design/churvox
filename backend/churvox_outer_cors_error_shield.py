from __future__ import annotations

import logging
import sys
from typing import Any

VERSION = "churvox-outer-cors-error-shield-20260712b"
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
    headers = [
        (b"access-control-allow-origin", _text(origin).encode("latin1")),
        (b"access-control-allow-credentials", b"true"),
        (b"access-control-allow-methods", b"GET,POST,PUT,PATCH,DELETE,OPTIONS"),
        (b"access-control-allow-headers", (_text(request_headers) or "Authorization,Content-Type,X-Requested-With").encode("latin1")),
        (b"access-control-expose-headers", b"Retry-After,X-Churvox-Cors-Shield,X-Churvox-Auth-Version,X-Churvox-Boot-Fingerprint"),
        (b"vary", b"Origin"),
        (b"x-churvox-cors-shield", VERSION.encode("latin1")),
    ]
    return headers


class OuterCorsErrorShield:
    def __init__(self, app, module):
        self.app = app
        self.module = module
        self.state = getattr(app, "state", None)

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
            body = b'{"success":false,"detail":"Churvox is restarting. Please try again shortly.","retryable":true,"version":"churvox-outer-cors-error-shield-20260712b"}'
            headers = [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode("ascii")),
                (b"cache-control", b"no-store"),
                (b"retry-after", b"3"),
                *cors_headers(origin, allow_headers),
            ]
            await send({"type": "http.response.start", "status": 503, "headers": headers})
            await send({"type": "http.response.body", "body": body})


def _attach_to_exported_wrappers(module, app) -> None:
    wrapped = OuterCorsErrorShield(app, module)
    for module_name in ("server", "backend.server"):
        wrapper = sys.modules.get(module_name)
        if wrapper is None or wrapper is module:
            continue
        wrapper_app = getattr(wrapper, "app", None)
        wrapper_legacy = getattr(wrapper, "legacy", None)
        if wrapper_app is app or wrapper_legacy is module:
            setattr(wrapper, "app", wrapped)
            setattr(wrapper, "CHURVOX_OUTER_CORS_VERSION", VERSION)


def install(module) -> None:
    app = getattr(module, "app", None)
    if app is None:
        return

    state = getattr(app, "state", None)
    already_installed = bool(state and getattr(state, "churvox_outer_cors_error_shield", False))
    if not already_installed:
        try:
            app.add_middleware(OuterCorsErrorShield, module=module)
            if state is not None:
                state.churvox_outer_cors_error_shield = VERSION
        except Exception as exc:
            try:
                getattr(module, "logger", logging.getLogger(__name__)).warning("[Churvox] Outer CORS middleware install skipped: %s", exc)
            except Exception:
                pass

    _attach_to_exported_wrappers(module, app)
