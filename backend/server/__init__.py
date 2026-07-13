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
    'churvox_hq_router_mount_patch',
    'churvox_owner_cockpit_control_patch',
    'churvox_tester_signup_access_patch',
    'churvox_hq_owner_access_fix_patch',
    'churvox_hq_connection_status_patch',
    'churvox_hq_tester_status_patch',
    'churvox_hq_unique_visitors_patch',
    'churvox_hq_nz_day_visits_patch',
    'churvox_hq_growth_report_patch',
    'churvox_tester_email_send_final_patch',
    'churvox_tester_email_case_preserve_patch',
    'churvox_hq_tester_system_patch',
    'churvox_hq_control_access_final_patch',
    'churvox_hq_hello_canonical_patch',
    'churvox_hq_hello_only_guard_patch',
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


FINAL_COMMAND_WRAPPER_VERSION = 'churvox-command-v3-server-wrapper-20260713g'
FINAL_COMMAND_PATCH_INSTALLED = False
FINAL_COMMAND_PATCH_ERROR = ''


def _force_install_final_command_patch():
    global FINAL_COMMAND_PATCH_INSTALLED, FINAL_COMMAND_PATCH_ERROR
    try:
        try:
            import churvox_paid_launch_live_patch as command_patch
        except Exception:
            from backend import churvox_paid_launch_live_patch as command_patch
        command_patch.install(legacy, force=True)
        FINAL_COMMAND_PATCH_INSTALLED = True
        FINAL_COMMAND_PATCH_ERROR = ''
    except Exception as exc:
        FINAL_COMMAND_PATCH_INSTALLED = False
        FINAL_COMMAND_PATCH_ERROR = f'{type(exc).__name__}:{exc}'
        print(f'Churvox final Command wrapper patch failed: {exc}', file=sys.stderr)


def _remove_route(path, method):
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (
                getattr(route, 'path', '') == path
                and method.upper() in set(getattr(route, 'methods', set()) or set())
            )
        ]
    except Exception:
        pass


async def _final_command_wrapper_marker():
    route_owners = {}
    for path in ['/api/command/slips', '/api/command/scan', '/api/admin-brain/scan', '/api/billing/create-checkout-session', '/api/billing/create-addon-checkout-session', '/api/messages', '/api/messages/readiness']:
        owners = []
        for route in list(getattr(app.router, 'routes', []) or []):
            if getattr(route, 'path', '') != path:
                continue
            endpoint = getattr(route, 'endpoint', None)
            methods = sorted(str(value) for value in (getattr(route, 'methods', set()) or set()))
            owners.append(f"{','.join(methods)}:{getattr(endpoint, '__name__', 'unknown')}")
        route_owners[path] = owners
    return {
        'ok': FINAL_COMMAND_PATCH_INSTALLED,
        'success': FINAL_COMMAND_PATCH_INSTALLED,
        'ready': FINAL_COMMAND_PATCH_INSTALLED,
        'version': FINAL_COMMAND_WRAPPER_VERSION,
        'patch_installed': FINAL_COMMAND_PATCH_INSTALLED,
        'patch_stage': 'ready' if FINAL_COMMAND_PATCH_INSTALLED else 'force_install_failed',
        'patch_error': FINAL_COMMAND_PATCH_ERROR or None,
        'billing_patch_installed': globals().get('FINAL_BILLING_PATCH_INSTALLED', False),
        'billing_version': globals().get('FINAL_BILLING_VERSION'),
        'billing_error': globals().get('FINAL_BILLING_PATCH_ERROR') or None,
        'session_revocation_installed': globals().get('FINAL_SESSION_REVOCATION_INSTALLED', False),
        'session_revocation_version': globals().get('FINAL_SESSION_REVOCATION_VERSION'),
        'session_revocation_error': globals().get('FINAL_SESSION_REVOCATION_ERROR') or None,
        'owner_messages_patch_installed': globals().get('FINAL_OWNER_MESSAGES_PATCH_INSTALLED', False),
        'owner_messages_version': globals().get('FINAL_OWNER_MESSAGES_VERSION'),
        'owner_messages_error': globals().get('FINAL_OWNER_MESSAGES_PATCH_ERROR') or None,
        'route_owners': route_owners,
        'checked_at': datetime.now(timezone.utc).isoformat(),
    }


_force_install_final_command_patch()
_remove_route('/api/command-fast-load/boot', 'GET')
app.add_api_route('/api/command-fast-load/boot', _final_command_wrapper_marker, methods=['GET'])


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


BUSINESS_PROFILE_ROUTE_VERSION = 'business-profile-live-v1'
BUSINESS_PROFILE_SAFETY = 'Business profile only. Nothing was sent, synced, charged or changed outside the approved settings fields.'


