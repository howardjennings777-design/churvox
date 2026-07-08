from __future__ import annotations

INSTALLED = set()
HQ_PATHS = {
    "/api/admin/owner/connection",
    "/api/admin/owner/support-tickets",
    "/api/admin/owner/growth-report",
    "/api/admin/owner/unique-visitors",
}
ALLOWED_ORIGINS = {
    "https://www.churvox.com",
    "https://churvox.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
}


def cors_origin(request):
    origin = request.headers.get("origin") or ""
    if origin in ALLOWED_ORIGINS:
        return origin
    if origin.endswith(".onrender.com") or origin.endswith(".vercel.app"):
        return origin
    return "https://www.churvox.com"


def add_cors(response, request):
    origin = cors_origin(request)
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers") or "Authorization,Content-Type,Accept,X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"
    response.headers["Vary"] = "Origin"
    return response


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    JSONResponse = getattr(module, "JSONResponse", None)
    if not app or JSONResponse is None:
        return

    @app.middleware("http")
    async def hq_exact_cors_guard(request, call_next):
        path = request.url.path
        if path in HQ_PATHS and request.method.upper() == "OPTIONS":
            return add_cors(JSONResponse({"ok": True, "source": "hq_exact_cors_guard"}), request)
        response = await call_next(request)
        if path in HQ_PATHS:
            return add_cors(response, request)
        return response

    INSTALLED.add(name)
