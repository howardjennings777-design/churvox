from types import SimpleNamespace

from bson import ObjectId
from fastapi import FastAPI

try:
    import churvox_paid_launch_live_patch as patch
except Exception:
    from backend import churvox_paid_launch_live_patch as patch


class FakeCollection:
    async def create_index(self, *args, **kwargs):
        return "ok"


class FakeDb:
    def __getitem__(self, name):
        return FakeCollection()

    def __getattr__(self, name):
        return FakeCollection()


async def current_user(_request):
    return {
        "id": "507f1f77bcf86cd799439011",
        "business_id": "507f1f77bcf86cd799439011",
        "role": "owner",
    }


def matching(app, path, method):
    return [
        route
        for route in app.router.routes
        if getattr(route, "path", "") == path
        and method in set(getattr(route, "methods", set()) or set())
    ]


def test_forced_install_owns_final_command_routes():
    app = FastAPI()

    async def stale_scan(payload: dict):
        return {"source": "stale"}

    async def stale_admin(payload: dict):
        return {"source": "stale"}

    app.add_api_route("/api/command/scan", stale_scan, methods=["POST"])
    app.add_api_route("/api/admin-brain/scan", stale_admin, methods=["POST"])

    name = "churvox_command_fast_load_test_module"
    patch.INSTALLED.discard(name)
    module = SimpleNamespace(
        __name__=name,
        app=app,
        db=FakeDb(),
        get_current_user=current_user,
        ObjectId=ObjectId,
    )

    patch.install(module)

    # Simulate a legacy router being registered after an early import-hook install.
    app.add_api_route("/api/command/scan", stale_scan, methods=["POST"])
    app.add_api_route("/api/admin-brain/scan", stale_admin, methods=["POST"])

    patch.install(module, force=True)

    scan_routes = matching(app, "/api/command/scan", "POST")
    admin_routes = matching(app, "/api/admin-brain/scan", "POST")
    slip_routes = matching(app, "/api/command/slips", "GET")

    assert len(scan_routes) == 1
    assert len(admin_routes) == 1
    assert len(slip_routes) == 1
    assert scan_routes[0].endpoint.__name__ == "fast_scan"
    assert admin_routes[0].endpoint.__name__ == "admin_brain_bridge"
    assert slip_routes[0].endpoint.__name__ == "fast_slips"

    patch.INSTALLED.discard(name)