def _install_wrapper_business_profile_routes():
    db = getattr(legacy, 'db', None)
    get_current_user = getattr(legacy, 'get_current_user', None)
    if db is None or get_current_user is None:
        return

    allowed_fields = {
        'businessName', 'tradingName', 'ownerEmail', 'phone', 'website',
        'businessAddress', 'gstNumber', 'nzbn', 'bankName', 'bankNumber',
        'invoicePrefix', 'quotePrefix', 'workingHours', 'customerMessage',
        'documentFooter', 'brandTone', 'logoStatus',
    }
    owner_roles = {'employer', 'admin', 'owner', 'business_owner', 'manager', 'office_admin'}

    def _text(value, limit=4000):
        try:
            return str(value or '').strip()[:limit]
        except Exception:
            return ''

    def _read(user, *keys):
        for key in keys:
            if isinstance(user, dict) and user.get(key) not in (None, ''):
                return user.get(key)
            try:
                value = getattr(user, key, None)
                if value not in (None, ''):
                    return value
            except Exception:
                pass
        return ''

    def _truthy(value):
        if isinstance(value, bool):
            return value
        return _text(value, 20).lower() in {'1', 'true', 'yes', 'on', 'admin', 'owner'}

    def _business_id(user):
        return _text(_read(user, 'business_id', 'businessId', 'owner_business_id', 'id', '_id'), 180)

    def _maybe_oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    def _safe(value):
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, list):
            return [_safe(item) for item in value]
        if isinstance(value, dict):
            return {'id' if key == '_id' else key: _safe(item) for key, item in value.items() if key not in {'password', 'password_hash', 'hashed_password', 'token', 'access_token', 'refresh_token'}}
        return value

    async def _require_owner(request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail='Not authenticated')
        role = _text(_read(user, 'role'), 80).lower()
        is_admin = _truthy(_read(user, 'is_admin', 'is_platform_owner'))
        if role not in owner_roles and not is_admin:
            raise HTTPException(status_code=403, detail='Only an owner or admin can change business settings')
        if not _business_id(user):
            raise HTTPException(status_code=400, detail='Business id is missing')
        return user

    async def _owner_doc(user):
        business_id = _business_id(user)
        oid = _maybe_oid(business_id)
        queries = []
        if oid is not None:
            queries.extend([{'_id': oid}, {'business_id': oid, 'role': {'$in': list(owner_roles)}}])
        queries.extend([{'_id': business_id}, {'business_id': business_id, 'role': {'$in': list(owner_roles)}}])
        user_id = _text(_read(user, 'id', '_id'), 180)
        user_oid = _maybe_oid(user_id)
        if user_oid is not None:
            queries.append({'_id': user_oid})
        if user_id:
            queries.append({'_id': user_id})
        for query in queries:
            try:
                found = await db.users.find_one(query)
                if found:
                    return found
            except Exception:
                continue
        return {}

    def _profile_from(owner, saved, business_id):
        owner = owner or {}
        saved = saved or {}
        return {
            'business_id': business_id,
            'businessName': saved.get('businessName') or owner.get('business_name') or owner.get('company_name') or '',
            'tradingName': saved.get('tradingName') or owner.get('trading_name') or '',
            'ownerEmail': saved.get('ownerEmail') or owner.get('support_email') or owner.get('email') or '',
            'phone': saved.get('phone') or owner.get('phone') or owner.get('phone_number') or '',
            'website': saved.get('website') or owner.get('website') or '',
            'businessAddress': saved.get('businessAddress') or owner.get('business_address') or '',
            'gstNumber': saved.get('gstNumber') or owner.get('gst_number') or '',
            'nzbn': saved.get('nzbn') or owner.get('nzbn') or '',
            'bankName': saved.get('bankName') or owner.get('bank_account_name') or '',
            'bankNumber': saved.get('bankNumber') or owner.get('bank_account_number') or '',
            'invoicePrefix': saved.get('invoicePrefix') or owner.get('invoice_prefix') or 'INV',
            'quotePrefix': saved.get('quotePrefix') or owner.get('quote_prefix') or 'QUO',
            'workingHours': saved.get('workingHours') or owner.get('working_hours') or '',
            'customerMessage': saved.get('customerMessage') or owner.get('customer_message') or '',
            'documentFooter': saved.get('documentFooter') or owner.get('document_footer') or '',
            'brandTone': saved.get('brandTone') or owner.get('brand_tone') or 'Friendly, clear and professional',
            'logoStatus': saved.get('logoStatus') or owner.get('logo_status') or '',
            'updated_at': saved.get('updated_at'),
        }

    async def _get_profile(request: Request):
        user = await _require_owner(request)
        business_id = _business_id(user)
        owner = await _owner_doc(user)
        saved = await db.business_profiles.find_one({'business_id': business_id}) or {}
        profile = _profile_from(owner, saved, business_id)
        return JSONResponse({'success': True, 'profile': _safe(profile), 'data': {'profile': _safe(profile)}, 'version': BUSINESS_PROFILE_ROUTE_VERSION, 'safety': BUSINESS_PROFILE_SAFETY})

    async def _save_profile(request: Request):
        user = await _require_owner(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail='Settings payload must be an object')
        business_id = _business_id(user)
        clean = {key: _text(payload.get(key)) for key in allowed_fields if key in payload}
        now = datetime.now(timezone.utc)
        clean.update({'business_id': business_id, 'updated_at': now, 'updated_by': _text(_read(user, 'id', '_id'), 180)})
        await db.business_profiles.update_one(
            {'business_id': business_id},
            {'$set': clean, '$setOnInsert': {'created_at': now}},
            upsert=True,
        )

        owner = await _owner_doc(user)
        user_updates = {}
        mapping = {
            'businessName': 'business_name',
            'tradingName': 'trading_name',
            'ownerEmail': 'support_email',
            'phone': 'phone',
            'website': 'website',
            'businessAddress': 'business_address',
            'gstNumber': 'gst_number',
            'nzbn': 'nzbn',
            'bankName': 'bank_account_name',
            'bankNumber': 'bank_account_number',
            'invoicePrefix': 'invoice_prefix',
            'quotePrefix': 'quote_prefix',
            'workingHours': 'working_hours',
            'customerMessage': 'customer_message',
            'documentFooter': 'document_footer',
            'brandTone': 'brand_tone',
            'logoStatus': 'logo_status',
        }
        for source_key, target_key in mapping.items():
            if source_key in clean:
                user_updates[target_key] = clean[source_key]
        if user_updates and owner.get('_id') is not None:
            await db.users.update_one(
                {'_id': owner['_id']},
                {'$set': {**user_updates, 'updated_at': now}},
            )

        saved = await db.business_profiles.find_one({'business_id': business_id}) or clean
        refreshed_owner = await _owner_doc(user)
        profile = _profile_from(refreshed_owner, saved, business_id)
        return JSONResponse({'success': True, 'message': 'Business profile saved', 'profile': _safe(profile), 'data': {'profile': _safe(profile)}, 'version': BUSINESS_PROFILE_ROUTE_VERSION, 'safety': BUSINESS_PROFILE_SAFETY})

    def _remove(path, method):
        app.router.routes = [
            route for route in app.router.routes
            if not (getattr(route, 'path', '') == path and method in set(getattr(route, 'methods', set()) or set()))
        ]

    _remove('/api/logic/business-profile', 'GET')
    _remove('/api/logic/business-profile', 'POST')
    app.add_api_route('/api/logic/business-profile', _get_profile, methods=['GET'])
    app.add_api_route('/api/logic/business-profile', _save_profile, methods=['POST'])


