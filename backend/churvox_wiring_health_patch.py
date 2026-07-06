from __future__ import annotations

import importlib, importlib.abc, importlib.machinery, sys
from datetime import datetime, timezone

TARGETS = {"server", "backend.server"}
INSTALLED = set()
REQUIRED = [
    ("/api/jobs", "GET"), ("/api/jobs", "POST"), ("/api/jobs/{record_id}", "PATCH"),
    ("/api/clients", "GET"), ("/api/clients", "POST"), ("/api/clients/{record_id}", "PATCH"),
    ("/api/quotes", "GET"), ("/api/quotes", "POST"),
    ("/api/invoices", "GET"), ("/api/invoices", "POST"),
    ("/api/team", "GET"), ("/api/team/workers", "POST"),
    ("/api/messages", "GET"), ("/api/messages", "POST"),
    ("/api/command/actions", "GET"), ("/api/command/execute-approved", "POST"),
    ("/api/worker/jobs", "GET"), ("/api/worker/field-slip", "POST"),
    ("/api/jobs/{job_id}/acknowledge", "POST"), ("/api/jobs/{job_id}/start", "POST"), ("/api/jobs/{job_id}/complete", "POST"),
    ("/api/payments/on-site/status", "GET"), ("/api/payments/on-site/setup-link", "POST"), ("/api/payments/on-site/payment-intent", "POST"), ("/api/payments/on-site/reader-key", "POST"), ("/api/payments/on-site/reader-result", "POST"),
]

def remove(app, path, method):
    try:
        app.router.routes = [r for r in app.router.routes if not (getattr(r, "path", "") == path and method in set(getattr(r, "methods", set()) or set()))]
    except Exception:
        pass

def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED: return
    app = getattr(module, "app", None)
    Request = getattr(module, "Request", None)
    if not app or Request is None: return

    async def wiring_health(request: Request):
        active = set()
        for route in getattr(app.router, "routes", []):
            path = getattr(route, "path", "")
            for method in set(getattr(route, "methods", set()) or set()):
                active.add((path, method))
        checks = [{"path": path, "method": method, "loaded": (path, method) in active} for path, method in REQUIRED]
        missing = [row for row in checks if not row["loaded"]]
        return {
            "success": True,
            "status": "ready" if not missing else "missing_routes",
            "loaded_count": len(checks) - len(missing),
            "required_count": len(checks),
            "missing": missing,
            "checks": checks,
            "owner_worker_loop": not any(row for row in missing if row["path"] in {"/api/worker/jobs", "/api/worker/field-slip", "/api/jobs/{job_id}/acknowledge", "/api/jobs/{job_id}/start", "/api/jobs/{job_id}/complete", "/api/command/actions"}),
            "payments_loop": not any(row for row in missing if row["path"].startswith("/api/payments/on-site")),
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    for path in ["/api/health/wiring", "/api/logic/wiring-health"]:
        remove(app, path, "GET")
        app.add_api_route(path, wiring_health, methods=["GET"])
    INSTALLED.add(name)

class Loader(importlib.abc.Loader):
    def __init__(self, original): self.original = original
    def create_module(self, spec): return self.original.create_module(spec) if hasattr(self.original, "create_module") else None
    def exec_module(self, module): self.original.exec_module(module); install(module)
class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS: return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader): spec.loader = Loader(spec.loader)
        return spec
if not any(isinstance(f, Finder) for f in sys.meta_path): sys.meta_path.insert(0, Finder())
for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded: install(loaded)
