from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:140]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


worker = "backend/churvox_worker_jobs_read_patch.py"
replace_once(
    worker,
    'LIVE_PATCH_VERSION = "worker-jobs-owner-visibility-v2-20260706"',
    'LIVE_PATCH_VERSION = "worker-jobs-definitive-route-v3-20260713"',
)
replace_once(
    worker,
    '''def _route_loaded(app, path, method):
    method = method.upper()
    try:
        for route in getattr(app.router, "routes", []):
            if getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set()):
                return True
    except Exception:
        pass
    return False
''',
    '''def _route_loaded(app, path, method):
    method = method.upper()
    try:
        for route in getattr(app.router, "routes", []):
            if getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set()):
                return True
    except Exception:
        pass
    return False


def _remove_route(app, path, method):
    method = method.upper()
    try:
        app.router.routes = [
            route for route in getattr(app.router, "routes", [])
            if not (
                getattr(route, "path", "") == path
                and method in set(getattr(route, "methods", set()) or set())
            )
        ]
    except Exception:
        pass
''',
)
replace_once(
    worker,
    '''    if getattr(app.state, "worker_jobs_read_patch", False):
        _install_extra_owner_visibility(module)
        return
''',
    '''    if getattr(app.state, "worker_jobs_read_patch", "") == LIVE_PATCH_VERSION:
        _install_extra_owner_visibility(module)
        return
''',
)
replace_once(
    worker,
    '''    @router.get("/health/wiring")
    async def direct_wiring_health():
''',
    '''    @router.get("/worker/jobs-readiness")
    async def worker_jobs_readiness():
        return {
            "success": True,
            "ready": True,
            "version": LIVE_PATCH_VERSION,
            "route": "/api/worker/jobs",
            "definitive_route_owner": "worker_jobs",
            "safety": "Read-only worker assignment visibility. No records were changed.",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    @router.get("/health/wiring")
    async def direct_wiring_health():
''',
)
replace_once(
    worker,
    '''    app.include_router(router)
''',
    '''    # FastAPI resolves matching routes in registration order. Remove every
    # older worker-jobs reader first so this business-scoped implementation is
    # the definitive live route rather than an unreachable duplicate.
    _remove_route(app, "/api/worker/jobs", "GET")
    _remove_route(app, "/api/worker/jobs-readiness", "GET")
    app.include_router(router)
''',
)
replace_once(
    worker,
    '''    app.state.worker_jobs_read_patch = True
''',
    '''    app.state.worker_jobs_read_patch = LIVE_PATCH_VERSION
''',
)

site = "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
replace_once(
    site,
    '<footer><button type="button" className="openSlip" onClick={onOpen}>Open slip</button></footer><small>Open the full slip to inspect the evidence and prepared form</small></article>;',
    '<footer><button type="button" className="openSlip" onClick={onOpen}>Open slip</button></footer></article>;',
)

print("CHURVOX_WORKER_JOBS_DEFINITIVE_ROUTE_PATCH_APPLIED")
