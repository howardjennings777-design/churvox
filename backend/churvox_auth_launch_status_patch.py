from __future__ import annotations

from datetime import datetime, timezone

VERSION = "churvox-auth-launch-status-20260712d"
REQUIRED_STATE = {
    "auth_hardening": "churvox_auth_paid_launch_hardening",
    "password_recovery": "churvox_password_recovery_paid_launch",
    "session_precision": "churvox_session_token_precision",
    "token_revocation": "churvox_token_revocation_paid_launch",
    "registration_verification": "churvox_registration_verification_paid_launch",
    "registration_claim": "churvox_registration_claim_guard",
    "login_final": "churvox_login_paid_launch_final",
    "worker_role_guard": "churvox_worker_login_role_guard",
    "invite_security": "churvox_invite_security_paid_launch",
    "checkout_token_guard": "churvox_checkout_token_session_guard",
}


def _route_exists(app, path: str, method: str = "GET") -> bool:
    try:
        return any(
            getattr(route, "path", "") == path
            and method.upper() in set(getattr(route, "methods", set()) or set())
            for route in app.router.routes
        )
    except Exception:
        return False


def install(module) -> None:
    app = getattr(module, "app", None)
    if app is None or getattr(app.state, "churvox_auth_launch_status", False):
        return

    async def auth_launch_status():
        checks = {}
        versions = {}
        for label, state_name in REQUIRED_STATE.items():
            value = getattr(app.state, state_name, None)
            checks[label] = bool(value)
            versions[label] = str(value or "missing")
        routes = {
            "register": _route_exists(app, "/api/auth/register", "POST"),
            "verify_email": _route_exists(app, "/api/auth/verify-email/{token}", "GET"),
            "resend_verification": _route_exists(app, "/api/auth/resend-verification", "POST"),
            "login": _route_exists(app, "/api/auth/login", "POST"),
            "worker_login": _route_exists(app, "/api/worker/auth/login", "POST"),
            "logout": _route_exists(app, "/api/auth/logout", "POST"),
            "forgot_password": _route_exists(app, "/api/auth/forgot-password", "POST"),
            "reset_password": _route_exists(app, "/api/auth/reset-password", "POST"),
            "refresh": _route_exists(app, "/api/auth/refresh", "POST"),
            "invite_verify": _route_exists(app, "/api/invite/verify/{token}", "GET"),
            "invite_accept": _route_exists(app, "/api/invite/accept", "POST"),
            "invite_resend": _route_exists(app, "/api/team/resend-invite/{worker_id}", "POST"),
        }
        ready = all(checks.values()) and all(routes.values())
        return {
            "success": True,
            "ready_for_paid_login": ready,
            "checks": checks,
            "routes": routes,
            "versions": versions,
            "version": VERSION,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    if not _route_exists(app, "/api/auth/launch-status", "GET"):
        app.add_api_route("/api/auth/launch-status", auth_launch_status, methods=["GET"])
    app.state.churvox_auth_launch_status = VERSION
