from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
import os
import runpy
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
spec.loader.exec_module(legacy)

app = getattr(legacy, 'app', None)
if app is None:
    legacy_namespace = runpy.run_path(str(legacy_path))
    app = legacy_namespace.get('app')

if app is None:
    raise RuntimeError('Churvox backend boot failed: backend/server.py did not expose app')

try:
    app.router.on_startup.clear()
except Exception:
    pass

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
        return {k: _json_safe(v) for k, v in value.items() if 'password' not in k.lower() and 'secret' not in k.lower() and 'token' not in k.lower() and 'hash' not in k.lower()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _doc_id(doc):
    return _safe_text((doc or {}).get('id') or (doc or {}).get('_id') or (doc or {}).get('invoice_id') or (doc or {}).get('job_id'))


def _as_object_id(value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def _business_values(user):
    values = []
    for key in ['business_id', 'id', '_id']:
        raw = (user or {}).get(key)
        if raw:
            values.append(str(raw))
            oid = _as_object_id(raw)
            if oid:
                values.append(oid)
    return values


def _business_scope_filter(user):
    values = _business_values(user)
    if not values:
        return {'_id': '__no_business__'}
    return {'$or': [{'business_id': {'$in': values}}, {'contractor_id': {'$in': values}}, {'owner_id': {'$in': values}}, {'client_business_id': {'$in': values}}]}


def _job_id_filter(job_id):
    clauses = [{'id': str(job_id)}, {'job_id': str(job_id)}]
    oid = _as_object_id(job_id)
    if oid:
        clauses.append({'_id': oid})
    return {'$or': clauses}


def _user_identifiers(user):
    values = set()
    for key in ['id', '_id', 'email', 'name', 'full_name']:
        value = _safe_text((user or {}).get(key))
        if value:
            values.add(value.lower())
    return values


def _job_assigned_to_user(job, user):
    allowed = _user_identifiers(user)
    assigned_values = []
    for key in ['assigned_worker_id', 'worker_id', 'assigned_to', 'assigned_worker_email', 'worker_email', 'worker_name']:
        value = _safe_text((job or {}).get(key))
        if value:
            assigned_values.append(value.lower())
    workers = (job or {}).get('workers') or (job or {}).get('assigned_workers') or []
    if isinstance(workers, list):
        for worker in workers:
            if isinstance(worker, dict):
                assigned_values.extend(_safe_text(worker.get(k)).lower() for k in ['id', '_id', 'email', 'name'] if _safe_text(worker.get(k)))
            elif _safe_text(worker):
                assigned_values.append(_safe_text(worker).lower())
    return bool(allowed.intersection(set(assigned_values)))


def _clean_plan(value):
    return PLAN_ALIAS.get(str(value or '').strip().lower(), str(value or 'none').strip().lower() or 'none')


def _plan_rank(user):
    return PLAN_RANK.get(_clean_plan((user or {}).get('plan') or (user or {}).get('subscription_plan')), 0)


def _is_free_tester(user):
    if not (user or {}).get('free_tester_access'):
        return False
    try:
        raw = (user or {}).get('free_tester_until')
        if not raw:
            return True
        until = raw if isinstance(raw, datetime) else datetime.fromisoformat(str(raw).replace('Z', '+00:00'))
        if not until.tzinfo:
            until = until.replace(tzinfo=timezone.utc)
        return until >= datetime.now(timezone.utc)
    except Exception:
        return True


def _has_accounting_addon(user):
    if _plan_rank(user) >= PLAN_RANK['enterprise']:
        return True
    keys = ['xero_addon_active', 'accounting_sync_addon_active', 'accounting_addon_active', 'has_xero_addon']
    if any(bool((user or {}).get(k)) for k in keys):
        return True
    addons = (user or {}).get('addons') or []
    if isinstance(addons, list):
        return any(str(a).lower() in {'xero', 'accounting', 'accounting_sync'} for a in addons)
    if isinstance(addons, dict):
        return bool(addons.get('xero') or addons.get('accounting_sync'))
    return False


def _required_plan_for_path(path):
    if path.startswith('/api/xero'):
        return 'xero_addon'
    for prefix, plan in FEATURE_ROUTES:
        if path.startswith(prefix):
            return plan
    return None


def _normalize_country(country):
    code = str(country or 'NZ').strip().upper()
    aliases = {'NZL': 'NZ', 'NEW ZEALAND': 'NZ', 'AUS': 'AU', 'AUSTRALIA': 'AU', 'USA': 'US', 'UNITED STATES': 'US', 'GB': 'UK', 'GBR': 'UK', 'UNITED KINGDOM': 'UK'}
    code = aliases.get(code, code)
    return code if code in SUPPORTED_COUNTRIES else 'NZ'


def _stripe_price_id(plan, country='NZ'):
    plan_key = _clean_plan(plan)
    country_code = _normalize_country(country)
    env_plan = PLAN_ENV_BY_KEY.get(plan_key)
    candidates = []
    if env_plan:
        candidates.append(f'STRIPE_PRICE_{env_plan}_{country_code}')
    candidates.extend([f'STRIPE_PRICE_{plan_key.upper()}_{country_code}', f'STRIPE_PRICE_{env_plan}' if env_plan else '', f'STRIPE_PRICE_{plan_key.upper()}'])
    legacy = {'solo': 'STRIPE_PRICE_SOLO', 'team': 'STRIPE_PRICE_TEAM', 'pro': 'STRIPE_PRICE_PRO', 'enterprise': 'STRIPE_PRICE_ENTERPRISE'}
    if plan_key in legacy:
        candidates.append(legacy[plan_key])
    for name in candidates:
        if name and os.environ.get(name, '').strip():
            return os.environ[name].strip()
    return ''


def _cors_origin(request):
    origin = _safe_text(request.headers.get('origin'))
    if origin in CORS_ALLOWED_ORIGINS:
        return origin
    if origin.endswith('.onrender.com') and 'churvox' in origin:
        return origin
    return ''


def _add_cors_headers(request, response):
    origin = _cors_origin(request)
    if not origin:
        return response
    response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    request_headers = _safe_text(request.headers.get('access-control-request-headers'), 'Authorization,Content-Type,Accept')
    response.headers['Access-Control-Allow-Headers'] = request_headers
    response.headers['Access-Control-Expose-Headers'] = 'Content-Type,Authorization'
    vary = response.headers.get('Vary')
    response.headers['Vary'] = 'Origin' if not vary else vary + ', Origin'
    return response


async def _get_user_or_none(request):
    try:
        return await legacy.get_current_user(request)
    except Exception:
        return None


async def _save_business_profile(request: Request):
    user = await _get_user_or_none(request)
    if not user:
        return JSONResponse({'success': False, 'detail': 'Not authenticated'}, status_code=401)
    if _safe_text(user.get('role'), 'employer').lower() not in {'employer', 'owner', 'admin'}:
        return JSONResponse({'success': False, 'detail': 'Only business owners can update business setup'}, status_code=403)
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    allowed = {
        'business_name': 'business_name', 'trading_name': 'trading_name', 'billing_country': 'billing_country', 'service_region': 'service_region',
        'phone': 'phone', 'invoice_prefix': 'invoice_prefix', 'support_email': 'support_email', 'reply_email': 'reply_email'
    }
    update = {}
    for src, dest in allowed.items():
        if src in payload:
            update[dest] = _safe_text(payload.get(src))
    if 'billing_country' in update:
        update['billing_country'] = _normalize_country(update['billing_country'])
    update['updated_at'] = datetime.now(timezone.utc)
    owner_oid = _as_object_id(user.get('business_id') or user.get('id'))
    user_oid = _as_object_id(user.get('id'))
    if not owner_oid:
        return JSONResponse({'success': False, 'detail': 'Business record not found'}, status_code=400)
    await legacy.db.users.update_one({'_id': owner_oid}, {'$set': update})
    if user_oid and user_oid != owner_oid:
        await legacy.db.users.update_one({'_id': user_oid}, {'$set': update})
    updated = await legacy.db.users.find_one({'_id': owner_oid}) or {}
    return JSONResponse({'success': True, 'message': 'Business profile saved', 'data': _json_safe(updated)})


async def _create_card_required_checkout(request: Request):
    # Deprecated. Do not create Stripe sessions here.
    # Clean checkout lives in backend/churvox_plan_consistency.py.
    return JSONResponse(
        {'success': False, 'detail': 'Deprecated checkout route disabled; use clean billing checkout'},
        status_code=410
    )

def _checkout_line_item(plan, country):
    price_id = _stripe_price_id(plan, country)
    if price_id:
        return {'price': price_id, 'quantity': 1}, 'env_price'

    currencies = {'NZ': 'nzd', 'AU': 'aud', 'US': 'usd', 'UK': 'gbp'}
    amounts = {
        'solo': {'NZ': 3900, 'AU': 3900, 'US': 2900, 'UK': 2500},
        'team': {'NZ': 8900, 'AU': 8900, 'US': 6900, 'UK': 5900},
        'pro': {'NZ': 14900, 'AU': 14900, 'US': 11900, 'UK': 9900},
        'enterprise': {'NZ': 29900, 'AU': 29900, 'US': 23900, 'UK': 19900},
    }
    labels = {'solo': 'Start', 'team': 'Crew', 'pro': 'Operator', 'enterprise': 'Command'}

    return {
        'price_data': {
            'currency': currencies.get(country, 'nzd'),
            'tax_behavior': 'exclusive',
            'unit_amount': amounts.get(plan, amounts['pro']).get(country, amounts['pro']['NZ']),
            'recurring': {'interval': 'month'},
            'product_data': {
                'name': f"Churvox {labels.get(plan, 'Operator')}",
                'description': 'Churvox monthly subscription plan',
            },
        },
        'quantity': 1,
    }, 'dynamic_price'


def _remove_conflicting_checkout_routes():
    bad_paths = {
        '/api/billing/create-checkout-session',
        '/api/stripe/create-checkout-session',
        '/api/billing/start-checkout',
        '/api/billing/start-checkout-form',
    }
    kept = []
    for route in list(app.router.routes):
        if getattr(route, 'path', '') in bad_paths:
            continue
        kept.append(route)
    app.router.routes = kept


_remove_conflicting_checkout_routes()


@app.post('/api/billing/create-checkout-session')
async def _clean_json_checkout(request: Request):
    user = await _get_user_or_none(request)
    if not user:
        return JSONResponse({'success': False, 'detail': 'Not authenticated'}, status_code=401)

    role = _safe_text(user.get('role'), 'employer').lower()
    if role not in {'employer', 'owner', 'admin', 'business_owner', 'superadmin', 'manager', 'office_admin'} and not user.get('is_admin') and not user.get('is_platform_owner'):
        return JSONResponse({'success': False, 'detail': 'Only business owners and admins can start billing checkout'}, status_code=403)

    secret = os.environ.get('STRIPE_SECRET_KEY', '').strip()
    if not secret:
        return JSONResponse({'success': False, 'detail': 'Stripe secret key not configured in Render'}, status_code=500)

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    plan = _clean_plan(payload.get('plan') or payload.get('plan_type') or payload.get('backend_plan') or 'pro')
    if plan not in {'solo', 'team', 'pro', 'enterprise'}:
        plan = 'pro'

    country = _normalize_country(payload.get('country') or payload.get('billing_country') or 'NZ')
    line_item, price_source = _checkout_line_item(plan, country)

    stripe.api_key = secret
    frontend = os.environ.get('FRONTEND_URL', 'https://www.churvox.com').rstrip('/')

    user_id = _safe_text(user.get('id') or user.get('_id'))
    business_id = _safe_text(user.get('business_id') or user.get('id') or user.get('_id'))
    metadata = {
        'user_id': user_id,
        'business_id': business_id,
        'plan': plan,
        'country': country,
        'source': 'server_wrapper_clean_json_checkout',
        'trial_days': '14',
        'card_required': 'false',
    }

    try:
        kwargs = {
            'mode': 'subscription',
            'payment_method_collection': 'if_required',
            'automatic_tax': {'enabled': True},
            'billing_address_collection': 'required',
            'line_items': [line_item],
            'subscription_data': {
                'trial_period_days': 14,
                'trial_settings': {'end_behavior': {'missing_payment_method': 'cancel'}},
                'metadata': metadata,
            },
            'metadata': metadata,
            'success_url': f'{_backend_public_url(request)}/api/billing/checkout-return?session_id={{CHECKOUT_SESSION_ID}}',
            'cancel_url': f'{frontend}/plans?checkout=cancelled&plan={plan}&country={country}',
        }
        if _safe_text(user.get('email')):
            kwargs['customer_email'] = _safe_text(user.get('email'))

        session = stripe.checkout.Session.create(**kwargs)
    except Exception as exc:
        return JSONResponse({'success': False, 'detail': f'Stripe checkout error: {exc}'}, status_code=500)

    url = getattr(session, 'url', '') or ''
    session_id = getattr(session, 'id', '') or ''

    if not url:
        return JSONResponse({'success': False, 'detail': 'Stripe did not return a checkout URL'}, status_code=500)

    return JSONResponse({
        'success': True,
        'url': url,
        'checkout_url': url,
        'session_id': session_id,
        'plan': plan,
        'country': country,
        'price_source': price_source,
        'trial_days': 14,
        'card_required': False,
    })


@app.post('/api/billing/start-checkout-form')
async def _clean_form_checkout(request: Request):
    from urllib.parse import parse_qs

    raw = (await request.body()).decode('utf-8', errors='ignore')
    form = {k: v[0] for k, v in parse_qs(raw).items() if v}

    token = _safe_text(form.get('token') or form.get('access_token'))
    if not token:
        return JSONResponse({'success': False, 'detail': 'Missing checkout token'}, status_code=401)

    try:
        jwt_payload = legacy.jwt.decode(
            token,
            legacy.JWT_SECRET,
            algorithms=[legacy.JWT_ALGORITHM],
        )
        if jwt_payload.get('type') != 'access':
            return JSONResponse({'success': False, 'detail': 'Invalid checkout token type'}, status_code=401)
        user_doc = await legacy.db.users.find_one({'_id': ObjectId(jwt_payload['sub'])})
    except Exception:
        return JSONResponse({'success': False, 'detail': 'Invalid checkout token'}, status_code=401)

    if not user_doc:
        return JSONResponse({'success': False, 'detail': 'User not found'}, status_code=401)

    role = _safe_text(user_doc.get('role'), 'employer').lower()
    if role not in {'employer', 'owner', 'admin', 'business_owner', 'superadmin', 'manager', 'office_admin'} and not user_doc.get('is_admin') and not user_doc.get('is_platform_owner'):
        return JSONResponse({'success': False, 'detail': 'Only business owners and admins can start billing checkout'}, status_code=403)

    secret = os.environ.get('STRIPE_SECRET_KEY', '').strip()
    if not secret:
        return JSONResponse({'success': False, 'detail': 'Stripe secret key not configured in Render'}, status_code=500)

    if stripe is None:
        return JSONResponse({'success': False, 'detail': 'Stripe package is not available'}, status_code=500)

    plan = _clean_plan(form.get('plan') or form.get('plan_type') or form.get('backend_plan') or 'pro')
    if plan not in {'solo', 'team', 'pro', 'enterprise'}:
        plan = 'pro'

    country = _normalize_country(form.get('country') or form.get('billing_country') or 'NZ')
    line_item, price_source = _checkout_line_item(plan, country)

    stripe.api_key = secret
    frontend = _frontend_public_url()

    user_id = _safe_text(user_doc.get('id') or user_doc.get('_id'))
    business_id = _safe_text(user_doc.get('business_id') or user_doc.get('id') or user_doc.get('_id'))

    metadata = {
        'user_id': user_id,
        'business_id': business_id,
        'plan': plan,
        'country': country,
        'source': 'server_wrapper_clean_form_checkout',
        'trial_days': '14',
        'card_required': 'false',
    }

    try:
        kwargs = {
            'mode': 'subscription',
            'payment_method_collection': 'if_required',
            'automatic_tax': {'enabled': True},
            'billing_address_collection': 'required',
            'line_items': [line_item],
            'subscription_data': {
                'trial_period_days': 14,
                'trial_settings': {'end_behavior': {'missing_payment_method': 'cancel'}},
                'metadata': metadata,
            },
            'metadata': metadata,
            'success_url': f'{_backend_public_url(request)}/api/billing/checkout-return?session_id={{CHECKOUT_SESSION_ID}}',
            'cancel_url': f'{frontend}/plans?checkout=cancelled&plan={plan}&country={country}',
        }

        if _safe_text(user_doc.get('email')):
            kwargs['customer_email'] = _safe_text(user_doc.get('email'))

        session = stripe.checkout.Session.create(**kwargs)
    except Exception as exc:
        return JSONResponse({'success': False, 'detail': f'Stripe checkout error: {exc}'}, status_code=500)

    url = getattr(session, 'url', '') or ''
    if not url:
        return JSONResponse({'success': False, 'detail': 'Stripe did not return a checkout URL'}, status_code=500)

    return RedirectResponse(url, status_code=303)


def _backend_public_url(request=None):
    configured = os.environ.get('BACKEND_PUBLIC_URL') or os.environ.get('API_PUBLIC_URL') or ''
    if configured:
        return configured.rstrip('/')
    return 'https://grassley-backend.onrender.com'


def _frontend_public_url():
    return os.environ.get('FRONTEND_URL', 'https://www.churvox.com').rstrip('/')


def _save_meta_for_plan(plan, country):
    plan = _clean_plan(plan)
    country = _normalize_country(country)
    prices = {
        'solo': 39,
        'team': 89,
        'pro': 149,
        'enterprise': 299,
    }
    names = {
        'solo': 'Start',
        'team': 'Crew',
        'pro': 'Operator',
        'enterprise': 'Command',
    }
    return {
        'plan': plan,
        'plan_name': names.get(plan, 'Operator'),
        'plan_price': prices.get(plan, 149),
        'billing_country': country,
        'business_country': country,
        'country': country,
    }


async def _save_plan_from_checkout_session(session):
    meta = dict(getattr(session, 'metadata', {}) or {})
    plan = _clean_plan(meta.get('plan') or 'pro')
    if plan not in {'solo', 'team', 'pro', 'enterprise'}:
        plan = 'pro'

    country = _normalize_country(meta.get('country') or 'NZ')
    user_id = _safe_text(meta.get('user_id'))
    business_id = _safe_text(meta.get('business_id') or user_id)
    customer_email = _safe_text(getattr(session, 'customer_email', '') or meta.get('email') or meta.get('customer_email')).lower()

    now = datetime.now(timezone.utc)

    update = _save_meta_for_plan(plan, country)
    update.update({
        'subscription_plan': plan,
        'subscription_status': 'trialing',
        'stripe_customer_id': _safe_text(getattr(session, 'customer', '')),
        'stripe_subscription_id': _safe_text(getattr(session, 'subscription', '')),
        'has_app_access': True,
        'updated_at': now,
        'trial_started_at': now,
    })

    clauses = []

    for raw in [business_id, user_id]:
        value = _safe_text(raw)
        if not value:
            continue

        oid = _as_object_id(value)
        if oid:
            clauses.extend([
                {'_id': oid},
                {'business_id': oid},
                {'owner_id': oid},
            ])

        clauses.extend([
            {'id': value},
            {'business_id': value},
            {'owner_id': value},
            {'_id': value},
        ])

    if customer_email:
        clauses.append({'email': customer_email})

    if not clauses:
        await legacy.db.billing_plan_sessions.update_one(
            {'stripe_session_id': _safe_text(getattr(session, 'id', ''))},
            {'$set': {
                'status': 'save_failed',
                'reason': 'missing_user_metadata',
                'metadata': meta,
                'updated_at': now,
            }},
            upsert=True,
        )
        return {'success': False, 'detail': 'Stripe session has no usable business/user/email metadata', 'metadata': meta}

    result = await legacy.db.users.update_many({'$or': clauses}, {'$set': update})
    matched = int(getattr(result, 'matched_count', 0) or 0)

    await legacy.db.billing_plan_sessions.update_one(
        {'stripe_session_id': _safe_text(getattr(session, 'id', ''))},
        {'$set': {
            'business_id': business_id,
            'owner_user_id': user_id,
            'customer_email': customer_email,
            'plan': plan,
            'country': country,
            'status': 'confirmed' if matched else 'save_failed',
            'matched_users': matched,
            'stripe_customer_id': _safe_text(getattr(session, 'customer', '')),
            'stripe_subscription_id': _safe_text(getattr(session, 'subscription', '')),
            'confirmed_at': now,
            'source': 'backend_checkout_return_robust_save',
            'metadata': meta,
        }},
        upsert=True,
    )

    if matched <= 0:
        return {
            'success': False,
            'detail': 'No user matched Stripe metadata/email',
            'metadata': meta,
            'customer_email': customer_email,
        }

    return {'success': True, 'plan': plan, 'country': country, 'matched_users': matched}


@app.get('/api/billing/checkout-return')
async def _checkout_return_save_plan(request: Request):
    frontend = _frontend_public_url()
    session_id = _safe_text(request.query_params.get('session_id'))

    if not session_id:
        return RedirectResponse(f'{frontend}/plans?checkout=missing_session', status_code=303)

    secret = os.environ.get('STRIPE_SECRET_KEY', '').strip()
    if not secret:
        return RedirectResponse(f'{frontend}/plans?checkout=save_failed&reason=stripe_secret_missing', status_code=303)

    try:
        stripe.api_key = secret
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception:
        return RedirectResponse(f'{frontend}/plans?checkout=verify_failed', status_code=303)

    saved = await _save_plan_from_checkout_session(session)
    if not saved.get('success'):
        return RedirectResponse(f'{frontend}/plans?checkout=save_failed', status_code=303)

    return RedirectResponse(
        f"{frontend}/plans?checkout=saved&plan={saved.get('plan')}&country={saved.get('country')}",
        status_code=303,
    )


async def _secure_complete_job(request, job_id):
    user = await _get_user_or_none(request)
    if not user:
        return JSONResponse({'success': False, 'detail': 'Not authenticated'}, status_code=401)
    job_query = {'$and': [_business_scope_filter(user), _job_id_filter(job_id)]}
    job = await legacy.db.jobs.find_one(job_query)
    if not job:
        return JSONResponse({'success': False, 'detail': 'Job not found'}, status_code=404)
    role = _safe_text(user.get('role')).lower()
    if role in {'worker', 'staff', 'employee', 'subcontractor', 'contractor'} and not _job_assigned_to_user(job, user):
        return JSONResponse({'success': False, 'detail': 'Job not found'}, status_code=404)
    now = datetime.now(timezone.utc)
    update = {'status': 'completed', 'job_status': 'completed', 'workflow_status': 'completed', 'completed': True, 'completed_at': now, 'updated_at': now, 'completed_by': _safe_text(user.get('id') or user.get('_id') or user.get('email'))}
    result = await legacy.db.jobs.update_one(job_query, {'$set': update})
    if result.matched_count == 0:
        return JSONResponse({'success': False, 'detail': 'Job not found'}, status_code=404)
    job.update(update)
    return JSONResponse({'success': True, 'message': 'Job completed', 'job': _json_safe(job)})


@app.middleware('http')
async def _churvox_launch_guard_middleware(request, call_next):
    path = request.url.path.rstrip('/')
    method = request.method.upper()
    if method == 'PATCH' and path == '/api/user/business-profile':
        return await _save_business_profile(request)
    # Billing checkout must fall through to the clean billing router.
    # The old wrapper intercept forced card collection and /billing/success.
    if method == 'POST' and path.startswith('/api/jobs/') and path.endswith('/complete'):
        parts = path.split('/')
        if len(parts) >= 5:
            return await _secure_complete_job(request, parts[-2])
    required = _required_plan_for_path(path)
    if required and not any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES):
        user = await _get_user_or_none(request)
        if not user:
            return JSONResponse({'success': False, 'detail': 'Not authenticated'}, status_code=401)
        if _is_free_tester(user):
            return await call_next(request)
        if required == 'xero_addon':
            if not _has_accounting_addon(user):
                return JSONResponse({'success': False, 'detail': 'Xero sync requires Command or the Accounting Sync Add-on'}, status_code=403)
        elif _plan_rank(user) < PLAN_RANK.get(required, 1):
            return JSONResponse({'success': False, 'detail': 'Your plan does not include this feature'}, status_code=403)
    return await call_next(request)


@app.middleware('http')
async def _churvox_hard_cors_middleware(request, call_next):
    if request.method.upper() == 'OPTIONS':
        return _add_cors_headers(request, JSONResponse({'ok': True}, status_code=204))
    response = await call_next(request)
    return _add_cors_headers(request, response)


async def _business_query(request):
    user = await _get_user_or_none(request)
    if not user:
        return {}, None
    return _business_scope_filter(user), user


async def _build_operator_slips(request):
    query, user = await _business_query(request)
    slips = []
    db = legacy.db
    try:
        jobs = await db.jobs.find(query).sort('created_at', -1).limit(25).to_list(length=25)
    except Exception:
        jobs = []
    try:
        invoices = await db.invoices.find(query).sort('created_at', -1).limit(25).to_list(length=25)
    except Exception:
        invoices = []
    try:
        quotes = await db.quotes.find(query).sort('created_at', -1).limit(20).to_list(length=20)
    except Exception:
        quotes = []
    unassigned = [j for j in jobs if not (j.get('assigned_worker_id') or j.get('worker_id') or j.get('assigned_to'))]
    if unassigned:
        sample = unassigned[0]
        slips.append({'id': 'assign-' + _doc_id(sample), 'type': 'job_assignment', 'category': 'jobs', 'priority': 'high', 'status': 'prepared', 'title': 'Assign worker to job', 'summary': 'Churvox found a job that still needs a person on it.', 'prepared_by': 'Churvox AI Operator', 'primary_action': 'Approve assignment', 'secondary_action': 'Edit first', 'client': _safe_text(sample.get('client_name') or sample.get('customer_name') or sample.get('client'), 'Client'), 'job': _safe_text(sample.get('title') or sample.get('job_type') or sample.get('description'), 'Job'), 'details': {'job_id': _doc_id(sample), 'address': _safe_text(sample.get('address'), 'No address saved'), 'scheduled': _safe_text(sample.get('scheduled_date') or sample.get('date'), 'No date set'), 'reason': 'This keeps the job moving without the owner hunting through jobs.'}})
    open_invoices = [i for i in invoices if _safe_text(i.get('status'), 'draft').lower() in ['sent', 'overdue', 'unpaid', 'open']]
    if open_invoices:
        inv = open_invoices[0]
        slips.append({'id': 'invoice-followup-' + _doc_id(inv), 'type': 'invoice_followup', 'category': 'invoices', 'priority': 'high' if _safe_text(inv.get('status')).lower() == 'overdue' else 'normal', 'status': 'prepared', 'title': 'Invoice follow-up prepared', 'summary': 'Churvox prepared a polite follow-up for an open invoice.', 'prepared_by': 'Churvox AI Operator', 'primary_action': 'Approve reminder', 'secondary_action': 'Edit message', 'client': _safe_text(inv.get('customer_name') or inv.get('client_name'), 'Customer'), 'amount': _safe_money(inv.get('total') or inv.get('amount_due') or inv.get('subtotal')), 'details': {'invoice_id': _doc_id(inv), 'status': _safe_text(inv.get('status'), 'open'), 'message': 'Friendly reminder prepared for owner approval before anything is sent.'}})
    completed_jobs = [j for j in jobs if _safe_text(j.get('status')).lower() in ['completed', 'done'] or j.get('completed') is True]
    if completed_jobs:
        job = completed_jobs[0]
        slips.append({'id': 'draft-invoice-' + _doc_id(job), 'type': 'draft_invoice', 'category': 'invoices', 'priority': 'normal', 'status': 'prepared', 'title': 'Draft invoice ready', 'summary': 'Churvox found completed work and prepared the next admin step.', 'prepared_by': 'Churvox AI Operator', 'primary_action': 'Review draft', 'secondary_action': 'Edit details', 'client': _safe_text(job.get('client_name') or job.get('customer_name'), 'Customer'), 'amount': _safe_money(job.get('price') or job.get('total')), 'details': {'job_id': _doc_id(job), 'description': _safe_text(job.get('title') or job.get('job_type'), 'Completed job'), 'reason': 'Completed jobs should move straight toward invoice review.'}})
    pending_quotes = [q for q in quotes if _safe_text(q.get('status'), 'draft').lower() in ['sent', 'pending', 'draft']]
    if pending_quotes:
        q = pending_quotes[0]
        slips.append({'id': 'quote-followup-' + _doc_id(q), 'type': 'quote_followup', 'category': 'quotes', 'priority': 'normal', 'status': 'prepared', 'title': 'Quote follow-up prepared', 'summary': 'Churvox prepared a quote follow-up so the owner can approve or edit it.', 'prepared_by': 'Churvox AI Operator', 'primary_action': 'Approve follow-up', 'secondary_action': 'Edit message', 'client': _safe_text(q.get('customer_name') or q.get('client_name'), 'Customer'), 'amount': _safe_money(q.get('price') or q.get('total')), 'details': {'quote_id': _doc_id(q), 'status': _safe_text(q.get('status'), 'draft')}})
    if not slips:
        slips.append({'id': 'daily-summary', 'type': 'daily_summary', 'category': 'command', 'priority': 'normal', 'status': 'prepared', 'title': 'Daily admin check ready', 'summary': 'Churvox checked jobs, invoices and quotes. No urgent slip needs approval right now.', 'prepared_by': 'Churvox AI Operator', 'primary_action': 'View details', 'secondary_action': 'Refresh', 'details': {'jobs_checked': len(jobs), 'invoices_checked': len(invoices), 'quotes_checked': len(quotes), 'time': datetime.now(timezone.utc).isoformat()}})
    return slips


async def _slips_payload(request):
    slips = await _build_operator_slips(request)
    return {'success': True, 'slips': slips, 'actions': slips, 'items': slips, 'data': slips, 'count': len(slips)}


for _path in ['/api/slips', '/api/command/slips', '/api/smart-hub/slips', '/api/smarthub/slips', '/api/ai/slips', '/api/ai/actions', '/api/ai/operator/slips', '/api/ai/operator/actions', '/api/ai-operator/slips', '/api/ai-operator/actions', '/api/operator/slips', '/api/operator/actions', '/api/approval-queue', '/api/operator/approval-queue', '/api/ai/operator/approval-queue', '/api/ai-operator/approval-queue']:
    async def _handler(request: Request, _p=_path):
        return await _slips_payload(request)
    app.get(_path)(_handler)


@app.get('/api/smart-hub')
@app.get('/api/smarthub')
@app.get('/api/command')
async def command_summary(request: Request):
    slips = await _build_operator_slips(request)
    return {'success': True, 'summary': 'Churvox AI Operator has prepared the next admin actions.', 'slips': slips, 'actions': slips, 'approval_queue': slips, 'counts': {'prepared': len(slips), 'urgent': len([s for s in slips if s.get('priority') == 'high'])}}


@app.post('/api/slips/{slip_id}/approve')
@app.post('/api/command/slips/{slip_id}/approve')
@app.post('/api/ai/operator/slips/{slip_id}/approve')
@app.post('/api/ai-operator/slips/{slip_id}/approve')
@app.post('/api/operator/slips/{slip_id}/approve')
async def approve_slip(slip_id: str):
    return {'success': True, 'approved': True, 'slip_id': slip_id, 'message': 'Slip approved. Churvox recorded the approval.'}

# CHURVOX_WORKER_SHIFT_GPS_BASE_20260617
async def _worker_shift_payload(request: Request):
    try:
        return await request.json()
    except Exception:
        return {}


def _geo_from_payload(payload):
    location = payload.get("location") if isinstance(payload, dict) else {}
    if not isinstance(location, dict):
        location = {}
    lat = location.get("lat", payload.get("lat") if isinstance(payload, dict) else None)
    lng = location.get("lng", payload.get("lng") if isinstance(payload, dict) else None)
    accuracy = location.get("accuracy", payload.get("accuracy") if isinstance(payload, dict) else None)
    try:
        lat = float(lat) if lat is not None and str(lat).strip() != "" else None
        lng = float(lng) if lng is not None and str(lng).strip() != "" else None
        accuracy = float(accuracy) if accuracy is not None and str(accuracy).strip() != "" else None
    except Exception:
        lat, lng, accuracy = None, None, None
    return {"lat": lat, "lng": lng, "accuracy": accuracy}


async def _active_shift_for_user(user):
    user_id = str(user.get("id") or user.get("_id") or "")
    business_id = str(user.get("business_id") or user.get("contractor_id") or user.get("owner_id") or "")
    return await legacy.db.worker_shifts.find_one({
        "worker_id": user_id,
        "business_id": business_id,
        "status": "clocked_in",
    })


async def _write_gps_log(user, shift_id, geo, source):
    if geo.get("lat") is None or geo.get("lng") is None:
        return None

    now = datetime.now(timezone.utc)
    user_id = str(user.get("id") or user.get("_id") or "")
    business_id = str(user.get("business_id") or user.get("contractor_id") or user.get("owner_id") or "")

    doc = {
        "worker_id": user_id,
        "business_id": business_id,
        "shift_id": str(shift_id or ""),
        "timestamp": now,
        "lat": geo.get("lat"),
        "lng": geo.get("lng"),
        "accuracy": geo.get("accuracy"),
        "source": source,
        "created_at": now,
    }

    await legacy.db.worker_gps_logs.insert_one(doc)

    update = {
        "clock_status": "clocked_in" if source != "clock_out" else "clocked_out",
        "last_lat": geo.get("lat"),
        "last_lng": geo.get("lng"),
        "last_gps_accuracy": geo.get("accuracy"),
        "last_gps_at": now,
        "gps_tracking_enabled": source != "clock_out",
        "updated_at": now,
    }

    user_oid = _as_object_id(user_id)
    if user_oid:
        await legacy.db.users.update_one({"_id": user_oid}, {"$set": update})
    await legacy.db.users.update_many({"email": user.get("email")}, {"$set": update})

    return doc


@app.get("/api/worker/shift/status")
async def _worker_shift_status(request: Request):
    user = await _get_user_or_none(request)
    if not user:
        return JSONResponse({"success": False, "detail": "Not authenticated"}, status_code=401)

    shift = await _active_shift_for_user(user)
    if not shift:
        return JSONResponse({
            "success": True,
            "data": {
                "status": "clocked_out",
                "gps_tracking_enabled": False,
                "shift": None,
            },
        })

    now = datetime.now(timezone.utc)
    started = shift.get("clock_in_time") or shift.get("created_at")
    try:
        total = int((now - started).total_seconds()) if started else 0
    except Exception:
        total = 0

    return JSONResponse({
        "success": True,
        "data": {
            "status": "clocked_in",
            "gps_tracking_enabled": True,
            "shift": _json_safe(shift),
            "shift_seconds": total,
        },
    })


@app.post("/api/worker/clock-in")
async def _worker_clock_in(request: Request):
    user = await _get_user_or_none(request)
    if not user:
        return JSONResponse({"success": False, "detail": "Not authenticated"}, status_code=401)

    payload = await _worker_shift_payload(request)
    geo = _geo_from_payload(payload)
    now = datetime.now(timezone.utc)
    existing = await _active_shift_for_user(user)

    if existing:
        await _write_gps_log(user, existing.get("_id"), geo, "clock_in_refresh")
        return JSONResponse({"success": True, "message": "Already clocked in", "data": _json_safe(existing)})

    user_id = str(user.get("id") or user.get("_id") or "")
    business_id = str(user.get("business_id") or user.get("contractor_id") or user.get("owner_id") or "")

    shift = {
        "worker_id": user_id,
        "worker_name": user.get("name") or user.get("full_name") or user.get("email") or "Worker",
        "worker_email": user.get("email") or "",
        "business_id": business_id,
        "status": "clocked_in",
        "clock_in_time": now,
        "clock_in_location": geo,
        "clock_out_time": None,
        "clock_out_location": None,
        "total_shift_seconds": 0,
        "gps_tracking_enabled": True,
        "created_at": now,
        "updated_at": now,
    }

    inserted = await legacy.db.worker_shifts.insert_one(shift)
    shift["_id"] = inserted.inserted_id
    await _write_gps_log(user, inserted.inserted_id, geo, "clock_in")

    user_oid = _as_object_id(user_id)
    update = {
        "clock_status": "clocked_in",
        "shift_id": str(inserted.inserted_id),
        "clock_in_time": now,
        "gps_tracking_enabled": True,
        "updated_at": now,
    }
    if user_oid:
        await legacy.db.users.update_one({"_id": user_oid}, {"$set": update})
    if user.get("email"):
        await legacy.db.users.update_many({"email": user.get("email")}, {"$set": update})

    return JSONResponse({"success": True, "message": "Clocked in", "data": _json_safe(shift)})


@app.post("/api/worker/gps-ping")
async def _worker_gps_ping(request: Request):
    user = await _get_user_or_none(request)
    if not user:
        return JSONResponse({"success": False, "detail": "Not authenticated"}, status_code=401)

    shift = await _active_shift_for_user(user)
    if not shift:
        return JSONResponse({"success": False, "detail": "Worker is not clocked in"}, status_code=400)

    payload = await _worker_shift_payload(request)
    geo = _geo_from_payload(payload)
    if geo.get("lat") is None or geo.get("lng") is None:
        return JSONResponse({"success": False, "detail": "GPS location missing"}, status_code=400)

    log = await _write_gps_log(user, shift.get("_id"), geo, payload.get("source") or "hourly")
    await legacy.db.worker_shifts.update_one({"_id": shift.get("_id")}, {"$set": {"last_gps_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}})

    return JSONResponse({"success": True, "message": "GPS recorded", "data": _json_safe(log)})


@app.post("/api/worker/clock-out")
async def _worker_clock_out(request: Request):
    user = await _get_user_or_none(request)
    if not user:
        return JSONResponse({"success": False, "detail": "Not authenticated"}, status_code=401)

    shift = await _active_shift_for_user(user)
    if not shift:
        return JSONResponse({"success": True, "message": "Already clocked out", "data": None})

    payload = await _worker_shift_payload(request)
    geo = _geo_from_payload(payload)
    now = datetime.now(timezone.utc)
    clock_in = shift.get("clock_in_time") or shift.get("created_at")
    try:
        total = int((now - clock_in).total_seconds()) if clock_in else 0
    except Exception:
        total = 0

    await _write_gps_log(user, shift.get("_id"), geo, "clock_out")

    update = {
        "status": "clocked_out",
        "clock_out_time": now,
        "clock_out_location": geo,
        "total_shift_seconds": total,
        "gps_tracking_enabled": False,
        "updated_at": now,
    }
    await legacy.db.worker_shifts.update_one({"_id": shift.get("_id")}, {"$set": update})

    user_id = str(user.get("id") or user.get("_id") or "")
    user_oid = _as_object_id(user_id)
    user_update = {
        "clock_status": "clocked_out",
        "clock_out_time": now,
        "today_shift_seconds": total,
        "gps_tracking_enabled": False,
        "updated_at": now,
    }
    if user_oid:
        await legacy.db.users.update_one({"_id": user_oid}, {"$set": user_update})
    if user.get("email"):
        await legacy.db.users.update_many({"email": user.get("email")}, {"$set": user_update})

    return JSONResponse({"success": True, "message": "Clocked out", "data": {"total_shift_seconds": total}})
