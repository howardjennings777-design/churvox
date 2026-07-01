from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import Request
from fastapi.responses import JSONResponse, RedirectResponse

try:
    import stripe
except Exception:
    stripe = None

backend_dir = Path(__file__).resolve().parents[1]
legacy_path = backend_dir / 'server.py'

# Render starts with: uvicorn server:app
# Because this package is named server, this wrapper must load ../server.py.
# Keep the backend directory first on sys.path so absolute legacy imports resolve.
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

spec = spec_from_file_location('churvox_legacy_server', legacy_path)
legacy = module_from_spec(spec)
sys.modules['churvox_legacy_server'] = legacy

# Some older emergency edits left plain-English notes / stale calls inside server.py.
# Clean those exact lines before compiling so the legacy backend can still boot.
source = legacy_path.read_text(encoding='utf-8')
source = source.replace(
    'app.include_router(api_router) moved to bottom after all routes',
    '# app.include_router(api_router) moved to bottom after all routes',
)
source = source.replace(
    'register_command_hub_routes(api_router, db, get_current_user, get_user_business_id)',
    "globals().get('register_command_hub_routes', lambda *args, **kwargs: None)(api_router, db, get_current_user, get_user_business_id)",
)
code = compile(source, str(legacy_path), 'exec')
exec(code, legacy.__dict__)

app = getattr(legacy, 'app', None)
if app is None:
    raise RuntimeError('Churvox backend boot failed: backend/server.py did not expose app')

try:
    app.router.on_startup.clear()
except Exception:
    pass


def _install_launch_patch(module_name):
    try:
        module = __import__(module_name)
        installer = getattr(module, 'install', None)
        if installer:
            installer(legacy)
    except Exception as exc:
        print(f'Churvox launch patch skipped: {module_name}: {exc}', file=sys.stderr)


for _patch in [
    'churvox_auth_login_fast_patch',
    'churvox_worker_login_bridge_patch',
    'churvox_worker_jobs_read_patch',
    'churvox_paid_launch_guard_patch',
    'churvox_admin_recovery_patch',
    'churvox_owner_cockpit_control_patch',
    'churvox_tester_signup_access_patch',
    'churvox_on_site_payments_patch',
    'churvox_terminal_reader_patch',
]:
    _install_launch_patch(_patch)

PLAN_ALIAS = {'start': 'solo', 'solo': 'solo', 'crew': 'team', 'team': 'team', 'operator': 'pro', 'pro': 'pro', 'command': 'enterprise', 'enterprise': 'enterprise'}
PLAN_RANK = {'none': 0, '': 0, 'trial': 1, 'solo': 1, 'start': 1, 'team': 2, 'crew': 2, 'pro': 3, 'operator': 3, 'enterprise': 4, 'command': 4}
PLAN_ENV_BY_KEY = {'solo': 'START', 'team': 'CREW', 'pro': 'OPERATOR', 'enterprise': 'COMMAND'}
SUPPORTED_COUNTRIES = {'NZ', 'AU', 'US', 'UK'}
FEATURE_ROUTES = [
    ('/api/team', 'team'), ('/api/time', 'team'), ('/api/dispatch', 'team'), ('/api/routes', 'team'), ('/api/areas', 'team'), ('/api/photos', 'team'), ('/api/documents', 'team'), ('/api/recurring', 'team'),
    ('/api/slips', 'pro'), ('/api/command', 'pro'), ('/api/operator', 'pro'), ('/api/ai', 'pro'), ('/api/approval', 'pro'), ('/api/approvals', 'pro'), ('/api/alerts', 'pro'), ('/api/automation', 'pro'), ('/api/messages', 'pro'), ('/api/reviews', 'pro'),
    ('/api/payroll', 'enterprise'), ('/api/reports', 'enterprise'), ('/api/exports', 'enterprise'), ('/api/roles', 'enterprise'), ('/api/profit', 'enterprise'), ('/api/assets', 'enterprise'), ('/api/inventory', 'enterprise'), ('/api/gps', 'enterprise')
]
PUBLIC_PREFIXES = ('/api/auth', '/api/billing', '/api/admin', '/api/lifecycle', '/api/platform/visit', '/api/support', '/api/invite', '/api/health')
CORS_ALLOWED_ORIGINS = {
    'https://www.churvox.com',
    'https://churvox.com',
    'https://www.churvox.onrender.com',
    'https://churvox.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
}


def _safe_text(value, fallback=''):
    if value is None:
        return fallback
    try:
        text = str(value).strip()
        return text if text else fallback
    except Exception:
        return fallback


def _safe_money(value):
    try:
        amount = float(value or 0)
        if amount <= 0:
            return None
        return '${:,.2f}'.format(amount)
    except Exception:
        return None


def _json_safe(value):
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value
