from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, Request
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
        installer = getattr(module, 'install', None) or getattr(module, '_install', None)
        if installer:
            installer(legacy)
    except Exception as exc:
        print(f'Churvox launch patch skipped: {module_name}: {exc}', file=sys.stderr)


for _patch in [
    'churvox_auth_login_fast_patch',
    'churvox_worker_login_bridge_patch',
    'churvox_worker_jobs_read_patch',
    'churvox_field_loop_patch',
    'churvox_paid_launch_guard_patch',
    'churvox_admin_recovery_patch',
    'churvox_owner_cockpit_control_patch',
    'churvox_tester_signup_access_patch',
    'churvox_hq_owner_access_fix_patch',
    'churvox_hq_tester_status_patch',
    'churvox_hq_unique_visitors_patch',
    'churvox_on_site_payments_patch',
    'churvox_terminal_reader_patch',
    'churvox_os_v2_saved_records_patch',
    'churvox_owner_record_engine_routes_patch',
    'churvox_launch_create_records_patch',
    'churvox_legit_wiring_patch',
    'churvox_owner_visibility_v2_patch',
    'churvox_owner_data_debug_patch',
    'churvox_wiring_health_patch',
    'churvox_api_request_422_fix_patch',
    'churvox_tester_email_send_final_patch',
    'churvox_email_provider_status_patch',
    'churvox_nav_attention_counts_patch',
    'churvox_nav_attention_counts_status_fix_patch',
    'churvox_nav_attention_request_signature_fix_patch',
    'churvox_industry_mode_patch',
    'churvox_industry_mode_request_fix_patch',
    'churvox_business_profile_required_patch',
    'churvox_industry_isolation_patch',
    'churvox_industry_request_signature_fix_patch',
    'churvox_business_logic_health_patch',
    'churvox_business_system_suite_patch',
    'churvox_jobs_proof_pack_safe_patch',
]:
    _install_launch_patch(_patch)


def _install_wrapper_proof_pack_guard():
    db = getattr(legacy, 'db', None)
    get_current_user = getattr(legacy, 'get_current_user', None)
    if db is None or get_current_user is None:
        return

    def _text(value):
        try:
            return str(value or '').strip()
        except Exception:
            return ''

    def _key(value):
        return ''.join(ch for ch in _text(value).lower() if ch.isalnum())

    def _read(user, *keys):
        for key in keys:
            try:
                if isinstance(user, dict) and user.get(key) not in (None, ''):
                    return user.get(key)
                value = getattr(user, key, None)
                if value not in (None, ''):
                    return value
            except Exception:
                pass
        return ''

    def _industry(user):
        profile_doc = _read(user, 'business_profile') or {}
        brain_doc = _read(user, 'industry_brain') or {}
        profile = _read(user, 'industry_profile', 'industry_key')
        mode = _read(user, 'industry_mode')
        if not profile and isinstance(profile_doc, dict):
            profile = profile_doc.get('industry_key') or profile_doc.get('industry')
        if not mode and isinstance(brain_doc, dict):
            mode = brain_doc.get('mode')
        return _text(profile or 'field_service') or 'field_service', _text(mode or 'field_service') or 'field_service'

    def _checklist(profile, mode):
        k = _key(profile)
        m = _key(mode)
        if 'lawn' in k or 'landscape' in k or 'garden' in k:
            return ['Before lawn/garden photo', 'After lawn/garden photo', 'Gate/access note', 'Green waste or extra work note', 'Weather issue note']
        if 'clean' in k or 'visit' in m:
            return ['Before condition photo', 'After clean photo', 'Checklist completed', 'Access/key issue note', 'Extra time or supplies note']
        if any(word in k for word in ['plumbing', 'electrical', 'hvac']):
            return ['Before issue photo', 'After repair/install photo', 'Parts used', 'Safety/compliance note', 'Customer approval note']
        return ['Before photo', 'After photo', 'Worker completion note', 'Customer-visible summary']

    def _safe(value):
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, list):
            return [_safe(v) for v in value]
        if isinstance(value, dict):
            return {'id' if k == '_id' else k: _safe(v) for k, v in value.items() if not any(word in str(k).lower() for word in ['password', 'token', 'secret', 'hash'])}
        return value

    async def _proof_pack(request: Request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail='Not authenticated')
        profile, mode = _industry(user)
        job_id = _text(request.query_params.get('job_id') or request.query_params.get('id'))
        saved = []
        if job_id:
            try:
                cursor = db.job_proof_packs.find({'job_id': job_id}).sort('updated_at', -1)
                saved = [_safe(row) for row in await cursor.limit(20).to_list(length=20)]
            except Exception:
                saved = []
        return {'success': True, 'source': 'churvox_wrapper_proof_pack_guard', 'industry_key': profile, 'mode': mode, 'job_id': job_id, 'checklist': _checklist(profile, mode), 'saved_proof': saved, 'updated_at': datetime.now(timezone.utc).isoformat()}

    async def _save_proof_pack(request: Request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail='Not authenticated')
        try:
            body = await request.json()
        except Exception:
            body = {}
        profile, mode = _industry(user)
        row = {'business_id': _text(_read(user, 'business_id', 'businessId', 'owner_business_id', 'contractor_id', 'id', '_id')), 'owner_email': _text(_read(user, 'email', 'user_email')).lower(), 'job_id': _text((body or {}).get('job_id')), 'industry_key': profile, 'mode': mode, 'checklist': (body or {}).get('checklist') or _checklist(profile, mode), 'notes': _text((body or {}).get('notes')), 'items': (body or {}).get('items') or [], 'created_at': datetime.now(timezone.utc), 'updated_at': datetime.now(timezone.utc)}
        try:
            await db.job_proof_packs.insert_one(row)
        except Exception:
            pass
        return {'success': True, 'source': 'churvox_wrapper_proof_pack_guard', 'proof_pack': _safe(row)}

    try:
        app.router.routes = [route for route in app.router.routes if not (getattr(route, 'path', '') == '/api/jobs/proof-pack' and set(getattr(route, 'methods', set()) or set()).intersection({'GET', 'POST'}))]
    except Exception:
        pass
    app.add_api_route('/api/jobs/proof-pack', _proof_pack, methods=['GET'])
    app.add_api_route('/api/jobs/proof-pack', _save_proof_pack, methods=['POST'])


_install_wrapper_proof_pack_guard()

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
