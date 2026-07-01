from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys

backend_dir = Path(__file__).resolve().parents[1]
legacy_path = backend_dir / "server.py"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

spec = spec_from_file_location("churvox_legacy_server", legacy_path)
legacy = module_from_spec(spec)
sys.modules["churvox_legacy_server"] = legacy

source = legacy_path.read_text(encoding="utf-8")
source = source.replace(
    "app.include_router(api_router) moved to bottom after all routes",
    "# app.include_router(api_router) moved to bottom after all routes",
)
source = source.replace(
    "register_command_hub_routes(api_router, db, get_current_user, get_user_business_id)",
    "globals().get('register_command_hub_routes', lambda *args, **kwargs: None)(api_router, db, get_current_user, get_user_business_id)",
)

code = compile(source, str(legacy_path), "exec")
exec(code, legacy.__dict__)

app = getattr(legacy, "app", None)
if app is None:
    raise RuntimeError("Churvox backend boot failed: backend/server.py did not expose app")

try:
    import churvox_worker_login_bridge_patch
    churvox_worker_login_bridge_patch.install(legacy)
except Exception as exc:
    print(f"Churvox worker bridge skipped: {exc}", file=sys.stderr)

try:
    app.router.on_startup.clear()
except Exception:
    pass