_install_wrapper_business_profile_routes()


COMMAND_SMOKE_MARKER = 'command-live-smoke-guard-20260710e'
COMMAND_SMOKE_SAFETY = 'Owner approval recorded. Nothing was sent, synced, charged or changed.'


def _wrapper_has_auth(request: Request) -> bool:
    auth = request.headers.get('authorization', '')
    cookie = request.headers.get('cookie', '')
    return bool(auth.strip()) or any(token in cookie for token in ['token=', 'session=', 'owner_portal_session', 'access_token'])


async def _command_live_smoke_marker():
    return JSONResponse({'success': True, 'marker': COMMAND_SMOKE_MARKER, 'safety': COMMAND_SMOKE_SAFETY})


async def _business_profile_live_marker():
    return JSONResponse({'success': True, 'version': BUSINESS_PROFILE_ROUTE_VERSION, 'safety': BUSINESS_PROFILE_SAFETY})


async def _command_protected_placeholder(request: Request):
    if not _wrapper_has_auth(request):
        return JSONResponse({'detail': 'Not authenticated', 'marker': COMMAND_SMOKE_MARKER, 'safety': COMMAND_SMOKE_SAFETY}, status_code=401)
    return JSONResponse({'success': True, 'items': [], 'events': [], 'audit': [], 'marker': COMMAND_SMOKE_MARKER, 'safety': COMMAND_SMOKE_SAFETY})


async def _command_worker_request_placeholder(request: Request):
    if not _wrapper_has_auth(request):
        return JSONResponse({'detail': 'Not authenticated', 'marker': COMMAND_SMOKE_MARKER, 'safety': COMMAND_SMOKE_SAFETY}, status_code=401)
    return JSONResponse({'success': True, 'message': 'Command request protected. Owner approval is required.', 'marker': COMMAND_SMOKE_MARKER, 'safety': COMMAND_SMOKE_SAFETY})


