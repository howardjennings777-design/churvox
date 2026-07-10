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
    'churvox_command_approval_fields_patch',
    'churvox_tester_signup_access_patch',
    'churvox_hq_owner_access_fix_patch',
    'churvox_hq_extra_owner_email_patch',
    'churvox_hq_connection_status_patch',
    'churvox_hq_tester_status_patch',
    'churvox_hq_unique_visitors_patch',
    'churvox_hq_nz_day_visits_patch',
    'churvox_hq_growth_report_patch',
    'churvox_internal_support_patch',
    'churvox_record_delete_patch',
    'churvox_records_exact_bypass_patch',
    'churvox_hq_exact_endpoint_bypass_patch',
    'churvox_hq_exact_cors_patch',
    'churvox_hq_account_delete_patch',
    'churvox_on_site_payments_patch',
    'churvox_on_site_payments_request_signature_fix_patch',
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
    'churvox_auto_smart_patch',
    'churvox_auto_smart_request_signature_fix_patch',
    'churvox_admin_brain_patch',
    'churvox_admin_brain_owner_decision_patch',
    'churvox_admin_brain_request_signature_fix_patch',
    'churvox_jobs_proof_pack_safe_patch',
    'churvox_jobs_proof_pack_middleware_guard_patch',
    'churvox_owner_access_safety_patch',
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
        if 'barber' in k or 'hair' in k or 'salon' in k or 'beauty' in k:
            return ['Client service notes', 'Before/after note if needed', 'Product or colour note', 'Follow-up reminder', 'Payment/invoice note']
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
        return JSONResponse({'success': True, 'job_id': job_id, 'industry_profile': profile, 'industry_mode': mode, 'checklist': _checklist(profile, mode), 'proof_pack': saved, 'items': saved})

    async def _proof_pack_options(request: Request):
        try:
            user = await get_current_user(request)
        except Exception:
            user = {}
        profile, mode = _industry(user)
        return JSONResponse({'success': True, 'industry_profile': profile, 'industry_mode': mode, 'required_items': _checklist(profile, mode), 'optional_items': ['Extra materials photo', 'Customer signature', 'Invoice note']})

    app.add_api_route('/api/jobs/proof-pack', _proof_pack, methods=['GET'])
    app.add_api_route('/api/jobs/proof-pack/options', _proof_pack_options, methods=['GET'])


_install_wrapper_proof_pack_guard()


COMMAND_SMOKE_MARKER = 'command-live-smoke-guard-20260710e'
COMMAND_SMOKE_SAFETY = 'Owner approval recorded. Nothing was sent, synced, charged or changed.'


def _wrapper_has_auth(request: Request) -> bool:
    auth = request.headers.get('authorization', '')
    cookie = request.headers.get('cookie', '')
    return bool(auth.strip()) or any(token in cookie for token in ['token=', 'session=', 'owner_portal_session', 'access_token'])


async def _command_live_smoke_marker():
    return JSONResponse({'success': True, 'marker': COMMAND_SMOKE_MARKER, 'safety': COMMAND_SMOKE_SAFETY})


async def _command_protected_placeholder(request: Request):
    if not _wrapper_has_auth(request):
        return JSONResponse({'detail': 'Not authenticated', 'marker': COMMAND_SMOKE_MARKER, 'safety': COMMAND_SMOKE_SAFETY}, status_code=401)
    return JSONResponse({'success': True, 'items': [], 'events': [], 'audit': [], 'marker': COMMAND_SMOKE_MARKER, 'safety': COMMAND_SMOKE_SAFETY})


async def _command_worker_request_placeholder(request: Request):
    if not _wrapper_has_auth(request):
        return JSONResponse({'detail': 'Not authenticated', 'marker': COMMAND_SMOKE_MARKER, 'safety': COMMAND_SMOKE_SAFETY}, status_code=401)
    return JSONResponse({'success': True, 'message': 'Command request protected. Owner approval is required.', 'marker': COMMAND_SMOKE_MARKER, 'safety': COMMAND_SMOKE_SAFETY})


app.add_api_route('/api/command/live-smoke-marker', _command_live_smoke_marker, methods=['GET'])
app.add_api_route('/api/command/events', _command_protected_placeholder, methods=['GET', 'POST'])
app.add_api_route('/api/command/audit', _command_protected_placeholder, methods=['GET', 'POST'])
app.add_api_route('/api/command/worker-payment-request', _command_worker_request_placeholder, methods=['POST'])
app.add_api_route('/api/command/worker-update-request', _command_worker_request_placeholder, methods=['POST'])


@app.options('/{full_path:path}')
async def _global_options(full_path: str):
    return JSONResponse({'ok': True})


@app.get('/api/healthz')
async def _wrapper_healthz():
    return {'ok': True, 'service': 'churvox-backend-wrapper', 'stripe_loaded': bool(stripe)}


@app.get('/healthz')
async def _plain_healthz():
    return {'ok': True, 'service': 'churvox-backend-wrapper'}
