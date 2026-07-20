from __future__ import annotations

import inspect


VERSION = "churvox-password-policy-final-20260720a"
COMMON_PASSWORDS = {
    "password",
    "password1",
    "password123",
    "12345678",
    "123456789",
    "qwerty123",
    "letmein123",
    "welcome123",
    "admin123",
    "churvox123",
}


def text(value):
    return str(value or "")


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def validate_password(password):
    raw = text(password)
    if len(raw) < 8:
        return "Password must be at least 8 characters."
    if len(raw) > 128:
        return "Password must be no more than 128 characters."
    if raw != raw.strip():
        return "Password cannot begin or end with spaces."
    lowered = raw.casefold()
    if lowered in COMMON_PASSWORDS:
        return "Choose a less common password."
    if len(set(raw)) < 3:
        return "Choose a less repetitive password."
    return ""


def install(module):
    app = getattr(module, "app", None)
    ResetPassword = getattr(module, "ResetPassword", None)
    Response = getattr(module, "Response", None)
    HTTPException = getattr(module, "HTTPException", None)
    if app is None or ResetPassword is None or Response is None or HTTPException is None:
        return
    if getattr(app.state, "churvox_password_policy_final", "") == VERSION:
        return

    path = "/api/auth/reset-password"
    existing = [route for route in app.router.routes if route_matches(route, path, "POST")]
    if not existing:
        return
    original = existing[-1].endpoint
    if getattr(original, "__churvox_password_policy_final__", False):
        app.state.churvox_password_policy_final = VERSION
        return

    async def final_reset_password(data, response):
        password = text(getattr(data, "new_password", ""))
        error = validate_password(password)
        if error:
            raise HTTPException(status_code=400, detail=error)
        result = original(data, response)
        if inspect.isawaitable(result):
            result = await result
        if isinstance(result, dict):
            result = dict(result)
            result["password_policy_version"] = VERSION
        return result

    final_reset_password.__annotations__ = {"data": ResetPassword, "response": Response}
    final_reset_password.__churvox_password_policy_final__ = True

    app.router.routes = [route for route in app.router.routes if not route_matches(route, path, "POST")]
    app.add_api_route(path, final_reset_password, methods=["POST"])
    preferred = [route for route in app.router.routes if route_matches(route, path, "POST")]
    app.router.routes = preferred + [route for route in app.router.routes if route not in preferred]
    app.state.churvox_password_policy_final = VERSION