app.add_api_route('/api/command/live-smoke-marker', _command_live_smoke_marker, methods=['GET'])
app.add_api_route('/api/settings/live-marker', _business_profile_live_marker, methods=['GET'])
app.add_api_route('/api/command/events', _command_protected_placeholder, methods=['GET', 'POST'])
app.add_api_route('/api/command/audit', _command_protected_placeholder, methods=['GET', 'POST'])
app.add_api_route('/api/command/worker-payment-request', _command_worker_request_placeholder, methods=['POST'])
app.add_api_route('/api/command/worker-update-request', _command_worker_request_placeholder, methods=['POST'])


FINAL_BILLING_VERSION = 'churvox-paid-launch-billing-final-20260713a'
FINAL_BILLING_PATCH_INSTALLED = False
FINAL_BILLING_PATCH_ERROR = ''


def _force_install_final_billing_patch():
    global FINAL_BILLING_PATCH_INSTALLED, FINAL_BILLING_PATCH_ERROR
    try:
        try:
            import churvox_paid_launch_billing_final_patch as billing_patch
        except Exception:
            from backend import churvox_paid_launch_billing_final_patch as billing_patch
        FINAL_BILLING_PATCH_INSTALLED = bool(billing_patch.install(legacy, force=True))
        FINAL_BILLING_PATCH_ERROR = '' if FINAL_BILLING_PATCH_INSTALLED else 'installer_not_ready'
    except Exception as exc:
        FINAL_BILLING_PATCH_INSTALLED = False
        FINAL_BILLING_PATCH_ERROR = f'{type(exc).__name__}:{exc}'
        print(f'Churvox final billing patch failed: {exc}', file=sys.stderr)


_force_install_final_billing_patch()


FINAL_SESSION_REVOCATION_VERSION = 'churvox-logout-all-sessions-final-20260713a'
FINAL_SESSION_REVOCATION_INSTALLED = False
FINAL_SESSION_REVOCATION_ERROR = ''


def _force_install_final_session_revocation():
    global FINAL_SESSION_REVOCATION_INSTALLED, FINAL_SESSION_REVOCATION_ERROR
    try:
        try:
            import churvox_logout_all_sessions_final_patch as session_patch
        except Exception:
            from backend import churvox_logout_all_sessions_final_patch as session_patch
        FINAL_SESSION_REVOCATION_INSTALLED = bool(session_patch.install(legacy, force=True))
        FINAL_SESSION_REVOCATION_ERROR = '' if FINAL_SESSION_REVOCATION_INSTALLED else 'installer_not_ready'
    except Exception as exc:
        FINAL_SESSION_REVOCATION_INSTALLED = False
        FINAL_SESSION_REVOCATION_ERROR = f'{type(exc).__name__}:{exc}'
        print(f'Churvox final session revocation patch failed: {exc}', file=sys.stderr)


_force_install_final_session_revocation()


FINAL_OWNER_MESSAGES_VERSION = 'churvox-final-owner-messages-v17-20260714'
FINAL_OWNER_MESSAGES_PATCH_INSTALLED = False
FINAL_OWNER_MESSAGES_PATCH_ERROR = ''


def _force_install_final_owner_messages_patch():
    global FINAL_OWNER_MESSAGES_PATCH_INSTALLED, FINAL_OWNER_MESSAGES_PATCH_ERROR
    try:
        try:
            import churvox_final_owner_messages_route_patch as messages_patch
        except Exception:
            from backend import churvox_final_owner_messages_route_patch as messages_patch
        FINAL_OWNER_MESSAGES_PATCH_INSTALLED = bool(messages_patch.install(legacy, force=True))
        FINAL_OWNER_MESSAGES_PATCH_ERROR = '' if FINAL_OWNER_MESSAGES_PATCH_INSTALLED else 'installer_not_ready'
    except Exception as exc:
        FINAL_OWNER_MESSAGES_PATCH_INSTALLED = False
        FINAL_OWNER_MESSAGES_PATCH_ERROR = f'{type(exc).__name__}:{exc}'
        print(f'Churvox final owner messages patch failed: {exc}', file=sys.stderr)


_force_install_final_owner_messages_patch()


@app.options('/{full_path:path}')
async def _global_options(full_path: str):
    return JSONResponse({'ok': True})


@app.get('/api/healthz')
async def _wrapper_healthz():
    return {'ok': True, 'service': 'churvox-backend-wrapper', 'stripe_loaded': bool(stripe), 'business_profile_version': BUSINESS_PROFILE_ROUTE_VERSION}


@app.get('/healthz')
async def _plain_healthz():
    return {'ok': True, 'service': 'churvox-backend-wrapper'}


@app.get('/')
async def _root():
    return RedirectResponse('/api/healthz')
